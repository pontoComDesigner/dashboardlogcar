/**
 * Rotas de Configurações
 * 
 * Endpoints para configurações administrativas
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { importarHistorico } = require('../scripts/importarHistoricoFaturamentos');
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { registrarAcao } = require('../services/auditoriaService');

// Todas as rotas requerem autenticação primeiro
router.use(authenticateToken);

// Todas as rotas requerem papel ADMINISTRATIVO (após autenticação)
router.use(requireRole('ADMINISTRATIVO'));

/**
 * POST /api/configuracoes/upload-historico
 * 
 * Faz upload e importa arquivo CSV com histórico de faturamentos
 */
router.post('/upload-historico', async (req, res) => {
  try {
    // Log para debug
    logger.info(`Upload histórico - User: ${req.user?.username || 'N/A'}, Role: ${req.user?.role || 'N/A'}`);
    
    // Verificar se há arquivo no body (enviado como FormData)
    if (!req.body || !req.body.fileContent) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo CSV é obrigatório'
      });
    }

    // Criar arquivo temporário na memória
    const fileContent = req.body.fileContent;
    const fileName = req.body.fileName || 'historico.csv';
    
    // Criar caminho temporário
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `historico_${Date.now()}_${fileName}`);

    try {
      // Salvar conteúdo do arquivo temporariamente
      fs.writeFileSync(tempFilePath, fileContent, 'utf-8');

      // Importar histórico
      await importarHistorico(tempFilePath);

      // Remover arquivo temporário
      fs.unlinkSync(tempFilePath);

      // Registrar auditoria
      registrarAcao(
        req.user,
        'HISTORICO_IMPORTADO',
        'configuracoes',
        null,
        null,
        { fileName },
        req
      );

      res.json({
        success: true,
        message: 'Histórico importado com sucesso!'
      });
    } catch (importError) {
      // Remover arquivo temporário em caso de erro
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw importError;
    }
  } catch (error) {
    logger.error('Erro ao importar histórico:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao importar histórico'
    });
  }
});

/**
 * GET /api/configuracoes/historico
 * 
 * Lista histórico de desmembramentos importados agrupados por carga
 */
router.get('/historico', (req, res) => {
  // Log para debug
  logger.info(`Listar histórico - User: ${req.user?.username || 'N/A'}, Role: ${req.user?.role || 'N/A'}`);
  try {
    const db = getDatabase();
    const { page = 1, limit = 20, numeroNotaFiscal, codigoProduto } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Buscar cargas agrupadas por nota fiscal e número de carga
    let query = `
      SELECT 
        numeroNotaFiscal,
        numeroCarga,
        GROUP_CONCAT(
          codigoProduto || '|' || 
          COALESCE(descricaoProduto, '') || '|' || 
          quantidadePorCarga || '|' || 
          COALESCE(unidade, 'UN')
        , '||') as produtos
      FROM historico_desmembramentos_reais
      WHERE 1=1
    `;
    const params = [];
    
    if (numeroNotaFiscal) {
      query += ' AND numeroNotaFiscal LIKE ?';
      params.push(`%${numeroNotaFiscal}%`);
    }
    
    if (codigoProduto) {
      query += ' AND codigoProduto = ?';
      params.push(codigoProduto);
    }
    
    query += ' GROUP BY numeroNotaFiscal, numeroCarga';
    query += ' ORDER BY numeroNotaFiscal DESC, numeroCarga ASC';
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    // Buscar total de cargas
    let countQuery = `
      SELECT COUNT(DISTINCT numeroNotaFiscal || '-' || numeroCarga) as total
      FROM historico_desmembramentos_reais
      WHERE 1=1
    `;
    const countParams = [];
    
    if (numeroNotaFiscal) {
      countQuery += ' AND numeroNotaFiscal LIKE ?';
      countParams.push(`%${numeroNotaFiscal}%`);
    }
    
    if (codigoProduto) {
      countQuery += ' AND codigoProduto = ?';
      countParams.push(codigoProduto);
    }
    
    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        logger.error('Erro ao contar histórico:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar histórico'
        });
      }
      
      db.all(query, params, (err, rows) => {
        if (err) {
          logger.error('Erro ao buscar histórico:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar histórico'
          });
        }
        
        // Processar cargas e seus produtos
        const cargas = (rows || []).map(row => {
          const produtos = row.produtos ? row.produtos.split('||').map(prod => {
            const [codigo, descricao, quantidade, unidade] = prod.split('|');
            return {
              codigoProduto: codigo,
              descricao: descricao || '',
              quantidade: parseInt(quantidade) || 0,
              unidade: unidade || 'UN'
            };
          }) : [];
          
          return {
            numeroNotaFiscal: row.numeroNotaFiscal,
            numeroCarga: row.numeroCarga,
            produtos: produtos,
            totalProdutos: produtos.length,
            totalQuantidade: produtos.reduce((sum, p) => sum + p.quantidade, 0)
          };
        });
        
        res.json({
          success: true,
          cargas: cargas,
          paginacao: {
            pagina: parseInt(page),
            limite: parseInt(limit),
            total: countRow?.total || 0,
            totalPaginas: Math.ceil((countRow?.total || 0) / parseInt(limit))
          }
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao listar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/configuracoes/historico/estatisticas
 * 
 * Retorna estatísticas do histórico importado
 */
router.get('/historico/estatisticas', (req, res) => {
  // Log para debug
  logger.info(`Estatísticas histórico - User: ${req.user?.username || 'N/A'}, Role: ${req.user?.role || 'N/A'}`);
  try {
    const db = getDatabase();
    
    db.all(`
      SELECT 
        COUNT(DISTINCT numeroNotaFiscal) as totalNotasFiscais,
        COUNT(DISTINCT codigoProduto) as totalProdutos,
        COUNT(*) as totalRegistros
      FROM historico_desmembramentos_reais
    `, [], (err, stats) => {
      if (err) {
        logger.error('Erro ao buscar estatísticas:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar estatísticas'
        });
      }
      
      res.json({
        success: true,
        estatisticas: stats[0] || {
          totalNotasFiscais: 0,
          totalProdutos: 0,
          totalRegistros: 0
        }
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;
