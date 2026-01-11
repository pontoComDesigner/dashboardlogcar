/**
 * Serviço de Machine Learning para Desmembramento
 * 
 * Gerencia modelos ML, predições e treinamentos
 */

const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const featureEngineeringService = require('./mlFeatureEngineeringService');

/**
 * Registra ação no log de auditoria ML
 */
function registrarAuditoriaML(acao, usuario, detalhes = {}) {
  const db = getDatabase();
  const id = uuidv4();
  
  db.run(
    'INSERT INTO ml_audit_log (id, acao, usuarioId, usuarioNome, detalhes) VALUES (?, ?, ?, ?, ?)',
    [
      id,
      acao,
      usuario?.id || null,
      usuario?.username || usuario?.nome || null,
      JSON.stringify(detalhes)
    ],
    (err) => {
      if (err) {
        logger.error('Erro ao registrar auditoria ML:', err);
      }
    }
  );
}

/**
 * Busca o modelo ativo mais recente
 */
function buscarModeloAtivo() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM ml_models 
       WHERE status = 'ATIVO' 
       ORDER BY trainedAt DESC 
       LIMIT 1`,
      [],
      (err, row) => {
        if (err) {
          logger.error('Erro ao buscar modelo ativo:', err);
          return reject(err);
        }
        
        if (row) {
          // Parse JSON fields
          try {
            row.parametros = row.parametros ? JSON.parse(row.parametros) : null;
            row.metricas = row.metricas ? JSON.parse(row.metricas) : null;
          } catch (e) {
            logger.warn('Erro ao fazer parse de campos JSON do modelo:', e);
          }
        }
        
        resolve(row || null);
      }
    );
  });
}

/**
 * Predição heurística
 */
function fazerPredicaoHeuristica(features) {
  let numeroCargas = 1;
  let confianca = 0.5;
  
  if (features.temProdutosEspeciais) {
    numeroCargas += features.quantidadeProdutosEspeciais || 0;
    confianca = 0.7;
  }
  
  const cargasPorPeso = features.pesoTotal > 0 ? Math.ceil(features.pesoTotal / 25000) : 0;
  const cargasPorVolume = features.volumeTotal > 0 ? Math.ceil(features.volumeTotal / 80) : 0;
  
  numeroCargas = Math.max(numeroCargas, cargasPorPeso, cargasPorVolume, 1);
  
  return {
    numeroCargasSugerido: numeroCargas,
    confianca: Math.min(0.95, confianca)
  };
}

/**
 * Faz predição usando modelo ML
 */
async function fazerPredicao(notaFiscal, itens) {
  try {
    const modelo = await buscarModeloAtivo();
    const features = await featureEngineeringService.extrairFeatures(notaFiscal, itens);
    
    if (!modelo) {
      return {
        numeroCargasSugerido: null,
        confianca: 0.5,
        modeloVersao: null,
        metodo: 'FALLBACK_REGRAS_FIXAS',
        features
      };
    }
    
    const predicao = fazerPredicaoHeuristica(features);
    const predicaoId = uuidv4();
    const db = getDatabase();
    
    db.run(
      `INSERT INTO ml_predictions 
       (id, notaFiscalId, modeloVersao, features, numeroCargasSugerido, confianca)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [predicaoId, notaFiscal.id, modelo.versao, JSON.stringify(features), predicao.numeroCargasSugerido, predicao.confianca]
    );
    
    return {
      numeroCargasSugerido: predicao.numeroCargasSugerido,
      confianca: predicao.confianca,
      modeloVersao: modelo.versao,
      metodo: 'ML',
      features,
      predicaoId
    };
  } catch (error) {
    logger.error('Erro ao fazer predição ML:', error);
    throw error;
  }
}

/**
 * Registra resultado de predição (aceito/rejeitado)
 */
function registrarResultadoPredicao(predicaoId, aceito, distribuicaoFinal, ajustadoManualmente = false) {
  const db = getDatabase();
  
  db.run(
    `UPDATE ml_predictions 
     SET aceito = ?, distribuicaoFinal = ?, ajustadoManualmente = ?
     WHERE id = ?`,
    [aceito ? 1 : 0, JSON.stringify(distribuicaoFinal), ajustadoManualmente ? 1 : 0, predicaoId]
  );
}

/**
 * Lista modelos disponíveis
 */
function listarModelos(filtroStatus = null) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM ml_models ORDER BY trainedAt DESC';
    const params = filtroStatus ? [filtroStatus] : [];
    if (filtroStatus) query = 'SELECT * FROM ml_models WHERE status = ? ORDER BY trainedAt DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []).map(row => {
        try {
          row.parametros = row.parametros ? JSON.parse(row.parametros) : null;
          row.metricas = row.metricas ? JSON.parse(row.metricas) : null;
        } catch (e) {}
        return row;
      }));
    });
  });
}

/**
 * Ativa um modelo
 */
function ativarModelo(modeloId, usuario) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.run('UPDATE ml_models SET status = ? WHERE status = ?', ['INATIVO', 'ATIVO'], (err) => {
      if (err) return reject(err);
      db.run('UPDATE ml_models SET status = ? WHERE id = ?', ['ATIVO', modeloId], function(err) {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

module.exports = {
  fazerPredicao,
  registrarResultadoPredicao,
  buscarModeloAtivo,
  listarModelos,
  ativarModelo,
  registrarAuditoriaML
};
