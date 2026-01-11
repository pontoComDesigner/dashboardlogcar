/**
 * Script para testar se a IA de desmembramento reconhece os padrões do histórico
 */
require('dotenv').config();
const { initDatabase } = require('../database/init');
const { distribuirItensEntreCargas } = require('../services/desmembramentoService');

async function testar() {
  await initDatabase();
  console.log("🧪 Iniciando Teste de Inteligência de Desmembramento...");

  // Criar um pedido que mistura o padrão "Fundação" com o padrão "Elétrica"
  const pedidoMisturado = [
    { codigoProduto: "9675", quantidade: 20, descricao: "CIMENTO" },      // Fundação
    { codigoProduto: "17704", quantidade: 1000, descricao: "TIJOLO" },   // Fundação
    { codigoProduto: "3001", quantidade: 10, descricao: "CABO 2.5MM" },  // Elétrica
    { codigoProduto: "3002", quantidade: 5, descricao: "DISJUNTOR" },    // Elétrica
    { codigoProduto: "3003", quantidade: 20, descricao: "CAIXA 4X2" }    // Elétrica
  ];

  console.log("\n📦 Itens do Pedido (Mistura de Fundação e Elétrica):");
  pedidoMisturado.forEach(i => console.log(`   - ${i.descricao}: ${i.quantidade}`));

  console.log("\n🤖 IA Processando distribuição baseada em histórico...");
  const resultado = await distribuirItensEntreCargas(pedidoMisturado, 0);

  console.log(`\n✅ Resultado: A IA sugeriu ${resultado.length} cargas.`);
  
  resultado.forEach((carga, idx) => {
    console.log(`\n🚚 CARGA #${idx + 1}:`);
    carga.itens.forEach(i => console.log(`   - ${i.descricao}: ${i.quantidade}`));
  });

  if (resultado.length === 2) {
    console.log("\n🎯 SUCESSO: A IA identificou os dois kits e separou corretamente!");
  } else {
    console.log("\n⚠️ A IA não conseguiu separar os kits perfeitamente. Verifique se o histórico foi importado.");
  }
  
  process.exit(0);
}

testar().catch(err => {
  console.error(err);
  process.exit(1);
});
