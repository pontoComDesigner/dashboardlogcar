/**
 * Serviço de Auditoria
 * Registra todas as ações importantes no sistema
 */

const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

/**
 * Registra uma ação na auditoria
 */
function registrarAcao(usuario, acao, entidade, entidadeId, dadosAnteriores, dadosNovos, req = null) {
  const db = getDatabase();
  const auditoriaId = uuidv4();
  
  const ip = req ? req.ip || req.headers['x-forwarded-for'] || 'N/A' : 'N/A';
  const userAgent = req ? req.headers['user-agent'] || 'N/A' : 'N/A';
  
  db.run(`
    INSERT INTO auditoria 
    (id, usuarioId, usuarioNome, acao, entidade, entidadeId, dadosAnteriores, dadosNovos, ip, userAgent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    auditoriaId,
    usuario?.id || null,
    usuario?.name || usuario?.username || 'Sistema',
    acao,
    entidade,
    entidadeId || null,
    dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
    dadosNovos ? JSON.stringify(dadosNovos) : null,
    ip,
    userAgent
  ], (err) => {
    if (err) {
      logger.error('Erro ao registrar auditoria:', err);
    }
  });
}

/**
 * Busca histórico de auditoria
 */
function buscarAuditoria(filtros = {}) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM auditoria WHERE 1=1';
    const params = [];
    
    if (filtros.usuarioId) {
      query += ' AND usuarioId = ?';
      params.push(filtros.usuarioId);
    }
    
    if (filtros.entidade) {
      query += ' AND entidade = ?';
      params.push(filtros.entidade);
    }
    
    if (filtros.entidadeId) {
      query += ' AND entidadeId = ?';
      params.push(filtros.entidadeId);
    }
    
    if (filtros.acao) {
      query += ' AND acao = ?';
      params.push(filtros.acao);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(filtros.limit || 100);
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      
      const registros = rows.map(row => ({
        ...row,
        dadosAnteriores: row.dadosAnteriores ? JSON.parse(row.dadosAnteriores) : null,
        dadosNovos: row.dadosNovos ? JSON.parse(row.dadosNovos) : null
      }));
      
      resolve(registros);
    });
  });
}

module.exports = {
  registrarAcao,
  buscarAuditoria
};







