/**
 * Script para criar tabelas do módulo de Machine Learning
 * 
 * Execute: node scripts/criar-tabelas-ml.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'faturamento.db');

// Garantir que o diretório existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao banco de dados');
  
  // Criar tabelas
  const tabelas = [
    {
      nome: 'ml_training_data',
      sql: `
        CREATE TABLE IF NOT EXISTS ml_training_data (
          id TEXT PRIMARY KEY,
          numeroNotaFiscal TEXT NOT NULL,
          
          -- FEATURES (entradas do modelo)
          totalItens INTEGER,
          totalProdutosUnicos INTEGER,
          pesoTotal REAL,
          volumeTotal REAL,
          valorTotal REAL,
          temProdutosEspeciais INTEGER DEFAULT 0,
          quantidadeProdutosEspeciais INTEGER DEFAULT 0,
          percentualProdutosEspeciais REAL,
          listaCodigosProdutos TEXT,
          listaQuantidades TEXT,
          listaValores TEXT,
          mediaQuantidadePorItem REAL,
          desvioPadraoQuantidades REAL,
          mediaValorPorItem REAL,
          frequenciaMediaProdutos REAL,
          similaridadeComHistorico REAL,
          
          -- LABELS (saídas esperadas)
          numeroCargas INTEGER NOT NULL,
          distribuicaoCargas TEXT,
          
          -- METADADOS
          metodoOrigem TEXT,
          confiancaOrigem REAL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          processedAt TEXT,
          usedInTraining INTEGER DEFAULT 0
        )
      `
    },
    {
      nome: 'ml_models',
      sql: `
        CREATE TABLE IF NOT EXISTS ml_models (
          id TEXT PRIMARY KEY,
          versao TEXT NOT NULL UNIQUE,
          nome TEXT NOT NULL,
          algoritmo TEXT NOT NULL,
          parametros TEXT,
          metricas TEXT,
          arquivoModelo TEXT,
          status TEXT DEFAULT 'INATIVO',
          accuracy REAL,
          precision REAL,
          recall REAL,
          f1Score REAL,
          trainedAt TEXT,
          trainedBy TEXT,
          observacoes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      nome: 'ml_predictions',
      sql: `
        CREATE TABLE IF NOT EXISTS ml_predictions (
          id TEXT PRIMARY KEY,
          notaFiscalId TEXT NOT NULL,
          modeloVersao TEXT,
          
          -- INPUT
          features TEXT,
          
          -- OUTPUT (predição)
          numeroCargasSugerido INTEGER,
          distribuicaoSugerida TEXT,
          confianca REAL,
          
          -- RESULTADO FINAL
          aceito INTEGER DEFAULT 0,
          distribuicaoFinal TEXT,
          ajustadoManualmente INTEGER DEFAULT 0,
          
          -- METADADOS
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          usadoParaTreinar INTEGER DEFAULT 0
        )
      `
    },
    {
      nome: 'ml_audit_log',
      sql: `
        CREATE TABLE IF NOT EXISTS ml_audit_log (
          id TEXT PRIMARY KEY,
          acao TEXT NOT NULL,
          usuarioId TEXT,
          usuarioNome TEXT,
          detalhes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
  ];
  
  // Criar índices
  const indices = [
    { nome: 'idx_ml_training_data_numeroNotaFiscal', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_training_data_numeroNotaFiscal ON ml_training_data(numeroNotaFiscal)' },
    { nome: 'idx_ml_training_data_usedInTraining', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_training_data_usedInTraining ON ml_training_data(usedInTraining)' },
    { nome: 'idx_ml_models_status', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status)' },
    { nome: 'idx_ml_models_versao', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_models_versao ON ml_models(versao)' },
    { nome: 'idx_ml_predictions_notaFiscalId', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_predictions_notaFiscalId ON ml_predictions(notaFiscalId)' },
    { nome: 'idx_ml_predictions_modeloVersao', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_predictions_modeloVersao ON ml_predictions(modeloVersao)' },
    { nome: 'idx_ml_predictions_aceito', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_predictions_aceito ON ml_predictions(aceito)' },
    { nome: 'idx_ml_audit_log_acao', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_audit_log_acao ON ml_audit_log(acao)' },
    { nome: 'idx_ml_audit_log_createdAt', sql: 'CREATE INDEX IF NOT EXISTS idx_ml_audit_log_createdAt ON ml_audit_log(createdAt)' }
  ];
  
  let tabelasCriadas = 0;
  let indicesCriados = 0;
  
  // Criar tabelas
  tabelas.forEach(({ nome, sql }) => {
    db.run(sql, (err) => {
      if (err) {
        console.error(`❌ Erro ao criar tabela ${nome}:`, err.message);
      } else {
        console.log(`✅ Tabela ${nome} criada/verificada`);
        tabelasCriadas++;
      }
      
      if (tabelasCriadas === tabelas.length) {
        // Criar índices após tabelas
        criarIndices();
      }
    });
  });
  
  function criarIndices() {
    indices.forEach(({ nome, sql }) => {
      db.run(sql, (err) => {
        if (err) {
          console.error(`❌ Erro ao criar índice ${nome}:`, err.message);
        } else {
          console.log(`✅ Índice ${nome} criado/verificado`);
          indicesCriados++;
        }
        
        if (indicesCriados === indices.length) {
          console.log('\n✅ Todas as tabelas e índices do módulo ML foram criados com sucesso!');
          db.close();
        }
      });
    });
  }
});

