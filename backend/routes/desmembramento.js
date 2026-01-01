/**
 * Rotas de Desmembramento
 * 
 * Endpoints para desmembrar notas fiscais em cargas
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { desmembrarNotaFiscal, desmembrarNotaFiscalManual, validarDesmembramento, sugerirNumeroCargas } = require('../services/desmembramentoService');
const { registrarAcao } = require('../services/auditoriaService');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * GET /api/desmembramento/pendentes
 * 
 * Lista notas fiscais pendentes de desmembramento
 */
router.get('/pendentes', (req, res) => {
  try {
    const db = getDatabase();
    
    db.all(`
      SELECT nf.*, 
        COUNT(c.id) as quantidadeCargas,
        COALESCE(SUM(nfi.quantidade), 0) as totalItens
      FROM notas_fiscais nf
      LEFT JOIN cargas c ON nf.id = c.notaFiscalId
      LEFT JOIN nota_fiscal_itens nfi ON nf.id = nfi.notaFiscalId
      WHERE nf.status = 'PENDENTE_DESMEMBRAMENTO'
      GROUP BY nf.id
      ORDER BY nf.createdAt DESC
    `, [], (err, notas) => {
      if (err) {
        logger.error('Erro ao buscar notas pendentes:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar notas fiscais pendentes'
        });
      }
      
      res.json({
        success: true,
        notasFiscais: notas || []
      });
    });
  } catch (error) {
    logger.error('Erro ao listar notas pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/desmembramento/nota/:id
 * 
 * Busca detalhes de uma nota fiscal para desmembramento
 */
router.get('/nota/:id', (req, res) => {
  try {
    const db = getDatabase();
    const notaId = req.params.id;
    
    // Buscar nota fiscal
    db.get('SELECT * FROM notas_fiscais WHERE id = ?', [notaId], (err, nota) => {
      if (err) {
        logger.error('Erro ao buscar nota fiscal:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar nota fiscal'
        });
      }
      
      if (!nota) {
        return res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }
      
      // Buscar itens
      db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ? ORDER BY descricao', [notaId], (err, itens) => {
        if (err) {
          logger.error('Erro ao buscar itens:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar itens da nota fiscal'
          });
        }
        
      // Buscar cargas existentes (se houver)
      db.all('SELECT * FROM cargas WHERE notaFiscalId = ? ORDER BY numeroCarga', [notaId], (err, cargas) => {
        if (err) {
          logger.error('Erro ao buscar cargas:', err);
          return res.json({
            success: true,
            notaFiscal: {
              ...nota,
              itens: itens || [],
              cargas: []
            }
          });
        }
        
        // Se não há cargas, retornar direto
        if (!cargas || cargas.length === 0) {
          return res.json({
            success: true,
            notaFiscal: {
              ...nota,
              itens: itens || [],
              cargas: []
            }
          });
        }
        
        // Buscar itens de cada carga
        const cargasComItens = [];
        let cargasProcessadas = 0;
        
        cargas.forEach((carga) => {
          db.all(`
            SELECT ci.*, nfi.descricao, nfi.unidade, nfi.valorUnitario, nfi.peso, nfi.volume, nfi.codigoInterno, nfi.codigoBarrasEan
            FROM carga_itens ci
            INNER JOIN nota_fiscal_itens nfi ON ci.notaFiscalItemId = nfi.id
            WHERE ci.cargaId = ?
            ORDER BY ci.ordem
          `, [carga.id], (err, cargaItens) => {
            if (err) {
              logger.error('Erro ao buscar itens da carga:', err);
            }
            
            cargasComItens.push({
              ...carga,
              itens: cargaItens || []
            });
            
            cargasProcessadas++;
            if (cargasProcessadas === cargas.length) {
              res.json({
                success: true,
                notaFiscal: {
                  ...nota,
                  itens: itens || [],
                  cargas: cargasComItens
                }
              });
            }
          });
        });
      });
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/desmembramento/sugerir/:notaId
 * 
 * Sugere número de cargas para uma nota fiscal
 */
router.get('/sugerir/:notaId', async (req, res) => {
  try {
    const db = getDatabase();
    const notaId = req.params.notaId;
    
    db.get('SELECT * FROM notas_fiscais WHERE id = ?', [notaId], async (err, nota) => {
      if (err || !nota) {
        return res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }
      
      const numeroCargas = await sugerirNumeroCargas(nota);
      
      res.json({
        success: true,
        numeroCargasSugerido: numeroCargas,
        notaFiscal: {
          pesoTotal: nota.pesoTotal,
          volumeTotal: nota.volumeTotal,
          valorTotal: nota.valorTotal
        }
      });
    });
  } catch (error) {
    logger.error('Erro ao sugerir cargas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * POST /api/desmembramento/desmembrar
 * 
 * Desmembra uma nota fiscal em múltiplas cargas
 */
router.post('/desmembrar', requireRole('LOGISTICA', 'ADMINISTRATIVO'), async (req, res) => {
  try {
    const { notaFiscalId, numeroCargas, metodo, distribuicaoManual } = req.body;
    
    if (!notaFiscalId) {
      return res.status(400).json({
        success: false,
        message: 'notaFiscalId é obrigatório'
      });
    }
    
    // Validar antes de desmembrar
    const validacao = await validarDesmembramento(notaFiscalId);
    if (validacao.cargas.quantidadeCargas > 0) {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal já foi desmembrada'
      });
    }
    
    let cargasCriadas;
    
    // Se for manual, usar distribuição específica
    if (metodo === 'MANUAL' && distribuicaoManual) {
      cargasCriadas = await desmembrarNotaFiscalManual(
        notaFiscalId,
        distribuicaoManual,
        req.user.id
      );
    } else {
      // Desmembrar automaticamente
      cargasCriadas = await desmembrarNotaFiscal(
        notaFiscalId,
        numeroCargas,
        req.user.id,
        metodo || 'AUTOMATICO'
      );
    }
    
    // Registrar auditoria
    registrarAcao(
      req.user,
      'DESMEMBRAMENTO_CRIADO',
      'notas_fiscais',
      notaFiscalId,
      null,
      { numeroCargas: cargasCriadas.length, metodo: metodo || 'AUTOMATICO' },
      req
    );
    
    // Validar após desmembramento
    const validacaoFinal = await validarDesmembramento(notaFiscalId);
    
    res.json({
      success: true,
      message: 'Nota fiscal desmembrada com sucesso',
      cargas: cargasCriadas,
      validacao: validacaoFinal
    });
  } catch (error) {
    logger.error('Erro ao desmembrar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao desmembrar nota fiscal'
    });
  }
});

/**
 * GET /api/desmembramento/validar/:notaId
 * 
 * Valida desmembramento de uma nota fiscal
 */
router.get('/validar/:notaId', async (req, res) => {
  try {
    const validacao = await validarDesmembramento(req.params.notaId);
    
    res.json({
      success: true,
      validacao
    });
  } catch (error) {
    logger.error('Erro ao validar desmembramento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao validar desmembramento'
    });
  }
});

/**
 * GET /api/desmembramento/cargas/:notaId
 * 
 * Lista cargas de uma nota fiscal
 */
router.get('/cargas/:notaId', (req, res) => {
  try {
    const db = getDatabase();
    const notaId = req.params.notaId;
    
    db.all(`
      SELECT c.*, 
        COUNT(ci.id) as quantidadeItens
      FROM cargas c
      LEFT JOIN carga_itens ci ON c.id = ci.cargaId
      WHERE c.notaFiscalId = ?
      GROUP BY c.id
      ORDER BY c.numeroCarga
    `, [notaId], (err, cargas) => {
      if (err) {
        logger.error('Erro ao buscar cargas:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar cargas'
        });
      }
      
      // Buscar itens de cada carga
      const cargasComItens = [];
      let cargasProcessadas = 0;
      
      if (cargas.length === 0) {
        return res.json({
          success: true,
          cargas: []
        });
      }
      
      cargas.forEach((carga) => {
        db.all(`
          SELECT ci.*, nfi.descricao, nfi.unidade, nfi.valorUnitario, nfi.peso, nfi.volume, nfi.codigoInterno, nfi.codigoBarrasEan
          FROM carga_itens ci
          INNER JOIN nota_fiscal_itens nfi ON ci.notaFiscalItemId = nfi.id
          WHERE ci.cargaId = ?
          ORDER BY ci.ordem
        `, [carga.id], (err, itens) => {
          if (err) {
            logger.error('Erro ao buscar itens:', err);
          }
          
          cargasComItens.push({
            ...carga,
            itens: itens || []
          });
          
          cargasProcessadas++;
          if (cargasProcessadas === cargas.length) {
            res.json({
              success: true,
              cargas: cargasComItens
            });
          }
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar cargas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;

