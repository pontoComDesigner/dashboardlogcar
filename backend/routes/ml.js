/**
 * Rotas de Machine Learning para Desmembramento
 * 
 * Endpoints para predições ML e gerenciamento de modelos
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const mlService = require('../services/mlService');
const featureEngineeringService = require('../services/mlFeatureEngineeringService');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * POST /api/ml/predict
 * 
 * Faz predição de número de cargas para uma nota fiscal
 */
router.post('/predict', requireRole('LOGISTICA', 'ADMINISTRATIVO'), async (req, res) => {
  try {
    const { notaFiscalId, incluirDistribuicao } = req.body;
    
    if (!notaFiscalId) {
      return res.status(400).json({
        success: false,
        message: 'notaFiscalId é obrigatório'
      });
    }
    
    const db = getDatabase();
    
    // Buscar nota fiscal
    const nota = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM notas_fiscais WHERE id = ?', [notaFiscalId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      });
    }
    
    // Buscar itens
    const itens = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaFiscalId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    if (itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal não possui itens'
      });
    }
    
    // Fazer predição
    const predicao = await mlService.fazerPredicao(nota, itens);
    
    res.json({
      success: true,
      predicao: {
        numeroCargasSugerido: predicao.numeroCargasSugerido,
        confianca: predicao.confianca,
        modeloVersao: predicao.modeloVersao,
        metodo: predicao.metodo,
        features: predicao.features,
        predicaoId: predicao.predicaoId
      }
    });
  } catch (error) {
    logger.error('Erro ao fazer predição ML:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao fazer predição'
    });
  }
});

/**
 * GET /api/ml/models
 * 
 * Lista modelos disponíveis
 */
router.get('/models', requireRole('LOGISTICA', 'ADMINISTRATIVO'), async (req, res) => {
  try {
    const { status } = req.query;
    const modelos = await mlService.listarModelos(status || null);
    
    res.json({
      success: true,
      modelos
    });
  } catch (error) {
    logger.error('Erro ao listar modelos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar modelos'
    });
  }
});

/**
 * GET /api/ml/models/ativo
 * 
 * Busca modelo ativo atual
 */
router.get('/models/ativo', requireRole('LOGISTICA', 'ADMINISTRATIVO'), async (req, res) => {
  try {
    const modelo = await mlService.buscarModeloAtivo();
    
    if (!modelo) {
      return res.json({
        success: true,
        modelo: null,
        message: 'Nenhum modelo ativo encontrado'
      });
    }
    
    res.json({
      success: true,
      modelo
    });
  } catch (error) {
    logger.error('Erro ao buscar modelo ativo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar modelo ativo'
    });
  }
});

/**
 * POST /api/ml/models/:modelId/activate
 * 
 * Ativa um modelo (desativa outros)
 */
router.post('/models/:modelId/activate', requireRole('ADMINISTRATIVO'), async (req, res) => {
  try {
    const { modelId } = req.params;
    
    await mlService.ativarModelo(modelId, req.user);
    
    res.json({
      success: true,
      message: 'Modelo ativado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao ativar modelo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao ativar modelo'
    });
  }
});

/**
 * POST /api/ml/predictions/:predicaoId/resultado
 * 
 * Registra resultado de uma predição (aceito/rejeitado)
 */
router.post('/predictions/:predicaoId/resultado', requireRole('LOGISTICA', 'ADMINISTRATIVO'), async (req, res) => {
  try {
    const { predicaoId } = req.params;
    const { aceito, distribuicaoFinal, ajustadoManualmente } = req.body;
    
    if (typeof aceito !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'aceito deve ser um boolean'
      });
    }
    
    mlService.registrarResultadoPredicao(
      predicaoId,
      aceito,
      distribuicaoFinal || null,
      ajustadoManualmente || false
    );
    
    res.json({
      success: true,
      message: 'Resultado registrado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao registrar resultado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar resultado'
    });
  }
});

/**
 * GET /api/ml/stats
 * 
 * Retorna estatísticas do módulo ML
 */
router.get('/stats', requireRole('LOGISTICA', 'ADMINISTRATIVO'), async (req, res) => {
  try {
    const db = getDatabase();
    
    const stats = await new Promise((resolve, reject) => {
      const queries = {
        totalPredicoes: 'SELECT COUNT(*) as total FROM ml_predictions',
        predicoesAceitas: 'SELECT COUNT(*) as total FROM ml_predictions WHERE aceito = 1',
        predicoesRejeitadas: 'SELECT COUNT(*) as total FROM ml_predictions WHERE aceito = 0',
        totalModelos: 'SELECT COUNT(*) as total FROM ml_models',
        modelosAtivos: 'SELECT COUNT(*) as total FROM ml_models WHERE status = ?',
        totalTrainingData: 'SELECT COUNT(*) as total FROM ml_training_data'
      };
      
      const results = {};
      let completed = 0;
      const totalQueries = Object.keys(queries).length;
      
      Object.entries(queries).forEach(([key, query]) => {
        const params = key === 'modelosAtivos' ? ['ATIVO'] : [];
        db.get(query, params, (err, row) => {
          if (err) {
            logger.error(`Erro ao buscar stat ${key}:`, err);
            results[key] = 0;
          } else {
            results[key] = row?.total || 0;
          }
          
          completed++;
          if (completed === totalQueries) {
            // Calcular taxa de aceitação
            const taxaAceitacao = results.totalPredicoes > 0
              ? (results.predicoesAceitas / results.totalPredicoes) * 100
              : 0;
            
            resolve({
              ...results,
              taxaAceitacao: parseFloat(taxaAceitacao.toFixed(2))
            });
          }
        });
      });
    });
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas'
    });
  }
});

module.exports = router;

