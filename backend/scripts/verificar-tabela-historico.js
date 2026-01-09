/**
 * Script para verificar se a tabela historico_desmembramentos_reais existe
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
  
  // Verificar se a tabela existe
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%historico%'", [], (err, rows) => {
    if (err) {
      console.error('❌ Erro ao consultar:', err);
      db.close();
      process.exit(1);
    }
    
    console.log('📊 Tabelas com "historico" no nome:');
    if (rows && rows.length > 0) {
      rows.forEach(row => console.log(`  - ${row.name}`));
      
      // Verificar se historico_desmembramentos_reais existe
      const historico = rows.find(r => r.name === 'historico_desmembramentos_reais');
      if (historico) {
        console.log('\n✅ Tabela historico_desmembramentos_reais encontrada!');
        
        // Contar registros
        db.get('SELECT COUNT(*) as total FROM historico_desmembramentos_reais', [], (err, row) => {
          if (err) {
            console.error('❌ Erro ao contar:', err);
          } else {
            console.log(`📈 Total de registros: ${row.total}`);
          }
          db.close();
        });
      } else {
        console.log('\n❌ Tabela historico_desmembramentos_reais NÃO encontrada!');
        console.log('💡 Execute a migração/inicialização do banco primeiro.');
        db.close();
      }
    } else {
      console.log('  (nenhuma tabela encontrada)');
      console.log('\n❌ Tabela historico_desmembramentos_reais NÃO encontrada!');
      console.log('💡 Execute a migração/inicialização do banco primeiro.');
      db.close();
    }
  });
});


