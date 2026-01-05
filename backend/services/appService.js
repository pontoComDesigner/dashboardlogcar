/**
 * Serviço para comunicação com o APP LogCar
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

const APP_URL = process.env.APP_URL || 'http://localhost:3002/api';
const APP_API_KEY = process.env.APP_API_KEY || 'default-app-api-key';

/**
 * Envia romaneio para o APP LogCar
 * 
 * @param {Object} romaneio - Dados do romaneio completo com pedidos
 * @returns {Promise<Object>} Resposta do APP
 */
async function enviarRomaneioAoApp(romaneio) {
  try {
    const url = `${APP_URL}/romaneios`;
    
    logger.info(`📤 Enviando romaneio ${romaneio.numeroRomaneio} para o APP...`);
    
    const response = await axios.post(url, romaneio, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': APP_API_KEY
      },
      timeout: 10000 // 10 segundos
    });
    
    logger.info(`✅ Romaneio ${romaneio.numeroRomaneio} enviado com sucesso ao APP`);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error(`❌ Erro ao enviar romaneio ${romaneio.numeroRomaneio} ao APP:`, error.message);
    
    if (error.response) {
      // Erro de resposta do servidor
      return {
        success: false,
        error: error.response.data || error.message,
        status: error.response.status
      };
    } else if (error.request) {
      // Requisição foi feita mas não houve resposta
      return {
        success: false,
        error: 'APP não respondeu',
        status: 0
      };
    } else {
      // Erro ao configurar a requisição
      return {
        success: false,
        error: error.message,
        status: 0
      };
    }
  }
}

/**
 * Formata romaneio para envio ao APP
 * 
 * @param {Object} romaneio - Romaneio do banco de dados
 * @param {Array} pedidos - Pedidos associados ao romaneio
 * @returns {Object} Romaneio formatado
 */
function formatarRomaneioParaApp(romaneio, pedidos) {
  return {
    numeroRomaneio: romaneio.numeroRomaneio,
    transportadora: romaneio.transportadora,
    veiculo: romaneio.veiculo,
    motorista: romaneio.motorista,
    dataSaida: romaneio.dataSaida,
    dataPrevisaoEntrega: romaneio.dataPrevisaoEntrega,
    observacoes: romaneio.observacoes,
    status: romaneio.status,
    pedidos: pedidos.map(pedido => ({
      numeroPedido: pedido.numeroPedido,
      clienteNome: pedido.clienteNome,
      clienteCnpjCpf: pedido.clienteCnpjCpf,
      clienteEndereco: pedido.clienteEndereco,
      clienteCidade: pedido.clienteCidade,
      clienteEstado: pedido.clienteEstado,
      clienteCep: pedido.clienteCep,
      valorTotal: pedido.valorTotal,
      observacoes: pedido.observacoes,
      status: pedido.pedidoStatus || pedido.status,
      ordem: pedido.ordem
    }))
  };
}

module.exports = {
  enviarRomaneioAoApp,
  formatarRomaneioParaApp
};









