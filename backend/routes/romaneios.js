/**
 * Rotas de Romaneios/Cargas
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * GET /api/romaneios
 * 
 * Lista todos os romaneios
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { status } = req.query;
    
    let query = `
      SELECT r.*, 
        COALESCE(
          (SELECT COUNT(*) FROM romaneio_pedidos WHERE romaneioId = r.id) +
          (SELECT COUNT(*) FROM romaneio_cargas WHERE romaneioId = r.id),
          0
        ) as totalPedidos
      FROM romaneios r
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY r.createdAt DESC';
    
    db.all(query, params, (err, romaneios) => {
      if (err) {
        logger.error('Erro ao buscar romaneios:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar romaneios'
        });
      }
      
      res.json({
        success: true,
        romaneios
      });
    });
  } catch (error) {
    logger.error('Erro ao listar romaneios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/romaneios/:id
 * 
 * Busca um romaneio específico com seus pedidos
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const romaneioId = req.params.id;
    
    // Buscar romaneio
    db.get('SELECT * FROM romaneios WHERE id = ?', [romaneioId], (err, romaneio) => {
      if (err) {
        logger.error('Erro ao buscar romaneio:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar romaneio'
        });
      }
      
      if (!romaneio) {
        return res.status(404).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }
      
      // Buscar pedidos e cargas do romaneio
      // Primeiro buscar pedidos
      db.all(`
        SELECT rp.*, 
          p.numeroPedido, 
          p.clienteNome, 
          p.clienteEndereco, 
          p.valorTotal, 
          p.status as pedidoStatus,
          'pedido' as tipo
        FROM romaneio_pedidos rp
        INNER JOIN pedidos p ON rp.pedidoId = p.id
        WHERE rp.romaneioId = ?
        ORDER BY rp.ordem, p.numeroPedido
      `, [romaneioId], (err, pedidos) => {
        if (err) {
          logger.error('Erro ao buscar pedidos do romaneio:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar pedidos do romaneio'
          });
        }
        
        // Agora buscar cargas
        db.all(`
          SELECT rc.*,
            c.numeroCarga as numeroPedido,
            c.clienteNome,
            c.clienteEndereco,
            c.valorTotal,
            c.status as pedidoStatus,
            c.numeroNota,
            c.notaFiscalId,
            'carga' as tipo
          FROM romaneio_cargas rc
          INNER JOIN cargas c ON rc.cargaId = c.id
          WHERE rc.romaneioId = ?
          ORDER BY rc.ordem, c.numeroCarga
        `, [romaneioId], (err, cargas) => {
          if (err) {
            logger.error('Erro ao buscar cargas do romaneio:', err);
            // Retornar apenas pedidos em caso de erro
            return res.json({
              success: true,
              romaneio: {
                ...romaneio,
                pedidos: pedidos || []
              }
            });
          }
          
          // Combinar pedidos e cargas, ordenando por ordem
          const todos = [
            ...(pedidos || []).map(p => ({ ...p, tipo: 'pedido' })),
            ...(cargas || []).map(c => ({ ...c, tipo: 'carga' }))
          ].sort((a, b) => {
            // Ordenar primeiro por ordem, depois por numeroPedido
            if (a.ordem !== b.ordem) {
              return (a.ordem || 0) - (b.ordem || 0);
            }
            return (a.numeroPedido || '').localeCompare(b.numeroPedido || '');
          });
          
          res.json({
            success: true,
            romaneio: {
              ...romaneio,
              pedidos: todos
            }
          });
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar romaneio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * POST /api/romaneios
 * 
 * Cria um novo romaneio (LOGISTICA)
 */
router.post('/', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const { numeroRomaneio, transportadora, veiculo, motorista, dataSaida, dataPrevisaoEntrega, observacoes, pedidos } = req.body;
    
    if (!numeroRomaneio) {
      return res.status(400).json({
        success: false,
        message: 'Número do romaneio é obrigatório'
      });
    }
    
    const db = getDatabase();
    const romaneioId = uuidv4();
    
    // Verificar se número do romaneio já existe
    db.get('SELECT id FROM romaneios WHERE numeroRomaneio = ?', [numeroRomaneio], (err, existing) => {
      if (err) {
        logger.error('Erro ao verificar romaneio:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar romaneio'
        });
      }
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Número do romaneio já existe'
        });
      }
      
      // Inserir romaneio
      db.run(
        `INSERT INTO romaneios 
         (id, numeroRomaneio, transportadora, veiculo, motorista, dataSaida, dataPrevisaoEntrega, observacoes, status, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ABERTO', ?)`,
        [romaneioId, numeroRomaneio, transportadora || null, veiculo || null, motorista || null, dataSaida || null, dataPrevisaoEntrega || null, observacoes || null, req.user.id],
        function(err) {
          if (err) {
            logger.error('Erro ao inserir romaneio:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao criar romaneio'
            });
          }
          
          // Inserir pedidos do romaneio se fornecidos
          if (pedidos && Array.isArray(pedidos) && pedidos.length > 0) {
            const stmt = db.prepare(`
              INSERT INTO romaneio_pedidos (id, romaneioId, pedidoId, ordem)
              VALUES (?, ?, ?, ?)
            `);
            
            let itemsInserted = 0;
            let itemsError = null;
            
            pedidos.forEach((pedidoId, index) => {
              const itemId = uuidv4();
              
              stmt.run([itemId, romaneioId, pedidoId, index], (err) => {
                if (err) {
                  itemsError = err;
                  logger.error('Erro ao inserir pedido no romaneio:', err);
                } else {
                  itemsInserted++;
                  if (itemsInserted === pedidos.length) {
                    stmt.finalize((err) => {
                      if (err || itemsError) {
                        logger.error('Erro ao finalizar inserção de pedidos:', err || itemsError);
                      }
                      
                      logger.info(`✅ Romaneio criado: ${numeroRomaneio}`);
                      res.status(201).json({
                        success: true,
                        message: 'Romaneio criado com sucesso',
                        romaneio: {
                          id: romaneioId,
                          numeroRomaneio
                        }
                      });
                    });
                  }
                }
              });
            });
          } else {
            logger.info(`✅ Romaneio criado: ${numeroRomaneio}`);
            res.status(201).json({
              success: true,
              message: 'Romaneio criado com sucesso',
              romaneio: {
                id: romaneioId,
                numeroRomaneio
              }
            });
          }
        }
      );
    });
  } catch (error) {
    logger.error('Erro ao criar romaneio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * PUT /api/romaneios/:id
 * 
 * Atualiza um romaneio
 */
router.put('/:id', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const romaneioId = req.params.id;
    const { transportadora, veiculo, motorista, dataSaida, dataPrevisaoEntrega, observacoes, status, pedidos } = req.body;
    
    const db = getDatabase();
    
    // Verificar se romaneio existe
    db.get('SELECT id FROM romaneios WHERE id = ?', [romaneioId], (err, romaneio) => {
      if (err) {
        logger.error('Erro ao verificar romaneio:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar romaneio'
        });
      }
      
      if (!romaneio) {
        return res.status(404).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }
      
      // Montar query de atualização
      const updates = [];
      const values = [];
      
      if (transportadora !== undefined) {
        updates.push('transportadora = ?');
        values.push(transportadora);
      }
      if (veiculo !== undefined) {
        updates.push('veiculo = ?');
        values.push(veiculo);
      }
      if (motorista !== undefined) {
        updates.push('motorista = ?');
        values.push(motorista);
      }
      if (dataSaida !== undefined) {
        updates.push('dataSaida = ?');
        values.push(dataSaida);
      }
      if (dataPrevisaoEntrega !== undefined) {
        updates.push('dataPrevisaoEntrega = ?');
        values.push(dataPrevisaoEntrega);
      }
      if (observacoes !== undefined) {
        updates.push('observacoes = ?');
        values.push(observacoes);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      
      if (updates.length > 0) {
        updates.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(romaneioId);
        
        const query = `UPDATE romaneios SET ${updates.join(', ')} WHERE id = ?`;
        
        db.run(query, values, function(err) {
          if (err) {
            logger.error('Erro ao atualizar romaneio:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao atualizar romaneio'
            });
          }
          
          // Atualizar pedidos se fornecidos
          if (pedidos && Array.isArray(pedidos)) {
            // Deletar pedidos antigos
            db.run('DELETE FROM romaneio_pedidos WHERE romaneioId = ?', [romaneioId], (err) => {
              if (err) {
                logger.error('Erro ao deletar pedidos antigos:', err);
              }
              
              // Inserir novos pedidos
              const stmt = db.prepare(`
                INSERT INTO romaneio_pedidos (id, romaneioId, pedidoId, ordem)
                VALUES (?, ?, ?, ?)
              `);
              
              let itemsInserted = 0;
              pedidos.forEach((pedidoId, index) => {
                const itemId = uuidv4();
                
                stmt.run([itemId, romaneioId, pedidoId, index], (err) => {
                  if (!err) itemsInserted++;
                  if (itemsInserted === pedidos.length) {
                    stmt.finalize();
                  }
                });
              });
            });
          }
          
          logger.info(`✅ Romaneio atualizado: ${romaneioId}`);
          res.json({
            success: true,
            message: 'Romaneio atualizado com sucesso'
          });
        });
      } else {
        res.json({
          success: true,
          message: 'Nenhum campo para atualizar'
        });
      }
    });
  } catch (error) {
    logger.error('Erro ao atualizar romaneio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * POST /api/romaneios/:id/pedidos
 * 
 * Adiciona pedidos a um romaneio
 */
router.post('/:id/pedidos', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const romaneioId = req.params.id;
    const { pedidos } = req.body;
    
    if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de pedidos é obrigatória'
      });
    }
    
    const db = getDatabase();
    
    // Verificar se romaneio existe
    db.get('SELECT id FROM romaneios WHERE id = ?', [romaneioId], (err, romaneio) => {
      if (err) {
        logger.error('Erro ao verificar romaneio:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao adicionar pedidos'
        });
      }
      
      if (!romaneio) {
        return res.status(404).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }
      
      // Buscar ordem máxima atual
      db.get('SELECT MAX(ordem) as maxOrdem FROM romaneio_pedidos WHERE romaneioId = ?', [romaneioId], (err, result) => {
        if (err) {
          logger.error('Erro ao buscar ordem máxima:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao adicionar pedidos'
          });
        }
        
        let currentOrder = (result && result.maxOrdem !== null) ? result.maxOrdem + 1 : 0;
        
        const stmt = db.prepare(`
          INSERT INTO romaneio_pedidos (id, romaneioId, pedidoId, ordem)
          VALUES (?, ?, ?, ?)
        `);
        
        let itemsInserted = 0;
        let itemsError = null;
        
        pedidos.forEach((pedidoId) => {
          const itemId = uuidv4();
          
          stmt.run([itemId, romaneioId, pedidoId, currentOrder++], (err) => {
            if (err) {
              itemsError = err;
              logger.error('Erro ao inserir pedido no romaneio:', err);
            } else {
              itemsInserted++;
              if (itemsInserted === pedidos.length) {
                stmt.finalize((err) => {
                  if (err || itemsError) {
                    logger.error('Erro ao finalizar inserção de pedidos:', err || itemsError);
                    return res.status(500).json({
                      success: false,
                      message: 'Erro ao adicionar alguns pedidos'
                    });
                  }
                  
                  logger.info(`✅ Pedidos adicionados ao romaneio: ${romaneioId}`);
                  res.json({
                    success: true,
                    message: 'Pedidos adicionados com sucesso'
                  });
                });
              }
            }
          });
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao adicionar pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * POST /api/romaneios/:id/desmembrar
 * 
 * Desmembra pedidos de um romaneio (cria novo romaneio com os pedidos selecionados)
 */
router.post('/:id/desmembrar', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const romaneioId = req.params.id;
    const { pedidos, novoNumeroRomaneio, motivo } = req.body;
    
    if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de pedidos para desmembrar é obrigatória'
      });
    }
    
    if (!novoNumeroRomaneio) {
      return res.status(400).json({
        success: false,
        message: 'Número do novo romaneio é obrigatório'
      });
    }
    
    const db = getDatabase();
    
    // Verificar se romaneio origem existe
    db.get('SELECT * FROM romaneios WHERE id = ?', [romaneioId], (err, romaneioOrigem) => {
      if (err) {
        logger.error('Erro ao verificar romaneio origem:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao desmembrar romaneio'
        });
      }
      
      if (!romaneioOrigem) {
        return res.status(404).json({
          success: false,
          message: 'Romaneio origem não encontrado'
        });
      }
      
      // Verificar se número do novo romaneio já existe
      db.get('SELECT id FROM romaneios WHERE numeroRomaneio = ?', [novoNumeroRomaneio], (err, existing) => {
        if (err) {
          logger.error('Erro ao verificar novo romaneio:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao desmembrar romaneio'
          });
        }
        
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Número do novo romaneio já existe'
          });
        }
        
        const novoRomaneioId = uuidv4();
        
        // Criar novo romaneio
        db.run(
          `INSERT INTO romaneios 
           (id, numeroRomaneio, transportadora, veiculo, motorista, dataSaida, dataPrevisaoEntrega, observacoes, status, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ABERTO', ?)`,
          [novoRomaneioId, novoNumeroRomaneio, romaneioOrigem.transportadora, romaneioOrigem.veiculo, romaneioOrigem.motorista, romaneioOrigem.dataSaida, romaneioOrigem.dataPrevisaoEntrega, `Desmembrado de ${romaneioOrigem.numeroRomaneio}`, req.user.id],
          function(err) {
            if (err) {
              logger.error('Erro ao criar novo romaneio:', err);
              return res.status(500).json({
                success: false,
                message: 'Erro ao criar novo romaneio'
              });
            }
            
            // Remover pedidos do romaneio original e adicionar ao novo
            const stmtDelete = db.prepare('DELETE FROM romaneio_pedidos WHERE romaneioId = ? AND pedidoId = ?');
            const stmtInsert = db.prepare('INSERT INTO romaneio_pedidos (id, romaneioId, pedidoId, ordem) VALUES (?, ?, ?, ?)');
            
            let processed = 0;
            let errorOccurred = false;
            
            pedidos.forEach((pedidoId, index) => {
              // Deletar do romaneio original
              stmtDelete.run([romaneioId, pedidoId], (err) => {
                if (err && !errorOccurred) {
                  errorOccurred = true;
                  logger.error('Erro ao remover pedido do romaneio original:', err);
                }
                
                // Inserir no novo romaneio
                const itemId = uuidv4();
                stmtInsert.run([itemId, novoRomaneioId, pedidoId, index], (err) => {
                  if (err && !errorOccurred) {
                    errorOccurred = true;
                    logger.error('Erro ao inserir pedido no novo romaneio:', err);
                  }
                  
                  processed++;
                  if (processed === pedidos.length) {
                    stmtDelete.finalize();
                    stmtInsert.finalize();
                    
                    // Registrar desmembramento
                    const desmembramentoId = uuidv4();
                    db.run(
                      'INSERT INTO desmembramentos (id, romaneioOrigemId, romaneioDestinoId, pedidoId, motivo, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
                      [desmembramentoId, romaneioId, novoRomaneioId, pedidoId, motivo || null, req.user.id],
                      (err) => {
                        if (err) {
                          logger.error('Erro ao registrar desmembramento:', err);
                        }
                        
                        if (errorOccurred) {
                          return res.status(500).json({
                            success: false,
                            message: 'Desmembramento concluído com alguns erros'
                          });
                        }
                        
                        logger.info(`✅ Romaneio desmembrado: ${romaneioId} -> ${novoRomaneioId}`);
                        res.json({
                          success: true,
                          message: 'Romaneio desmembrado com sucesso',
                          romaneioDestino: {
                            id: novoRomaneioId,
                            numeroRomaneio: novoNumeroRomaneio
                          }
                        });
                      }
                    );
                  }
                });
              });
            });
          }
        );
      });
    });
  } catch (error) {
    logger.error('Erro ao desmembrar romaneio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * DELETE /api/romaneios/:id
 * 
 * Remove um romaneio (apenas ADMINISTRATIVO)
 */
router.delete('/:id', requireRole('ADMINISTRATIVO'), (req, res) => {
  try {
    const romaneioId = req.params.id;
    const db = getDatabase();
    
    db.run('DELETE FROM romaneios WHERE id = ?', [romaneioId], function(err) {
      if (err) {
        logger.error('Erro ao deletar romaneio:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar romaneio'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }
      
      logger.info(`✅ Romaneio deletado: ${romaneioId}`);
      res.json({
        success: true,
        message: 'Romaneio deletado com sucesso'
      });
    });
  } catch (error) {
    logger.error('Erro ao deletar romaneio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;



