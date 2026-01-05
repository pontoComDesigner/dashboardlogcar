/**
 * Script para adicionar campos de vendedor e telefones na tabela notas_fiscais
 * 
 * Execute este script para adicionar os campos:
 * - vendedorId
 * - vendedorNome
 * - clienteTelefone1
 * - clienteTelefone2
 * 
 * Uso: node scripts/adicionar-campos-vendedor-telefone.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/faturamento.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco de dados');
  console.log('📋 Adicionando campos de vendedor e telefones...\n');
  
  const migrations = [
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorId TEXT`, name: 'notas_fiscais.vendedorId' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorNome TEXT`, name: 'notas_fiscais.vendedorNome' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone1 TEXT`, name: 'notas_fiscais.clienteTelefone1' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone2 TEXT`, name: 'notas_fiscais.clienteTelefone2' }
  ];
  
  let completed = 0;
  let errors = 0;
  
  migrations.forEach((migration, index) => {
    db.run(migration.sql, (err) => {
      if (err) {
        // Ignorar erro se coluna já existe
        if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
          console.log(`   ⏭️  ${migration.name} já existe (${index + 1}/${migrations.length})`);
        } else {
          console.error(`   ❌ Erro na migração ${migration.name} (${index + 1}/${migrations.length}):`, err.message);
          errors++;
        }
      } else {
        console.log(`   ✅ ${migration.name} adicionada (${index + 1}/${migrations.length})`);
      }
      
      completed++;
      
      if (completed === migrations.length) {
        console.log(`\n📊 Resumo: ${migrations.length - errors} migrações aplicadas, ${errors} erros`);
        if (errors === 0) {
          console.log('✅ Migração concluída com sucesso!\n');
        } else {
          console.log('⚠️ Algumas migrações falharam. Verifique os erros acima.\n');
        }
        db.close();
      }
    });
  });
});







