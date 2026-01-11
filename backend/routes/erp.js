/**
 * Rotas de Integração ERP
 * 
 * Endpoints para o ERP enviar notas fiscais e romaneios
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { apiKeyMiddleware } = require('../middleware/auth');

/**
 * POST /api/erp/notas-fiscais
 * 
 * Recebe nota fiscal do ERP
 */
router.post('/notas-fiscais', apiKeyMiddleware, (req, res) => {
  try {
    const dadosNF = req.body;
    
    // Validar dados obrigatórios
    if (!dadosNF.numeroNota || !dadosNF.clienteNome || !dadosNF.clienteCnpjCpf || !dadosNF.itens) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios faltando: numeroNota, clienteNome, clienteCnpjCpf, itens'
      });
    }
    
    const db = getDatabase();
    const notaId = uuidv4();
    
    // Verificar se já existe (por erpId ou número+serie)
    db.get(
      'SELECT id FROM notas_fiscais WHERE erpId = ? OR (numeroNota = ? AND serie = ?)',
      [dadosNF.erpId || null, dadosNF.numeroNota, dadosNF.serie || '1'],
      (err, existing) => {
        if (err) {
          logger.error('Erro ao verificar nota fiscal:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao processar nota fiscal'
          });
        }
        
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Nota fiscal já recebida',
            notaFiscalId: existing.id
          });
        }
        
        // Calcular totais
        const valorTotal = dadosNF.valorTotal || dadosNF.itens.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
        const pesoTotal = dadosNF.pesoTotal || dadosNF.itens.reduce((sum, item) => sum + (item.peso || 0), 0);
        const volumeTotal = dadosNF.volumeTotal || dadosNF.itens.reduce((sum, item) => sum + (item.volume || 0), 0);
        
        // Inserir nota fiscal
        db.run(
          `INSERT INTO notas_fiscais 
           (id, erpId, numeroNota, serie, numeroPedido, clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, clienteEstado, clienteCep, dataEmissao, dataVencimento, valorTotal, pesoTotal, volumeTotal, chaveAcesso, observacoes, vendedorId, vendedorNome, clienteTelefone1, clienteTelefone2, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE_DESMEMBRAMENTO')`,
          [
            notaId,
            dadosNF.erpId || null,
            dadosNF.numeroNota,
            dadosNF.serie || '1',
            dadosNF.numeroPedido || null,
            dadosNF.clienteNome,
            dadosNF.clienteCnpjCpf,
            dadosNF.clienteEndereco || null,
            dadosNF.clienteCidade || null,
            dadosNF.clienteEstado || null,
            dadosNF.clienteCep || null,
            dadosNF.dataEmissao || new Date().toISOString().split('T')[0],
            dadosNF.dataVencimento || null,
            valorTotal,
            pesoTotal,
            volumeTotal,
            dadosNF.chaveAcesso || null,
            dadosNF.observacoes || null,
            dadosNF.vendedorId || null,
            dadosNF.vendedorNome || null,
            dadosNF.clienteTelefone1 || null,
            dadosNF.clienteTelefone2 || null
          ],
          function(err) {
            if (err) {
              logger.error('Erro ao inserir nota fiscal:', err);
              return res.status(500).json({
                success: false,
                message: 'Erro ao processar nota fiscal'
              });
            }
            
            // Inserir itens
            const stmt = db.prepare(`
              INSERT INTO nota_fiscal_itens 
              (id, notaFiscalId, descricao, quantidade, unidade, valorUnitario, valorTotal, peso, volume, ncm, cfop, codigoProduto, codigoInterno, codigoBarrasEan)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            let itemsInserted = 0;
            let itemsError = null;
            
            dadosNF.itens.forEach((item) => {
              const itemId = uuidv4();
              stmt.run([
                itemId,
                notaId,
                item.descricao,
                item.quantidade,
                item.unidade || 'UN',
                item.valorUnitario || 0,
                item.valorTotal || 0,
                item.peso || 0,
                item.volume || 0,
                item.ncm || null,
                item.cfop || null,
                item.codigoProduto || null,
                item.codigoInterno || null,
                item.codigoBarrasEan || null
              ], (err) => {
                if (err) {
                  itemsError = err;
                  logger.error('Erro ao inserir item:', err);
                } else {
                  itemsInserted++;
                  if (itemsInserted === dadosNF.itens.length) {
                    stmt.finalize((err) => {
                      if (err || itemsError) {
                        logger.error('Erro ao finalizar inserção de itens:', err || itemsError);
                      }
                      
                      logger.info(`✅ Nota fiscal recebida: ${dadosNF.numeroNota} (${dadosNF.itens.length} itens)`);
                      res.status(201).json({
                        success: true,
                        message: 'Nota fiscal recebida com sucesso',
                        notaFiscalId: notaId,
                        status: 'PENDENTE_DESMEMBRAMENTO'
                      });
                    });
                  }
                }
              });
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('Erro ao processar nota fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar nota fiscal'
    });
  }
});

module.exports = router;
