/**
 * Script para importar histórico de faturamentos do PDF
 * 
 * Formato esperado do arquivo CSV:
 * Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
 * 
 * Exemplo:
 * NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,1
 * NF-123456,50080,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
 * NF-123456,19500,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
 * 
 * Produtos especiais (6000, 50080, 19500) serão automaticamente cadastrados
 * com regra de 1 unidade por carga.
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

// Códigos de produtos especiais (só podem ter 1 unidade por carga)
const CODIGOS_ESPECIAIS = ['6000', '50080', '19500'];

/**
 * Processa uma linha do CSV
 */
function processarLinhaCSV(linha, numeroLinha) {
  const campos = linha.split(',').map(campo => campo.trim());
  
  if (campos.length < 5) {
    console.warn(`Linha ${numeroLinha} ignorada: formato inválido (esperado: 5 campos, encontrado: ${campos.length})`);
    return null;
  }
  
  const [numeroNotaFiscal, codigoProduto, descricaoProduto, unidade, quantidade] = campos;
  
  // Validar campos obrigatórios
  if (!numeroNotaFiscal || !codigoProduto || !quantidade) {
    console.warn(`Linha ${numeroLinha} ignorada: campos obrigatórios faltando`);
    return null;
  }
  
  // Validar quantidade
  const quantidadeNum = parseInt(quantidade, 10);
  if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
    console.warn(`Linha ${numeroLinha} ignorada: quantidade inválida (${quantidade})`);
    return null;
  }
  
  const item = {
    numeroNotaFiscal: numeroNotaFiscal.trim(),
    codigoProduto: codigoProduto.trim(),
    descricaoProduto: (descricaoProduto || '').trim(),
    unidade: (unidade || 'UN').trim(),
    quantidade: quantidadeNum
  };
  
  return item;
}

/**
 * Processa itens do CSV mantendo a ordem e agrupando por cargas
 * 
 * REGRA: Produtos consecutivos da mesma NF = mesma carga
 * Quando a NF muda, inicia nova carga (nova NF)
 */
function processarDesmembramentos(itens) {
  const desmembramentos = [];
  const cargas = [];
  let cargaAtual = null;
  let numeroCargaGlobal = 1;
  let sequenciaItem = 1;
  
  // Processar cada item na ordem do CSV
  for (const item of itens) {
    // Se mudou a nota fiscal, criar nova carga ou nova sequência
    if (!cargaAtual || cargaAtual.numeroNotaFiscal !== item.numeroNotaFiscal) {
      // Se já havia uma carga, finalizar ela
      if (cargaAtual) {
        cargas.push(cargaAtual);
      }
      
      // Criar nova carga
      cargaAtual = {
        numeroNotaFiscal: item.numeroNotaFiscal,
        numeroCarga: numeroCargaGlobal++,
        produtos: []
      };
    }
    
    // Adicionar produto à carga atual
    cargaAtual.produtos.push({
      codigoProduto: item.codigoProduto,
      descricaoProduto: item.descricaoProduto,
      unidade: item.unidade,
      quantidade: item.quantidade
    });
  }
  
  // Adicionar última carga
  if (cargaAtual) {
    cargas.push(cargaAtual);
  }
  
  // Converter cargas para formato de desmembramentos
  for (const carga of cargas) {
    // Agrupar produtos iguais na mesma carga (somar quantidades)
    const produtosAgrupados = {};
    for (const produto of carga.produtos) {
      const key = `${produto.codigoProduto}`;
      if (!produtosAgrupados[key]) {
        produtosAgrupados[key] = {
          codigoProduto: produto.codigoProduto,
          descricaoProduto: produto.descricaoProduto,
          unidade: produto.unidade,
          quantidadeTotal: 0,
          quantidadePorCarga: 0
        };
      }
      produtosAgrupados[key].quantidadeTotal += produto.quantidade;
      produtosAgrupados[key].quantidadePorCarga += produto.quantidade;
    }
    
    // Processar cada produto agrupado
    for (const key of Object.keys(produtosAgrupados)) {
      const produto = produtosAgrupados[key];
      const isEspecial = CODIGOS_ESPECIAIS.includes(produto.codigoProduto);
      
      // Se for produto especial, cada unidade vai para uma carga separada
      if (isEspecial) {
        for (let i = 0; i < produto.quantidadeTotal; i++) {
          desmembramentos.push({
            numeroNotaFiscal: carga.numeroNotaFiscal,
            codigoProduto: produto.codigoProduto,
            descricaoProduto: produto.descricaoProduto,
            unidade: produto.unidade,
            quantidadeTotal: produto.quantidadeTotal,
            quantidadePorCarga: 1,
            numeroCarga: carga.numeroCarga + i,
            numeroSequencia: sequenciaItem++
          });
        }
      } else {
        // Produto normal: quantidade total na carga
        desmembramentos.push({
          numeroNotaFiscal: carga.numeroNotaFiscal,
          codigoProduto: produto.codigoProduto,
          descricaoProduto: produto.descricaoProduto,
          unidade: produto.unidade,
          quantidadeTotal: produto.quantidadeTotal,
          quantidadePorCarga: produto.quantidadePorCarga,
          numeroCarga: carga.numeroCarga,
          numeroSequencia: sequenciaItem++
        });
      }
    }
  }
  
  return desmembramentos;
}

/**
 * Cadastra regras de produtos especiais
 */
function cadastrarRegrasProdutosEspeciais(db) {
  return new Promise((resolve, reject) => {
    let processados = 0;
    let inseridos = 0;
    let jaExistentes = 0;
    
    for (const codigoProduto of CODIGOS_ESPECIAIS) {
      // Verificar se já existe
      db.get(
        'SELECT id FROM regras_produtos_especiais WHERE codigoProduto = ?',
        [codigoProduto],
        (err, row) => {
          if (err) {
            console.error(`Erro ao verificar regra para produto ${codigoProduto}:`, err);
            processados++;
            if (processados === CODIGOS_ESPECIAIS.length) {
              resolve({ inseridos, jaExistentes });
            }
            return;
          }
          
          if (row) {
            // Já existe, atualizar
            db.run(
              'UPDATE regras_produtos_especiais SET quantidadeMaximaPorCarga = ?, updatedAt = CURRENT_TIMESTAMP WHERE codigoProduto = ?',
              [1, codigoProduto],
              (err) => {
                processados++;
                if (err) {
                  console.error(`Erro ao atualizar regra para produto ${codigoProduto}:`, err);
                } else {
                  jaExistentes++;
                  console.log(`Regra atualizada para produto ${codigoProduto}: 1 unidade por carga`);
                }
                
                if (processados === CODIGOS_ESPECIAIS.length) {
                  resolve({ inseridos, jaExistentes });
                }
              }
            );
          } else {
            // Inserir nova regra
            const id = uuidv4();
            db.run(
              'INSERT INTO regras_produtos_especiais (id, codigoProduto, quantidadeMaximaPorCarga, observacoes) VALUES (?, ?, ?, ?)',
              [id, codigoProduto, 1, 'Produto especial: só pode ter 1 unidade por carga'],
              (err) => {
                processados++;
                if (err) {
                  console.error(`Erro ao inserir regra para produto ${codigoProduto}:`, err);
                } else {
                  inseridos++;
                  console.log(`Regra cadastrada para produto ${codigoProduto}: 1 unidade por carga`);
                }
                
                if (processados === CODIGOS_ESPECIAIS.length) {
                  resolve({ inseridos, jaExistentes });
                }
              }
            );
          }
        }
      );
    }
  });
}

/**
 * Importa histórico de faturamentos do arquivo CSV
 */
async function importarHistorico(arquivoCSV) {
  const db = getDatabase();
  
  try {
    console.log('════════════════════════════════════════════════════════════');
    console.log('📥 IMPORTANDO HISTÓRICO DE FATURAMENTOS');
    console.log('════════════════════════════════════════════════════════════');
    
    // Verificar se arquivo existe
    if (!fs.existsSync(arquivoCSV)) {
      console.error(`❌ Arquivo não encontrado: ${arquivoCSV}`);
      return;
    }
    
    // Ler arquivo
    console.log(`📄 Lendo arquivo: ${arquivoCSV}`);
    const conteudo = fs.readFileSync(arquivoCSV, 'utf-8');
    const linhas = conteudo.split('\n').filter(linha => linha.trim().length > 0);
    
    // Remover cabeçalho se existir
    if (linhas[0] && (linhas[0].toLowerCase().includes('número') || linhas[0].toLowerCase().includes('numero'))) {
      linhas.shift();
      console.log('📋 Cabeçalho removido');
    }
    
    console.log(`📊 Total de linhas: ${linhas.length}`);
    
    // Processar linhas
    const itens = [];
    for (let i = 0; i < linhas.length; i++) {
      const item = processarLinhaCSV(linhas[i], i + 1);
      if (item) {
        itens.push(item);
      }
    }
    
    console.log(`✅ ${itens.length} itens válidos processados`);
    
    // Cadastrar regras de produtos especiais
    console.log('────────────────────────────────────────────────────────────');
    console.log('🔧 Cadastrando regras de produtos especiais...');
    const regras = await cadastrarRegrasProdutosEspeciais(db);
    console.log(`   • ${regras.inseridos} regras inseridas`);
    console.log(`   • ${regras.jaExistentes} regras já existentes`);
    
    // Processar desmembramentos (mantém ordem do CSV)
    console.log('────────────────────────────────────────────────────────────');
    console.log(`📦 Processando ${itens.length} itens do CSV...`);
    
    const desmembramentos = processarDesmembramentos(itens);
    const totalDesmembramentos = desmembramentos.length;
    let totalInseridos = 0;
    let totalErros = 0;
    
    // Inserir desmembramentos no banco
    for (const desmembramento of desmembramentos) {
      
      const id = uuidv4();
      
      await new Promise((resolve) => {
        db.run(
          'INSERT INTO historico_desmembramentos_reais (id, numeroNotaFiscal, codigoProduto, descricaoProduto, unidade, quantidadeTotal, quantidadePorCarga, numeroCarga, numeroSequencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            desmembramento.numeroNotaFiscal,
            desmembramento.codigoProduto,
            desmembramento.descricaoProduto,
            desmembramento.unidade,
            desmembramento.quantidadeTotal,
            desmembramento.quantidadePorCarga,
            desmembramento.numeroCarga,
            desmembramento.numeroSequencia
          ],
          (err) => {
            if (err) {
              console.error(`Erro ao inserir desmembramento:`, err);
              totalErros++;
            } else {
              totalInseridos++;
            }
            resolve();
          }
        );
      });
    }
    
    // Contar notas fiscais e cargas únicas
    const notasFiscaisUnicas = new Set(desmembramentos.map(d => d.numeroNotaFiscal));
    const cargasUnicas = new Set(desmembramentos.map(d => `${d.numeroNotaFiscal}-${d.numeroCarga}`));
    
    console.log(`📦 ${notasFiscaisUnicas.size} notas fiscais únicas`);
    console.log(`🚚 ${cargasUnicas.size} cargas únicas`);
    
    console.log('────────────────────────────────────────────────────────────');
    console.log('✅ IMPORTAÇÃO CONCLUÍDA');
    console.log(`   • ${totalDesmembramentos} desmembramentos processados`);
    console.log(`   • ${totalInseridos} registros inseridos`);
    if (totalErros > 0) {
      console.log(`   • ${totalErros} erros encontrados`);
    }
    
    console.log('\n💡 As regras de produtos especiais foram cadastradas automaticamente.');
    console.log('💡 Os produtos especiais (6000, 50080, 19500) agora só podem ter 1 unidade por carga.\n');
    
  } catch (error) {
    console.error('❌ Erro ao importar histórico:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const arquivoCSV = process.argv[2];
  
  if (!arquivoCSV) {
    console.error('❌ Uso: node importarHistoricoFaturamentos.js <arquivo.csv>');
    console.log('\n📝 Exemplo:');
    console.log('   node importarHistoricoFaturamentos.js historico.csv\n');
    process.exit(1);
  }
  
  (async () => {
    try {
      await importarHistorico(arquivoCSV);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  })();
}

module.exports = { importarHistorico };


