/**
 * Script para adicionar colunas faltantes nas tabelas existentes
 * 
 * Execute este script se você já tinha um banco de dados criado antes
 * das atualizações de estrutura
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/faturamento.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco de dados');
  
  // Adicionar colunas se não existirem
  // SQLite não suporta UNIQUE em ADD COLUMN, então erpId será adicionado sem UNIQUE
  const migrations = [
    // Tabela notas_fiscais
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN numeroPedido TEXT`, name: 'notas_fiscais.numeroPedido' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteCidade TEXT`, name: 'notas_fiscais.clienteCidade' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteEstado TEXT`, name: 'notas_fiscais.clienteEstado' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteCep TEXT`, name: 'notas_fiscais.clienteCep' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN erpId TEXT`, name: 'notas_fiscais.erpId' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN recebidoDoErp INTEGER DEFAULT 0`, name: 'notas_fiscais.recebidoDoErp' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN pesoTotal REAL`, name: 'notas_fiscais.pesoTotal' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN volumeTotal REAL`, name: 'notas_fiscais.volumeTotal' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorId TEXT`, name: 'notas_fiscais.vendedorId' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorNome TEXT`, name: 'notas_fiscais.vendedorNome' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone1 TEXT`, name: 'notas_fiscais.clienteTelefone1' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone2 TEXT`, name: 'notas_fiscais.clienteTelefone2' },
    
    // Tabela nota_fiscal_itens
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN quantidadeDesmembrada REAL DEFAULT 0`, name: 'nota_fiscal_itens.quantidadeDesmembrada' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN peso REAL`, name: 'nota_fiscal_itens.peso' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN volume REAL`, name: 'nota_fiscal_itens.volume' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN codigoProduto TEXT`, name: 'nota_fiscal_itens.codigoProduto' }
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
        console.log('✅ Migração concluída!\n');
        db.close();
      }
    });
  });
});


 * 
 * Execute este script se você já tinha um banco de dados criado antes
 * das atualizações de estrutura
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/faturamento.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco de dados');
  
  // Adicionar colunas se não existirem
  // SQLite não suporta UNIQUE em ADD COLUMN, então erpId será adicionado sem UNIQUE
  const migrations = [
    // Tabela notas_fiscais
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN numeroPedido TEXT`, name: 'notas_fiscais.numeroPedido' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteCidade TEXT`, name: 'notas_fiscais.clienteCidade' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteEstado TEXT`, name: 'notas_fiscais.clienteEstado' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteCep TEXT`, name: 'notas_fiscais.clienteCep' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN erpId TEXT`, name: 'notas_fiscais.erpId' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN recebidoDoErp INTEGER DEFAULT 0`, name: 'notas_fiscais.recebidoDoErp' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN pesoTotal REAL`, name: 'notas_fiscais.pesoTotal' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN volumeTotal REAL`, name: 'notas_fiscais.volumeTotal' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorId TEXT`, name: 'notas_fiscais.vendedorId' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorNome TEXT`, name: 'notas_fiscais.vendedorNome' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone1 TEXT`, name: 'notas_fiscais.clienteTelefone1' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone2 TEXT`, name: 'notas_fiscais.clienteTelefone2' },
    
    // Tabela nota_fiscal_itens
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN quantidadeDesmembrada REAL DEFAULT 0`, name: 'nota_fiscal_itens.quantidadeDesmembrada' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN peso REAL`, name: 'nota_fiscal_itens.peso' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN volume REAL`, name: 'nota_fiscal_itens.volume' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN codigoProduto TEXT`, name: 'nota_fiscal_itens.codigoProduto' }
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
        console.log('✅ Migração concluída!\n');
        db.close();
      }
    });
  });
});


 * 
 * Execute este script se você já tinha um banco de dados criado antes
 * das atualizações de estrutura
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/faturamento.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco de dados');
  
  // Adicionar colunas se não existirem
  // SQLite não suporta UNIQUE em ADD COLUMN, então erpId será adicionado sem UNIQUE
  const migrations = [
    // Tabela notas_fiscais
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN numeroPedido TEXT`, name: 'notas_fiscais.numeroPedido' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteCidade TEXT`, name: 'notas_fiscais.clienteCidade' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteEstado TEXT`, name: 'notas_fiscais.clienteEstado' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteCep TEXT`, name: 'notas_fiscais.clienteCep' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN erpId TEXT`, name: 'notas_fiscais.erpId' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN recebidoDoErp INTEGER DEFAULT 0`, name: 'notas_fiscais.recebidoDoErp' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN pesoTotal REAL`, name: 'notas_fiscais.pesoTotal' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN volumeTotal REAL`, name: 'notas_fiscais.volumeTotal' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorId TEXT`, name: 'notas_fiscais.vendedorId' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN vendedorNome TEXT`, name: 'notas_fiscais.vendedorNome' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone1 TEXT`, name: 'notas_fiscais.clienteTelefone1' },
    { sql: `ALTER TABLE notas_fiscais ADD COLUMN clienteTelefone2 TEXT`, name: 'notas_fiscais.clienteTelefone2' },
    
    // Tabela nota_fiscal_itens
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN quantidadeDesmembrada REAL DEFAULT 0`, name: 'nota_fiscal_itens.quantidadeDesmembrada' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN peso REAL`, name: 'nota_fiscal_itens.peso' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN volume REAL`, name: 'nota_fiscal_itens.volume' },
    { sql: `ALTER TABLE nota_fiscal_itens ADD COLUMN codigoProduto TEXT`, name: 'nota_fiscal_itens.codigoProduto' }
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
        console.log('✅ Migração concluída!\n');
        db.close();
      }
    });
  });
});

