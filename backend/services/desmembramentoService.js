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
 * 
 * REGRA:
 * - Produtos especiais: Cada unidade vai para uma carga separada (1 unidade por carga)
 * - Produtos normais: Consulta histórico de faturamento para ver como foram desmembrados anteriormente
 *   Se não houver histórico, vai sozinho em uma carga (toda a quantidade em uma carga)
 * 
 * Exemplo:
 * - 5 unidades do código 6000 (especial) → 5 cargas
 * - 2 unidades do código 50080 (especial) → 2 cargas  
 * - 5 unidades do código 19500 (especial) → 5 cargas
 * - 25 unidades do código 9675 (normal) → consulta histórico
 *   Se histórico indicar 5 unidades por carga → 5 cargas (25 / 5 = 5 cargas)
 *   Se não houver histórico → 1 carga (toda quantidade junto)
 * Total: varia conforme histórico
 */
async function calcularNumeroCargasPorProdutosEspeciais(itens) {
  const codigosProdutos = itens.map(item => item.codigoProduto || item.codigoInterno).filter(Boolean);
  const regras = await buscarRegrasProdutosEspeciais(codigosProdutos);
  
  let numeroCargasEspeciais = 0;
  let numeroCargasNormais = 0;
  let totalProdutosEspeciais = 0;
  let totalProdutosNormais = 0;
  
  for (const item of itens) {
    const codigo = item.codigoProduto || item.codigoInterno;
    if (!codigo) continue;
    
    const quantidadeMaxima = regras[codigo] || null;
    const quantidadeItem = item.quantidade || 1;
    
    if (quantidadeMaxima !== null && quantidadeMaxima > 0) {
      // Produto especial: cada unidade precisa de uma carga separada
      numeroCargasEspeciais += quantidadeItem;
      totalProdutosEspeciais += quantidadeItem;
      logger.info(`Produto especial ${codigo}: ${quantidadeItem} unidades requer ${quantidadeItem} cargas (1 unidade por carga)`);
    } else {
      // Produto normal: consultar histórico de faturamento
      const padraoHistorico = await buscarPadraoHistoricoProdutoNormal(codigo, quantidadeItem);
      
      if (padraoHistorico && padraoHistorico.quantidadePorCarga > 0) {
        // Usar padrão do histórico
        const cargasNecessarias = Math.ceil(quantidadeItem / padraoHistorico.quantidadePorCarga);
        numeroCargasNormais += cargasNecessarias;
        totalProdutosNormais += quantidadeItem;
        logger.info(`Produto normal ${codigo}: ${quantidadeItem} unidades requer ${cargasNecessarias} cargas (baseado no histórico: ${padraoHistorico.quantidadePorCarga} unidades por carga, frequência: ${padraoHistorico.frequencia})`);
      } else {
        // Sem histórico: toda a quantidade vai em uma carga separada
        numeroCargasNormais += 1;
        totalProdutosNormais += quantidadeItem;
        logger.info(`Produto normal ${codigo}: ${quantidadeItem} unidades requer 1 carga (sem histórico encontrado, toda quantidade junto)`);
      }
    }
  }
  
  const numeroCargasNecessario = numeroCargasEspeciais + numeroCargasNormais;
  
  // Se não houver produtos, retornar 1 (mínimo)
  if (numeroCargasNecessario === 0) {
    return 1;
  }
  
  logger.info(`Total de cargas necessárias: ${numeroCargasNecessario} (${numeroCargasEspeciais} para produtos especiais, ${numeroCargasNormais} para produtos normais)`);
  
  return numeroCargasNecessario;
}

/**
 * Distribui itens entre cargas de forma equilibrada
 * Agora considera regras de produtos especiais
 */
async function distribuirItensEntreCargas(itens, numeroCargas) {
  // Buscar regras de produtos especiais
  const codigosProdutos = itens.map(item => item.codigoProduto || item.codigoInterno).filter(Boolean);
  const regras = await buscarRegrasProdutosEspeciais(codigosProdutos);
  
  // Calcular número mínimo de cargas necessário por produtos especiais
  const numeroCargasMinimo = await calcularNumeroCargasPorProdutosEspeciais(itens);
  const numeroCargasFinal = Math.max(numeroCargas, numeroCargasMinimo);
  
  if (numeroCargasFinal > numeroCargas) {
    logger.info(`Ajustando número de cargas de ${numeroCargas} para ${numeroCargasFinal} devido a produtos especiais`);
  }
  
  // Ordenar itens por prioridade:
  // 1. Produtos especiais primeiro (para garantir distribuição correta)
  // 2. Depois por peso (maior primeiro)
  const itensOrdenados = [...itens].sort((a, b) => {
    const codigoA = a.codigoProduto || a.codigoInterno;
    const codigoB = b.codigoProduto || b.codigoInterno;
    const regraA = codigoA && regras[codigoA] ? regras[codigoA] : null;
    const regraB = codigoB && regras[codigoB] ? regras[codigoB] : null;
    
    // Produtos especiais primeiro
    if (regraA && !regraB) return -1;
    if (!regraA && regraB) return 1;
    
    // Dentro de produtos especiais ou normais, ordenar por peso
    const pesoA = a.peso || 0;
    const pesoB = b.peso || 0;
    return pesoB - pesoA;
  });
  
  // Inicializar cargas
  const cargas = Array.from({ length: numeroCargasFinal }, () => ({
    itens: [],
    pesoTotal: 0,
    volumeTotal: 0,
    valorTotal: 0
  }));
  
  // Contador para rastrear em qual carga vamos colocar o próximo item
  // Primeiro vão os produtos especiais, depois os normais
  let proximaCarga = 0;
  
  // Separar itens em especiais e normais
  const itensEspeciais = [];
  const itensNormais = [];
  
  for (const item of itensOrdenados) {
    const codigo = item.codigoProduto || item.codigoInterno;
    const quantidadeMaxima = codigo && regras[codigo] ? regras[codigo] : null;
    
    if (quantidadeMaxima !== null && quantidadeMaxima > 0) {
      itensEspeciais.push(item);
    } else {
      itensNormais.push(item);
    }
  }
  
  // Primeiro: distribuir produtos especiais (1 unidade por carga)
  for (const item of itensEspeciais) {
    const codigo = item.codigoProduto || item.codigoInterno;
    const quantidadeItem = item.quantidade || 1;
    
    // Cada unidade vai para uma carga separada
    for (let unidade = 0; unidade < quantidadeItem; unidade++) {
      if (proximaCarga >= numeroCargasFinal) {
        logger.warn(`Atenção: Não há cargas suficientes para produto especial ${codigo}. Cargas necessárias: ${quantidadeItem}, mas só temos ${numeroCargasFinal}`);
        break;
      }
      
      const cargaIndex = proximaCarga;
      const quantidadeParaEstaCarga = 1; // Sempre 1 unidade por carga para produtos especiais
      
      // Calcular valores proporcionais
      const valorUnitario = (item.valorTotal || 0) / quantidadeItem;
      const pesoUnitario = (item.peso || 0) / quantidadeItem;
      const volumeUnitario = (item.volume || 0) / quantidadeItem;
      
      cargas[cargaIndex].itens.push({
        ...item,
        quantidade: quantidadeParaEstaCarga,
        quantidadeOriginal: quantidadeItem,
        valorTotal: valorUnitario * quantidadeParaEstaCarga,
        peso: pesoUnitario * quantidadeParaEstaCarga,
        volume: volumeUnitario * quantidadeParaEstaCarga
      });
      
      cargas[cargaIndex].pesoTotal += pesoUnitario * quantidadeParaEstaCarga;
      cargas[cargaIndex].volumeTotal += volumeUnitario * quantidadeParaEstaCarga;
      cargas[cargaIndex].valorTotal += valorUnitario * quantidadeParaEstaCarga;
      
      proximaCarga++;
    }
    
    logger.info(`Produto especial ${codigo}: ${quantidadeItem} unidades distribuídas em ${quantidadeItem} cargas diferentes (1 unidade por carga)`);
  }
  
  // Segundo: distribuir produtos normais (baseado no histórico de faturamento)
  for (const item of itensNormais) {
    const codigo = item.codigoProduto || item.codigoInterno;
    const quantidadeItem = item.quantidade || 1;
    
    // Buscar padrão do histórico para este produto
    const padraoHistorico = await buscarPadraoHistoricoProdutoNormal(codigo, quantidadeItem);
    
    if (padraoHistorico && padraoHistorico.quantidadePorCarga > 0) {
      // Usar padrão do histórico: dividir conforme histórico
      const quantidadePorCarga = padraoHistorico.quantidadePorCarga;
      const cargasNecessarias = Math.ceil(quantidadeItem / quantidadePorCarga);
      
      // Calcular valores proporcionais
      const valorUnitario = (item.valorTotal || 0) / quantidadeItem;
      const pesoUnitario = (item.peso || 0) / quantidadeItem;
      const volumeUnitario = (item.volume || 0) / quantidadeItem;
      
      let quantidadeRestante = quantidadeItem;
      
      for (let i = 0; i < cargasNecessarias && proximaCarga < numeroCargasFinal; i++) {
        const quantidadeNestaCarga = Math.min(quantidadePorCarga, quantidadeRestante);
        
        cargas[proximaCarga].itens.push({
          ...item,
          quantidade: quantidadeNestaCarga,
          quantidadeOriginal: quantidadeItem,
          valorTotal: valorUnitario * quantidadeNestaCarga,
          peso: pesoUnitario * quantidadeNestaCarga,
          volume: volumeUnitario * quantidadeNestaCarga
        });
        
        cargas[proximaCarga].pesoTotal += pesoUnitario * quantidadeNestaCarga;
        cargas[proximaCarga].volumeTotal += volumeUnitario * quantidadeNestaCarga;
        cargas[proximaCarga].valorTotal += valorUnitario * quantidadeNestaCarga;
        
        quantidadeRestante -= quantidadeNestaCarga;
        proximaCarga++;
      }
      
      if (quantidadeRestante > 0) {
        logger.warn(`Atenção: ${quantidadeRestante} unidades do produto normal ${codigo} não puderam ser distribuídas`);
      }
      
      logger.info(`Produto normal ${codigo}: ${quantidadeItem} unidades distribuídas em ${cargasNecessarias} cargas (baseado no histórico: ${quantidadePorCarga} unidades por carga)`);
    } else {
      // Sem histórico: toda a quantidade vai em uma carga separada
      if (proximaCarga >= numeroCargasFinal) {
        logger.warn(`Atenção: Não há cargas suficientes para produto normal ${codigo}. Precisa de 1 carga, mas só temos ${numeroCargasFinal}`);
        break;
      }
      
      const cargaIndex = proximaCarga;
      
      // Produto normal: toda a quantidade vai em uma carga separada
      cargas[cargaIndex].itens.push({
        ...item,
        quantidade: quantidadeItem,
        quantidadeOriginal: quantidadeItem,
        valorTotal: item.valorTotal || 0,
        peso: item.peso || 0,
        volume: item.volume || 0
      });
      
      cargas[cargaIndex].pesoTotal += item.peso || 0;
      cargas[cargaIndex].volumeTotal += item.volume || 0;
      cargas[cargaIndex].valorTotal += item.valorTotal || 0;
      
      proximaCarga++;
      
      logger.info(`Produto normal ${codigo}: ${quantidadeItem} unidades em 1 carga (sem histórico encontrado, toda quantidade junto)`);
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
      // Buscar nota fiscal com itens
      db.get('SELECT * FROM notas_fiscais WHERE id = ?', [notaFiscalId], async (err, nota) => {
        if (err || !nota) {
          return reject(new Error('Nota fiscal não encontrada'));
        }
        
        // Buscar itens
        db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaFiscalId], async (err, itens) => {
          if (err) {
            return reject(err);
          }
          
          // Se não foi especificado número de cargas, sugerir
          if (!numeroCargas) {
            numeroCargas = await sugerirNumeroCargas(nota);
          }
          
          // Distribuir itens (agora async - considera produtos especiais)
          const cargasDistribuidas = await distribuirItensEntreCargas(itens, numeroCargas);
          
          // Criar cargas no banco
          const cargasCriadas = [];
          const numeroBase = nota.numeroNota;
          
          for (let i = 0; i < cargasDistribuidas.length; i++) {
            const cargaDistribuida = cargasDistribuidas[i];
            const cargaId = uuidv4();
            const numeroCarga = `${numeroBase}-C${String(i + 1).padStart(2, '0')}`;
            
            // Inserir carga com dados completos da NF
            await new Promise((res, rej) => {
              db.run(`
                INSERT INTO cargas 
                (id, numeroCarga, notaFiscalId, numeroNota, numeroPedido, 
                 clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, 
                 clienteEstado, clienteCep, dataVencimento, observacoesNF,
                 pesoTotal, volumeTotal, valorTotal, status, createdBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CRIADA', ?)
              `, [
                cargaId,
                numeroCarga,
                notaFiscalId,
                nota.numeroNota,
                nota.numeroPedido,
                nota.clienteNome,
                nota.clienteCnpjCpf,
                nota.clienteEndereco,
                nota.clienteCidade,
                nota.clienteEstado,
                nota.clienteCep,
                nota.dataVencimento,
                nota.observacoes,
                cargaDistribuida.pesoTotal,
                cargaDistribuida.volumeTotal,
                cargaDistribuida.valorTotal,
                userId
              ], function(err) {
                if (err) return rej(err);
                res();
              });
            });
            
            // Inserir itens da carga
            for (const item of cargaDistribuida.itens) {
              const cargaItemId = uuidv4();
              await new Promise((res, rej) => {
                db.run(`
                  INSERT INTO carga_itens 
                  (id, cargaId, notaFiscalItemId, quantidade, valorTotal, peso, volume, ordem)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  cargaItemId,
                  cargaId,
                  item.id,
                  item.quantidade,
                  item.valorTotal,
                  item.peso || null,
                  item.volume || null,
                  0
                ], function(err) {
                  if (err) return rej(err);
                  
                  // Atualizar quantidade desmembrada do item
                  db.run(`
                    UPDATE nota_fiscal_itens 
                    SET quantidadeDesmembrada = quantidadeDesmembrada + ?
                    WHERE id = ?
                  `, [item.quantidade, item.id], (err) => {
                    if (err) logger.error('Erro ao atualizar quantidade desmembrada:', err);
                    res();
                  });
                });
              });
            }
            
            cargasCriadas.push({
              id: cargaId,
              numeroCarga,
              pesoTotal: cargaDistribuida.pesoTotal,
              volumeTotal: cargaDistribuida.volumeTotal,
              valorTotal: cargaDistribuida.valorTotal,
              quantidadeItens: cargaDistribuida.itens.length
            });
          }
          
          // Atualizar status da nota fiscal
          db.run('UPDATE notas_fiscais SET status = ? WHERE id = ?', ['DESMEMBRADA', notaFiscalId], (err) => {
            if (err) logger.error('Erro ao atualizar status:', err);
          });
          
          // Registrar histórico
          const historicoId = uuidv4();
          db.run(`
            INSERT INTO desmembramentos_historico 
            (id, notaFiscalId, numeroNotasCriadas, metodo, createdBy)
            VALUES (?, ?, ?, ?, ?)
          `, [historicoId, notaFiscalId, numeroCargas, metodo, userId], (err) => {
            if (err) logger.error('Erro ao registrar histórico:', err);
          });
          
          resolve(cargasCriadas);
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Valida se o desmembramento está correto
 */
async function validarDesmembramento(notaFiscalId) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Buscar totais da nota fiscal
    db.get(`
      SELECT 
        COALESCE(SUM(valorTotal), 0) as valorTotal,
        COALESCE(SUM(quantidade), 0) as quantidadeTotal
      FROM nota_fiscal_itens
      WHERE notaFiscalId = ?
    `, [notaFiscalId], (err, notaTotais) => {
      if (err) return reject(err);
      
      // Buscar totais das cargas
      db.get(`
        SELECT 
          COALESCE(SUM(valorTotal), 0) as valorTotal,
          COUNT(DISTINCT id) as quantidadeCargas
        FROM cargas
        WHERE notaFiscalId = ?
      `, [notaFiscalId], (err, cargasTotais) => {
        if (err) return reject(err);
        
        // Verificar se totais batem
        const valorDivergencia = Math.abs(notaTotais.valorTotal - cargasTotais.valorTotal);
        const porcentagemDivergencia = notaTotais.valorTotal > 0 
          ? (valorDivergencia / notaTotais.valorTotal) * 100 
          : 0;
        
        const valido = porcentagemDivergencia < 0.01; // Tolerância de 0.01%
        
        resolve({
          valido,
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
 * Desmembra uma nota fiscal manualmente (com distribuição específica)
 */
async function desmembrarNotaFiscalManual(notaFiscalId, distribuicaoCargas, userId) {
  const db = getDatabase();
  
  return new Promise(async (resolve, reject) => {
    try {
      // Buscar nota fiscal
      db.get('SELECT * FROM notas_fiscais WHERE id = ?', [notaFiscalId], async (err, nota) => {
        if (err || !nota) {
          return reject(new Error('Nota fiscal não encontrada'));
        }
        
        // Buscar itens
        db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaFiscalId], async (err, itens) => {
          if (err) {
            return reject(err);
          }
          
          const cargasCriadas = [];
          const numeroBase = nota.numeroNota;
          
          // Criar cargas conforme distribuição fornecida
          for (let i = 0; i < distribuicaoCargas.length; i++) {
            const distribuicao = distribuicaoCargas[i];
            const cargaId = uuidv4();
            const numeroCarga = `${numeroBase}-C${String(i + 1).padStart(2, '0')}`;
            
            // Calcular totais da carga (será calculado durante inserção dos itens)
            let pesoTotal = 0;
            let volumeTotal = 0;
            let valorTotal = 0;
            
            // Inserir carga com dados completos da NF (totais serão atualizados depois)
            await new Promise((res, rej) => {
              db.run(`
                INSERT INTO cargas 
                (id, numeroCarga, notaFiscalId, numeroNota, numeroPedido, 
                 clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, 
                 clienteEstado, clienteCep, dataVencimento, observacoesNF,
                 pesoTotal, volumeTotal, valorTotal, status, createdBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'CRIADA', ?)
              `, [
                cargaId,
                numeroCarga,
                notaFiscalId,
                nota.numeroNota,
                nota.numeroPedido,
                nota.clienteNome,
                nota.clienteCnpjCpf,
                nota.clienteEndereco,
                nota.clienteCidade,
                nota.clienteEstado,
                nota.clienteCep,
                nota.dataVencimento,
                nota.observacoes,
                userId
              ], function(err) {
                if (err) return rej(err);
                res();
              });
            });
            
            // Inserir itens da carga
            for (const itemDist of distribuicao.itens) {
              const itemOriginal = itens.find(it => it.id === itemDist.idItem);
              if (!itemOriginal) continue;
              
              const cargaItemId = uuidv4();
              const valorTotalItem = itemOriginal.valorUnitario * itemDist.quantidade;
              const pesoItem = (itemOriginal.peso || 0) * (itemDist.quantidade / (itemOriginal.quantidade || 1));
              const volumeItem = (itemOriginal.volume || 0) * (itemDist.quantidade / (itemOriginal.quantidade || 1));
              
              // Acumular totais
              pesoTotal += pesoItem;
              volumeTotal += volumeItem;
              valorTotal += valorTotalItem;
              
              await new Promise((res, rej) => {
                db.run(`
                  INSERT INTO carga_itens 
                  (id, cargaId, notaFiscalItemId, quantidade, valorTotal, peso, volume, ordem)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  cargaItemId,
                  cargaId,
                  itemDist.idItem,
                  itemDist.quantidade,
                  valorTotalItem,
                  pesoItem,
                  volumeItem,
                  0
                ], function(err) {
                  if (err) return rej(err);
                  
                  // Atualizar quantidade desmembrada
                  db.run(`
                    UPDATE nota_fiscal_itens 
                    SET quantidadeDesmembrada = quantidadeDesmembrada + ?
                    WHERE id = ?
                  `, [itemDist.quantidade, itemDist.idItem], (err) => {
                    if (err) logger.error('Erro ao atualizar quantidade desmembrada:', err);
                    res();
                  });
                });
              });
            }
            
            // Atualizar totais da carga
            await new Promise((res, rej) => {
              db.run(`
                UPDATE cargas 
                SET pesoTotal = ?, volumeTotal = ?, valorTotal = ?
                WHERE id = ?
              `, [pesoTotal, volumeTotal, valorTotal, cargaId], (err) => {
                if (err) return rej(err);
                res();
              });
            });
            
            cargasCriadas.push({
              id: cargaId,
              numeroCarga,
              pesoTotal,
              volumeTotal,
              valorTotal,
              quantidadeItens: distribuicao.itens.length
            });
          }
          
          // Atualizar status
          db.run('UPDATE notas_fiscais SET status = ? WHERE id = ?', ['DESMEMBRADA', notaFiscalId], (err) => {
            if (err) logger.error('Erro ao atualizar status:', err);
          });
          
          // Registrar histórico
          const historicoId = uuidv4();
          db.run(`
            INSERT INTO desmembramentos_historico 
            (id, notaFiscalId, numeroNotasCriadas, metodo, createdBy)
            VALUES (?, ?, ?, ?, ?)
          `, [historicoId, notaFiscalId, distribuicaoCargas.length, 'MANUAL', userId], (err) => {
            if (err) logger.error('Erro ao registrar histórico:', err);
          });
          
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

