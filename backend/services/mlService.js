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
 * Faz predição usando modelo ML
 * 
 * Por enquanto, retorna predição baseada em heurística
 * (será substituído por modelo ML real após implementação)
 */
async function fazerPredicao(notaFiscal, itens) {
  try {
    const modelo = await buscarModeloAtivo();
    
    // Extrair features
    const features = await featureEngineeringService.extrairFeatures(notaFiscal, itens);
    
    // Se não houver modelo ativo, usar fallback (regras fixas)
    if (!modelo) {
      logger.info('Nenhum modelo ML ativo encontrado, usando fallback (regras fixas)');
      return {
        numeroCargasSugerido: null, // será calculado pelas regras fixas
        confianca: 0.5,
        modeloVersao: null,
        metodo: 'FALLBACK_REGRAS_FIXAS',
        features
      };
    }
    
    // TODO: Implementar predição real com modelo ML
    // Por enquanto, usar heurística baseada em features
    const predicao = fazerPredicaoHeuristica(features);
    
    // Registrar predição
    const predicaoId = uuidv4();
    const db = getDatabase();
    db.run(
      `INSERT INTO ml_predictions 
       (id, notaFiscalId, modeloVersao, features, numeroCargasSugerido, confianca)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        predicaoId,
        notaFiscal.id,
        modelo.versao,
        JSON.stringify(features),
        predicao.numeroCargasSugerido,
        predicao.confianca
      ],
      (err) => {
        if (err) {
          logger.error('Erro ao registrar predição:', err);
        }
      }
    );
    
    registrarAuditoriaML('PREDICAO_FEITA', null, {
      notaFiscalId: notaFiscal.id,
      modeloVersao: modelo.versao,
      predicao: predicao.numeroCargasSugerido,
      confianca: predicao.confianca
    });
    
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
 * Predição heurística (temporária, até implementar ML real)
 * 
 * Usa features para calcular uma estimativa baseada em regras simples
 */
function fazerPredicaoHeuristica(features) {
  let numeroCargas = 1;
  let confianca = 0.5;
  
  // Baseado em produtos especiais
  if (features.temProdutosEspeciais) {
    numeroCargas += features.quantidadeProdutosEspeciais || 0;
    confianca = 0.7; // maior confiança para produtos especiais
  }
  
  // Baseado em peso (estimativa: 25 toneladas por caminhão)
  const cargasPorPeso = features.pesoTotal > 0 
    ? Math.ceil(features.pesoTotal / 25000) 
    : 0;
  
  // Baseado em volume (estimativa: 80 m³ por caminhão)
  const cargasPorVolume = features.volumeTotal > 0 
    ? Math.ceil(features.volumeTotal / 80) 
    : 0;
  
  // Usar o maior valor
  const numeroCargasFisicas = Math.max(cargasPorPeso, cargasPorVolume, 1);
  numeroCargas = Math.max(numeroCargas, numeroCargasFisicas);
  
  // Ajustar confiança baseado em similaridade com histórico
  if (features.similaridadeComHistorico !== undefined) {
    confianca = Math.min(0.95, 0.5 + (features.similaridadeComHistorico * 0.4));
  }
  
  return {
    numeroCargasSugerido: numeroCargas,
    confianca: Math.min(0.95, confianca)
  };
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
    [
      aceito ? 1 : 0,
      JSON.stringify(distribuicaoFinal),
      ajustadoManualmente ? 1 : 0,
      predicaoId
    ],
    (err) => {
      if (err) {
        logger.error('Erro ao registrar resultado da predição:', err);
      } else {
        logger.info(`Resultado da predição ${predicaoId} registrado: aceito=${aceito}, ajustado=${ajustadoManualmente}`);
      }
    }
  );
}

/**
 * Lista modelos disponíveis
 */
function listarModelos(filtroStatus = null) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM ml_models ORDER BY trainedAt DESC';
    const params = [];
    
    if (filtroStatus) {
      query = 'SELECT * FROM ml_models WHERE status = ? ORDER BY trainedAt DESC';
      params.push(filtroStatus);
    }
    
    db.all(query, params, (err, rows) => {
      if (err) {
        logger.error('Erro ao listar modelos:', err);
        return reject(err);
      }
      
      // Parse JSON fields
      const modelos = (rows || []).map(row => {
        try {
          row.parametros = row.parametros ? JSON.parse(row.parametros) : null;
          row.metricas = row.metricas ? JSON.parse(row.metricas) : null;
        } catch (e) {
          logger.warn('Erro ao fazer parse de campos JSON:', e);
        }
        return row;
      });
      
      resolve(modelos);
    });
  });
}

/**
 * Ativa um modelo (desativa outros)
 */
function ativarModelo(modeloId, usuario) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Primeiro, desativar todos os modelos
    db.run('UPDATE ml_models SET status = ? WHERE status = ?', ['INATIVO', 'ATIVO'], (err) => {
      if (err) {
        return reject(err);
      }
      
      // Ativar o modelo escolhido
      db.run(
        'UPDATE ml_models SET status = ? WHERE id = ?',
        ['ATIVO', modeloId],
        function(err) {
          if (err) {
            return reject(err);
          }
          
          if (this.changes === 0) {
            return reject(new Error('Modelo não encontrado'));
          }
          
          registrarAuditoriaML('MODELO_ATIVADO', usuario, {
            modeloId,
            versao: null // será preenchido depois
          });
          
          resolve();
        }
      );
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

