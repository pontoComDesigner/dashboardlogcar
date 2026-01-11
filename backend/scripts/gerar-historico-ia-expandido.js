/**
 * Script para gerar um histórico de faturamento diversificado para teste da IA
 */
const fs = require('fs');
const path = require('path');

const padroes = [
  { nome: "Fundação", itens: [{ c: "9675", q: 20, d: "CIMENTO" }, { c: "17704", q: 1000, d: "TIJOLO" }] },
  { nome: "Acabamento", itens: [{ c: "2001", q: 5, d: "PISO" }, { c: "2002", q: 2, d: "ARGAMASSA AC3" }] },
  { nome: "Elétrica", itens: [{ c: "3001", q: 10, d: "CABO 2.5MM" }, { c: "3002", q: 5, d: "DISJUNTOR" }, { c: "3003", q: 20, d: "CAIXA 4X2" }] },
  { nome: "Hidráulica", itens: [{ c: "4001", q: 4, d: "TUBO ESGOTO" }, { c: "4002", q: 10, d: "COVELO" }] },
  { nome: "Especial Areia", itens: [{ c: "6000", q: 1, d: "AREIA CARRADA" }] }
];

let csv = "Numero Nota Fiscal,Codigo do Produto,Descricao do Produto,Unidade,Quantidade\n";

// Gerar 50 notas fiscais baseadas nos padrões
for (let i = 1; i <= 50; i++) {
  const padrao = padroes[Math.floor(Math.random() * padroes.length)];
  const nf = `NF-TREINO-${i.toString().padStart(3, '0')}`;
  
  padrao.itens.forEach(item => {
    csv += `${nf},${item.c},${item.d},UN,${item.q}\n`;
  });
}

const filePath = path.join(__dirname, '../../historico_ia_expandido.csv');
fs.writeFileSync(filePath, csv);
console.log(`✅ Arquivo gerado em: ${filePath}`);
console.log(`💡 Importe este arquivo nas configurações para treinar o sistema com ${padroes.length} padrões diferentes.`);
