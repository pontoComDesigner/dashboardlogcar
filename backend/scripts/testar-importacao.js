/**
 * Script para testar importação com inicialização do banco
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
    await importarHistorico(arquivoCSV);
    
    console.log('\n✅ Importação concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();


