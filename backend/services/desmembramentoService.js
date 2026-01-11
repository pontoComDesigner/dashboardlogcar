/**
 * Serviço de Desmembramento Inteligente
 * 
 * Lógica para desmembrar notas fiscais em múltiplas cargas
 * baseado em histórico e regras heurísticas
 */

const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

/**
 * Busca regras de produtos especiais
 */
async function buscarRegrasProdutosEspeciais(codigosProdutos) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    if (!codigosProdutos || codigosProdutos.length === 0) {
      return resolve({});
    }
    
    const placeholders = codigosProdutos.map(() => '?').join(',');
    const query = `
      SELECT codigoProduto, quantidadeMaximaPorCarga 
      FROM regras_produtos_especiais 
      WHERE codigoProduto IN (${placeholders})
    `;
    
    db.all(query, codigosProdutos, (err, rows) => {
      if (err) {
        logger.error('Erro ao buscar regras de produtos especiais:', err);
        return resolve({});
      }
      
      const regras = {};
      rows.forEach(row => {
        regras[row.codigoProduto] = row.quantidadeMaximaPorCarga || 1;
      });
      
      resolve(regras);
    });
  });
}

/**
 * Busca padrão de desmembramento no histórico para um produto normal
 */
async function buscarPadraoHistoricoProdutoNormal(codigoProduto, quantidade) {
  const db = getDatabase();
  
  return new Promise((resolve) => {
    if (!codigoProduto || !quantidade || quantidade <= 0) {
      return resolve(null);
    }
    
    const query = `
      SELECT 
        numeroNotaFiscal,
        quantidadeTotal,
        quantidadePorCarga,
        numeroCarga,
        COUNT(*) as frequencia
      FROM historico_desmembramentos_reais
      WHERE codigoProduto = ?
        AND quantidadeTotal >= ? * 0.5
        AND quantidadeTotal <= ? * 2
      GROUP BY quantidadeTotal, quantidadePorCarga
      ORDER BY ABS(quantidadeTotal - ?) ASC, frequencia DESC
      LIMIT 1
    `;
    
    db.get(query, [codigoProduto, quantidade, quantidade, quantidade], (err, row) => {
      if (err) {
        logger.error(`Erro ao buscar padrão histórico para produto ${codigoProduto}:`, err);
        return resolve(null);
      }
      
      if (row) {
        return resolve({
          quantidadePorCarga: row.quantidadePorCarga,
          quantidadeTotalHistorico: row.quantidadeTotal,
          frequencia: row.frequencia
        });
      }
      
      db.get(`
        SELECT 
          AVG(quantidadePorCarga) as mediaQuantidadePorCarga,
          MAX(quantidadePorCarga) as maxQuantidadePorCarga,
          COUNT(*) as frequencia
        FROM historico_desmembramentos_reais
        WHERE codigoProduto = ?
      `, [codigoProduto], (err, row) => {
        if (err || !row || !row.mediaQuantidadePorCarga) {
          return resolve(null);
        }
        
        return resolve({
          quantidadePorCarga: Math.round(row.mediaQuantidadePorCarga),
          quantidadeTotalHistorico: null,
          frequencia: row.frequencia
        });
      });
    });
  });
}

/**
 * Calcula número de cargas necessário baseado em produtos especiais e normais
 */
async function calcularNumeroCargasPorProdutosEspeciais(itens) {
  const codigosProdutos = itens.map(item => item.codigoProduto || item.codigoInterno).filter(Boolean);
  const regras = await buscarRegrasProdutosEspeciais(codigosProdutos);
  
  let numeroCargasEspeciais = 0;
  let numeroCargasNormais = 0;
  
  for (const item of itens) {
    const codigo = item.codigoProduto || item.codigoInterno;
    if (!codigo) continue;
    
    const quantidadeMaxima = regras[codigo] || null;
    const quantidadeItem = item.quantidade || 1;
    
    if (quantidadeMaxima !== null && quantidadeMaxima > 0) {
      numeroCargasEspeciais += quantidadeItem;
    } else {
      const padraoHistorico = await buscarPadraoHistoricoProdutoNormal(codigo, quantidadeItem);
      
      if (padraoHistorico && padraoHistorico.quantidadePorCarga > 0) {
        const cargasNecessarias = Math.ceil(quantidadeItem / padraoHistorico.quantidadePorCarga);
        numeroCargasNormais += cargasNecessarias;
      } else {
        numeroCargasNormais += 1;
      }
    }
  }
  
  return Math.max(numeroCargasEspeciais + numeroCargasNormais, 1);
}

/**
 * Calcula número de cargas usando regras heurísticas
 */
function calcularNumeroCargasHeuristico(notaFiscal) {
  const peso = notaFiscal.pesoTotal || 0;
  const volume = notaFiscal.volumeTotal || 0;
  const valor = notaFiscal.valorTotal || 0;
  
  const PESO_MAX_CAMINHAO = 25000;
  const VOLUME_MAX_CAMINHAO = 80;
  const VALOR_MAX_CAMINHAO = 500000;
  
  let cargasPorPeso = peso > 0 ? Math.ceil(peso / PESO_MAX_CAMINHAO) : 1;
  let cargasPorVolume = volume > 0 ? Math.ceil(volume / VOLUME_MAX_CAMINHAO) : 1;
  let cargasPorValor = valor > 0 ? Math.ceil(valor / VALOR_MAX_CAMINHAO) : 1;
  
  return Math.max(cargasPorPeso, cargasPorVolume, cargasPorValor, 1);
}

/**
 * Sugere número de cargas baseado em kits identificados no histórico
 */
async function sugerirNumeroCargas(notaFiscal, itens = null) {
  try {
    if (!itens || itens.length === 0) {
      const db = getDatabase();
      itens = await new Promise((resolve) => {
        db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaFiscal.id], (err, rows) => {
          resolve(rows || []);
        });
      });
    }

    if (itens.length > 0) {
      const cargasSugeridas = await distribuirItensEntreCargas(itens, 0);
      return cargasSugeridas.length;
    }
    
    return calcularNumeroCargasHeuristico(notaFiscal);
  } catch (error) {
    logger.error('Erro ao sugerir cargas:', error);
    return calcularNumeroCargasHeuristico(notaFiscal);
  }
}

/**
 * Busca agrupamentos históricos (conjuntos de produtos que viajam juntos)
 */
async function buscarKitsHistoricos() {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    const query = `
      SELECT numeroNotaFiscal, numeroCarga, 
             GROUP_CONCAT(codigoProduto || ':' || quantidadePorCarga, ',') as kit
      FROM historico_desmembramentos_reais
      GROUP BY numeroNotaFiscal, numeroCarga
    `;
    db.all(query, [], (err, rows) => {
      if (err) return resolve([]);
      const kits = rows.map(r => r.kit.split(',').sort().join('|'));
      // Contar frequência de cada kit
      const frequencia = kits.reduce((acc, kit) => {
        acc[kit] = (acc[kit] || 0) + 1;
        return acc;
      }, {});
      resolve(frequencia);
    });
  });
}

/**
 * Distribui itens entre cargas baseando-se em padrões de kits históricos
 */
async function distribuirItensEntreCargas(itens, numeroCargas) {
  const kitsHistoricos = await buscarKitsHistoricos();
  const sortedKits = Object.entries(kitsHistoricos).sort((a, b) => b[1] - a[1]);

  let itensRestantes = itens.map(i => ({ ...i, qtdAtual: i.quantidade }));
  const cargasSugeridas = [];

  // 1. Tentar encontrar Kits exatos do histórico nos itens atuais
  for (const [kitStr, freq] of sortedKits) {
    const kitItens = kitStr.split('|').map(k => {
      const [cod, qtd] = k.split(':');
      return { codigo: cod, quantidade: parseFloat(qtd) };
    });

    // Tentar aplicar este kit enquanto houver itens suficientes
    let podeAplicar = true;
    while (podeAplicar) {
      const novaCarga = { itens: [], pesoTotal: 0, volumeTotal: 0, valorTotal: 0 };
      let itensParaRemover = [];

      for (const kitItem of kitItens) {
        const itemNaNota = itensRestantes.find(i => 
          (i.codigoProduto === kitItem.codigo || i.codigoInterno === kitItem.codigo) && 
          i.qtdAtual >= kitItem.quantidade
        );

        if (itemNaNota) {
          itensParaRemover.push({ item: itemNaNota, qtd: kitItem.quantidade });
        } else {
          podeAplicar = false;
          break;
        }
      }

      if (podeAplicar && itensParaRemover.length > 0) {
        itensParaRemover.forEach(({ item, qtd }) => {
          const proporcao = qtd / item.quantidade;
          novaCarga.itens.push({ ...item, quantidade: qtd, valorTotal: item.valorTotal * proporcao });
          novaCarga.pesoTotal += (item.peso || 0) * proporcao;
          novaCarga.volumeTotal += (item.volume || 0) * proporcao;
          novaCarga.valorTotal += (item.valorTotal || 0) * proporcao;
          item.qtdAtual -= qtd;
        });
        cargasSugeridas.push(novaCarga);
      }
    }
  }

  // 2. Itens que não entraram em kits (ou sobraram) vão para uma carga residual ou distribuídos
  const residual = itensRestantes.filter(i => i.qtdAtual > 0);
  if (residual.length > 0) {
    const cargaResidual = { itens: [], pesoTotal: 0, volumeTotal: 0, valorTotal: 0 };
    residual.forEach(item => {
      const proporcao = item.qtdAtual / item.quantidade;
      cargaResidual.itens.push({ ...item, quantidade: item.qtdAtual, valorTotal: item.valorTotal * proporcao });
      cargaResidual.pesoTotal += (item.peso || 0) * proporcao;
      cargaResidual.volumeTotal += (item.volume || 0) * proporcao;
      cargaResidual.valorTotal += (item.valorTotal || 0) * proporcao;
    });
    cargasSugeridas.push(cargaResidual);
  }

  return cargasSugeridas;
}

/**
 * Valida se o desmembramento está correto
 */
async function validarDesmembramento(notaFiscalId) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT COALESCE(SUM(valorTotal), 0) as valorTotal
      FROM nota_fiscal_itens WHERE notaFiscalId = ?
    `, [notaFiscalId], (err, notaTotais) => {
      if (err) return reject(err);
      
      db.get(`
        SELECT COALESCE(SUM(valorTotal), 0) as valorTotal, COUNT(DISTINCT id) as quantidadeCargas
        FROM cargas WHERE notaFiscalId = ?
      `, [notaFiscalId], (err, cargasTotais) => {
        if (err) return reject(err);
        
        const valorDivergencia = Math.abs(notaTotais.valorTotal - cargasTotais.valorTotal);
        const porcentagemDivergencia = notaTotais.valorTotal > 0 ? (valorDivergencia / notaTotais.valorTotal) * 100 : 0;
        
        resolve({
          valido: porcentagemDivergencia < 0.01,
          valorDivergencia,
          porcentagemDivergencia,
          notaFiscal: notaTotais,
          cargas: cargasTotais
        });
      });
    });
  });
}

/**
 * Desmembra uma nota fiscal em múltiplas cargas
 */
async function desmembrarNotaFiscal(notaFiscalId, numeroCargas, userId, metodo = 'AUTOMATICO') {
  const db = getDatabase();
  
  return new Promise(async (resolve, reject) => {
    try {
      db.get('SELECT * FROM notas_fiscais WHERE id = ?', [notaFiscalId], async (err, nota) => {
        if (err || !nota) return reject(new Error('Nota fiscal não encontrada'));
        
        db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaFiscalId], async (err, itens) => {
          if (err) return reject(err);
          
          const numCargas = numeroCargas || await sugerirNumeroCargas(nota, itens);
          const cargasDistribuidas = await distribuirItensEntreCargas(itens, numCargas);
          const cargasCriadas = [];
          
          for (let i = 0; i < cargasDistribuidas.length; i++) {
            const cargaDist = cargasDistribuidas[i];
            const cargaId = uuidv4();
            const numeroCarga = `${nota.numeroNota}-C${String(i + 1).padStart(2, '0')}`;
            
            await new Promise((res, rej) => {
              db.run(`
                INSERT INTO cargas 
                (id, numeroCarga, notaFiscalId, numeroNota, numeroPedido, 
                 clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, 
                 clienteEstado, clienteCep, dataVencimento, observacoesNF,
                 pesoTotal, volumeTotal, valorTotal, status, createdBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CRIADA', ?)
              `, [
                cargaId, numeroCarga, notaFiscalId, nota.numeroNota, nota.numeroPedido,
                nota.clienteNome, nota.clienteCnpjCpf, nota.clienteEndereco, nota.clienteCidade,
                nota.clienteEstado, nota.clienteCep, nota.dataVencimento, nota.observacoes,
                cargaDist.pesoTotal, cargaDist.volumeTotal, cargaDist.valorTotal, userId
              ], (err) => err ? rej(err) : res());
            });
            
            for (const item of cargaDist.itens) {
              await new Promise((res, rej) => {
                db.run(`
                  INSERT INTO carga_itens (id, cargaId, notaFiscalItemId, quantidade, valorTotal, peso, volume)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [uuidv4(), cargaId, item.id, item.quantidade, item.valorTotal, item.peso, item.volume], 
                (err) => err ? rej(err) : res());
              });
            }
            cargasCriadas.push({ id: cargaId, numeroCarga });
          }
          
          db.run('UPDATE notas_fiscais SET status = ? WHERE id = ?', ['DESMEMBRADA', notaFiscalId]);
          resolve(cargasCriadas);
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Desmembra uma nota fiscal manualmente
 */
async function desmembrarNotaFiscalManual(notaFiscalId, distribuicaoCargas, userId) {
  const db = getDatabase();
  
  return new Promise(async (resolve, reject) => {
    try {
      db.get('SELECT * FROM notas_fiscais WHERE id = ?', [notaFiscalId], async (err, nota) => {
        if (err || !nota) return reject(new Error('Nota fiscal não encontrada'));
        
        db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaFiscalId], async (err, itens) => {
          if (err) return reject(err);
          
          const cargasCriadas = [];
          for (let i = 0; i < distribuicaoCargas.length; i++) {
            const dist = distribuicaoCargas[i];
            const cargaId = uuidv4();
            const numeroCarga = `${nota.numeroNota}-C${String(i + 1).padStart(2, '0')}`;
            let pTotal = 0, vTotal = 0, valTotal = 0;
            
            await new Promise((res, rej) => {
              db.run(`INSERT INTO cargas (id, numeroCarga, notaFiscalId, numeroNota, clienteNome, status, createdBy)
                      VALUES (?, ?, ?, ?, ?, 'CRIADA', ?)`,
              [cargaId, numeroCarga, notaFiscalId, nota.numeroNota, nota.clienteNome, userId], (err) => err ? rej(err) : res());
            });
            
            for (const itemDist of dist.itens) {
              const itemOrig = itens.find(it => it.id === itemDist.idItem);
              if (!itemOrig) continue;
              const vItem = itemOrig.valorUnitario * itemDist.quantidade;
              const pItem = (itemOrig.peso || 0) * (itemDist.quantidade / itemOrig.quantidade);
              const volItem = (itemOrig.volume || 0) * (itemDist.quantidade / itemOrig.quantidade);
              pTotal += pItem; vTotal += volItem; valTotal += vItem;
              
              await new Promise((res, rej) => {
                db.run(`INSERT INTO carga_itens (id, cargaId, notaFiscalItemId, quantidade, valorTotal, peso, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), cargaId, itemDist.idItem, itemDist.quantidade, vItem, pItem, volItem], (err) => err ? rej(err) : res());
              });
            }
            
            await new Promise((res, rej) => {
              db.run(`UPDATE cargas SET pesoTotal = ?, volumeTotal = ?, valorTotal = ? WHERE id = ?`,
              [pTotal, vTotal, valTotal, cargaId], (err) => err ? rej(err) : res());
            });
            cargasCriadas.push({ id: cargaId, numeroCarga });
          }
          
          db.run('UPDATE notas_fiscais SET status = ? WHERE id = ?', ['DESMEMBRADA', notaFiscalId]);
          resolve(cargasCriadas);
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  sugerirNumeroCargas,
  calcularNumeroCargasHeuristico,
  distribuirItensEntreCargas,
  desmembrarNotaFiscal,
  desmembrarNotaFiscalManual,
  validarDesmembramento
};
