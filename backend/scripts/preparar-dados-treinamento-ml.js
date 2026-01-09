/**
 * Script para preparar dados de treinamento ML a partir do histórico
 * 
 * Este script lê o histórico de desmembramentos reais e prepara dados
 * estruturados para treinamento de modelos ML
 * 
 * Execute: node scripts/preparar-dados-treinamento-ml.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, getDatabase } = require('../database/init');

// Importar serviço de feature engineering
const featureEngineeringService = require('../services/mlFeatureEngineeringService');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'faturamento.db');

// Verificar se banco existe
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Banco de dados não encontrado:', DB_PATH);
  process.exit(1);
}

// Inicializar banco e processar
(async () => {
  try {
    console.log('🔄 Inicializando banco de dados...');
    await initDatabase();
    console.log('✅ Conectado ao banco de dados\n');
    
    const db = getDatabase();
    await processarDados(db);
    db.close();
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();

async function processarDados(db) {
  try {
    console.log('\n📊 Iniciando preparação de dados de treinamento...\n');
    
    // Verificar se tabela existe
    const tabelaExiste = await new Promise((resolve) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='historico_desmembramentos_reais'",
        [],
        (err, row) => {
          resolve(!!row);
        }
      );
    });
    
    if (!tabelaExiste) {
      console.log('❌ Tabela historico_desmembramentos_reais não encontrada!');
      console.log('\n📋 Você precisa primeiro importar o histórico de faturamentos.');
      console.log('   Execute: npm run importar-historico <arquivo.csv>');
      console.log('   Exemplo: npm run importar-historico csv.csv\n');
      db.close();
      return;
    }
    
    // 1. Buscar todas as notas fiscais únicas do histórico
    const notasFiscais = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT numeroNotaFiscal 
         FROM historico_desmembramentos_reais 
         ORDER BY numeroNotaFiscal`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`📦 Encontradas ${notasFiscais.length} notas fiscais no histórico\n`);
    
    if (notasFiscais.length === 0) {
      console.log('⚠️  Nenhuma nota fiscal encontrada no histórico.');
      console.log('   Importe dados históricos primeiro usando: npm run importar-historico');
      return;
    }
    
    // 2. Limpar dados antigos (opcional - comentar se quiser manter)
    console.log('🗑️  Limpando dados de treinamento anteriores...');
    await new Promise((resolve) => {
      db.run('DELETE FROM ml_training_data', [], (err) => {
        if (err) {
          console.warn('⚠️  Aviso ao limpar dados:', err.message);
        }
        resolve();
      });
    });
    
    // 3. Processar cada nota fiscal
    let processadas = 0;
    let sucesso = 0;
    let erros = 0;
    
    for (const nf of notasFiscais) {
      try {
        processadas++;
        const progresso = `[${processadas}/${notasFiscais.length}]`;
        
        // Buscar todos os produtos desta NF no histórico
        const produtosHistorico = await new Promise((resolve, reject) => {
          db.all(
            `SELECT * FROM historico_desmembramentos_reais 
             WHERE numeroNotaFiscal = ? 
             ORDER BY codigoProduto, numeroCarga`,
            [nf.numeroNotaFiscal],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        if (produtosHistorico.length === 0) {
          console.log(`${progresso} ⚠️  ${nf.numeroNotaFiscal}: Sem produtos, pulando...`);
          continue;
        }
        
        // Agrupar por código de produto para calcular totais
        const produtosAgrupados = {};
        produtosHistorico.forEach(p => {
          const codigo = p.codigoProduto;
          if (!produtosAgrupados[codigo]) {
            produtosAgrupados[codigo] = {
              codigoProduto: codigo,
              descricaoProduto: p.descricaoProduto,
              unidade: p.unidade,
              quantidadeTotal: p.quantidadeTotal || 0
            };
          }
        });
        
        // Calcular número de cargas (maior numeroCarga)
        const numeroCargas = Math.max(...produtosHistorico.map(p => p.numeroCarga || 1));
        
        // Criar objeto simulado de nota fiscal e itens para extrair features
        const itensSimulados = Object.values(produtosAgrupados).map(p => ({
          codigoProduto: p.codigoProduto,
          codigoInterno: p.codigoProduto,
          descricao: p.descricaoProduto,
          quantidade: p.quantidadeTotal,
          valorTotal: 0, // não temos no histórico
          peso: 0,
          volume: 0,
          valorUnitario: 0
        }));
        
        const notaFiscalSimulada = {
          id: nf.numeroNotaFiscal,
          numeroNota: nf.numeroNotaFiscal,
          pesoTotal: 0,
          volumeTotal: 0,
          valorTotal: 0
        };
        
        // Extrair features
        const features = await featureEngineeringService.extrairFeatures(
          notaFiscalSimulada, 
          itensSimulados
        );
        
        // Preparar distribuição de cargas (simplificada)
        const distribuicaoCargas = produtosHistorico.reduce((acc, p) => {
          const cargaNum = p.numeroCarga || 1;
          if (!acc[cargaNum]) {
            acc[cargaNum] = [];
          }
          acc[cargaNum].push({
            codigoProduto: p.codigoProduto,
            quantidade: p.quantidadePorCarga || 0
          });
          return acc;
        }, {});
        
        // Inserir em ml_training_data
        const id = uuidv4();
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO ml_training_data 
             (id, numeroNotaFiscal, totalItens, totalProdutosUnicos, pesoTotal, volumeTotal, 
              valorTotal, temProdutosEspeciais, quantidadeProdutosEspeciais, percentualProdutosEspeciais,
              listaCodigosProdutos, listaQuantidades, listaValores, mediaQuantidadePorItem,
              desvioPadraoQuantidades, mediaValorPorItem, frequenciaMediaProdutos, similaridadeComHistorico,
              numeroCargas, distribuicaoCargas, metodoOrigem, confiancaOrigem, processedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              nf.numeroNotaFiscal,
              features.totalItens,
              features.totalProdutosUnicos,
              features.pesoTotal,
              features.volumeTotal,
              features.valorTotal,
              features.temProdutosEspeciais,
              features.quantidadeProdutosEspeciais,
              features.percentualProdutosEspeciais,
              features.listaCodigosProdutos,
              features.listaQuantidades,
              features.listaValores,
              features.mediaQuantidadePorItem,
              features.desvioPadraoQuantidades,
              features.mediaValorPorItem,
              features.frequenciaMediaProdutos,
              features.similaridadeComHistorico,
              numeroCargas, // LABEL
              JSON.stringify(distribuicaoCargas),
              'HISTORICO',
              1.0, // confiança alta para dados históricos
              new Date().toISOString()
            ],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        sucesso++;
        if (processadas % 10 === 0 || processadas === notasFiscais.length) {
          console.log(`${progresso} ✅ Processadas: ${processadas} | Sucesso: ${sucesso} | Erros: ${erros}`);
        }
      } catch (error) {
        erros++;
        console.error(`❌ Erro ao processar ${nf.numeroNotaFiscal}:`, error.message);
      }
    }
    
    // 4. Estatísticas finais
    console.log('\n────────────────────────────────────────────────────────────');
    console.log('📊 Resumo:');
    console.log(`   • Notas fiscais processadas: ${processadas}`);
    console.log(`   • Sucesso: ${sucesso}`);
    console.log(`   • Erros: ${erros}`);
    
    // Contar registros inseridos
    const total = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM ml_training_data', [], (err, row) => {
        if (err) resolve(0);
        else resolve(row?.total || 0);
      });
    });
    
    console.log(`   • Total de registros em ml_training_data: ${total}`);
    
    if (total >= 50) {
      console.log('\n✅ Dados suficientes para treinamento!');
    } else if (total >= 20) {
      console.log('\n⚠️  Poucos dados. Recomendado: pelo menos 50 registros.');
      console.log('   Funcionará, mas modelo pode ter performance limitada.');
    } else {
      console.log('\n❌ Dados insuficientes. Mínimo recomendado: 50 registros.');
      console.log('   Continue importando histórico ou use modelo heurístico.');
    }
    
    console.log('\n✅ Preparação concluída!\n');
  } catch (error) {
    console.error('❌ Erro ao processar dados:', error);
    throw error;
  }
}
