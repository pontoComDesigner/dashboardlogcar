/**
 * Script para simular envio de Notas Fiscais do ERP
 * 
 * Uso: node scripts/simular-erp-envio.js [quantidade]
 * 
 * Exemplo: node scripts/simular-erp-envio.js 5
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const API_KEY = process.env.ERP_API_KEY || 'default-api-key-change-me';

// Dados de exemplo
const clientes = [
  {
    nome: 'Construtora ABC Ltda',
    cnpj: '12.345.678/0001-90',
    endereco: 'Av. Paulista, 1000',
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
  }
];

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
  { descricao: 'Tinta Acrílica Branco Gelo', unidade: 'LT', peso: 1.5, volume: 0.018, valor: 58.00, ncm: '32091000', codigo: 'TIN-001' },
  { descricao: 'Piso Cerâmico 60x60cm', unidade: 'M²', peso: 28, volume: 0.036, valor: 35.90, ncm: '69072200', codigo: 'PIS-001' }
];

function gerarNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function selecionarAleatorio(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function gerarItens() {
  const quantidadeItens = gerarNumeroAleatorio(3, 8);
  const itensSelecionados = [];
  const indicesUsados = new Set();
  
  // Selecionar produtos únicos
  while (itensSelecionados.length < quantidadeItens && indicesUsados.size < produtos.length) {
    const indice = Math.floor(Math.random() * produtos.length);
    if (!indicesUsados.has(indice)) {
      indicesUsados.add(indice);
      const produto = produtos[indice];
      const quantidade = gerarNumeroAleatorio(1, produto.unidade === 'SAC' ? 200 : produto.unidade === 'M³' ? 50 : produto.unidade === 'KG' ? 5000 : 1000);
      const valorUnitario = produto.valor * (0.95 + Math.random() * 0.1); // Variação de ±5%
      
      itensSelecionados.push({
        descricao: produto.descricao,
        quantidade: quantidade,
        unidade: produto.unidade,
        valorUnitario: parseFloat(valorUnitario.toFixed(2)),
        valorTotal: parseFloat((valorUnitario * quantidade).toFixed(2)),
        peso: produto.peso * quantidade,
        volume: produto.volume * quantidade,
        ncm: produto.ncm,
        cfop: '5102',
        codigoProduto: produto.codigo
      });
    }
  }
  
  return itensSelecionados;
}

function gerarNotaFiscal(numero, cliente) {
  const itens = gerarItens();
  const valorTotal = itens.reduce((sum, item) => sum + item.valorTotal, 0);
  const pesoTotal = itens.reduce((sum, item) => sum + item.peso, 0);
  const volumeTotal = itens.reduce((sum, item) => sum + item.volume, 0);
  
  const dataEmissao = new Date();
  dataEmissao.setDate(dataEmissao.getDate() - gerarNumeroAleatorio(0, 7)); // Últimos 7 dias
  
  return {
    erpId: `ERP-NF-${numero.toString().padStart(6, '0')}`,
    numeroNota: numero.toString().padStart(8, '0'),
    serie: '1',
    numeroPedido: `PED-${numero.toString().padStart(5, '0')}`,
    clienteNome: cliente.nome,
    clienteCnpjCpf: cliente.cnpj,
    clienteEndereco: cliente.endereco,
    clienteCidade: cliente.cidade,
    clienteEstado: cliente.estado,
    clienteCep: cliente.cep,
    dataEmissao: dataEmissao.toISOString().split('T')[0],
    valorTotal: parseFloat(valorTotal.toFixed(2)),
    pesoTotal: parseFloat(pesoTotal.toFixed(2)),
    volumeTotal: parseFloat(volumeTotal.toFixed(3)),
    chaveAcesso: `3520${new Date().getFullYear()}${cliente.cnpj.replace(/\D/g, '').substring(0, 8)}550000000${numero.toString().padStart(8, '0')}${gerarNumeroAleatorio(10000000, 99999999)}`,
    observacoes: gerarNumeroAleatorio(1, 3) === 1 ? 'Entrega urgente' : gerarNumeroAleatorio(1, 2) === 1 ? 'Cuidado com carga' : null,
    itens: itens
  };
}

async function enviarNotaFiscal(notaFiscal) {
  try {
    const response = await axios.post(`${API_URL}/erp/notas-fiscais`, notaFiscal, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function main() {
  const quantidade = parseInt(process.argv[2]) || 3;
  
  console.log('\n🚀 Simulador de Envio de Notas Fiscais do ERP\n');
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`📦 Quantidade: ${quantidade} nota(s) fiscal(is)\n`);
  console.log('─'.repeat(60));
  
  let sucessos = 0;
  let erros = 0;
  
  for (let i = 1; i <= quantidade; i++) {
    const cliente = selecionarAleatorio(clientes);
    const notaFiscal = gerarNotaFiscal(1000 + i, cliente);
    
    process.stdout.write(`\n[${i}/${quantidade}] Enviando NF ${notaFiscal.numeroNota}... `);
    
    const resultado = await enviarNotaFiscal(notaFiscal);
    
    if (resultado.success) {
      console.log('✅ OK');
      console.log(`   Cliente: ${cliente.nome}`);
      console.log(`   Valor: R$ ${notaFiscal.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      console.log(`   Itens: ${notaFiscal.itens.length}`);
      console.log(`   Peso: ${notaFiscal.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`);
      console.log(`   Volume: ${notaFiscal.volumeTotal.toFixed(3)} m³`);
      sucessos++;
    } else {
      console.log(`❌ ERRO (${resultado.status || 'N/A'})`);
      console.log(`   ${resultado.error}`);
      erros++;
    }
    
    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Sucessos: ${sucessos}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📈 Taxa de sucesso: ${((sucessos / quantidade) * 100).toFixed(1)}%\n`);
  
  if (sucessos > 0) {
    console.log('💡 Dica: Acesse http://localhost:3000/desmembramento para ver as notas fiscais pendentes!\n');
  }
}

// Executar
main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  process.exit(1);
});









