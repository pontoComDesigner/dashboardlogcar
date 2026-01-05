/**
 * Rotas de Relatórios
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * GET /api/relatorios/dashboard
 * 
 * Retorna dados do dashboard
 */
router.get('/dashboard', (req, res) => {
  try {
    const db = getDatabase();
    
    // Contar pedidos por status
    db.all(`
      SELECT status, COUNT(*) as total
      FROM pedidos
      GROUP BY status
    `, [], (err, pedidosPorStatus) => {
      if (err) {
        logger.error('Erro ao buscar pedidos por status:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar dados do dashboard'
        });
      }
      
      // Contar notas fiscais por status
      db.all(`
        SELECT status, COUNT(*) as total
        FROM notas_fiscais
        GROUP BY status
      `, [], (err, notasPorStatus) => {
        if (err) {
          logger.error('Erro ao buscar notas por status:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar dados do dashboard'
          });
        }
        
        // Contar romaneios por status
        db.all(`
          SELECT status, COUNT(*) as total
          FROM romaneios
          GROUP BY status
        `, [], (err, romaneiosPorStatus) => {
          if (err) {
            logger.error('Erro ao buscar romaneios por status:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao buscar dados do dashboard'
            });
          }
          
          // Valor total de pedidos
          db.get(`
            SELECT COALESCE(SUM(valorTotal), 0) as valorTotal
            FROM pedidos
          `, [], (err, valorTotalPedidos) => {
            if (err) {
              logger.error('Erro ao buscar valor total:', err);
              return res.status(500).json({
                success: false,
                message: 'Erro ao buscar dados do dashboard'
              });
            }
            
            // Valor total de notas fiscais
            db.get(`
              SELECT COALESCE(SUM(valorTotal), 0) as valorTotal
              FROM notas_fiscais
            `, [], (err, valorTotalNotas) => {
              if (err) {
                logger.error('Erro ao buscar valor total de notas:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Erro ao buscar dados do dashboard'
                });
              }
              
              res.json({
                success: true,
                dashboard: {
                  pedidosPorStatus: pedidosPorStatus || [],
                  notasPorStatus: notasPorStatus || [],
                  romaneiosPorStatus: romaneiosPorStatus || [],
                  valorTotalPedidos: valorTotalPedidos?.valorTotal || 0,
                  valorTotalNotas: valorTotalNotas?.valorTotal || 0
                }
              });
            });
          });
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;










