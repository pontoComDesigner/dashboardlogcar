/**
 * Middleware de tratamento de erros
 */

const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Erro na requisição:', err);
  
  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors: err.errors
    });
  }
  
  // Erro de autenticação
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      message: 'Não autorizado'
    });
  }
  
  // Erro padrão
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { errorHandler };







