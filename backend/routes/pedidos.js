/**
 * Rotas de Pedidos
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
 * GET /api/pedidos
 * 
 * Lista todos os pedidos e notas fiscais desmembradas
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { status, incluirNotasFiscais } = req.query;
    
    // Buscar pedidos
    let queryPedidos = `
      SELECT p.*, 
        COUNT(pi.id) as totalItens,
        COALESCE(SUM(pi.valorTotal), 0) as valorTotalCalculado,
        'PEDIDO' as tipo
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON p.id = pi.pedidoId
      WHERE 1=1
    `;
    const paramsPedidos = [];
    
    if (status) {
      queryPedidos += ' AND p.status = ?';
      paramsPedidos.push(status);
    }
    
    queryPedidos += ' GROUP BY p.id';
    
    db.all(queryPedidos, paramsPedidos, (err, pedidos) => {
      if (err) {
        logger.error('Erro ao buscar pedidos:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar pedidos'
        });
      }
      
      // Se incluirNotasFiscais for true, buscar também notas fiscais desmembradas
      if (incluirNotasFiscais === 'true') {
        db.all(`
          SELECT nf.id,
            nf.numeroPedido as numeroPedido,
            nf.clienteNome,
            nf.valorTotal,
            nf.status,
            nf.createdAt,
            COUNT(c.id) as quantidadeCargas,
            'NOTA_FISCAL' as tipo,
            nf.numeroNota,
            nf.serie
          FROM notas_fiscais nf
          LEFT JOIN cargas c ON nf.id = c.notaFiscalId
          WHERE nf.status = 'DESMEMBRADA'
          GROUP BY nf.id
          ORDER BY nf.createdAt DESC
        `, [], (err, notasFiscais) => {
          if (err) {
            logger.error('Erro ao buscar notas fiscais:', err);
            // Retornar apenas pedidos em caso de erro
            return res.json({
              success: true,
              pedidos: pedidos || [],
              notasFiscais: []
            });
          }
          
          // Combinar pedidos e notas fiscais
          const todos = [
            ...(pedidos || []).map(p => ({ ...p, tipo: 'PEDIDO' })),
            ...(notasFiscais || []).map(nf => ({ 
              ...nf, 
              tipo: 'NOTA_FISCAL',
              numeroPedido: nf.numeroPedido || `NF ${nf.numeroNota}`
            }))
          ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          res.json({
            success: true,
            pedidos: todos,
            notasFiscais: notasFiscais || []
          });
        });
      } else {
        res.json({
          success: true,
          pedidos: pedidos || [],
          notasFiscais: []
        });
      }
    });
  } catch (error) {
    logger.error('Erro ao listar pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/pedidos/:id
 * 
 * Busca um pedido específico com seus itens
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const pedidoId = req.params.id;
    
    // Buscar pedido
    db.get('SELECT * FROM pedidos WHERE id = ?', [pedidoId], (err, pedido) => {
      if (err) {
        logger.error('Erro ao buscar pedido:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar pedido'
        });
      }
      
      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }
      
      // Buscar itens do pedido
      db.all('SELECT * FROM pedido_itens WHERE pedidoId = ? ORDER BY descricao', [pedidoId], (err, itens) => {
        if (err) {
          logger.error('Erro ao buscar itens do pedido:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar itens do pedido'
          });
        }
        
        res.json({
          success: true,
          pedido: {
            ...pedido,
            itens: itens || []
          }
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * POST /api/pedidos
 * 
 * Cria um novo pedido (LOGISTICA)
 */
router.post('/', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const { numeroPedido, clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, clienteEstado, clienteCep, valorTotal, observacoes, itens } = req.body;
    
    if (!numeroPedido || !clienteNome) {
      return res.status(400).json({
        success: false,
        message: 'Número do pedido e nome do cliente são obrigatórios'
      });
    }
    
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pedido deve ter pelo menos um item'
      });
    }
    
    const db = getDatabase();
    const pedidoId = uuidv4();
    
    // Verificar se número do pedido já existe
    db.get('SELECT id FROM pedidos WHERE numeroPedido = ?', [numeroPedido], (err, existing) => {
      if (err) {
        logger.error('Erro ao verificar pedido:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar pedido'
        });
      }
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Número do pedido já existe'
        });
      }
      
      // Calcular valor total se não fornecido
      let valorTotalFinal = valorTotal || 0;
      if (!valorTotal) {
        valorTotalFinal = itens.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
      }
      
      // Inserir pedido
      db.run(
        `INSERT INTO pedidos 
         (id, numeroPedido, clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, clienteEstado, clienteCep, valorTotal, observacoes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE')`,
        [pedidoId, numeroPedido, clienteNome, clienteCnpjCpf || null, clienteEndereco || null, clienteCidade || null, clienteEstado || null, clienteCep || null, valorTotalFinal, observacoes || null],
        function(err) {
          if (err) {
            logger.error('Erro ao inserir pedido:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao criar pedido'
            });
          }
          
          // Inserir itens
          const stmt = db.prepare(`
            INSERT INTO pedido_itens (id, pedidoId, descricao, quantidade, unidade, valorUnitario, valorTotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          let itemsInserted = 0;
          let itemsError = null;
          
          itens.forEach((item) => {
            const itemId = uuidv4();
            const valorTotalItem = item.valorTotal || (item.valorUnitario * item.quantidade);
            
            stmt.run(
              [itemId, pedidoId, item.descricao, item.quantidade, item.unidade || 'UN', item.valorUnitario, valorTotalItem],
              (err) => {
                if (err) {
                  itemsError = err;
                  logger.error('Erro ao inserir item:', err);
                } else {
                  itemsInserted++;
                  if (itemsInserted === itens.length) {
                    stmt.finalize((err) => {
                      if (err || itemsError) {
                        logger.error('Erro ao finalizar inserção de itens:', err || itemsError);
                        return res.status(500).json({
                          success: false,
                          message: 'Pedido criado mas houve erro ao inserir itens'
                        });
                      }
                      
                      logger.info(`✅ Pedido criado: ${numeroPedido}`);
                      res.status(201).json({
                        success: true,
                        message: 'Pedido criado com sucesso',
                        pedido: {
                          id: pedidoId,
                          numeroPedido,
                          clienteNome,
                          valorTotal: valorTotalFinal
                        }
                      });
                    });
                  }
                }
              }
            );
          });
        }
      );
    });
  } catch (error) {
    logger.error('Erro ao criar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * PUT /api/pedidos/:id
 * 
 * Atualiza um pedido
 */
router.put('/:id', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const pedidoId = req.params.id;
    const { clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, clienteEstado, clienteCep, valorTotal, observacoes, status, itens } = req.body;
    
    const db = getDatabase();
    
    // Verificar se pedido existe
    db.get('SELECT id FROM pedidos WHERE id = ?', [pedidoId], (err, pedido) => {
      if (err) {
        logger.error('Erro ao verificar pedido:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar pedido'
        });
      }
      
      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }
      
      // Montar query de atualização
      const updates = [];
      const values = [];
      
      if (clienteNome !== undefined) {
        updates.push('clienteNome = ?');
        values.push(clienteNome);
      }
      if (clienteCnpjCpf !== undefined) {
        updates.push('clienteCnpjCpf = ?');
        values.push(clienteCnpjCpf);
      }
      if (clienteEndereco !== undefined) {
        updates.push('clienteEndereco = ?');
        values.push(clienteEndereco);
      }
      if (clienteCidade !== undefined) {
        updates.push('clienteCidade = ?');
        values.push(clienteCidade);
      }
      if (clienteEstado !== undefined) {
        updates.push('clienteEstado = ?');
        values.push(clienteEstado);
      }
      if (clienteCep !== undefined) {
        updates.push('clienteCep = ?');
        values.push(clienteCep);
      }
      if (valorTotal !== undefined) {
        updates.push('valorTotal = ?');
        values.push(valorTotal);
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
        values.push(pedidoId);
        
        const query = `UPDATE pedidos SET ${updates.join(', ')} WHERE id = ?`;
        
        db.run(query, values, function(err) {
          if (err) {
            logger.error('Erro ao atualizar pedido:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao atualizar pedido'
            });
          }
          
          // Atualizar itens se fornecidos
          if (itens && Array.isArray(itens)) {
            // Deletar itens antigos
            db.run('DELETE FROM pedido_itens WHERE pedidoId = ?', [pedidoId], (err) => {
              if (err) {
                logger.error('Erro ao deletar itens antigos:', err);
              }
              
              // Inserir novos itens
              const stmt = db.prepare(`
                INSERT INTO pedido_itens (id, pedidoId, descricao, quantidade, unidade, valorUnitario, valorTotal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `);
              
              let itemsInserted = 0;
              itens.forEach((item) => {
                const itemId = uuidv4();
                const valorTotalItem = item.valorTotal || (item.valorUnitario * item.quantidade);
                
                stmt.run(
                  [itemId, pedidoId, item.descricao, item.quantidade, item.unidade || 'UN', item.valorUnitario, valorTotalItem],
                  (err) => {
                    if (!err) itemsInserted++;
                    if (itemsInserted === itens.length) {
                      stmt.finalize();
                    }
                  }
                );
              });
            });
          }
          
          logger.info(`✅ Pedido atualizado: ${pedidoId}`);
          res.json({
            success: true,
            message: 'Pedido atualizado com sucesso'
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
    logger.error('Erro ao atualizar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * DELETE /api/pedidos/:id
 * 
 * Remove um pedido (apenas ADMINISTRATIVO)
 */
router.delete('/:id', requireRole('ADMINISTRATIVO'), (req, res) => {
  try {
    const pedidoId = req.params.id;
    const db = getDatabase();
    
    db.run('DELETE FROM pedidos WHERE id = ?', [pedidoId], function(err) {
      if (err) {
        logger.error('Erro ao deletar pedido:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar pedido'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
      }
      
      logger.info(`✅ Pedido deletado: ${pedidoId}`);
      res.json({
        success: true,
        message: 'Pedido deletado com sucesso'
      });
    });
  } catch (error) {
    logger.error('Erro ao deletar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;

