/**
 * Middleware de autenticação JWT
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

/**
 * Middleware para verificar token JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    logger.warn(`❌ Token não fornecido: ${req.method} ${req.path} - IP: ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação não fornecido'
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-me', (err, decoded) => {
    if (err) {
      logger.warn(`❌ Token inválido: ${err.message} - ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }
    
    // Adicionar informações do usuário à requisição
    req.user = decoded;
    next();
  });
}

/**
 * Middleware para verificar se o usuário tem role específica
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn(`❌ Usuário não autenticado: ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`❌ Acesso negado: ${req.user.username} (${req.user.role}) tentou acessar recurso de ${allowedRoles.join(' ou ')}`);
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissão insuficiente.'
      });
    }
    
    next();
  };
}

/**
 * Middleware opcional - verifica token se fornecido, mas não bloqueia
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-me', (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  
  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
};






