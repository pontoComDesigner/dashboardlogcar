/**
 * Serviço de Feature Engineering para ML
 * 
 * Extrai e prepara features (características) das notas fiscais
 * para uso em modelos de Machine Learning
 */

const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');

/**
 * Extrai features de uma nota fiscal e seus itens
 */
async function extrairFeatures(notaFiscal, itens) {
  if (!itens || itens.length === 0) {
    throw new Error('Itens da nota fiscal são necessários para extrair features');
  }
  
  // Calcular métricas básicas
  const totalItens = itens.reduce((sum, item) => sum + (item.quantidade || 0), 0);
  const codigosProdutos = [...new Set(itens.map(item => item.codigoProduto || item.codigoInterno).filter(Boolean))];
  const totalProdutosUnicos = codigosProdutos.length;
  
  // Calcular totais
  const pesoTotal = notaFiscal.pesoTotal || itens.reduce((sum, item) => sum + (item.peso || 0) * (item.quantidade || 0), 0);
  const volumeTotal = notaFiscal.volumeTotal || itens.reduce((sum, item) => sum + (item.volume || 0) * (item.quantidade || 0), 0);
  const valorTotal = notaFiscal.valorTotal || itens.reduce((sum, item) => sum + (item.valorTotal || item.valorUnitario * (item.quantidade || 0) || 0), 0);
  
  // Verificar produtos especiais
  const produtosEspeciais = await buscarCodigosProdutosEspeciais();
  const itensEspeciais = itens.filter(item => {
    const codigo = item.codigoProduto || item.codigoInterno;
    return codigo && produtosEspeciais.includes(codigo);
  });
  const temProdutosEspeciais = itensEspeciais.length > 0 ? 1 : 0;
  const quantidadeProdutosEspeciais = itensEspeciais.reduce((sum, item) => sum + (item.quantidade || 0), 0);
  const percentualProdutosEspeciais = totalItens > 0 ? quantidadeProdutosEspeciais / totalItens : 0;
  
  // Calcular estatísticas
  const quantidades = itens.map(item => item.quantidade || 0);
  const mediaQuantidadePorItem = quantidades.length > 0 
    ? quantidades.reduce((a, b) => a + b, 0) / quantidades.length 
    : 0;
  
  const desvioPadraoQuantidades = calcularDesvioPadrao(quantidades);
  
  const valores = itens.map(item => item.valorTotal || item.valorUnitario * (item.quantidade || 0) || 0);
  const mediaValorPorItem = valores.length > 0 
    ? valores.reduce((a, b) => a + b, 0) / valores.length 
    : 0;
  
  // Calcular frequência média de produtos (baseado em histórico)
  const frequenciaMediaProdutos = await calcularFrequenciaMediaProdutos(codigosProdutos);
  
  // Calcular similaridade com histórico
  const similaridadeComHistorico = await calcularSimilaridadeComHistorico(codigosProdutos, quantidades);
  
  // Preparar listas para features categóricas
  const listaCodigosProdutos = JSON.stringify(codigosProdutos);
  const listaQuantidades = JSON.stringify(quantidades);
  const listaValores = JSON.stringify(valores);
  
  return {
    // Features numéricas
    totalItens,
    totalProdutosUnicos,
    pesoTotal,
    volumeTotal,
    valorTotal,
    temProdutosEspeciais,
    quantidadeProdutosEspeciais,
    percentualProdutosEspeciais,
    mediaQuantidadePorItem,
    desvioPadraoQuantidades,
    mediaValorPorItem,
    frequenciaMediaProdutos,
    similaridadeComHistorico,
    
    // Features categóricas (para uso futuro)
    listaCodigosProdutos,
    listaQuantidades,
    listaValores,
    codigosProdutos // array para processamento
  };
}

/**
 * Busca códigos de produtos especiais
 */
function buscarCodigosProdutosEspeciais() {
  const db = getDatabase();
  
  return new Promise((resolve) => {
    db.all(
      'SELECT codigoProduto FROM regras_produtos_especiais',
      [],
      (err, rows) => {
        if (err) {
          logger.error('Erro ao buscar produtos especiais:', err);
          return resolve([]);
        }
        
        resolve((rows || []).map(row => row.codigoProduto));
      }
    );
  });
}

/**
 * Calcula desvio padrão
 */
function calcularDesvioPadrao(valores) {
  if (valores.length === 0) return 0;
  
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const variancia = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / valores.length;
  return Math.sqrt(variancia);
}

/**
 * Calcula frequência média de produtos no histórico
 */
function calcularFrequenciaMediaProdutos(codigosProdutos) {
  const db = getDatabase();
  
  return new Promise((resolve) => {
    if (codigosProdutos.length === 0) {
      return resolve(0);
    }
    
    const placeholders = codigosProdutos.map(() => '?').join(',');
    const query = `
      SELECT AVG(frequencia) as mediaFrequencia
      FROM (
        SELECT codigoProduto, COUNT(*) as frequencia
        FROM historico_desmembramentos_reais
        WHERE codigoProduto IN (${placeholders})
        GROUP BY codigoProduto
      )
    `;
    
    db.get(query, codigosProdutos, (err, row) => {
      if (err) {
        logger.error('Erro ao calcular frequência média:', err);
        return resolve(0);
      }
      
      resolve(row?.mediaFrequencia || 0);
    });
  });
}

/**
 * Calcula similaridade com histórico (0.0 a 1.0)
 * 
 * Baseado em quantos produtos desta NF aparecem frequentemente juntos no histórico
 */
function calcularSimilaridadeComHistorico(codigosProdutos, quantidades) {
  const db = getDatabase();
  
  return new Promise((resolve) => {
    if (codigosProdutos.length === 0) {
      return resolve(0);
    }
    
    // Buscar notas fiscais do histórico que contêm produtos similares
    const placeholders = codigosProdutos.map(() => '?').join(',');
    const query = `
      SELECT numeroNotaFiscal, COUNT(DISTINCT codigoProduto) as produtosEncontrados
      FROM historico_desmembramentos_reais
      WHERE codigoProduto IN (${placeholders})
      GROUP BY numeroNotaFiscal
      HAVING produtosEncontrados >= ?
      ORDER BY produtosEncontrados DESC
      LIMIT 10
    `;
    
    db.all(query, [...codigosProdutos, Math.min(2, codigosProdutos.length)], (err, rows) => {
      if (err) {
        logger.error('Erro ao calcular similaridade:', err);
        return resolve(0);
      }
      
      if (!rows || rows.length === 0) {
        return resolve(0);
      }
      
      // Calcular similaridade média
      // Similaridade = produtos encontrados / total de produtos
      const similaridades = rows.map(row => row.produtosEncontrados / codigosProdutos.length);
      const similaridadeMedia = similaridades.reduce((a, b) => a + b, 0) / similaridades.length;
      
      // Normalizar para 0-1 (mas já está nessa faixa)
      resolve(Math.min(1.0, similaridadeMedia));
    });
  });
}

/**
 * Prepara dados de treinamento a partir do histórico
 */
async function prepararDadosTreinamento() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Buscar todas as notas fiscais que foram desmembradas
    // Agrupar por número de nota fiscal para ter os dados completos
    const query = `
      SELECT DISTINCT numeroNotaFiscal
      FROM historico_desmembramentos_reais
      ORDER BY numeroNotaFiscal
    `;
    
    db.all(query, [], async (err, notasFiscais) => {
      if (err) {
        logger.error('Erro ao buscar notas fiscais do histórico:', err);
        return reject(err);
      }
      
      const dadosTreinamento = [];
      
      // Para cada nota fiscal, montar os dados de treinamento
      for (const nf of notasFiscais || []) {
        try {
          // Buscar todos os produtos desta nota fiscal no histórico
          const produtosHistorico = await new Promise((res, rej) => {
            db.all(
              `SELECT * FROM historico_desmembramentos_reais 
               WHERE numeroNotaFiscal = ? 
               ORDER BY codigoProduto`,
              [nf.numeroNotaFiscal],
              (err, rows) => {
                if (err) rej(err);
                else res(rows || []);
              }
            );
          });
          
          if (produtosHistorico.length === 0) continue;
          
          // Agrupar por código de produto para ter totais
          const produtosAgrupados = {};
          produtosHistorico.forEach(p => {
            const codigo = p.codigoProduto;
            if (!produtosAgrupados[codigo]) {
              produtosAgrupados[codigo] = {
                codigoProduto: codigo,
                descricaoProduto: p.descricaoProduto,
                unidade: p.unidade,
                quantidadeTotal: p.quantidadeTotal,
                quantidadePorCarga: p.quantidadePorCarga
              };
            }
          });
          
          // Calcular número de cargas (maior numeroCarga)
          const numeroCargas = Math.max(...produtosHistorico.map(p => p.numeroCarga || 1));
          
          // Criar objeto simulado de nota fiscal e itens para extrair features
          const itensSimulados = Object.values(produtosAgrupados).map(p => ({
            codigoProduto: p.codigoProduto,
            codigoInterno: p.codigoProduto,
            descricao: p.descricaoProduto,
            quantidade: p.quantidadeTotal,
            valorTotal: 0, // não temos no histórico
            peso: 0,
            volume: 0
          }));
          
          const notaFiscalSimulada = {
            id: nf.numeroNotaFiscal,
            pesoTotal: 0,
            volumeTotal: 0,
            valorTotal: 0
          };
          
          // Extrair features
          const features = await extrairFeatures(notaFiscalSimulada, itensSimulados);
          
          // Adicionar label (número de cargas)
          dadosTreinamento.push({
            numeroNotaFiscal: nf.numeroNotaFiscal,
            features: {
              ...features,
              numeroCargas // label
            },
            label: numeroCargas
          });
        } catch (error) {
          logger.warn(`Erro ao processar nota fiscal ${nf.numeroNotaFiscal}:`, error);
          continue;
        }
      }
      
      logger.info(`Preparados ${dadosTreinamento.length} registros de treinamento`);
      resolve(dadosTreinamento);
    });
  });
}

module.exports = {
  extrairFeatures,
  prepararDadosTreinamento,
  buscarCodigosProdutosEspeciais
};

