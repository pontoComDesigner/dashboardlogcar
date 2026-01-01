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
 * Sugere número de cargas baseado em histórico
 */
async function sugerirNumeroCargas(notaFiscal) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Buscar padrões similares no histórico
    const query = `
      SELECT AVG(numeroNotasCriadas) as mediaCargas, COUNT(*) as frequencia
      FROM desmembramentos_historico dh
      INNER JOIN notas_fiscais nf ON dh.notaFiscalId = nf.id
      WHERE nf.clienteCnpjCpf = ? 
        AND ABS(nf.valorTotal - ?) / ? < 0.3
      GROUP BY nf.clienteCnpjCpf
    `;
    
    db.get(query, [notaFiscal.clienteCnpjCpf, notaFiscal.valorTotal, notaFiscal.valorTotal || 1], (err, row) => {
      if (err) {
        logger.error('Erro ao buscar padrões:', err);
        // Em caso de erro, usar regra heurística padrão
        resolve(calcularNumeroCargasHeuristico(notaFiscal));
        return;
      }
      
      if (row && row.mediaCargas && row.frequencia > 0) {
        const sugerido = Math.ceil(row.mediaCargas);
        logger.info(`Padrão encontrado: ${sugerido} cargas (frequência: ${row.frequencia})`);
        resolve(sugerido);
      } else {
        // Não há histórico, usar regra heurística
        resolve(calcularNumeroCargasHeuristico(notaFiscal));
      }
    });
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
 * Distribui itens entre cargas de forma equilibrada
 */
function distribuirItensEntreCargas(itens, numeroCargas) {
  // Ordenar itens por peso (maior primeiro) para melhor distribuição
  const itensOrdenados = [...itens].sort((a, b) => {
    const pesoA = a.peso || 0;
    const pesoB = b.peso || 0;
    return pesoB - pesoA;
  });
  
  // Inicializar cargas
  const cargas = Array.from({ length: numeroCargas }, () => ({
    itens: [],
    pesoTotal: 0,
    volumeTotal: 0,
    valorTotal: 0
  }));
  
  // Distribuir itens usando algoritmo "First Fit Decreasing"
  for (const item of itensOrdenados) {
    // Encontrar a carga com menor peso total
    let cargaMenorPeso = cargas[0];
    for (const carga of cargas) {
      if (carga.pesoTotal < cargaMenorPeso.pesoTotal) {
        cargaMenorPeso = carga;
      }
    }
    
    // Adicionar item à carga
    cargaMenorPeso.itens.push({
      ...item,
      quantidade: item.quantidade // Pode ser ajustado para desmembrar item também
    });
    cargaMenorPeso.pesoTotal += item.peso || 0;
    cargaMenorPeso.volumeTotal += item.volume || 0;
    cargaMenorPeso.valorTotal += item.valorTotal || 0;
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
          
          // Distribuir itens
          const cargasDistribuidas = distribuirItensEntreCargas(itens, numeroCargas);
          
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

