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
 * Agrupa itens por nota fiscal e calcula desmembramentos
 */
function agruparPorNotaFiscal(itens) {
  const notasFiscais = {};
  
  for (const item of itens) {
    if (!notasFiscais[item.numeroNotaFiscal]) {
      notasFiscais[item.numeroNotaFiscal] = [];
    }
    notasFiscais[item.numeroNotaFiscal].push(item);
  }
  
  return notasFiscais;
}

/**
 * Processa desmembramentos de uma nota fiscal
 * Identifica quantas cargas foram necessárias e como os itens foram distribuídos
 */
function processarDesmembramentos(itensNota) {
  const desmembramentos = [];
  let numeroCarga = 1;
  let sequenciaItem = 1;
  
  // Agrupar por código de produto
  const itensPorCodigo = {};
  for (const item of itensNota) {
    if (!itensPorCodigo[item.codigoProduto]) {
      itensPorCodigo[item.codigoProduto] = {
        codigoProduto: item.codigoProduto,
        descricaoProduto: item.descricaoProduto,
        unidade: item.unidade,
        quantidadeTotal: 0,
        itens: []
      };
    }
    itensPorCodigo[item.codigoProduto].quantidadeTotal += item.quantidade;
    itensPorCodigo[item.codigoProduto].itens.push(item);
  }
  
  // Processar cada código de produto
  for (const codigoProduto of Object.keys(itensPorCodigo)) {
    const produto = itensPorCodigo[codigoProduto];
    const isEspecial = CODIGOS_ESPECIAIS.includes(codigoProduto);
    const quantidadeMaximaPorCarga = isEspecial ? 1 : null;
    
    let quantidadeRestante = produto.quantidadeTotal;
    let cargaAtual = numeroCarga;
    
    // Se for produto especial, cada unidade vai para uma carga diferente
    if (isEspecial && quantidadeMaximaPorCarga === 1) {
      for (let i = 0; i < produto.quantidadeTotal; i++) {
        desmembramentos.push({
          numeroNotaFiscal: itensNota[0].numeroNotaFiscal,
          codigoProduto: codigoProduto,
          descricaoProduto: produto.descricaoProduto,
          unidade: produto.unidade,
          quantidadeTotal: produto.quantidadeTotal,
          quantidadePorCarga: 1,
          numeroCarga: cargaAtual + i,
          numeroSequencia: sequenciaItem++
        });
      }
      
      // Atualizar número máximo de cargas necessárias
      if (cargaAtual + produto.quantidadeTotal - 1 > numeroCarga) {
        numeroCarga = cargaAtual + produto.quantidadeTotal;
      }
    } else {
      // Produto normal: pode ir tudo na mesma carga (ou distribuído)
      // Por padrão, colocamos tudo na primeira carga
      desmembramentos.push({
        numeroNotaFiscal: itensNota[0].numeroNotaFiscal,
        codigoProduto: codigoProduto,
        descricaoProduto: produto.descricaoProduto,
        unidade: produto.unidade,
        quantidadeTotal: produto.quantidadeTotal,
        quantidadePorCarga: produto.quantidadeTotal,
        numeroCarga: cargaAtual,
        numeroSequencia: sequenciaItem++
      });
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
    
    // Agrupar por nota fiscal
    const notasFiscais = agruparPorNotaFiscal(itens);
    console.log('────────────────────────────────────────────────────────────');
    console.log(`📦 ${Object.keys(notasFiscais).length} notas fiscais encontradas`);
    
    // Processar cada nota fiscal
    let totalDesmembramentos = 0;
    let totalInseridos = 0;
    let totalErros = 0;
    
    for (const numeroNotaFiscal of Object.keys(notasFiscais)) {
      const itensNota = notasFiscais[numeroNotaFiscal];
      const desmembramentos = processarDesmembramentos(itensNota);
      totalDesmembramentos += desmembramentos.length;
      
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
    }
    
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

