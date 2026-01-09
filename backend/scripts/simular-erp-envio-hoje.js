/**
 * Script para simular envio de Notas Fiscais do ERP
 * com data de faturamento = 01/01/2026
 * 
 * Uso: node scripts/simular-erp-envio-hoje.js [quantidade]
 * 
 * Exemplo: node scripts/simular-erp-envio-hoje.js 5
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.ERP_API_KEY || 'default-api-key-change-me';

// Data fixa de hoje
const DATA_HOJE = '2026-01-01';

// Dados de exemplo - clientes
const clientes = [
  {
    nome: 'Construtora ABC Ltda',
    cnpj: '12.345.678/0001-90',
    endereco: 'Av. Paulista, 1000 - 10º andar',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01310-100'
  },
  {
    nome: 'Obra e Reforma ME',
    cnpj: '98.765.432/0001-10',
    endereco: 'Rua das Flores, 250',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567'
  },
  {
    nome: 'Construtora XYZ S.A.',
    cnpj: '11.222.333/0001-44',
    endereco: 'Rua Industrial, 500',
    cidade: 'Guarulhos',
    estado: 'SP',
    cep: '07000-000'
  },
  {
    nome: 'Pedreira e Cimentos Ltda',
    cnpj: '55.666.777/0001-88',
    endereco: 'Rodovia dos Bandeirantes, km 25',
    cidade: 'Campinas',
    estado: 'SP',
    cep: '13000-000'
  },
  {
    nome: 'Materiais de Construção Silva',
    cnpj: '33.444.555/0001-22',
    endereco: 'Av. Faria Lima, 2000',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01452-000'
  },
  {
    nome: 'Construções Modernas Ltda',
    cnpj: '77.888.999/0001-33',
    endereco: 'Rua Comercial, 800',
    cidade: 'Osasco',
    estado: 'SP',
    cep: '06000-000'
  }
];

// Produtos de material de construção
const produtos = [
  { descricao: 'Cimento Portland CP-II-E-32', unidade: 'SAC', peso: 50, volume: 0.036, valor: 25.50, ncm: '25232900', codigo: 'CIM-001' },
  { descricao: 'Areia Média Lavada', unidade: 'M³', peso: 1500, volume: 1, valor: 85.00, ncm: '25051000', codigo: 'ARE-001' },
  { descricao: 'Brita 1 (19mm)', unidade: 'M³', peso: 1600, volume: 1, valor: 95.00, ncm: '25171000', codigo: 'BRI-001' },
  { descricao: 'Tijolo Cerâmico 9x19x19', unidade: 'MIL', peso: 3500, volume: 0.5, valor: 420.00, ncm: '69041000', codigo: 'TIJ-001' },
  { descricao: 'Argamassa Colante AC-II', unidade: 'SAC', peso: 20, volume: 0.028, valor: 18.90, ncm: '38245000', codigo: 'ARG-001' },
  { descricao: 'Reboco AC-III', unidade: 'SAC', peso: 20, volume: 0.028, valor: 15.50, ncm: '38245000', codigo: 'REB-001' },
  { descricao: 'Telha Cerâmica Portuguesa', unidade: 'M²', peso: 45, volume: 0.01, valor: 12.80, ncm: '69051000', codigo: 'TEL-001' },
  { descricao: 'Viga Pré-Moldada 10x20', unidade: 'UN', peso: 350, volume: 0.2, valor: 180.00, ncm: '68109100', codigo: 'VIG-001' },
  { descricao: 'Ferro CA-50 6.3mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 4.20, ncm: '72142000', codigo: 'FER-001' },
  { descricao: 'Ferro CA-50 8mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 4.50, ncm: '72142000', codigo: 'FER-002' },
  { descricao: 'Ferro CA-50 10mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 5.20, ncm: '72142000', codigo: 'FER-003' },
  { descricao: 'Tinta Acrílica Branco Gelo', unidade: 'LT', peso: 1.5, volume: 0.018, valor: 58.00, ncm: '32091000', codigo: 'TIN-001' },
  { descricao: 'Piso Cerâmico 60x60cm', unidade: 'M²', peso: 28, volume: 0.036, valor: 35.90, ncm: '69072200', codigo: 'PIS-001' },
  { descricao: 'Bloco de Concreto 14x19x39', unidade: 'MIL', peso: 4000, volume: 0.55, valor: 380.00, ncm: '68101100', codigo: 'BLO-001' },
  { descricao: 'Tubo PVC 100mm', unidade: 'M', peso: 8, volume: 0.008, valor: 28.50, ncm: '39172300', codigo: 'TUB-001' },
  { descricao: 'Canaleta Pré-Moldada', unidade: 'M', peso: 15, volume: 0.015, valor: 12.00, ncm: '68109100', codigo: 'CAN-001' },
  { descricao: 'Vergalhão CA-50 12.5mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 5.80, ncm: '72142000', codigo: 'VER-001' },
  { descricao: 'Cal Hidratada CH-I', unidade: 'SAC', peso: 20, volume: 0.025, valor: 16.50, ncm: '25221000', codigo: 'CAL-001' }
];

function gerarNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function selecionarAleatorio(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function gerarChaveAcesso(numeroNota, cnpj, serie = '1') {
  // Gera uma chave de acesso simulada (NFe padrão)
  const cnpjLimpo = cnpj.replace(/\D/g, '').substring(0, 14).padStart(14, '0');
  const numeroNotaLimpo = numeroNota.toString().padStart(9, '0');
  const serieLimpo = serie.padStart(3, '0');
  const codigoNumerico = gerarNumeroAleatorio(10000000, 99999999).toString();
  const dv = gerarNumeroAleatorio(0, 9);
  
  return `3520${DATA_HOJE.replace(/-/g, '')}${cnpjLimpo}55${serieLimpo}${numeroNotaLimpo}${codigoNumerico}${dv}`;
}

function gerarItens() {
  const quantidadeItens = gerarNumeroAleatorio(4, 10);
  const itensSelecionados = [];
  const indicesUsados = new Set();
  
  // Selecionar produtos únicos
  while (itensSelecionados.length < quantidadeItens && indicesUsados.size < produtos.length) {
    const indice = Math.floor(Math.random() * produtos.length);
    if (!indicesUsados.has(indice)) {
      indicesUsados.add(indice);
      const produto = produtos[indice];
      
      // Quantidade variada por tipo de unidade
      let quantidade;
      if (produto.unidade === 'SAC') {
        quantidade = gerarNumeroAleatorio(10, 300);
      } else if (produto.unidade === 'M³') {
        quantidade = gerarNumeroAleatorio(5, 100);
      } else if (produto.unidade === 'KG') {
        quantidade = gerarNumeroAleatorio(100, 5000);
      } else if (produto.unidade === 'MIL') {
        quantidade = gerarNumeroAleatorio(1, 50);
      } else if (produto.unidade === 'M²') {
        quantidade = gerarNumeroAleatorio(50, 500);
      } else {
        quantidade = gerarNumeroAleatorio(1, 100);
      }
      
      // Valor unitário com pequena variação (±3%)
      const variacao = 0.97 + Math.random() * 0.06;
      const valorUnitario = parseFloat((produto.valor * variacao).toFixed(2));
      const valorTotal = parseFloat((valorUnitario * quantidade).toFixed(2));
      
      // Gerar código interno (baseado no código do produto)
      const codigoInterno = produto.codigo;
      
      // Gerar código de barras EAN-13 simulado (789 + 9 dígitos + dígito verificador)
      const prefixoEAN = '789';
      const codigoNumerico = (100000000 + Math.floor(Math.random() * 899999999)).toString();
      // Calcular dígito verificador EAN-13 (simplificado)
      const digitos = (prefixoEAN + codigoNumerico).split('').map(Number);
      let soma = 0;
      for (let i = 0; i < 12; i++) {
        soma += digitos[i] * (i % 2 === 0 ? 1 : 3);
      }
      const digitoVerificador = (10 - (soma % 10)) % 10;
      const codigoBarrasEan = prefixoEAN + codigoNumerico + digitoVerificador;
      
      itensSelecionados.push({
        descricao: produto.descricao,
        quantidade: quantidade,
        unidade: produto.unidade,
        valorUnitario: valorUnitario,
        valorTotal: valorTotal,
        peso: parseFloat((produto.peso * quantidade).toFixed(2)),
        volume: parseFloat((produto.volume * quantidade).toFixed(3)),
        ncm: produto.ncm,
        cfop: '5102',
        codigoProduto: produto.codigo,
        codigoInterno: codigoInterno,
        codigoBarrasEan: codigoBarrasEan
      });
    }
  }
  
  return itensSelecionados;
}

function gerarNotaFiscal(numero, cliente, numeroBase = 5000) {
  const itens = gerarItens();
  const valorTotal = parseFloat(itens.reduce((sum, item) => sum + item.valorTotal, 0).toFixed(2));
  const pesoTotal = parseFloat(itens.reduce((sum, item) => sum + item.peso, 0).toFixed(2));
  const volumeTotal = parseFloat(itens.reduce((sum, item) => sum + item.volume, 0).toFixed(3));
  
  const numeroNota = (numeroBase + numero).toString().padStart(8, '0');
  const numeroPedido = `PED-${(numeroBase + numero).toString().padStart(6, '0')}`;
  
  // Data de vencimento: 30 dias após emissão
  const dataVencimento = new Date(DATA_HOJE);
  dataVencimento.setDate(dataVencimento.getDate() + 30);
  
  const observacoes = [
    null,
    'Entrega urgente - Entregar até 15:00h',
    'Cuidado com carga - Material frágil',
    'Entrega em horário comercial',
    'Confirmar recebimento com assinatura',
    'Material para obra - Seguir especificações técnicas'
  ][gerarNumeroAleatorio(0, 5)];
  
  return {
    erpId: `ERP-NF-${numeroNota}`,
    numeroNota: numeroNota,
    serie: '1',
    numeroPedido: numeroPedido,
    clienteNome: cliente.nome,
    clienteCnpjCpf: cliente.cnpj,
    clienteEndereco: cliente.endereco,
    clienteCidade: cliente.cidade,
    clienteEstado: cliente.estado,
    clienteCep: cliente.cep,
    dataEmissao: DATA_HOJE,
    dataVencimento: dataVencimento.toISOString().split('T')[0],
    valorTotal: valorTotal,
    pesoTotal: pesoTotal,
    volumeTotal: volumeTotal,
    chaveAcesso: gerarChaveAcesso(numeroNota, cliente.cnpj),
    observacoes: observacoes,
    itens: itens
  };
}

async function enviarNotaFiscal(notaFiscal) {
  try {
    const response = await axios.post(`${API_URL}/erp/notas-fiscais`, notaFiscal, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      details: error.response?.data
    };
  }
}

async function main() {
  const quantidade = parseInt(process.argv[2]) || 5;
  const numeroInicial = parseInt(process.argv[3]) || 5000;
  
  console.log('\n🚀 Simulador de Envio de Notas Fiscais do ERP');
  console.log(`📅 Data de Faturamento: ${DATA_HOJE}\n`);
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`);
  console.log(`📦 Quantidade: ${quantidade} nota(s) fiscal(is)`);
  console.log(`🔢 Número inicial: ${numeroInicial} (NF ${numeroInicial.toString().padStart(8, '0')} até ${(numeroInicial + quantidade - 1).toString().padStart(8, '0')})\n`);
  console.log('─'.repeat(70));
  
  let sucessos = 0;
  let erros = 0;
  const errosDetalhes = [];
  
  for (let i = 1; i <= quantidade; i++) {
    const cliente = selecionarAleatorio(clientes);
    const notaFiscal = gerarNotaFiscal(i, cliente, numeroInicial);
    
    process.stdout.write(`\n[${i}/${quantidade}] Enviando NF ${notaFiscal.numeroNota}... `);
    
    const resultado = await enviarNotaFiscal(notaFiscal);
    
    if (resultado.success) {
      console.log('✅ OK');
      console.log(`   Cliente: ${cliente.nome}`);
      console.log(`   Pedido: ${notaFiscal.numeroPedido}`);
      console.log(`   Valor: R$ ${notaFiscal.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`   Itens: ${notaFiscal.itens.length}`);
      console.log(`   Peso: ${notaFiscal.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`);
      console.log(`   Volume: ${notaFiscal.volumeTotal.toFixed(3)} m³`);
      sucessos++;
    } else {
      console.log(`❌ ERRO (${resultado.status || 'N/A'})`);
      console.log(`   ${resultado.error}`);
      if (resultado.details) {
        console.log(`   Detalhes: ${JSON.stringify(resultado.details)}`);
      }
      errosDetalhes.push({
        numero: notaFiscal.numeroNota,
        erro: resultado.error,
        status: resultado.status
      });
      erros++;
    }
    
    // Pequeno delay para não sobrecarregar
    if (i < quantidade) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Sucessos: ${sucessos}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📈 Taxa de sucesso: ${((sucessos / quantidade) * 100).toFixed(1)}%`);
  
  if (errosDetalhes.length > 0) {
    console.log('\n⚠️  Detalhes dos erros:');
    errosDetalhes.forEach(erro => {
      console.log(`   NF ${erro.numero}: ${erro.erro} (${erro.status || 'N/A'})`);
    });
  }
  
  if (sucessos > 0) {
    console.log('\n💡 Próximos passos:');
    console.log('   1. Acesse http://localhost:3000/desmembramento para ver as notas fiscais pendentes');
    console.log('   2. Use os filtros para encontrar as notas fiscais de hoje (01/01/2026)');
    console.log('   3. Clique em uma nota para iniciar o desmembramento\n');
  }
}

// Executar
main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Data:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
});


 * com data de faturamento = 01/01/2026
 * 
 * Uso: node scripts/simular-erp-envio-hoje.js [quantidade]
 * 
 * Exemplo: node scripts/simular-erp-envio-hoje.js 5
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.ERP_API_KEY || 'default-api-key-change-me';

// Data fixa de hoje
const DATA_HOJE = '2026-01-01';

// Dados de exemplo - clientes
const clientes = [
  {
    nome: 'Construtora ABC Ltda',
    cnpj: '12.345.678/0001-90',
    endereco: 'Av. Paulista, 1000 - 10º andar',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01310-100'
  },
  {
    nome: 'Obra e Reforma ME',
    cnpj: '98.765.432/0001-10',
    endereco: 'Rua das Flores, 250',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567'
  },
  {
    nome: 'Construtora XYZ S.A.',
    cnpj: '11.222.333/0001-44',
    endereco: 'Rua Industrial, 500',
    cidade: 'Guarulhos',
    estado: 'SP',
    cep: '07000-000'
  },
  {
    nome: 'Pedreira e Cimentos Ltda',
    cnpj: '55.666.777/0001-88',
    endereco: 'Rodovia dos Bandeirantes, km 25',
    cidade: 'Campinas',
    estado: 'SP',
    cep: '13000-000'
  },
  {
    nome: 'Materiais de Construção Silva',
    cnpj: '33.444.555/0001-22',
    endereco: 'Av. Faria Lima, 2000',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01452-000'
  },
  {
    nome: 'Construções Modernas Ltda',
    cnpj: '77.888.999/0001-33',
    endereco: 'Rua Comercial, 800',
    cidade: 'Osasco',
    estado: 'SP',
    cep: '06000-000'
  }
];

// Produtos de material de construção
const produtos = [
  { descricao: 'Cimento Portland CP-II-E-32', unidade: 'SAC', peso: 50, volume: 0.036, valor: 25.50, ncm: '25232900', codigo: 'CIM-001' },
  { descricao: 'Areia Média Lavada', unidade: 'M³', peso: 1500, volume: 1, valor: 85.00, ncm: '25051000', codigo: 'ARE-001' },
  { descricao: 'Brita 1 (19mm)', unidade: 'M³', peso: 1600, volume: 1, valor: 95.00, ncm: '25171000', codigo: 'BRI-001' },
  { descricao: 'Tijolo Cerâmico 9x19x19', unidade: 'MIL', peso: 3500, volume: 0.5, valor: 420.00, ncm: '69041000', codigo: 'TIJ-001' },
  { descricao: 'Argamassa Colante AC-II', unidade: 'SAC', peso: 20, volume: 0.028, valor: 18.90, ncm: '38245000', codigo: 'ARG-001' },
  { descricao: 'Reboco AC-III', unidade: 'SAC', peso: 20, volume: 0.028, valor: 15.50, ncm: '38245000', codigo: 'REB-001' },
  { descricao: 'Telha Cerâmica Portuguesa', unidade: 'M²', peso: 45, volume: 0.01, valor: 12.80, ncm: '69051000', codigo: 'TEL-001' },
  { descricao: 'Viga Pré-Moldada 10x20', unidade: 'UN', peso: 350, volume: 0.2, valor: 180.00, ncm: '68109100', codigo: 'VIG-001' },
  { descricao: 'Ferro CA-50 6.3mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 4.20, ncm: '72142000', codigo: 'FER-001' },
  { descricao: 'Ferro CA-50 8mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 4.50, ncm: '72142000', codigo: 'FER-002' },
  { descricao: 'Ferro CA-50 10mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 5.20, ncm: '72142000', codigo: 'FER-003' },
  { descricao: 'Tinta Acrílica Branco Gelo', unidade: 'LT', peso: 1.5, volume: 0.018, valor: 58.00, ncm: '32091000', codigo: 'TIN-001' },
  { descricao: 'Piso Cerâmico 60x60cm', unidade: 'M²', peso: 28, volume: 0.036, valor: 35.90, ncm: '69072200', codigo: 'PIS-001' },
  { descricao: 'Bloco de Concreto 14x19x39', unidade: 'MIL', peso: 4000, volume: 0.55, valor: 380.00, ncm: '68101100', codigo: 'BLO-001' },
  { descricao: 'Tubo PVC 100mm', unidade: 'M', peso: 8, volume: 0.008, valor: 28.50, ncm: '39172300', codigo: 'TUB-001' },
  { descricao: 'Canaleta Pré-Moldada', unidade: 'M', peso: 15, volume: 0.015, valor: 12.00, ncm: '68109100', codigo: 'CAN-001' },
  { descricao: 'Vergalhão CA-50 12.5mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 5.80, ncm: '72142000', codigo: 'VER-001' },
  { descricao: 'Cal Hidratada CH-I', unidade: 'SAC', peso: 20, volume: 0.025, valor: 16.50, ncm: '25221000', codigo: 'CAL-001' }
];

function gerarNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function selecionarAleatorio(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function gerarChaveAcesso(numeroNota, cnpj, serie = '1') {
  // Gera uma chave de acesso simulada (NFe padrão)
  const cnpjLimpo = cnpj.replace(/\D/g, '').substring(0, 14).padStart(14, '0');
  const numeroNotaLimpo = numeroNota.toString().padStart(9, '0');
  const serieLimpo = serie.padStart(3, '0');
  const codigoNumerico = gerarNumeroAleatorio(10000000, 99999999).toString();
  const dv = gerarNumeroAleatorio(0, 9);
  
  return `3520${DATA_HOJE.replace(/-/g, '')}${cnpjLimpo}55${serieLimpo}${numeroNotaLimpo}${codigoNumerico}${dv}`;
}

function gerarItens() {
  const quantidadeItens = gerarNumeroAleatorio(4, 10);
  const itensSelecionados = [];
  const indicesUsados = new Set();
  
  // Selecionar produtos únicos
  while (itensSelecionados.length < quantidadeItens && indicesUsados.size < produtos.length) {
    const indice = Math.floor(Math.random() * produtos.length);
    if (!indicesUsados.has(indice)) {
      indicesUsados.add(indice);
      const produto = produtos[indice];
      
      // Quantidade variada por tipo de unidade
      let quantidade;
      if (produto.unidade === 'SAC') {
        quantidade = gerarNumeroAleatorio(10, 300);
      } else if (produto.unidade === 'M³') {
        quantidade = gerarNumeroAleatorio(5, 100);
      } else if (produto.unidade === 'KG') {
        quantidade = gerarNumeroAleatorio(100, 5000);
      } else if (produto.unidade === 'MIL') {
        quantidade = gerarNumeroAleatorio(1, 50);
      } else if (produto.unidade === 'M²') {
        quantidade = gerarNumeroAleatorio(50, 500);
      } else {
        quantidade = gerarNumeroAleatorio(1, 100);
      }
      
      // Valor unitário com pequena variação (±3%)
      const variacao = 0.97 + Math.random() * 0.06;
      const valorUnitario = parseFloat((produto.valor * variacao).toFixed(2));
      const valorTotal = parseFloat((valorUnitario * quantidade).toFixed(2));
      
      // Gerar código interno (baseado no código do produto)
      const codigoInterno = produto.codigo;
      
      // Gerar código de barras EAN-13 simulado (789 + 9 dígitos + dígito verificador)
      const prefixoEAN = '789';
      const codigoNumerico = (100000000 + Math.floor(Math.random() * 899999999)).toString();
      // Calcular dígito verificador EAN-13 (simplificado)
      const digitos = (prefixoEAN + codigoNumerico).split('').map(Number);
      let soma = 0;
      for (let i = 0; i < 12; i++) {
        soma += digitos[i] * (i % 2 === 0 ? 1 : 3);
      }
      const digitoVerificador = (10 - (soma % 10)) % 10;
      const codigoBarrasEan = prefixoEAN + codigoNumerico + digitoVerificador;
      
      itensSelecionados.push({
        descricao: produto.descricao,
        quantidade: quantidade,
        unidade: produto.unidade,
        valorUnitario: valorUnitario,
        valorTotal: valorTotal,
        peso: parseFloat((produto.peso * quantidade).toFixed(2)),
        volume: parseFloat((produto.volume * quantidade).toFixed(3)),
        ncm: produto.ncm,
        cfop: '5102',
        codigoProduto: produto.codigo,
        codigoInterno: codigoInterno,
        codigoBarrasEan: codigoBarrasEan
      });
    }
  }
  
  return itensSelecionados;
}

function gerarNotaFiscal(numero, cliente, numeroBase = 5000) {
  const itens = gerarItens();
  const valorTotal = parseFloat(itens.reduce((sum, item) => sum + item.valorTotal, 0).toFixed(2));
  const pesoTotal = parseFloat(itens.reduce((sum, item) => sum + item.peso, 0).toFixed(2));
  const volumeTotal = parseFloat(itens.reduce((sum, item) => sum + item.volume, 0).toFixed(3));
  
  const numeroNota = (numeroBase + numero).toString().padStart(8, '0');
  const numeroPedido = `PED-${(numeroBase + numero).toString().padStart(6, '0')}`;
  
  // Data de vencimento: 30 dias após emissão
  const dataVencimento = new Date(DATA_HOJE);
  dataVencimento.setDate(dataVencimento.getDate() + 30);
  
  const observacoes = [
    null,
    'Entrega urgente - Entregar até 15:00h',
    'Cuidado com carga - Material frágil',
    'Entrega em horário comercial',
    'Confirmar recebimento com assinatura',
    'Material para obra - Seguir especificações técnicas'
  ][gerarNumeroAleatorio(0, 5)];
  
  return {
    erpId: `ERP-NF-${numeroNota}`,
    numeroNota: numeroNota,
    serie: '1',
    numeroPedido: numeroPedido,
    clienteNome: cliente.nome,
    clienteCnpjCpf: cliente.cnpj,
    clienteEndereco: cliente.endereco,
    clienteCidade: cliente.cidade,
    clienteEstado: cliente.estado,
    clienteCep: cliente.cep,
    dataEmissao: DATA_HOJE,
    dataVencimento: dataVencimento.toISOString().split('T')[0],
    valorTotal: valorTotal,
    pesoTotal: pesoTotal,
    volumeTotal: volumeTotal,
    chaveAcesso: gerarChaveAcesso(numeroNota, cliente.cnpj),
    observacoes: observacoes,
    itens: itens
  };
}

async function enviarNotaFiscal(notaFiscal) {
  try {
    const response = await axios.post(`${API_URL}/erp/notas-fiscais`, notaFiscal, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      details: error.response?.data
    };
  }
}

async function main() {
  const quantidade = parseInt(process.argv[2]) || 5;
  const numeroInicial = parseInt(process.argv[3]) || 5000;
  
  console.log('\n🚀 Simulador de Envio de Notas Fiscais do ERP');
  console.log(`📅 Data de Faturamento: ${DATA_HOJE}\n`);
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`);
  console.log(`📦 Quantidade: ${quantidade} nota(s) fiscal(is)`);
  console.log(`🔢 Número inicial: ${numeroInicial} (NF ${numeroInicial.toString().padStart(8, '0')} até ${(numeroInicial + quantidade - 1).toString().padStart(8, '0')})\n`);
  console.log('─'.repeat(70));
  
  let sucessos = 0;
  let erros = 0;
  const errosDetalhes = [];
  
  for (let i = 1; i <= quantidade; i++) {
    const cliente = selecionarAleatorio(clientes);
    const notaFiscal = gerarNotaFiscal(i, cliente, numeroInicial);
    
    process.stdout.write(`\n[${i}/${quantidade}] Enviando NF ${notaFiscal.numeroNota}... `);
    
    const resultado = await enviarNotaFiscal(notaFiscal);
    
    if (resultado.success) {
      console.log('✅ OK');
      console.log(`   Cliente: ${cliente.nome}`);
      console.log(`   Pedido: ${notaFiscal.numeroPedido}`);
      console.log(`   Valor: R$ ${notaFiscal.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`   Itens: ${notaFiscal.itens.length}`);
      console.log(`   Peso: ${notaFiscal.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`);
      console.log(`   Volume: ${notaFiscal.volumeTotal.toFixed(3)} m³`);
      sucessos++;
    } else {
      console.log(`❌ ERRO (${resultado.status || 'N/A'})`);
      console.log(`   ${resultado.error}`);
      if (resultado.details) {
        console.log(`   Detalhes: ${JSON.stringify(resultado.details)}`);
      }
      errosDetalhes.push({
        numero: notaFiscal.numeroNota,
        erro: resultado.error,
        status: resultado.status
      });
      erros++;
    }
    
    // Pequeno delay para não sobrecarregar
    if (i < quantidade) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Sucessos: ${sucessos}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📈 Taxa de sucesso: ${((sucessos / quantidade) * 100).toFixed(1)}%`);
  
  if (errosDetalhes.length > 0) {
    console.log('\n⚠️  Detalhes dos erros:');
    errosDetalhes.forEach(erro => {
      console.log(`   NF ${erro.numero}: ${erro.erro} (${erro.status || 'N/A'})`);
    });
  }
  
  if (sucessos > 0) {
    console.log('\n💡 Próximos passos:');
    console.log('   1. Acesse http://localhost:3000/desmembramento para ver as notas fiscais pendentes');
    console.log('   2. Use os filtros para encontrar as notas fiscais de hoje (01/01/2026)');
    console.log('   3. Clique em uma nota para iniciar o desmembramento\n');
  }
}

// Executar
main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Data:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
});


 * com data de faturamento = 01/01/2026
 * 
 * Uso: node scripts/simular-erp-envio-hoje.js [quantidade]
 * 
 * Exemplo: node scripts/simular-erp-envio-hoje.js 5
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.ERP_API_KEY || 'default-api-key-change-me';

// Data fixa de hoje
const DATA_HOJE = '2026-01-01';

// Dados de exemplo - clientes
const clientes = [
  {
    nome: 'Construtora ABC Ltda',
    cnpj: '12.345.678/0001-90',
    endereco: 'Av. Paulista, 1000 - 10º andar',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01310-100'
  },
  {
    nome: 'Obra e Reforma ME',
    cnpj: '98.765.432/0001-10',
    endereco: 'Rua das Flores, 250',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567'
  },
  {
    nome: 'Construtora XYZ S.A.',
    cnpj: '11.222.333/0001-44',
    endereco: 'Rua Industrial, 500',
    cidade: 'Guarulhos',
    estado: 'SP',
    cep: '07000-000'
  },
  {
    nome: 'Pedreira e Cimentos Ltda',
    cnpj: '55.666.777/0001-88',
    endereco: 'Rodovia dos Bandeirantes, km 25',
    cidade: 'Campinas',
    estado: 'SP',
    cep: '13000-000'
  },
  {
    nome: 'Materiais de Construção Silva',
    cnpj: '33.444.555/0001-22',
    endereco: 'Av. Faria Lima, 2000',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01452-000'
  },
  {
    nome: 'Construções Modernas Ltda',
    cnpj: '77.888.999/0001-33',
    endereco: 'Rua Comercial, 800',
    cidade: 'Osasco',
    estado: 'SP',
    cep: '06000-000'
  }
];

// Produtos de material de construção
const produtos = [
  { descricao: 'Cimento Portland CP-II-E-32', unidade: 'SAC', peso: 50, volume: 0.036, valor: 25.50, ncm: '25232900', codigo: 'CIM-001' },
  { descricao: 'Areia Média Lavada', unidade: 'M³', peso: 1500, volume: 1, valor: 85.00, ncm: '25051000', codigo: 'ARE-001' },
  { descricao: 'Brita 1 (19mm)', unidade: 'M³', peso: 1600, volume: 1, valor: 95.00, ncm: '25171000', codigo: 'BRI-001' },
  { descricao: 'Tijolo Cerâmico 9x19x19', unidade: 'MIL', peso: 3500, volume: 0.5, valor: 420.00, ncm: '69041000', codigo: 'TIJ-001' },
  { descricao: 'Argamassa Colante AC-II', unidade: 'SAC', peso: 20, volume: 0.028, valor: 18.90, ncm: '38245000', codigo: 'ARG-001' },
  { descricao: 'Reboco AC-III', unidade: 'SAC', peso: 20, volume: 0.028, valor: 15.50, ncm: '38245000', codigo: 'REB-001' },
  { descricao: 'Telha Cerâmica Portuguesa', unidade: 'M²', peso: 45, volume: 0.01, valor: 12.80, ncm: '69051000', codigo: 'TEL-001' },
  { descricao: 'Viga Pré-Moldada 10x20', unidade: 'UN', peso: 350, volume: 0.2, valor: 180.00, ncm: '68109100', codigo: 'VIG-001' },
  { descricao: 'Ferro CA-50 6.3mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 4.20, ncm: '72142000', codigo: 'FER-001' },
  { descricao: 'Ferro CA-50 8mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 4.50, ncm: '72142000', codigo: 'FER-002' },
  { descricao: 'Ferro CA-50 10mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 5.20, ncm: '72142000', codigo: 'FER-003' },
  { descricao: 'Tinta Acrílica Branco Gelo', unidade: 'LT', peso: 1.5, volume: 0.018, valor: 58.00, ncm: '32091000', codigo: 'TIN-001' },
  { descricao: 'Piso Cerâmico 60x60cm', unidade: 'M²', peso: 28, volume: 0.036, valor: 35.90, ncm: '69072200', codigo: 'PIS-001' },
  { descricao: 'Bloco de Concreto 14x19x39', unidade: 'MIL', peso: 4000, volume: 0.55, valor: 380.00, ncm: '68101100', codigo: 'BLO-001' },
  { descricao: 'Tubo PVC 100mm', unidade: 'M', peso: 8, volume: 0.008, valor: 28.50, ncm: '39172300', codigo: 'TUB-001' },
  { descricao: 'Canaleta Pré-Moldada', unidade: 'M', peso: 15, volume: 0.015, valor: 12.00, ncm: '68109100', codigo: 'CAN-001' },
  { descricao: 'Vergalhão CA-50 12.5mm', unidade: 'KG', peso: 1, volume: 0.0001, valor: 5.80, ncm: '72142000', codigo: 'VER-001' },
  { descricao: 'Cal Hidratada CH-I', unidade: 'SAC', peso: 20, volume: 0.025, valor: 16.50, ncm: '25221000', codigo: 'CAL-001' }
];

function gerarNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function selecionarAleatorio(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function gerarChaveAcesso(numeroNota, cnpj, serie = '1') {
  // Gera uma chave de acesso simulada (NFe padrão)
  const cnpjLimpo = cnpj.replace(/\D/g, '').substring(0, 14).padStart(14, '0');
  const numeroNotaLimpo = numeroNota.toString().padStart(9, '0');
  const serieLimpo = serie.padStart(3, '0');
  const codigoNumerico = gerarNumeroAleatorio(10000000, 99999999).toString();
  const dv = gerarNumeroAleatorio(0, 9);
  
  return `3520${DATA_HOJE.replace(/-/g, '')}${cnpjLimpo}55${serieLimpo}${numeroNotaLimpo}${codigoNumerico}${dv}`;
}

function gerarItens() {
  const quantidadeItens = gerarNumeroAleatorio(4, 10);
  const itensSelecionados = [];
  const indicesUsados = new Set();
  
  // Selecionar produtos únicos
  while (itensSelecionados.length < quantidadeItens && indicesUsados.size < produtos.length) {
    const indice = Math.floor(Math.random() * produtos.length);
    if (!indicesUsados.has(indice)) {
      indicesUsados.add(indice);
      const produto = produtos[indice];
      
      // Quantidade variada por tipo de unidade
      let quantidade;
      if (produto.unidade === 'SAC') {
        quantidade = gerarNumeroAleatorio(10, 300);
      } else if (produto.unidade === 'M³') {
        quantidade = gerarNumeroAleatorio(5, 100);
      } else if (produto.unidade === 'KG') {
        quantidade = gerarNumeroAleatorio(100, 5000);
      } else if (produto.unidade === 'MIL') {
        quantidade = gerarNumeroAleatorio(1, 50);
      } else if (produto.unidade === 'M²') {
        quantidade = gerarNumeroAleatorio(50, 500);
      } else {
        quantidade = gerarNumeroAleatorio(1, 100);
      }
      
      // Valor unitário com pequena variação (±3%)
      const variacao = 0.97 + Math.random() * 0.06;
      const valorUnitario = parseFloat((produto.valor * variacao).toFixed(2));
      const valorTotal = parseFloat((valorUnitario * quantidade).toFixed(2));
      
      // Gerar código interno (baseado no código do produto)
      const codigoInterno = produto.codigo;
      
      // Gerar código de barras EAN-13 simulado (789 + 9 dígitos + dígito verificador)
      const prefixoEAN = '789';
      const codigoNumerico = (100000000 + Math.floor(Math.random() * 899999999)).toString();
      // Calcular dígito verificador EAN-13 (simplificado)
      const digitos = (prefixoEAN + codigoNumerico).split('').map(Number);
      let soma = 0;
      for (let i = 0; i < 12; i++) {
        soma += digitos[i] * (i % 2 === 0 ? 1 : 3);
      }
      const digitoVerificador = (10 - (soma % 10)) % 10;
      const codigoBarrasEan = prefixoEAN + codigoNumerico + digitoVerificador;
      
      itensSelecionados.push({
        descricao: produto.descricao,
        quantidade: quantidade,
        unidade: produto.unidade,
        valorUnitario: valorUnitario,
        valorTotal: valorTotal,
        peso: parseFloat((produto.peso * quantidade).toFixed(2)),
        volume: parseFloat((produto.volume * quantidade).toFixed(3)),
        ncm: produto.ncm,
        cfop: '5102',
        codigoProduto: produto.codigo,
        codigoInterno: codigoInterno,
        codigoBarrasEan: codigoBarrasEan
      });
    }
  }
  
  return itensSelecionados;
}

function gerarNotaFiscal(numero, cliente, numeroBase = 5000) {
  const itens = gerarItens();
  const valorTotal = parseFloat(itens.reduce((sum, item) => sum + item.valorTotal, 0).toFixed(2));
  const pesoTotal = parseFloat(itens.reduce((sum, item) => sum + item.peso, 0).toFixed(2));
  const volumeTotal = parseFloat(itens.reduce((sum, item) => sum + item.volume, 0).toFixed(3));
  
  const numeroNota = (numeroBase + numero).toString().padStart(8, '0');
  const numeroPedido = `PED-${(numeroBase + numero).toString().padStart(6, '0')}`;
  
  // Data de vencimento: 30 dias após emissão
  const dataVencimento = new Date(DATA_HOJE);
  dataVencimento.setDate(dataVencimento.getDate() + 30);
  
  const observacoes = [
    null,
    'Entrega urgente - Entregar até 15:00h',
    'Cuidado com carga - Material frágil',
    'Entrega em horário comercial',
    'Confirmar recebimento com assinatura',
    'Material para obra - Seguir especificações técnicas'
  ][gerarNumeroAleatorio(0, 5)];
  
  return {
    erpId: `ERP-NF-${numeroNota}`,
    numeroNota: numeroNota,
    serie: '1',
    numeroPedido: numeroPedido,
    clienteNome: cliente.nome,
    clienteCnpjCpf: cliente.cnpj,
    clienteEndereco: cliente.endereco,
    clienteCidade: cliente.cidade,
    clienteEstado: cliente.estado,
    clienteCep: cliente.cep,
    dataEmissao: DATA_HOJE,
    dataVencimento: dataVencimento.toISOString().split('T')[0],
    valorTotal: valorTotal,
    pesoTotal: pesoTotal,
    volumeTotal: volumeTotal,
    chaveAcesso: gerarChaveAcesso(numeroNota, cliente.cnpj),
    observacoes: observacoes,
    itens: itens
  };
}

async function enviarNotaFiscal(notaFiscal) {
  try {
    const response = await axios.post(`${API_URL}/erp/notas-fiscais`, notaFiscal, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      details: error.response?.data
    };
  }
}

async function main() {
  const quantidade = parseInt(process.argv[2]) || 5;
  const numeroInicial = parseInt(process.argv[3]) || 5000;
  
  console.log('\n🚀 Simulador de Envio de Notas Fiscais do ERP');
  console.log(`📅 Data de Faturamento: ${DATA_HOJE}\n`);
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`);
  console.log(`📦 Quantidade: ${quantidade} nota(s) fiscal(is)`);
  console.log(`🔢 Número inicial: ${numeroInicial} (NF ${numeroInicial.toString().padStart(8, '0')} até ${(numeroInicial + quantidade - 1).toString().padStart(8, '0')})\n`);
  console.log('─'.repeat(70));
  
  let sucessos = 0;
  let erros = 0;
  const errosDetalhes = [];
  
  for (let i = 1; i <= quantidade; i++) {
    const cliente = selecionarAleatorio(clientes);
    const notaFiscal = gerarNotaFiscal(i, cliente, numeroInicial);
    
    process.stdout.write(`\n[${i}/${quantidade}] Enviando NF ${notaFiscal.numeroNota}... `);
    
    const resultado = await enviarNotaFiscal(notaFiscal);
    
    if (resultado.success) {
      console.log('✅ OK');
      console.log(`   Cliente: ${cliente.nome}`);
      console.log(`   Pedido: ${notaFiscal.numeroPedido}`);
      console.log(`   Valor: R$ ${notaFiscal.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`   Itens: ${notaFiscal.itens.length}`);
      console.log(`   Peso: ${notaFiscal.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`);
      console.log(`   Volume: ${notaFiscal.volumeTotal.toFixed(3)} m³`);
      sucessos++;
    } else {
      console.log(`❌ ERRO (${resultado.status || 'N/A'})`);
      console.log(`   ${resultado.error}`);
      if (resultado.details) {
        console.log(`   Detalhes: ${JSON.stringify(resultado.details)}`);
      }
      errosDetalhes.push({
        numero: notaFiscal.numeroNota,
        erro: resultado.error,
        status: resultado.status
      });
      erros++;
    }
    
    // Pequeno delay para não sobrecarregar
    if (i < quantidade) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Sucessos: ${sucessos}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📈 Taxa de sucesso: ${((sucessos / quantidade) * 100).toFixed(1)}%`);
  
  if (errosDetalhes.length > 0) {
    console.log('\n⚠️  Detalhes dos erros:');
    errosDetalhes.forEach(erro => {
      console.log(`   NF ${erro.numero}: ${erro.erro} (${erro.status || 'N/A'})`);
    });
  }
  
  if (sucessos > 0) {
    console.log('\n💡 Próximos passos:');
    console.log('   1. Acesse http://localhost:3000/desmembramento para ver as notas fiscais pendentes');
    console.log('   2. Use os filtros para encontrar as notas fiscais de hoje (01/01/2026)');
    console.log('   3. Clique em uma nota para iniciar o desmembramento\n');
  }
}

// Executar
main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Data:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
});

