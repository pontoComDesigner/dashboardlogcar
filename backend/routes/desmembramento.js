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

/**
 * GET /api/desmembramento/regras-produtos-especiais
 * 
 * Lista todas as regras de produtos especiais
 */
router.get('/regras-produtos-especiais', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const db = getDatabase();
    
    db.all('SELECT * FROM regras_produtos_especiais ORDER BY codigoProduto', [], (err, regras) => {
      if (err) {
        logger.error('Erro ao buscar regras:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar regras de produtos especiais'
        });
      }
      
      res.json({
        success: true,
        regras: regras || []
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar regras:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * POST /api/desmembramento/regras-produtos-especiais
 * 
 * Cria ou atualiza uma regra de produto especial
 */
router.post('/regras-produtos-especiais', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const { codigoProduto, descricaoProduto, quantidadeMaximaPorCarga, observacoes } = req.body;
    
    if (!codigoProduto || !quantidadeMaximaPorCarga) {
      return res.status(400).json({
        success: false,
        message: 'codigoProduto e quantidadeMaximaPorCarga são obrigatórios'
      });
    }
    
    const db = getDatabase();
    const { v4: uuidv4 } = require('uuid');
    
    // Verificar se já existe
    db.get(
      'SELECT id FROM regras_produtos_especiais WHERE codigoProduto = ?',
      [codigoProduto],
      (err, row) => {
        if (err) {
          logger.error('Erro ao verificar regra:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao verificar regra existente'
          });
        }
        
        if (row) {
          // Atualizar
          db.run(
            'UPDATE regras_produtos_especiais SET descricaoProduto = ?, quantidadeMaximaPorCarga = ?, observacoes = ?, updatedAt = CURRENT_TIMESTAMP WHERE codigoProduto = ?',
            [descricaoProduto || null, quantidadeMaximaPorCarga, observacoes || null, codigoProduto],
            function(err) {
              if (err) {
                logger.error('Erro ao atualizar regra:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Erro ao atualizar regra'
                });
              }
              
              registrarAcao(
                req.user,
                'REGRA_PRODUTO_ESPECIAL_ATUALIZADA',
                'regras_produtos_especiais',
                row.id,
                null,
                { codigoProduto, quantidadeMaximaPorCarga },
                req
              );
              
              res.json({
                success: true,
                message: 'Regra atualizada com sucesso',
                regra: {
                  id: row.id,
                  codigoProduto,
                  descricaoProduto,
                  quantidadeMaximaPorCarga,
                  observacoes
                }
              });
            }
          );
        } else {
          // Criar nova
          const id = uuidv4();
          db.run(
            'INSERT INTO regras_produtos_especiais (id, codigoProduto, descricaoProduto, quantidadeMaximaPorCarga, observacoes) VALUES (?, ?, ?, ?, ?)',
            [id, codigoProduto, descricaoProduto || null, quantidadeMaximaPorCarga, observacoes || null],
            function(err) {
              if (err) {
                logger.error('Erro ao criar regra:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Erro ao criar regra'
                });
              }
              
              registrarAcao(
                req.user,
                'REGRA_PRODUTO_ESPECIAL_CRIADA',
                'regras_produtos_especiais',
                id,
                null,
                { codigoProduto, quantidadeMaximaPorCarga },
                req
              );
              
              res.status(201).json({
                success: true,
                message: 'Regra criada com sucesso',
                regra: {
                  id,
                  codigoProduto,
                  descricaoProduto,
                  quantidadeMaximaPorCarga,
                  observacoes
                }
              });
            }
          );
        }
      }
    );
  } catch (error) {
    logger.error('Erro ao processar regra:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * DELETE /api/desmembramento/regras-produtos-especiais/:codigoProduto
 * 
 * Remove uma regra de produto especial
 */
router.delete('/regras-produtos-especiais/:codigoProduto', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const { codigoProduto } = req.params;
    const db = getDatabase();
    
    db.get(
      'SELECT id FROM regras_produtos_especiais WHERE codigoProduto = ?',
      [codigoProduto],
      (err, row) => {
        if (err) {
          logger.error('Erro ao buscar regra:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar regra'
          });
        }
        
        if (!row) {
          return res.status(404).json({
            success: false,
            message: 'Regra não encontrada'
          });
        }
        
        db.run(
          'DELETE FROM regras_produtos_especiais WHERE codigoProduto = ?',
          [codigoProduto],
          (err) => {
            if (err) {
              logger.error('Erro ao deletar regra:', err);
              return res.status(500).json({
                success: false,
                message: 'Erro ao deletar regra'
              });
            }
            
            registrarAcao(
              req.user,
              'REGRA_PRODUTO_ESPECIAL_REMOVIDA',
              'regras_produtos_especiais',
              row.id,
              { codigoProduto },
              null,
              req
            );
            
            res.json({
              success: true,
              message: 'Regra removida com sucesso'
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('Erro ao remover regra:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/desmembramento/historico-reais
 * 
 * Lista histórico de desmembramentos reais importados
 */
router.get('/historico-reais', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const { numeroNotaFiscal, codigoProduto, limit = 100, offset = 0 } = req.query;
    const db = getDatabase();
    
    let query = 'SELECT * FROM historico_desmembramentos_reais WHERE 1=1';
    const params = [];
    
    if (numeroNotaFiscal) {
      query += ' AND numeroNotaFiscal = ?';
      params.push(numeroNotaFiscal);
    }
    
    if (codigoProduto) {
      query += ' AND codigoProduto = ?';
      params.push(codigoProduto);
    }
    
    query += ' ORDER BY createdAt DESC, numeroNotaFiscal, numeroCarga, numeroSequencia LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, historico) => {
      if (err) {
        logger.error('Erro ao buscar histórico:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar histórico'
        });
      }
      
      res.json({
        success: true,
        historico: historico || []
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;

