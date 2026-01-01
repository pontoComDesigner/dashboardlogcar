/**
 * Rotas para integração com ERP
 * 
 * Endpoints públicos para receber dados do ERP e retornar cargas
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { registrarAcao } = require('../services/auditoriaService');

// Middleware para autenticação de API Key (simplificado)
// Em produção, usar método mais seguro
const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const validApiKey = process.env.ERP_API_KEY || 'default-api-key-change-me';
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key inválida'
    });
  }
  
  next();
};

/**
 * POST /api/erp/notas-fiscais
 * 
 * Recebe nota fiscal do ERP (webhook)
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
        db.run(`
          INSERT INTO notas_fiscais 
          (id, numeroNota, serie, numeroPedido, clienteNome, clienteCnpjCpf, 
           clienteEndereco, clienteCidade, clienteEstado, clienteCep,
           dataEmissao, dataVencimento, valorTotal, chaveAcesso, observacoes,
           erpId, recebidoDoErp, pesoTotal, volumeTotal, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'PENDENTE_DESMEMBRAMENTO')
        `, [
          notaId,
          dadosNF.numeroNota,
          dadosNF.serie || '1',
          dadosNF.numeroPedido || null,
          dadosNF.clienteNome,
          dadosNF.clienteCnpjCpf,
          dadosNF.clienteEndereco || null,
          dadosNF.clienteCidade || null,
          dadosNF.clienteEstado || null,
          dadosNF.clienteCep || null,
          dadosNF.dataEmissao || new Date().toISOString(),
          dadosNF.dataVencimento || null,
          valorTotal,
          dadosNF.chaveAcesso || null,
          dadosNF.observacoes || null,
          dadosNF.erpId || null,
          pesoTotal,
          volumeTotal
        ], function(err) {
          if (err) {
            logger.error('Erro ao inserir nota fiscal:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao salvar nota fiscal'
            });
          }
          
          // Inserir itens
          const stmt = db.prepare(`
            INSERT INTO nota_fiscal_itens 
            (id, notaFiscalId, descricao, quantidade, unidade, valorUnitario, valorTotal, ncm, cfop, peso, volume, codigoProduto, codigoInterno, codigoBarrasEan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          let itemsInserted = 0;
          let itemsError = null;
          
          if (!dadosNF.itens || dadosNF.itens.length === 0) {
            stmt.finalize();
            return res.status(400).json({
              success: false,
              message: 'Nota fiscal deve ter pelo menos um item'
            });
          }
          
          dadosNF.itens.forEach((item, index) => {
            const itemId = uuidv4();
            const valorTotalItem = item.valorTotal || (item.valorUnitario * item.quantidade);
            
            stmt.run(
              [
                itemId, notaId, item.descricao, item.quantidade, 
                item.unidade || 'UN', item.valorUnitario || 0, valorTotalItem,
                item.ncm || null, item.cfop || null,
                item.peso || null, item.volume || null, item.codigoProduto || null,
                item.codigoInterno || null, item.codigoBarrasEan || null
              ],
              (err) => {
                if (err) {
                  itemsError = err;
                  logger.error(`Erro ao inserir item ${index + 1}:`, err);
                  logger.error('Item:', JSON.stringify(item, null, 2));
                } else {
                  itemsInserted++;
                }
                
                // Verificar se todos os itens foram processados
                if (itemsInserted + (itemsError ? 1 : 0) === dadosNF.itens.length) {
                  stmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                      logger.error('Erro ao finalizar inserção de itens:', finalizeErr);
                    }
                    
                    if (itemsError) {
                      logger.error('Erro ao inserir itens da nota fiscal:', itemsError);
                      return res.status(500).json({
                        success: false,
                        message: 'Erro ao inserir itens da nota fiscal: ' + itemsError.message
                      });
                    }
                    
                    registrarAcao(
                      null,
                      'NOTA_FISCAL_RECEBIDA',
                      'notas_fiscais',
                      notaId,
                      null,
                      { numeroNota: dadosNF.numeroNota, erpId: dadosNF.erpId },
                      req
                    );
                    
                    logger.info(`✅ Nota fiscal recebida do ERP: ${dadosNF.numeroNota}`);
                    res.status(201).json({
                      success: true,
                      message: 'Nota fiscal recebida com sucesso',
                      notaFiscalId: notaId,
                      status: 'PENDENTE_DESMEMBRAMENTO'
                    });
                  });
                }
              }
            );
          });
        });
      }
    );
  } catch (error) {
    logger.error('Erro ao processar nota fiscal do ERP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/erp/cargas/:notaFiscalId
 * 
 * Retorna cargas de uma nota fiscal para o ERP (SPOOL)
 */
router.get('/cargas/:notaFiscalId', apiKeyMiddleware, (req, res) => {
  try {
    const db = getDatabase();
    const notaFiscalId = req.params.notaFiscalId;
    
    // Buscar cargas
    db.all(`
      SELECT c.*, nf.numeroNota, nf.numeroPedido, nf.clienteNome, nf.clienteEndereco,
             nf.clienteCidade, nf.clienteEstado, nf.clienteCep, nf.observacoes as observacoesNF
      FROM cargas c
      INNER JOIN notas_fiscais nf ON c.notaFiscalId = nf.id
      WHERE c.notaFiscalId = ?
      ORDER BY c.numeroCarga
    `, [notaFiscalId], (err, cargas) => {
      if (err) {
        logger.error('Erro ao buscar cargas:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar cargas'
        });
      }
      
      if (cargas.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhuma carga encontrada para esta nota fiscal'
        });
      }
      
      // Buscar itens de cada carga
      const cargasComItens = [];
      let cargasProcessadas = 0;
      
      cargas.forEach((carga) => {
        db.all(`
          SELECT ci.*, nfi.descricao, nfi.unidade, nfi.ncm, nfi.cfop, nfi.codigoProduto, nfi.codigoInterno, nfi.codigoBarrasEan
          FROM carga_itens ci
          INNER JOIN nota_fiscal_itens nfi ON ci.notaFiscalItemId = nfi.id
          WHERE ci.cargaId = ?
          ORDER BY ci.ordem
        `, [carga.id], (err, itens) => {
          if (err) {
            logger.error('Erro ao buscar itens da carga:', err);
          }
          
          cargasComItens.push({
            ...carga,
            itens: itens || []
          });
          
          cargasProcessadas++;
          if (cargasProcessadas === cargas.length) {
            // Formato para SPOOL de impressão
            const formatoSpool = cargasComItens.map(carga => ({
              numeroCarga: carga.numeroCarga,
              numeroNota: carga.numeroNota,
              numeroPedido: carga.numeroPedido,
              notaFiscalId: carga.notaFiscalId,
              cliente: {
                nome: carga.clienteNome,
                cnpjCpf: carga.clienteCnpjCpf,
                endereco: carga.clienteEndereco,
                cidade: carga.clienteCidade,
                estado: carga.clienteEstado,
                cep: carga.clienteCep
              },
              dataVencimento: carga.dataVencimento,
              observacoesNF: carga.observacoesNF,
              transportadora: carga.transportadora,
              veiculo: carga.veiculo,
              motorista: carga.motorista,
              dataSaida: carga.dataSaida,
              dataPrevisaoEntrega: carga.dataPrevisaoEntrega,
              pesoTotal: carga.pesoTotal,
              volumeTotal: carga.volumeTotal,
              valorTotal: carga.valorTotal,
              status: carga.status === 'PENDENTE_DESMEMBRAMENTO' ? 'PENDENTE DE DESMEMBRAMENTO' : carga.status,
              itens: carga.itens.map(item => ({
                descricao: item.descricao,
                codigoProduto: item.codigoProduto,
                codigoInterno: item.codigoInterno,
                codigoBarrasEan: item.codigoBarrasEan,
                quantidade: item.quantidade,
                unidade: item.unidade,
                valorTotal: item.valorTotal,
                peso: item.peso,
                volume: item.volume,
                ncm: item.ncm,
                cfop: item.cfop
              }))
            }));
            
            res.json({
              success: true,
              notaFiscalId,
              quantidadeCargas: cargasComItens.length,
              cargas: formatoSpool
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
 * POST /api/erp/cargas/:cargaId/marcar-enviada
 * 
 * Marca carga como enviada ao ERP
 */
router.post('/cargas/:cargaId/marcar-enviada', apiKeyMiddleware, (req, res) => {
  try {
    const db = getDatabase();
    const cargaId = req.params.cargaId;
    
    db.run(`
      UPDATE cargas 
      SET erpEnviado = 1, erpEnviadoAt = CURRENT_TIMESTAMP, status = 'ENVIADA'
      WHERE id = ?
    `, [cargaId], function(err) {
      if (err) {
        logger.error('Erro ao marcar carga como enviada:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar carga'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Carga não encontrada'
        });
      }
      
      res.json({
        success: true,
        message: 'Carga marcada como enviada'
      });
    });
  } catch (error) {
    logger.error('Erro ao marcar carga:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/erp/pedidos/:notaFiscalId
 * 
 * Retorna pedidos desmembrados de uma nota fiscal para o ERP
 * As cargas desmembradas são retornadas como pedidos
 */
router.get('/pedidos/:notaFiscalId', apiKeyMiddleware, (req, res) => {
  try {
    const db = getDatabase();
    const notaFiscalId = req.params.notaFiscalId;
    
    // Buscar cargas (que são os pedidos desmembrados)
    db.all(`
      SELECT c.*, nf.numeroNota, nf.numeroPedido as numeroPedidoOriginal
      FROM cargas c
      INNER JOIN notas_fiscais nf ON c.notaFiscalId = nf.id
      WHERE c.notaFiscalId = ?
      ORDER BY c.numeroCarga
    `, [notaFiscalId], (err, cargas) => {
      if (err) {
        logger.error('Erro ao buscar pedidos:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar pedidos'
        });
      }
      
      if (cargas.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhum pedido encontrado para esta nota fiscal'
        });
      }
      
      // Buscar itens de cada carga
      const pedidosComItens = [];
      let processadas = 0;
      
      cargas.forEach((carga) => {
        db.all(`
          SELECT ci.*, nfi.descricao, nfi.unidade, nfi.ncm, nfi.cfop, nfi.codigoProduto, 
                 nfi.codigoInterno, nfi.codigoBarrasEan, nfi.valorUnitario
          FROM carga_itens ci
          INNER JOIN nota_fiscal_itens nfi ON ci.notaFiscalItemId = nfi.id
          WHERE ci.cargaId = ?
          ORDER BY ci.ordem
        `, [carga.id], (err, itens) => {
          if (err) {
            logger.error('Erro ao buscar itens do pedido:', err);
          }
          
          // Formatar como pedido (carga = pedido desmembrado)
          pedidosComItens.push({
            numeroPedido: carga.numeroCarga, // Número da carga é o número do pedido desmembrado
            numeroNota: carga.numeroNota,
            numeroPedidoOriginal: carga.numeroPedidoOriginal || carga.numeroPedido,
            notaFiscalId: carga.notaFiscalId,
            cliente: {
              nome: carga.clienteNome,
              cnpjCpf: carga.clienteCnpjCpf,
              endereco: carga.clienteEndereco,
              cidade: carga.clienteCidade,
              estado: carga.clienteEstado,
              cep: carga.clienteCep
            },
            dataVencimento: carga.dataVencimento,
            observacoesNF: carga.observacoesNF,
            pesoTotal: carga.pesoTotal,
            volumeTotal: carga.volumeTotal,
            valorTotal: carga.valorTotal,
            status: carga.status,
            itens: (itens || []).map(item => ({
              descricao: item.descricao,
              codigoProduto: item.codigoProduto,
              codigoInterno: item.codigoInterno,
              codigoBarrasEan: item.codigoBarrasEan,
              quantidade: item.quantidade,
              unidade: item.unidade,
              valorUnitario: item.valorUnitario,
              valorTotal: item.valorTotal,
              peso: item.peso,
              volume: item.volume,
              ncm: item.ncm,
              cfop: item.cfop
            }))
          });
          
          processadas++;
          if (processadas === cargas.length) {
            res.json({
              success: true,
              notaFiscalId,
              quantidadePedidos: pedidosComItens.length,
              pedidos: pedidosComItens
            });
          }
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao buscar pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * POST /api/erp/romaneios
 * 
 * Recebe informações de romaneios do ERP para visualização
 * O ERP monta os romaneios e envia apenas as informações para o DashboardLogCar
 * O sistema apenas salva as informações para visualização (não cria pedidos, apenas associa os que já existem)
 */
router.post('/romaneios', apiKeyMiddleware, (req, res) => {
  try {
    const dadosRomaneio = req.body;
    
    // Validar dados obrigatórios
    if (!dadosRomaneio.numeroRomaneio || !dadosRomaneio.pedidos || !Array.isArray(dadosRomaneio.pedidos)) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios faltando: numeroRomaneio, pedidos (array de números de pedido)'
      });
    }
    
    const db = getDatabase();
    const romaneioId = uuidv4();
    
    // Verificar se número do romaneio já existe
    db.get('SELECT id FROM romaneios WHERE numeroRomaneio = ?', [dadosRomaneio.numeroRomaneio], (err, existing) => {
      if (err) {
        logger.error('Erro ao verificar romaneio:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao processar romaneio'
        });
      }
      
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Romaneio já existe',
          romaneioId: existing.id
        });
      }
      
      // Inserir romaneio
      db.run(`
        INSERT INTO romaneios 
        (id, numeroRomaneio, transportadora, veiculo, motorista, dataSaida, dataPrevisaoEntrega, observacoes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ABERTO')
      `, [
        romaneioId,
        dadosRomaneio.numeroRomaneio,
        dadosRomaneio.transportadora || null,
        dadosRomaneio.veiculo || null,
        dadosRomaneio.motorista || null,
        dadosRomaneio.dataSaida || null,
        dadosRomaneio.dataPrevisaoEntrega || null,
        dadosRomaneio.observacoes || null
      ], function(err) {
        if (err) {
          logger.error('Erro ao inserir romaneio:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao criar romaneio'
          });
        }
        
        // Associar pedidos existentes ao romaneio (apenas para visualização)
        // Os pedidos são identificados pelo número do pedido (que são os números das cargas)
        const pedidosAssociados = [];
        let processadas = 0;
        let erroOcorrido = null;
        
        if (dadosRomaneio.pedidos.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Romaneio deve ter pelo menos um pedido'
          });
        }
        
        // Buscar pedidos pelos números fornecidos
        dadosRomaneio.pedidos.forEach((numeroPedido, index) => {
          // Primeiro tentar buscar pedido pelo numeroPedido
          db.get('SELECT id FROM pedidos WHERE numeroPedido = ?', [numeroPedido], (err, pedido) => {
            if (err) {
              erroOcorrido = err;
              logger.error('Erro ao buscar pedido:', err);
              processadas++;
              if (processadas === dadosRomaneio.pedidos.length) {
                return finalizarProcessamento();
              }
              return;
            }
            
            if (pedido) {
              // Pedido existe - associar ao romaneio
              associarPedidoAoRomaneio(pedido.id, index);
            } else {
              // Pedido não encontrado - pode ser que ainda não foi criado (normal, pois vem do APP)
              // Apenas logar e continuar
              logger.warn(`Pedido ${numeroPedido} não encontrado no sistema (pode ser que ainda não foi criado)`);
              processadas++;
              if (processadas === dadosRomaneio.pedidos.length) {
                return finalizarProcessamento();
              }
            }
          });
        });
        
        function associarPedidoAoRomaneio(pedidoId, ordem) {
          const relacionamentoId = uuidv4();
          
          db.run(`
            INSERT INTO romaneio_pedidos (id, romaneioId, pedidoId, ordem)
            VALUES (?, ?, ?, ?)
          `, [relacionamentoId, romaneioId, pedidoId, ordem], (err) => {
            if (err) {
              erroOcorrido = err;
              logger.error('Erro ao associar pedido ao romaneio:', err);
            } else {
              pedidosAssociados.push({ pedidoId, ordem });
            }
            
            processadas++;
            if (processadas === dadosRomaneio.pedidos.length) {
              finalizarProcessamento();
            }
          });
        }
        
        function finalizarProcessamento() {
          if (erroOcorrido) {
            logger.error('Erro ao processar romaneio:', erroOcorrido);
            return res.status(500).json({
              success: false,
              message: 'Erro ao processar alguns pedidos do romaneio',
              detalhes: erroOcorrido.message
            });
          }
          
          logger.info(`✅ Romaneio recebido do ERP para visualização: ${dadosRomaneio.numeroRomaneio} com ${pedidosAssociados.length} pedidos associados`);
          
          res.status(201).json({
            success: true,
            message: 'Romaneio recebido com sucesso para visualização',
            romaneioId,
            numeroRomaneio: dadosRomaneio.numeroRomaneio,
            pedidosAssociados: pedidosAssociados.length
          });
        }
      });
    });
  } catch (error) {
    logger.error('Erro ao processar romaneio do ERP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;

