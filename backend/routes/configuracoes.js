/**
 * Rotas de Configurações
 * 
 * Endpoints para configurações administrativas
 */

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const { importarHistorico } = require('../scripts/importarHistoricoFaturamentos');
const { logger } = require('../utils/logger');
const { registrarAcao } = require('../services/auditoriaService');

// Todas as rotas requerem autenticação e papel ADMINISTRATIVO
router.use(requireRole('ADMINISTRATIVO'));

/**
 * POST /api/configuracoes/upload-historico
 * 
 * Faz upload e importa arquivo CSV com histórico de faturamentos
 */
router.post('/upload-historico', async (req, res) => {
  try {
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

module.exports = router;

