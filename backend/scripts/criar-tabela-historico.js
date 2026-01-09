/**
 * Script para criar a tabela historico_desmembramentos_reais se não existir
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'faturamento.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Banco de dados não encontrado:', DB_PATH);
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco\n');
  
  // Criar tabela historico_desmembramentos_reais
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS historico_desmembramentos_reais (
      id TEXT PRIMARY KEY,
      numeroNotaFiscal TEXT NOT NULL,
      codigoProduto TEXT NOT NULL,
      descricaoProduto TEXT,
      unidade TEXT,
      quantidadeTotal INTEGER,
      quantidadePorCarga INTEGER,
      numeroCarga INTEGER,
      numeroSequencia INTEGER,
      observacoes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela:', err);
      db.close();
      process.exit(1);
    }
    
    console.log('✅ Tabela historico_desmembramentos_reais criada/verificada');
    
    // Criar índices
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_historico_numeroNotaFiscal ON historico_desmembramentos_reais(numeroNotaFiscal)',
      'CREATE INDEX IF NOT EXISTS idx_historico_codigoProduto ON historico_desmembramentos_reais(codigoProduto)',
      'CREATE INDEX IF NOT EXISTS idx_historico_numeroCarga ON historico_desmembramentos_reais(numeroCarga)'
    ];
    
    let completed = 0;
    indexes.forEach((indexSQL, idx) => {
      db.run(indexSQL, (err) => {
        if (err) {
          console.warn(`⚠️  Aviso ao criar índice ${idx + 1}:`, err.message);
        } else {
          console.log(`✅ Índice ${idx + 1} criado/verificado`);
        }
        
        completed++;
        if (completed === indexes.length) {
          console.log('\n✅ Tabela e índices criados com sucesso!\n');
          db.close();
        }
      });
    });
  });
});


