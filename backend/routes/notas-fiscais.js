/**
 * Rotas de Notas Fiscais
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
 * GET /api/notas-fiscais
 * 
 * Lista todas as notas fiscais
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { status, pedidoId } = req.query;
    
    let query = 'SELECT * FROM notas_fiscais WHERE 1=1';
    const params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (pedidoId) {
      query += ' AND pedidoId = ?';
      params.push(pedidoId);
    }
    
    query += ' ORDER BY dataEmissao DESC, createdAt DESC';
    
    db.all(query, params, (err, notas) => {
      if (err) {
        logger.error('Erro ao buscar notas fiscais:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar notas fiscais'
        });
      }
      
      res.json({
        success: true,
        notasFiscais: notas
      });
    });
  } catch (error) {
    logger.error('Erro ao listar notas fiscais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/notas-fiscais/:id
 * 
 * Busca uma nota fiscal específica com seus itens
 */
router.get('/:id', (req, res) => {
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
      
      // Buscar itens da nota fiscal
      db.all('SELECT * FROM nota_fiscal_itens WHERE notaFiscalId = ? ORDER BY descricao', [notaId], (err, itens) => {
        if (err) {
          logger.error('Erro ao buscar itens da nota fiscal:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar itens da nota fiscal'
          });
        }
        
        res.json({
          success: true,
          notaFiscal: {
            ...nota,
            itens: itens || []
          }
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
 * POST /api/notas-fiscais
 * 
 * Cria uma nova nota fiscal (LOGISTICA)
 */
router.post('/', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const { numeroNota, serie, pedidoId, clienteNome, clienteCnpjCpf, clienteEndereco, dataEmissao, dataVencimento, valorTotal, chaveAcesso, observacoes, itens } = req.body;
    
    if (!numeroNota || !clienteNome || !clienteCnpjCpf || !dataEmissao) {
      return res.status(400).json({
        success: false,
        message: 'Número da nota, nome do cliente, CNPJ/CPF e data de emissão são obrigatórios'
      });
    }
    
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nota fiscal deve ter pelo menos um item'
      });
    }
    
    const db = getDatabase();
    const notaId = uuidv4();
    
    // Verificar se número da nota já existe
    db.get('SELECT id FROM notas_fiscais WHERE numeroNota = ? AND serie = ?', [numeroNota, serie || '1'], (err, existing) => {
      if (err) {
        logger.error('Erro ao verificar nota fiscal:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar nota fiscal'
        });
      }
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Nota fiscal já existe'
        });
      }
      
      // Calcular valor total se não fornecido
      let valorTotalFinal = valorTotal || 0;
      if (!valorTotal) {
        valorTotalFinal = itens.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
      }
      
      // Inserir nota fiscal
      const { vendedorId, vendedorNome, clienteTelefone1, clienteTelefone2 } = req.body;
      db.run(
        `INSERT INTO notas_fiscais 
         (id, numeroNota, serie, pedidoId, clienteNome, clienteCnpjCpf, clienteEndereco, dataEmissao, dataVencimento, valorTotal, chaveAcesso, observacoes, vendedorId, vendedorNome, clienteTelefone1, clienteTelefone2, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE')`,
        [notaId, numeroNota, serie || '1', pedidoId || null, clienteNome, clienteCnpjCpf, clienteEndereco || null, dataEmissao, dataVencimento || null, valorTotalFinal, chaveAcesso || null, observacoes || null, vendedorId || null, vendedorNome || null, clienteTelefone1 || null, clienteTelefone2 || null],
        function(err) {
          if (err) {
            logger.error('Erro ao inserir nota fiscal:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao criar nota fiscal'
            });
          }
          
          // Inserir itens
          const stmt = db.prepare(`
            INSERT INTO nota_fiscal_itens (id, notaFiscalId, descricao, quantidade, unidade, valorUnitario, valorTotal, ncm, cfop)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          let itemsInserted = 0;
          let itemsError = null;
          
          itens.forEach((item) => {
            const itemId = uuidv4();
            const valorTotalItem = item.valorTotal || (item.valorUnitario * item.quantidade);
            
            stmt.run(
              [itemId, notaId, item.descricao, item.quantidade, item.unidade || 'UN', item.valorUnitario, valorTotalItem, item.ncm || null, item.cfop || null],
              (err) => {
                if (err) {
                  itemsError = err;
                  logger.error('Erro ao inserir item da nota fiscal:', err);
                } else {
                  itemsInserted++;
                  if (itemsInserted === itens.length) {
                    stmt.finalize((err) => {
                      if (err || itemsError) {
                        logger.error('Erro ao finalizar inserção de itens:', err || itemsError);
                        return res.status(500).json({
                          success: false,
                          message: 'Nota fiscal criada mas houve erro ao inserir itens'
                        });
                      }
                      
                      logger.info(`✅ Nota fiscal criada: ${numeroNota}`);
                      res.status(201).json({
                        success: true,
                        message: 'Nota fiscal criada com sucesso',
                        notaFiscal: {
                          id: notaId,
                          numeroNota,
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
    logger.error('Erro ao criar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * PUT /api/notas-fiscais/:id
 * 
 * Atualiza uma nota fiscal
 */
router.put('/:id', requireRole('LOGISTICA', 'ADMINISTRATIVO'), (req, res) => {
  try {
    const notaId = req.params.id;
    const { clienteNome, clienteCnpjCpf, clienteEndereco, dataEmissao, dataVencimento, valorTotal, status, chaveAcesso, observacoes, itens } = req.body;
    
    const db = getDatabase();
    
    // Verificar se nota fiscal existe
    db.get('SELECT id FROM notas_fiscais WHERE id = ?', [notaId], (err, nota) => {
      if (err) {
        logger.error('Erro ao verificar nota fiscal:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar nota fiscal'
        });
      }
      
      if (!nota) {
        return res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada'
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
      if (dataEmissao !== undefined) {
        updates.push('dataEmissao = ?');
        values.push(dataEmissao);
      }
      if (dataVencimento !== undefined) {
        updates.push('dataVencimento = ?');
        values.push(dataVencimento);
      }
      if (valorTotal !== undefined) {
        updates.push('valorTotal = ?');
        values.push(valorTotal);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (chaveAcesso !== undefined) {
        updates.push('chaveAcesso = ?');
        values.push(chaveAcesso);
      }
      if (observacoes !== undefined) {
        updates.push('observacoes = ?');
        values.push(observacoes);
      }
      
      if (updates.length > 0) {
        updates.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(notaId);
        
        const query = `UPDATE notas_fiscais SET ${updates.join(', ')} WHERE id = ?`;
        
        db.run(query, values, function(err) {
          if (err) {
            logger.error('Erro ao atualizar nota fiscal:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao atualizar nota fiscal'
            });
          }
          
          // Atualizar itens se fornecidos
          if (itens && Array.isArray(itens)) {
            // Deletar itens antigos
            db.run('DELETE FROM nota_fiscal_itens WHERE notaFiscalId = ?', [notaId], (err) => {
              if (err) {
                logger.error('Erro ao deletar itens antigos:', err);
              }
              
              // Inserir novos itens
              const stmt = db.prepare(`
                INSERT INTO nota_fiscal_itens (id, notaFiscalId, descricao, quantidade, unidade, valorUnitario, valorTotal, ncm, cfop)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              
              let itemsInserted = 0;
              itens.forEach((item) => {
                const itemId = uuidv4();
                const valorTotalItem = item.valorTotal || (item.valorUnitario * item.quantidade);
                
                stmt.run(
                  [itemId, notaId, item.descricao, item.quantidade, item.unidade || 'UN', item.valorUnitario, valorTotalItem, item.ncm || null, item.cfop || null],
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
          
          logger.info(`✅ Nota fiscal atualizada: ${notaId}`);
          res.json({
            success: true,
            message: 'Nota fiscal atualizada com sucesso'
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
    logger.error('Erro ao atualizar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * DELETE /api/notas-fiscais/:id
 * 
 * Remove uma nota fiscal (apenas ADMINISTRATIVO)
 */
router.delete('/:id', requireRole('ADMINISTRATIVO'), (req, res) => {
  try {
    const notaId = req.params.id;
    const db = getDatabase();
    
    db.run('DELETE FROM notas_fiscais WHERE id = ?', [notaId], function(err) {
      if (err) {
        logger.error('Erro ao deletar nota fiscal:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar nota fiscal'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
      }
      
      logger.info(`✅ Nota fiscal deletada: ${notaId}`);
      res.json({
        success: true,
        message: 'Nota fiscal deletada com sucesso'
      });
    });
  } catch (error) {
    logger.error('Erro ao deletar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;







