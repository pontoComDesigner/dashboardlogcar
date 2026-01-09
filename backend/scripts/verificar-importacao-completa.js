/**
 * Script para verificar importação completa e executar preparação de dados ML
 */

require('dotenv').config();
const { initDatabase, getDatabase } = require('../database/init');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

(async () => {
  try {
    await initDatabase();
    const db = getDatabase();
    
    // Contar registros
    const total = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM historico_desmembramentos_reais', [], (err, row) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    });
    
    console.log(`📊 Total de registros no histórico: ${total}`);
    
    // Contar notas fiscais únicas
    const nfs = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT numeroNotaFiscal FROM historico_desmembramentos_reais', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows?.length || 0);
      });
    });
    
    console.log(`📋 Total de notas fiscais únicas: ${nfs}`);
    
    // Contar registros em ml_training_data
    const mlTotal = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM ml_training_data', [], (err, row) => {
        if (err && err.message.includes('no such table')) resolve(0);
        else if (err) reject(err);
        else resolve(row?.total || 0);
      });
    });
    
    console.log(`🤖 Total de registros em ml_training_data: ${mlTotal}`);
    
    console.log('\n💡 Para preparar dados ML: npm run preparar-dados-ml');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();


