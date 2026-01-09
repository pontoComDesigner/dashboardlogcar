/**
 * Script para verificar estatísticas do módulo ML
 */

require('dotenv').config();
const { initDatabase, getDatabase } = require('../database/init');
const sqlite3 = require('sqlite3').verbose();

(async () => {
  try {
    await initDatabase();
    const db = getDatabase();
    
    console.log('📊 ESTATÍSTICAS DO MÓDULO ML\n');
    
    // Contar registros de treinamento
    const trainingData = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM ml_training_data', [], (err, row) => {
        resolve(row?.total || 0);
      });
    });
    
    console.log(`📦 Dados de treinamento: ${trainingData} registros`);
    
    // Contar modelos
    const modelos = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM ml_models', [], (err, row) => {
        resolve(row?.total || 0);
      });
    });
    
    const modelosAtivos = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM ml_models WHERE status = ?', ['ATIVO'], (err, row) => {
        resolve(row?.total || 0);
      });
    });
    
    console.log(`🤖 Modelos cadastrados: ${modelos}`);
    console.log(`✅ Modelos ativos: ${modelosAtivos}`);
    
    // Contar predições
    const predicoes = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM ml_predictions', [], (err, row) => {
        resolve(row?.total || 0);
      });
    });
    
    console.log(`🔮 Predições realizadas: ${predicoes}\n`);
    
    // Status
    if (trainingData >= 50) {
      console.log('✅ Sistema pronto para treinamento!');
    } else {
      console.log(`⚠️  Recomendado: ${50 - trainingData} registros adicionais para treinamento ideal`);
    }
    
    if (modelosAtivos > 0) {
      console.log('✅ Há modelo ativo - sistema ML operacional');
    } else {
      console.log('⚠️  Nenhum modelo ativo - sistema usando fallback (regras fixas)');
    }
    
    console.log('\n💡 Próximos passos:');
    console.log('   1. Testar predições via API');
    console.log('   2. Testar desmembramento automático no frontend');
    console.log('   3. Quando houver modelo treinado, sistema usará ML automaticamente\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();


