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
        db.run(
          `INSERT INTO notas_fiscais 
           (id, erpId, numeroNota, serie, numeroPedido, clienteNome, clienteCnpjCpf, clienteEndereco, clienteCidade, clienteEstado, clienteCep, dataEmissao, dataVencimento, valorTotal, pesoTotal, volumeTotal, chaveAcesso, observacoes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE_DESMEMBRAMENTO')`,
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
            dadosNF.observacoes || null
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
 * Retorna cargas desmembradas de uma nota fiscal (formato SPOOL - legado)
 * 
 * ⚠️ DEPRECIADO: Use /api/erp/pedidos/:notaFiscalId
 */
router.get('/cargas/:notaFiscalId', apiKeyMiddleware, (req, res) => {
  try {
    const { notaFiscalId } = req.params;
    const db = getDatabase();
    
    // Buscar cargas da nota fiscal
    db.all(
      `SELECT * FROM cargas WHERE notaFiscalId = ? ORDER BY numeroCarga`,
      [notaFiscalId],
      (err, cargas) => {
        if (err) {
          logger.error('Erro ao buscar cargas:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar cargas'
          });
        }
        
        if (!cargas || cargas.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Nenhuma carga encontrada para esta nota fiscal'
          });
        }
        
        // Buscar itens de cada carga e formatar resposta
        const cargasFormatadas = [];
        let cargasProcessadas = 0;
        
        cargas.forEach((carga) => {
          db.all(
            `SELECT * FROM carga_itens WHERE cargaId = ?`,
            [carga.id],
            (err, itens) => {
              if (err) {
                logger.error('Erro ao buscar itens da carga:', err);
              }
              
              // Buscar dados da nota fiscal para incluir informações do cliente
              db.get(
                `SELECT * FROM notas_fiscais WHERE id = ?`,
                [notaFiscalId],
                (err, notaFiscal) => {
                  if (err) {
                    logger.error('Erro ao buscar nota fiscal:', err);
                  }
                  
                  const formatoSpool = {
                    numeroCarga: carga.numeroCarga,
                    numeroNota: carga.numeroNota,
                    numeroPedido: carga.numeroPedido || notaFiscal?.numeroPedido || null,
                    notaFiscalId: carga.notaFiscalId,
                    cliente: {
                      nome: carga.clienteNome || notaFiscal?.clienteNome || null,
                      cnpjCpf: carga.clienteCnpjCpf || notaFiscal?.clienteCnpjCpf || null,
                      endereco: carga.clienteEndereco || notaFiscal?.clienteEndereco || null,
                      cidade: carga.clienteCidade || notaFiscal?.clienteCidade || null,
                      estado: carga.clienteEstado || notaFiscal?.clienteEstado || null,
                      cep: carga.clienteCep || notaFiscal?.clienteCep || null
                    },
                    dataVencimento: carga.dataVencimento || notaFiscal?.dataVencimento || null,
                    observacoesNF: carga.observacoesNF || notaFiscal?.observacoes || null,
                    transportadora: carga.transportadora,
                    veiculo: carga.veiculo,
                    motorista: carga.motorista,
                    dataSaida: carga.dataSaida,
                    dataPrevisaoEntrega: carga.dataPrevisaoEntrega,
                    pesoTotal: carga.pesoTotal,
                    volumeTotal: carga.volumeTotal,
                    valorTotal: carga.valorTotal,
                    status: carga.status === 'PENDENTE_DESMEMBRAMENTO' ? 'PENDENTE DE DESMEMBRAMENTO' : carga.status,
                    itens: (itens || []).map(item => ({
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
                  };
                  
                  cargasFormatadas.push(formatoSpool);
                  cargasProcessadas++;
                  
                  if (cargasProcessadas === cargas.length) {
                    res.json({
                      success: true,
                      quantidadeCargas: cargas.length,
                      cargas: cargasFormatadas
                    });
                  }
                }
              );
            }
          );
        });
      }
    );
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
 * Marca uma carga como enviada
 */
router.post('/cargas/:cargaId/marcar-enviada', apiKeyMiddleware, (req, res) => {
  try {
    const { cargaId } = req.params;
    const db = getDatabase();
    
    db.run(
      'UPDATE cargas SET status = ? WHERE id = ?',
      ['ENVIADA', cargaId],
      function(err) {
        if (err) {
          logger.error('Erro ao marcar carga como enviada:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status da carga'
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
      }
    );
  } catch (error) {
    logger.error('Erro ao marcar carga como enviada:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/erp/pedidos/:notaFiscalId
 * 
 * Retorna pedidos desmembrados (cargas) de uma nota fiscal
 */
router.get('/pedidos/:notaFiscalId', apiKeyMiddleware, (req, res) => {
  try {
    const { notaFiscalId } = req.params;
    const db = getDatabase();
    
    // Buscar cargas (pedidos) da nota fiscal
    db.all(
      `SELECT * FROM cargas WHERE notaFiscalId = ? ORDER BY numeroCarga`,
      [notaFiscalId],
      (err, cargas) => {
        if (err) {
          logger.error('Erro ao buscar pedidos:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar pedidos'
          });
        }
        
        if (!cargas || cargas.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Nenhum pedido encontrado para esta nota fiscal. A nota fiscal pode ainda não ter sido desmembrada.'
          });
        }
        
        // Buscar itens de cada carga e formatar resposta
        const pedidosFormatados = [];
        let pedidosProcessados = 0;
        
        cargas.forEach((carga) => {
          db.all(
            `SELECT * FROM carga_itens WHERE cargaId = ?`,
            [carga.id],
            (err, itens) => {
              if (err) {
                logger.error('Erro ao buscar itens do pedido:', err);
              }
              
              // Buscar dados da nota fiscal para incluir informações do cliente
              db.get(
                `SELECT * FROM notas_fiscais WHERE id = ?`,
                [notaFiscalId],
                (err, notaFiscal) => {
                  if (err) {
                    logger.error('Erro ao buscar nota fiscal:', err);
                  }
                  
                  const pedido = {
                    numeroPedido: carga.numeroCarga, // númeroCarga é o número do pedido
                    numeroNota: carga.numeroNota,
                    notaFiscalId: carga.notaFiscalId,
                    cliente: {
                      nome: carga.clienteNome || notaFiscal?.clienteNome || null,
                      cnpjCpf: carga.clienteCnpjCpf || notaFiscal?.clienteCnpjCpf || null,
                      endereco: carga.clienteEndereco || notaFiscal?.clienteEndereco || null,
                      cidade: carga.clienteCidade || notaFiscal?.clienteCidade || null,
                      estado: carga.clienteEstado || notaFiscal?.clienteEstado || null,
                      cep: carga.clienteCep || notaFiscal?.clienteCep || null
                    },
                    clienteNome: carga.clienteNome || notaFiscal?.clienteNome || null,
                    clienteCnpjCpf: carga.clienteCnpjCpf || notaFiscal?.clienteCnpjCpf || null,
                    clienteEndereco: carga.clienteEndereco || notaFiscal?.clienteEndereco || null,
                    clienteCidade: carga.clienteCidade || notaFiscal?.clienteCidade || null,
                    clienteEstado: carga.clienteEstado || notaFiscal?.clienteEstado || null,
                    clienteCep: carga.clienteCep || notaFiscal?.clienteCep || null,
                    dataVencimento: carga.dataVencimento || notaFiscal?.dataVencimento || null,
                    observacoesNF: carga.observacoesNF || notaFiscal?.observacoes || null,
                    pesoTotal: carga.pesoTotal,
                    volumeTotal: carga.volumeTotal,
                    valorTotal: carga.valorTotal,
                    status: carga.status === 'PENDENTE_DESMEMBRAMENTO' ? 'PENDENTE DE DESMEMBRAMENTO' : carga.status,
                    itens: (itens || []).map(item => ({
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
                  };
                  
                  pedidosFormatados.push(pedido);
                  pedidosProcessados++;
                  
                  if (pedidosProcessados === cargas.length) {
                    res.json({
                      success: true,
                      notaFiscalId,
                      quantidadePedidos: pedidosFormatados.length,
                      pedidos: pedidosFormatados
                    });
                  }
                }
              );
            }
          );
        });
      }
    );
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
 * O ERP cria o romaneio primeiro (sem pedidos) e depois associa os pedidos
 * Pedidos são opcionais - podem ser enviados depois
 */
router.post('/romaneios', apiKeyMiddleware, (req, res) => {
  try {
    const dadosRomaneio = req.body;
    
    // Validar dados obrigatórios
    if (!dadosRomaneio.numeroRomaneio) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios faltando: numeroRomaneio'
      });
    }
    
    // Pedidos são opcionais - podem ser adicionados depois
    const pedidos = dadosRomaneio.pedidos && Array.isArray(dadosRomaneio.pedidos) ? dadosRomaneio.pedidos : [];
    
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
        
        // Se não houver pedidos, apenas criar o romaneio vazio
        if (pedidos.length === 0) {
          logger.info(`✅ Romaneio criado sem pedidos: ${dadosRomaneio.numeroRomaneio}`);
          return res.status(201).json({
            success: true,
            message: 'Romaneio criado com sucesso (sem pedidos)',
            romaneioId,
            numeroRomaneio: dadosRomaneio.numeroRomaneio,
            pedidosAssociados: 0
          });
        }
        
        // Associar pedidos existentes ao romaneio (apenas para visualização)
        // Os pedidos são identificados pelo número do pedido (que são os números das cargas)
        const pedidosAssociados = [];
        let processadas = 0;
        let erroOcorrido = null;
        
        // Buscar pedidos pelos números fornecidos
        pedidos.forEach((numeroPedido, index) => {
          // Primeiro tentar buscar pedido pelo numeroPedido
          db.get('SELECT id FROM pedidos WHERE numeroPedido = ?', [numeroPedido], (err, pedido) => {
            if (err) {
              erroOcorrido = err;
              logger.error('Erro ao buscar pedido:', err);
              processadas++;
              if (processadas === pedidos.length) {
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
              if (processadas === pedidos.length) {
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
            if (processadas === pedidos.length) {
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

/**
 * POST /api/erp/romaneios/:romaneioId/pedidos
 * 
 * Associa pedidos a um romaneio existente
 */
router.post('/romaneios/:romaneioId/pedidos', apiKeyMiddleware, (req, res) => {
  try {
    const { romaneioId } = req.params;
    const { pedidos } = req.body; // Array de números de pedido
    
    if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios faltando: pedidos (array de números de pedido)'
      });
    }
    
    const db = getDatabase();
    
    // Verificar se romaneio existe
    db.get('SELECT id, numeroRomaneio FROM romaneios WHERE id = ?', [romaneioId], (err, romaneio) => {
      if (err) {
        logger.error('Erro ao verificar romaneio:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao processar requisição'
        });
      }
      
      if (!romaneio) {
        return res.status(404).json({
          success: false,
          message: 'Romaneio não encontrado'
        });
      }
      
      // Associar pedidos ao romaneio
      const pedidosAssociados = [];
      let processadas = 0;
      let erroOcorrido = null;
      
      pedidos.forEach((numeroPedido, index) => {
        db.get('SELECT id FROM pedidos WHERE numeroPedido = ?', [numeroPedido], (err, pedido) => {
          if (err) {
            erroOcorrido = err;
            logger.error('Erro ao buscar pedido:', err);
            processadas++;
            if (processadas === pedidos.length) {
              return finalizarProcessamento();
            }
            return;
          }
          
          if (pedido) {
            // Verificar se já está associado
            db.get('SELECT id FROM romaneio_pedidos WHERE romaneioId = ? AND pedidoId = ?', [romaneioId, pedido.id], (err, existing) => {
              if (err) {
                erroOcorrido = err;
                logger.error('Erro ao verificar associação:', err);
                processadas++;
                if (processadas === pedidos.length) {
                  return finalizarProcessamento();
                }
                return;
              }
              
              if (existing) {
                // Já está associado - apenas contar
                pedidosAssociados.push({ pedidoId: pedido.id, ordem: index });
                processadas++;
                if (processadas === pedidos.length) {
                  finalizarProcessamento();
                }
              } else {
                // Associar pedido ao romaneio
                const relacionamentoId = uuidv4();
                db.run(`
                  INSERT INTO romaneio_pedidos (id, romaneioId, pedidoId, ordem)
                  VALUES (?, ?, ?, ?)
                `, [relacionamentoId, romaneioId, pedido.id, index], (err) => {
                  if (err) {
                    erroOcorrido = err;
                    logger.error('Erro ao associar pedido ao romaneio:', err);
                  } else {
                    pedidosAssociados.push({ pedidoId: pedido.id, ordem: index });
                  }
                  
                  processadas++;
                  if (processadas === pedidos.length) {
                    finalizarProcessamento();
                  }
                });
              }
            });
          } else {
            logger.warn(`Pedido ${numeroPedido} não encontrado no sistema`);
            processadas++;
            if (processadas === pedidos.length) {
              finalizarProcessamento();
            }
          }
        });
      });
      
      function finalizarProcessamento() {
        if (erroOcorrido) {
          logger.error('Erro ao processar pedidos:', erroOcorrido);
          return res.status(500).json({
            success: false,
            message: 'Erro ao processar alguns pedidos',
            detalhes: erroOcorrido.message
          });
        }
        
        logger.info(`✅ ${pedidosAssociados.length} pedido(s) associado(s) ao romaneio ${romaneio.numeroRomaneio}`);
        
        res.status(200).json({
          success: true,
          message: 'Pedidos associados com sucesso',
          romaneioId,
          numeroRomaneio: romaneio.numeroRomaneio,
          pedidosAssociados: pedidosAssociados.length
        });
      }
    });
  } catch (error) {
    logger.error('Erro ao associar pedidos ao romaneio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;
