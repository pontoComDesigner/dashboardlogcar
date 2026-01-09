/**
 * Script para verificar dados na tabela historico_desmembramentos_reais
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'faturamento.db');

console.log('📍 Caminho do banco:', DB_PATH);
console.log('📂 Banco existe?', fs.existsSync(DB_PATH) ? 'SIM ✅' : 'NÃO ❌');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Banco de dados não encontrado!');
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco\n');
  
  // Contar registros
  db.get('SELECT COUNT(*) as total FROM historico_desmembramentos_reais', [], (err, row) => {
    if (err) {
      console.error('❌ Erro ao contar:', err);
      db.close();
      process.exit(1);
    }
    
    console.log(`📈 Total de registros: ${row.total}\n`);
    
    if (row.total === 0) {
      console.log('⚠️  Tabela está vazia. Os dados não foram importados.');
      console.log('💡 Você precisa importar os dados pelo frontend ou usar: npm run importar-historico <arquivo.csv>\n');
      db.close();
      return;
    }
    
    // Buscar notas fiscais únicas
    db.all('SELECT DISTINCT numeroNotaFiscal FROM historico_desmembramentos_reais ORDER BY numeroNotaFiscal LIMIT 10', [], (err, rows) => {
      if (err) {
        console.error('❌ Erro ao buscar NFs:', err);
        db.close();
        process.exit(1);
      }
      
      console.log(`📋 Primeiras 10 notas fiscais encontradas:`);
      if (rows && rows.length > 0) {
        rows.forEach((row, idx) => {
          console.log(`  ${idx + 1}. ${row.numeroNotaFiscal}`);
        });
        
        // Buscar alguns registros de exemplo
        console.log('\n📦 Primeiros 5 registros (exemplo):');
        db.all('SELECT numeroNotaFiscal, codigoProduto, quantidadeTotal, numeroCarga FROM historico_desmembramentos_reais LIMIT 5', [], (err, examples) => {
          if (err) {
            console.error('❌ Erro ao buscar exemplos:', err);
          } else if (examples && examples.length > 0) {
            examples.forEach((ex, idx) => {
              console.log(`  ${idx + 1}. NF: ${ex.numeroNotaFiscal} | Produto: ${ex.codigoProduto} | Qtd: ${ex.quantidadeTotal} | Carga: ${ex.numeroCarga}`);
            });
          }
          db.close();
        });
      } else {
        console.log('  (nenhuma nota fiscal encontrada)');
        db.close();
      }
    });
  });
});


