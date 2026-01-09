/**
 * Script para limpar todas as tabelas do banco de dados
 * Mantém a estrutura, apenas remove os dados
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
// Logger simples se não existir
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

const DB_PATH = path.join(__dirname, '..', 'data', 'faturamento.db');

function limparBanco() {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo do banco existe
    if (!fs.existsSync(DB_PATH)) {
      logger.info('Banco de dados não encontrado. Nada para limpar.');
      return resolve();
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Erro ao conectar ao banco:', err);
        return reject(err);
      }
      logger.info('✅ Conectado ao banco de dados');
    });

    // Ordem de deleção (respeitando foreign keys)
    const tabelas = [
      'carga_itens',
      'cargas',
      'nota_fiscal_itens',
      'notas_fiscais',
      'pedido_itens',
      'pedidos',
      'romaneio_pedidos',
      'romaneios',
      'desmembramentos_historico',
      'padroes_desmembramento',
      'auditoria'
      // Não limpar 'users' para manter os usuários cadastrados
    ];

    db.serialize(() => {
      // Desabilitar foreign keys temporariamente
      db.run('PRAGMA foreign_keys = OFF', (err) => {
        if (err) {
          logger.warn('Aviso ao desabilitar foreign keys:', err.message);
        }
      });

      let completadas = 0;
      let erros = 0;

      tabelas.forEach((tabela) => {
        db.run(`DELETE FROM ${tabela}`, (err) => {
          if (err) {
            logger.error(`Erro ao limpar tabela ${tabela}:`, err.message);
            erros++;
          } else {
            db.get(`SELECT changes() as changes`, (err, row) => {
              if (!err && row) {
                logger.info(`✅ Tabela ${tabela} limpa (${row.changes} registro(s) removido(s))`);
              }
            });
          }

          completadas++;
          if (completadas === tabelas.length) {
            // Reabilitar foreign keys
            db.run('PRAGMA foreign_keys = ON', (err) => {
              if (err) {
                logger.warn('Aviso ao reabilitar foreign keys:', err.message);
              }

              // Resetar auto-incrementos (se houver)
              db.run('DELETE FROM sqlite_sequence', (err) => {
                if (err && !err.message.includes('no such table')) {
                  logger.warn('Aviso ao resetar sequências:', err.message);
                }

                db.close((err) => {
                  if (err) {
                    logger.error('Erro ao fechar banco:', err);
                    return reject(err);
                  }
                  logger.info('✅ Banco de dados limpo com sucesso!');
                  logger.info(`📊 Resumo: ${tabelas.length - erros} tabelas limpas, ${erros} erros`);
                  resolve();
                });
              });
            });
          }
        });
      });
    });
  });
}

// Executar limpeza
limparBanco()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Erro ao limpar banco:', error);
    process.exit(1);
  });


 * Mantém a estrutura, apenas remove os dados
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
// Logger simples se não existir
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

const DB_PATH = path.join(__dirname, '..', 'data', 'faturamento.db');

function limparBanco() {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo do banco existe
    if (!fs.existsSync(DB_PATH)) {
      logger.info('Banco de dados não encontrado. Nada para limpar.');
      return resolve();
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Erro ao conectar ao banco:', err);
        return reject(err);
      }
      logger.info('✅ Conectado ao banco de dados');
    });

    // Ordem de deleção (respeitando foreign keys)
    const tabelas = [
      'carga_itens',
      'cargas',
      'nota_fiscal_itens',
      'notas_fiscais',
      'pedido_itens',
      'pedidos',
      'romaneio_pedidos',
      'romaneios',
      'desmembramentos_historico',
      'padroes_desmembramento',
      'auditoria'
      // Não limpar 'users' para manter os usuários cadastrados
    ];

    db.serialize(() => {
      // Desabilitar foreign keys temporariamente
      db.run('PRAGMA foreign_keys = OFF', (err) => {
        if (err) {
          logger.warn('Aviso ao desabilitar foreign keys:', err.message);
        }
      });

      let completadas = 0;
      let erros = 0;

      tabelas.forEach((tabela) => {
        db.run(`DELETE FROM ${tabela}`, (err) => {
          if (err) {
            logger.error(`Erro ao limpar tabela ${tabela}:`, err.message);
            erros++;
          } else {
            db.get(`SELECT changes() as changes`, (err, row) => {
              if (!err && row) {
                logger.info(`✅ Tabela ${tabela} limpa (${row.changes} registro(s) removido(s))`);
              }
            });
          }

          completadas++;
          if (completadas === tabelas.length) {
            // Reabilitar foreign keys
            db.run('PRAGMA foreign_keys = ON', (err) => {
              if (err) {
                logger.warn('Aviso ao reabilitar foreign keys:', err.message);
              }

              // Resetar auto-incrementos (se houver)
              db.run('DELETE FROM sqlite_sequence', (err) => {
                if (err && !err.message.includes('no such table')) {
                  logger.warn('Aviso ao resetar sequências:', err.message);
                }

                db.close((err) => {
                  if (err) {
                    logger.error('Erro ao fechar banco:', err);
                    return reject(err);
                  }
                  logger.info('✅ Banco de dados limpo com sucesso!');
                  logger.info(`📊 Resumo: ${tabelas.length - erros} tabelas limpas, ${erros} erros`);
                  resolve();
                });
              });
            });
          }
        });
      });
    });
  });
}

// Executar limpeza
limparBanco()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Erro ao limpar banco:', error);
    process.exit(1);
  });


 * Mantém a estrutura, apenas remove os dados
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
// Logger simples se não existir
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

const DB_PATH = path.join(__dirname, '..', 'data', 'faturamento.db');

function limparBanco() {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo do banco existe
    if (!fs.existsSync(DB_PATH)) {
      logger.info('Banco de dados não encontrado. Nada para limpar.');
      return resolve();
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Erro ao conectar ao banco:', err);
        return reject(err);
      }
      logger.info('✅ Conectado ao banco de dados');
    });

    // Ordem de deleção (respeitando foreign keys)
    const tabelas = [
      'carga_itens',
      'cargas',
      'nota_fiscal_itens',
      'notas_fiscais',
      'pedido_itens',
      'pedidos',
      'romaneio_pedidos',
      'romaneios',
      'desmembramentos_historico',
      'padroes_desmembramento',
      'auditoria'
      // Não limpar 'users' para manter os usuários cadastrados
    ];

    db.serialize(() => {
      // Desabilitar foreign keys temporariamente
      db.run('PRAGMA foreign_keys = OFF', (err) => {
        if (err) {
          logger.warn('Aviso ao desabilitar foreign keys:', err.message);
        }
      });

      let completadas = 0;
      let erros = 0;

      tabelas.forEach((tabela) => {
        db.run(`DELETE FROM ${tabela}`, (err) => {
          if (err) {
            logger.error(`Erro ao limpar tabela ${tabela}:`, err.message);
            erros++;
          } else {
            db.get(`SELECT changes() as changes`, (err, row) => {
              if (!err && row) {
                logger.info(`✅ Tabela ${tabela} limpa (${row.changes} registro(s) removido(s))`);
              }
            });
          }

          completadas++;
          if (completadas === tabelas.length) {
            // Reabilitar foreign keys
            db.run('PRAGMA foreign_keys = ON', (err) => {
              if (err) {
                logger.warn('Aviso ao reabilitar foreign keys:', err.message);
              }

              // Resetar auto-incrementos (se houver)
              db.run('DELETE FROM sqlite_sequence', (err) => {
                if (err && !err.message.includes('no such table')) {
                  logger.warn('Aviso ao resetar sequências:', err.message);
                }

                db.close((err) => {
                  if (err) {
                    logger.error('Erro ao fechar banco:', err);
                    return reject(err);
                  }
                  logger.info('✅ Banco de dados limpo com sucesso!');
                  logger.info(`📊 Resumo: ${tabelas.length - erros} tabelas limpas, ${erros} erros`);
                  resolve();
                });
              });
            });
          }
        });
      });
    });
  });
}

// Executar limpeza
limparBanco()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Erro ao limpar banco:', error);
    process.exit(1);
  });

