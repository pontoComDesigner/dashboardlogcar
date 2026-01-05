/**
 * Script para criar a tabela romaneio_cargas
 * 
 * Esta tabela relaciona romaneios com cargas (pedidos desmembrados)
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { logger } = require('../utils/logger');

const dbPath = path.join(__dirname, '../data/faturamento.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  }
});

logger.info('📦 Criando tabela romaneio_cargas...');

db.run(`
  CREATE TABLE IF NOT EXISTS romaneio_cargas (
    id TEXT PRIMARY KEY,
    romaneioId TEXT NOT NULL,
    cargaId TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    FOREIGN KEY (romaneioId) REFERENCES romaneios(id) ON DELETE CASCADE,
    FOREIGN KEY (cargaId) REFERENCES cargas(id) ON DELETE CASCADE,
    UNIQUE(romaneioId, cargaId)
  )
`, (err) => {
  if (err) {
    logger.error('❌ Erro ao criar tabela romaneio_cargas:', err);
    db.close();
    process.exit(1);
  }
  
  logger.success('✅ Tabela romaneio_cargas criada com sucesso!');
  db.close();
});









