/**
 * Inicialização do Banco de Dados SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/faturamento.db');
const DB_DIR = path.dirname(DB_PATH);

// Criar diretório se não existir
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;

/**
 * Inicializa o banco de dados e cria as tabelas
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Erro ao conectar ao banco de dados:', err);
        reject(err);
        return;
      }
      
      logger.info(`✅ Banco de dados conectado: ${DB_PATH}`);
      
      // Criar tabelas
      createTables()
        .then(() => {
          // Inserir dados iniciais
          return insertInitialData();
        })
        .then(() => {
          resolve(db);
        })
        .catch((error) => {
          logger.error('Erro ao inicializar banco de dados:', error);
          reject(error);
        });
    });
  });
}

/**
 * Cria todas as tabelas necessárias
 */
function createTables() {
  return new Promise((resolve, reject) => {
    const tables = [
      // Tabela de usuários
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL CHECK(role IN ('ADMINISTRATIVO', 'LOGISTICA')),
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela de pedidos
      `CREATE TABLE IF NOT EXISTS pedidos (
        id TEXT PRIMARY KEY,
        numeroPedido TEXT UNIQUE NOT NULL,
        clienteNome TEXT NOT NULL,
        clienteCnpjCpf TEXT,
        clienteEndereco TEXT,
        clienteCidade TEXT,
        clienteEstado TEXT,
        clienteCep TEXT,
        status TEXT NOT NULL DEFAULT 'PENDENTE',
        valorTotal REAL NOT NULL DEFAULT 0,
        observacoes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela de itens do pedido
      `CREATE TABLE IF NOT EXISTS pedido_itens (
        id TEXT PRIMARY KEY,
        pedidoId TEXT NOT NULL,
        descricao TEXT NOT NULL,
        quantidade REAL NOT NULL,
        unidade TEXT NOT NULL,
        valorUnitario REAL NOT NULL,
        valorTotal REAL NOT NULL,
        FOREIGN KEY (pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE
      )`,
      
      // Tabela de notas fiscais (recebidas do ERP)
      `CREATE TABLE IF NOT EXISTS notas_fiscais (
        id TEXT PRIMARY KEY,
        numeroNota TEXT NOT NULL,
        serie TEXT,
        numeroPedido TEXT,
        pedidoId TEXT,
        clienteNome TEXT NOT NULL,
        clienteCnpjCpf TEXT NOT NULL,
        clienteEndereco TEXT,
        clienteCidade TEXT,
        clienteEstado TEXT,
        clienteCep TEXT,
        dataEmissao TEXT NOT NULL,
        dataVencimento TEXT,
        valorTotal REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDENTE_DESMEMBRAMENTO',
        chaveAcesso TEXT,
        xmlPath TEXT,
        observacoes TEXT,
        erpId TEXT UNIQUE,
        recebidoDoErp INTEGER DEFAULT 0,
        pesoTotal REAL,
        volumeTotal REAL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedidoId) REFERENCES pedidos(id)
      )`,
      
      // Tabela de itens da nota fiscal
      `CREATE TABLE IF NOT EXISTS nota_fiscal_itens (
        id TEXT PRIMARY KEY,
        notaFiscalId TEXT NOT NULL,
        descricao TEXT NOT NULL,
        quantidade REAL NOT NULL,
        quantidadeDesmembrada REAL DEFAULT 0,
        unidade TEXT NOT NULL,
        valorUnitario REAL NOT NULL,
        valorTotal REAL NOT NULL,
        ncm TEXT,
        cfop TEXT,
        peso REAL,
        volume REAL,
        codigoProduto TEXT,
        codigoInterno TEXT,
        codigoBarrasEan TEXT,
        FOREIGN KEY (notaFiscalId) REFERENCES notas_fiscais(id) ON DELETE CASCADE
      )`,
      
      // Tabela de cargas (romaneios/cargas de desmembramento)
      `CREATE TABLE IF NOT EXISTS cargas (
        id TEXT PRIMARY KEY,
        numeroCarga TEXT UNIQUE NOT NULL,
        notaFiscalId TEXT NOT NULL,
        numeroNota TEXT NOT NULL,
        numeroPedido TEXT,
        clienteNome TEXT,
        clienteCnpjCpf TEXT,
        clienteEndereco TEXT,
        clienteCidade TEXT,
        clienteEstado TEXT,
        clienteCep TEXT,
        dataVencimento TEXT,
        observacoesNF TEXT,
        transportadora TEXT,
        veiculo TEXT,
        motorista TEXT,
        dataSaida TEXT,
        dataPrevisaoEntrega TEXT,
        status TEXT NOT NULL DEFAULT 'CRIADA',
        pesoTotal REAL,
        volumeTotal REAL,
        valorTotal REAL DEFAULT 0,
        observacoes TEXT,
        erpEnviado INTEGER DEFAULT 0,
        erpEnviadoAt TEXT,
        createdBy TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (notaFiscalId) REFERENCES notas_fiscais(id),
        FOREIGN KEY (createdBy) REFERENCES users(id)
      )`,
      
      // Tabela de itens da carga (itens desmembrados)
      `CREATE TABLE IF NOT EXISTS carga_itens (
        id TEXT PRIMARY KEY,
        cargaId TEXT NOT NULL,
        notaFiscalItemId TEXT NOT NULL,
        quantidade REAL NOT NULL,
        valorTotal REAL NOT NULL,
        peso REAL,
        volume REAL,
        ordem INTEGER DEFAULT 0,
        FOREIGN KEY (cargaId) REFERENCES cargas(id) ON DELETE CASCADE,
        FOREIGN KEY (notaFiscalItemId) REFERENCES nota_fiscal_itens(id)
      )`,
      
      // Tabela de histórico de desmembramentos (auditoria)
      `CREATE TABLE IF NOT EXISTS desmembramentos_historico (
        id TEXT PRIMARY KEY,
        notaFiscalId TEXT NOT NULL,
        numeroNotasCriadas INTEGER NOT NULL,
        metodo TEXT NOT NULL,
        motivo TEXT,
        dadosJson TEXT,
        createdBy TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (notaFiscalId) REFERENCES notas_fiscais(id),
        FOREIGN KEY (createdBy) REFERENCES users(id)
      )`,
      
      // Tabela de romaneios
      `CREATE TABLE IF NOT EXISTS romaneios (
        id TEXT PRIMARY KEY,
        numeroRomaneio TEXT UNIQUE NOT NULL,
        transportadora TEXT,
        veiculo TEXT,
        motorista TEXT,
        dataSaida TEXT,
        dataPrevisaoEntrega TEXT,
        observacoes TEXT,
        status TEXT NOT NULL DEFAULT 'ABERTO',
        createdBy TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users(id)
      )`,
      
      // Tabela de relação romaneio-pedidos
      `CREATE TABLE IF NOT EXISTS romaneio_pedidos (
        id TEXT PRIMARY KEY,
        romaneioId TEXT NOT NULL,
        pedidoId TEXT NOT NULL,
        ordem INTEGER DEFAULT 0,
        FOREIGN KEY (romaneioId) REFERENCES romaneios(id) ON DELETE CASCADE,
        FOREIGN KEY (pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE
      )`,
      
      // Tabela de padrões aprendidos (para IA/heurísticas)
      `CREATE TABLE IF NOT EXISTS padroes_desmembramento (
        id TEXT PRIMARY KEY,
        tipoCliente TEXT,
        tipoProduto TEXT,
        pesoTotal REAL,
        volumeTotal REAL,
        quantidadeItens INTEGER,
        numeroCargasSugeridas INTEGER,
        distribuicaoJson TEXT,
        frequencia INTEGER DEFAULT 1,
        taxaSucesso REAL DEFAULT 1.0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela de auditoria (log de todas as ações)
      `CREATE TABLE IF NOT EXISTS auditoria (
        id TEXT PRIMARY KEY,
        usuarioId TEXT,
        usuarioNome TEXT,
        acao TEXT NOT NULL,
        entidade TEXT NOT NULL,
        entidadeId TEXT,
        dadosAnteriores TEXT,
        dadosNovos TEXT,
        ip TEXT,
        userAgent TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuarioId) REFERENCES users(id)
      )`
    ];
    
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status)`,
      `CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedidoId)`,
      `CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON notas_fiscais(status)`,
      `CREATE INDEX IF NOT EXISTS idx_notas_fiscais_pedido ON notas_fiscais(pedidoId)`,
      `CREATE INDEX IF NOT EXISTS idx_notas_fiscais_erp ON notas_fiscais(erpId)`,
      `CREATE INDEX IF NOT EXISTS idx_nota_fiscal_itens_nota ON nota_fiscal_itens(notaFiscalId)`,
      `CREATE INDEX IF NOT EXISTS idx_cargas_nota ON cargas(notaFiscalId)`,
      `CREATE INDEX IF NOT EXISTS idx_cargas_status ON cargas(status)`,
      `CREATE INDEX IF NOT EXISTS idx_carga_itens_carga ON carga_itens(cargaId)`,
      `CREATE INDEX IF NOT EXISTS idx_carga_itens_item ON carga_itens(notaFiscalItemId)`,
      `CREATE INDEX IF NOT EXISTS idx_desmembramentos_nota ON desmembramentos_historico(notaFiscalId)`,
      `CREATE INDEX IF NOT EXISTS idx_romaneios_status ON romaneios(status)`,
      `CREATE INDEX IF NOT EXISTS idx_romaneio_pedidos_romaneio ON romaneio_pedidos(romaneioId)`,
      `CREATE INDEX IF NOT EXISTS idx_romaneio_pedidos_pedido ON romaneio_pedidos(pedidoId)`,
      `CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria(entidade, entidadeId)`,
      `CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuarioId)`
    ];
    
    // Criar tabelas sequencialmente
    function createTable(index) {
      if (index >= tables.length) {
        createIndexes(0);
        return;
      }
      
      db.run(tables[index], (err) => {
        if (err) {
          logger.error(`Erro ao criar tabela ${index + 1}:`, err);
          reject(err);
          return;
        }
        createTable(index + 1);
      });
    }
    
    // Criar índices sequencialmente
    function createIndexes(index) {
      if (index >= indexes.length) {
        logger.info('✅ Todas as tabelas e índices criados com sucesso');
        resolve();
        return;
      }
      
      db.run(indexes[index], (err) => {
        if (err) {
          logger.warn(`Erro ao criar índice ${index + 1}:`, err);
        }
        createIndexes(index + 1);
      });
    }
    
    createTable(0);
  });
}

/**
 * Insere dados iniciais no banco
 */
async function insertInitialData() {
  return new Promise(async (resolve, reject) => {
    // Verificar se já existem usuários
    db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
      if (err) {
        logger.error('Erro ao verificar usuários existentes:', err);
        reject(err);
        return;
      }
      
      if (row.count > 0) {
        logger.info('✅ Dados iniciais já existem no banco');
        resolve();
        return;
      }
      
      try {
        // Hash da senha padrão '123456'
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        // Inserir usuários padrão
        const users = [
          {
            id: uuidv4(),
            username: 'admin',
            password: hashedPassword,
            name: 'Administrador',
            email: 'admin@faturamento.com',
            role: 'ADMINISTRATIVO'
          },
          {
            id: uuidv4(),
            username: 'logistica',
            password: hashedPassword,
            name: 'Usuário Logística',
            email: 'logistica@faturamento.com',
            role: 'LOGISTICA'
          }
        ];
        
        const stmt = db.prepare(`
          INSERT INTO users (id, username, password, name, email, role)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        for (const user of users) {
          stmt.run([user.id, user.username, user.password, user.name, user.email, user.role], (err) => {
            if (err) {
              logger.error(`Erro ao inserir usuário ${user.username}:`, err);
            } else {
              logger.info(`✅ Usuário criado: ${user.username} (${user.role})`);
            }
          });
        }
        
        stmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            logger.info('✅ Dados iniciais inseridos com sucesso');
            logger.info('📝 Usuários padrão:');
            logger.info('   - admin / 123456 (ADMINISTRATIVO)');
            logger.info('   - logistica / 123456 (LOGISTICA)');
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Retorna a instância do banco de dados
 */
function getDatabase() {
  if (!db) {
    throw new Error('Banco de dados não inicializado. Chame initDatabase() primeiro.');
  }
  return db;
}

module.exports = {
  initDatabase,
  getDatabase
};

