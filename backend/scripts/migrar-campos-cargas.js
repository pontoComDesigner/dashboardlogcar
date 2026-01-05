/**
 * Script de migração para adicionar campos na tabela cargas
 * e atualizar nota_fiscal_itens com código interno e EAN
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

const DB_PATH = path.join(__dirname, '..', 'data', 'faturamento.db');

function migrar() {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo do banco existe
    if (!fs.existsSync(DB_PATH)) {
      logger.error('Banco de dados não encontrado:', DB_PATH);
      return reject(new Error('Banco de dados não encontrado'));
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Erro ao conectar ao banco:', err);
        return reject(err);
      }
      logger.info('✅ Conectado ao banco de dados');
    });

    db.serialize(() => {
      // 1. Adicionar campos na tabela cargas
      const camposCargas = [
        'clienteNome',
        'clienteCnpjCpf',
        'clienteEndereco',
        'clienteCidade',
        'clienteEstado',
        'clienteCep',
        'dataVencimento',
        'observacoesNF'
      ];

      camposCargas.forEach(campo => {
        db.run(`ALTER TABLE cargas ADD COLUMN ${campo} TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            logger.warn(`Aviso ao adicionar coluna ${campo}:`, err.message);
          } else if (!err) {
            logger.info(`✅ Coluna ${campo} adicionada à tabela cargas`);
          }
        });
      });

      // 2. Adicionar campos na tabela nota_fiscal_itens
      const camposItens = [
        { nome: 'codigoInterno', tipo: 'TEXT' },
        { nome: 'codigoBarrasEan', tipo: 'TEXT' }
      ];

      camposItens.forEach(campo => {
        db.run(`ALTER TABLE nota_fiscal_itens ADD COLUMN ${campo.nome} ${campo.tipo}`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            logger.warn(`Aviso ao adicionar coluna ${campo.nome}:`, err.message);
          } else if (!err) {
            logger.info(`✅ Coluna ${campo.nome} adicionada à tabela nota_fiscal_itens`);
          }
        });
      });

      // Aguardar um pouco para garantir que as alterações sejam aplicadas
      setTimeout(() => {
        // 3. Copiar dados da NF para as cargas existentes
        db.run(`
          UPDATE cargas 
          SET 
            clienteNome = (SELECT clienteNome FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId),
            clienteCnpjCpf = (SELECT clienteCnpjCpf FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId),
            clienteEndereco = (SELECT clienteEndereco FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId),
            clienteCidade = (SELECT clienteCidade FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId),
            clienteEstado = (SELECT clienteEstado FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId),
            clienteCep = (SELECT clienteCep FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId),
            dataVencimento = (SELECT dataVencimento FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId),
            observacoesNF = (SELECT observacoes FROM notas_fiscais WHERE notas_fiscais.id = cargas.notaFiscalId)
          WHERE clienteNome IS NULL
        `, (err) => {
          if (err) {
            logger.warn('Aviso ao atualizar dados das cargas:', err.message);
          } else {
            db.get('SELECT changes() as changes', (err, row) => {
              if (!err && row.changes > 0) {
                logger.info(`✅ ${row.changes} carga(s) atualizada(s) com dados da NF`);
              }
            });
          }
        });

        db.close((err) => {
          if (err) {
            logger.error('Erro ao fechar banco:', err);
            return reject(err);
          }
          logger.info('✅ Migração concluída com sucesso!');
          resolve();
        });
      }, 500);
    });
  });
}

// Executar migração
migrar()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Erro na migração:', error);
    process.exit(1);
  });










