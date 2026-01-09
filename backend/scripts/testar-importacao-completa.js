/**
 * Script para testar importação completa e mostrar erros detalhados
 */

require('dotenv').config();
const { initDatabase } = require('../database/init');
const { importarHistorico } = require('./importarHistoricoFaturamentos');
const path = require('path');

const arquivoCSV = process.argv[2] || 'C:\\Users\\Fabiano Silveira\\Downloads\\csv.csv';

(async () => {
  try {
    console.log('🔄 Inicializando banco de dados...\n');
    await initDatabase();
    console.log('✅ Banco inicializado\n');
    
    console.log(`📥 Importando arquivo: ${arquivoCSV}\n`);
    
    // Contar registros antes
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', 'data', 'faturamento.db');
    const db = new sqlite3.Database(dbPath);
    
    const antes = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM historico_desmembramentos_reais', [], (err, row) => {
        resolve(row?.total || 0);
      });
    });
    
    console.log(`📊 Registros ANTES da importação: ${antes}\n`);
    
    await importarHistorico(arquivoCSV);
    
    // Contar registros depois
    const depois = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM historico_desmembramentos_reais', [], (err, row) => {
        resolve(row?.total || 0);
        db.close();
      });
    });
    
    console.log(`\n📊 Registros DEPOIS da importação: ${depois}`);
    console.log(`📈 Registros ADICIONADOS: ${depois - antes}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();


