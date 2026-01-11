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
    
    const queries = {
      pedidosPorStatus: `
        SELECT status, COUNT(*) as total
        FROM pedidos
        GROUP BY status
      `,
      notasPorStatus: `
        SELECT status, COUNT(*) as total
        FROM notas_fiscais
        GROUP BY status
      `,
      romaneiosPorStatus: `
        SELECT status, COUNT(*) as total
        FROM romaneios
        GROUP BY status
      `,
      valorTotalPedidos: `
        SELECT COALESCE(SUM(valorTotal), 0) as valorTotal
        FROM pedidos
      `,
      valorTotalNotas: `
        SELECT COALESCE(SUM(valorTotal), 0) as valorTotal
        FROM notas_fiscais
      `,
      topMotoristas: `
        SELECT motorista, COUNT(*) as total
        FROM cargas
        WHERE motorista IS NOT NULL AND motorista != ''
        GROUP BY motorista
        ORDER BY total DESC
        LIMIT 5
      `,
      cargasRecentes: `
        SELECT id, numeroCarga, motorista, status, createdAt
        FROM cargas
        ORDER BY createdAt DESC
        LIMIT 5
      `
    };

    const results = {};
    let completed = 0;
    const totalQueries = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          logger.error(`Erro ao buscar ${key} para dashboard:`, err);
          results[key] = (key.startsWith('valor')) ? 0 : [];
        } else {
          if (key.startsWith('valor')) {
            results[key] = rows[0]?.valorTotal || 0;
          } else {
            results[key] = rows || [];
          }
        }

        completed++;
        if (completed === totalQueries) {
          res.json({
            success: true,
            dashboard: {
              pedidosPorStatus: results.pedidosPorStatus,
              notasPorStatus: results.notasPorStatus,
              romaneiosPorStatus: results.romaneiosPorStatus,
              valorTotalPedidos: results.valorTotalPedidos,
              valorTotalNotas: results.valorTotalNotas,
              topMotoristas: results.topMotoristas,
              cargasRecentes: results.cargasRecentes,
              tempoMedioEntregaDias: 1.5 // Placeholder até termos dados de entrega reais
            }
          });
        }
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
