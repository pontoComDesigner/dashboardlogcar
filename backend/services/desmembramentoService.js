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
 * Sugere número de cargas baseado em histórico e produtos da NF
 * 
 * Agora integrado com ML Service (com fallback para regras fixas)
 */
async function sugerirNumeroCargas(notaFiscal, itens = null) {
  const db = getDatabase();
  
  return new Promise(async (resolve, reject) => {
    try {
      // Tentar usar ML primeiro (se disponível)
      try {
        const mlService = require('./mlService');
        const predicao = await mlService.fazerPredicao(notaFiscal, itens || []);
        
        // Se ML retornou sugestão e confiança >= 0.6, usar ML
        if (predicao.numeroCargasSugerido !== null && predicao.confianca >= 0.6) {
          logger.info(`Número de cargas sugerido por ML: ${predicao.numeroCargasSugerido} (confiança: ${predicao.confianca})`);
          resolve(predicao.numeroCargasSugerido);
          return;
        }
        
        logger.info(`ML retornou baixa confiança (${predicao.confianca}), usando fallback (regras fixas)`);
      } catch (mlError) {
        logger.warn('Erro ao usar ML Service, usando fallback (regras fixas):', mlError.message);
      }
      
      // Fallback: Se temos itens, calcular baseado em produtos especiais e histórico
      if (itens && itens.length > 0) {
        const numeroCargasCalculado = await calcularNumeroCargasPorProdutosEspeciais(itens);
        logger.info(`Número de cargas calculado baseado em produtos (fallback): ${numeroCargasCalculado}`);
        resolve(numeroCargasCalculado);
        return;
      }
      
      // Se não temos itens, buscar da nota fiscal
      db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaFiscal.id], async (err, itensNF) => {
        if (err) {
          logger.error('Erro ao buscar itens da nota fiscal:', err);
          resolve(calcularNumeroCargasHeuristico(notaFiscal));
          return;
        }
        
        if (itensNF && itensNF.length > 0) {
          const numeroCargasCalculado = await calcularNumeroCargasPorProdutosEspeciais(itensNF);
          logger.info(`Número de cargas calculado baseado em produtos: ${numeroCargasCalculado}`);
          resolve(numeroCargasCalculado);
          return;
        }
        
        // Se não há itens, usar regra heurística
        resolve(calcularNumeroCargasHeuristico(notaFiscal));
      });
    } catch (error) {
      logger.error('Erro ao sugerir número de cargas:', error);
      resolve(calcularNumeroCargasHeuristico(notaFiscal));
    }
  });
}

/**
 * Calcula número de cargas usando regras heurísticas
 */
function calcularNumeroCargasHeuristico(notaFiscal) {
  const peso = notaFiscal.pesoTotal || 0;
  const volume = notaFiscal.volumeTotal || 0;
  const valor = notaFiscal.valorTotal || 0;
  
  // Capacidade média de um caminhão (pode ser configurável)
  const PESO_MAX_CAMINHAO = 25000; // 25 toneladas
  const VOLUME_MAX_CAMINHAO = 80; // 80 m³ (aproximado)
  const VALOR_MAX_CAMINHAO = 500000; // R$ 500.000
  
  let cargasPorPeso = peso > 0 ? Math.ceil(peso / PESO_MAX_CAMINHAO) : 1;
  let cargasPorVolume = volume > 0 ? Math.ceil(volume / VOLUME_MAX_CAMINHAO) : 1;
  let cargasPorValor = valor > 0 ? Math.ceil(valor / VALOR_MAX_CAMINHAO) : 1;
  
  // Pega o maior número (mais restritivo)
  const sugerido = Math.max(cargasPorPeso, cargasPorVolume, cargasPorValor, 1);
  
  logger.info(`Heurística: ${sugerido} cargas (peso: ${cargasPorPeso}, volume: ${cargasPorVolume}, valor: ${cargasPorValor})`);
  
  return sugerido;
}

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
    
    // Buscar no histórico como esse produto foi desmembrado anteriormente
    // Procurar por padrões similares (mesma quantidade ou quantidade próxima)
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
        logger.info(`Padrão histórico encontrado para produto ${codigoProduto}: ${row.quantidadeTotal} unidades foram divididas em ${row.quantidadePorCarga} por carga`);
        return resolve({
          quantidadePorCarga: row.quantidadePorCarga,
          quantidadeTotalHistorico: row.quantidadeTotal,
          frequencia: row.frequencia
        });
      }
      
      // Se não encontrou padrão similar, buscar qualquer padrão desse produto
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
        
        logger.info(`Padrão histórico médio encontrado para produto ${codigoProduto}: média de ${Math.round(row.mediaQuantidadePorCarga)} unidades por carga`);
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
      // Produto especial: cada unidade precisa de uma carga separada
      numeroCargasEspeciais += quantidadeItem;
      logger.info(`Produto especial ${codigo}: ${quantidadeItem} unidades requer ${quantidadeItem} cargas (1 unidade por carga)`);
    } else {
      // Produto normal: consultar histórico de faturamento
      const padraoHistorico = await buscarPadraoHistoricoProdutoNormal(codigo, quantidadeItem);
      
      if (padraoHistorico && padraoHistorico.quantidadePorCarga > 0) {
        const cargasNecessarias = Math.ceil(quantidadeItem / padraoHistorico.quantidadePorCarga);
        numeroCargasNormais += cargasNecessarias;
      } else {
        numeroCargasNormais += 1;
      }
    }
  }
  
  const numeroCargasNecessario = numeroCargasEspeciais + numeroCargasNormais;
  return Math.max(numeroCargasNecessario, 1);
}

/**
 * Distribui itens entre cargas de forma equilibrada
 */
async function distribuirItensEntreCargas(itens, numeroCargas) {
  const codigosProdutos = itens.map(item => item.codigoProduto || item.codigoInterno).filter(Boolean);
  const regras = await buscarRegrasProdutosEspeciais(codigosProdutos);
  
  const numeroCargasMinimo = await calcularNumeroCargasPorProdutosEspeciais(itens);
  const numeroCargasFinal = Math.max(numeroCargas, numeroCargasMinimo);
  
  const cargas = Array.from({ length: numeroCargasFinal }, () => ({
    itens: [],
    pesoTotal: 0,
    volumeTotal: 0,
    valorTotal: 0
  }));
  
  let proximaCarga = 0;
  
  const itensOrdenados = [...itens].sort((a, b) => {
    const codigoA = a.codigoProduto || a.codigoInterno;
    const codigoB = b.codigoProduto || b.codigoInterno;
    const regraA = codigoA && regras[codigoA] ? regras[codigoA] : null;
    const regraB = codigoB && regras[codigoB] ? regras[codigoB] : null;
    if (regraA && !regraB) return -1;
    if (!regraA && regraB) return 1;
    return (b.peso || 0) - (a.peso || 0);
  });

  for (const item of itensOrdenados) {
    const codigo = item.codigoProduto || item.codigoInterno;
    const quantidadeMaxima = codigo && regras[codigo] ? regras[codigo] : null;
    const quantidadeItem = item.quantidade || 1;
    
    if (quantidadeMaxima !== null && quantidadeMaxima > 0) {
      for (let i = 0; i < quantidadeItem; i++) {
        if (proximaCarga >= numeroCargasFinal) proximaCarga = 0;
        
        const pesoUnit = (item.peso || 0) / quantidadeItem;
        const volUnit = (item.volume || 0) / quantidadeItem;
        const valorUnit = (item.valorTotal || 0) / quantidadeItem;
        
        cargas[proximaCarga].itens.push({
          ...item,
          quantidade: 1,
          peso: pesoUnit,
          volume: volUnit,
          valorTotal: valorUnit
        });
        cargas[proximaCarga].pesoTotal += pesoUnit;
        cargas[proximaCarga].volumeTotal += volUnit;
        cargas[proximaCarga].valorTotal += valorUnit;
        proximaCarga++;
      }
    } else {
      if (proximaCarga >= numeroCargasFinal) proximaCarga = 0;
      cargas[proximaCarga].itens.push(item);
      cargas[proximaCarga].pesoTotal += item.peso || 0;
      cargas[proximaCarga].volumeTotal += item.volume || 0;
      cargas[proximaCarga].valorTotal += item.valorTotal || 0;
      proximaCarga++;
    }
  }
  
  return cargas;
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
          
          if (!numeroCargas) numeroCargas = await sugerirNumeroCargas(nota, itens);
          
          const cargasDistribuidas = await distribuirItensEntreCargas(itens, numeroCargas);
          const cargasCriadas = [];
          const numeroBase = nota.numeroNota;
          
          for (let i = 0; i < cargasDistribuidas.length; i++) {
            const cargaDist = cargasDistribuidas[i];
            const cargaId = uuidv4();
            const numeroCarga = `${numeroBase}-C${String(i + 1).padStart(2, '0')}`;
            
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
                  INSERT INTO carga_itens 
                  (id, cargaId, notaFiscalItemId, quantidade, valorTotal, peso, volume, ordem)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [uuidv4(), cargaId, item.id, item.quantidade, item.valorTotal, item.peso, item.volume, 0], 
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
          const numeroBase = nota.numeroNota;
          
          for (let i = 0; i < distribuicaoCargas.length; i++) {
            const dist = distribuicaoCargas[i];
            const cargaId = uuidv4();
            const numeroCarga = `${numeroBase}-C${String(i + 1).padStart(2, '0')}`;
            
            let pTotal = 0, vTotal = 0, valTotal = 0;
            
            await new Promise((res, rej) => {
              db.run(`INSERT INTO cargas (id, numeroCarga, notaFiscalId, numeroNota, clienteNome, status, createdBy)
                      VALUES (?, ?, ?, ?, ?, 'CRIADA', ?)`,
              [cargaId, numeroCarga, notaFiscalId, nota.numeroNota, nota.clienteNome, userId], 
              (err) => err ? rej(err) : res());
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
                [uuidv4(), cargaId, itemDist.idItem, itemDist.quantidade, vItem, pItem, volItem],
                (err) => err ? rej(err) : res());
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
