/**
 * Servidor Backend - Sistema de Faturamento Logístico
 * 
 * API REST para gestão de faturamento logístico, notas fiscais e desmembramento de cargas
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pedidoRoutes = require('./routes/pedidos');
const notaFiscalRoutes = require('./routes/notas-fiscais');
const romaneioRoutes = require('./routes/romaneios');
const relatorioRoutes = require('./routes/relatorios');
const erpRoutes = require('./routes/erp');
const desmembramentoRoutes = require('./routes/desmembramento');
const configuracoesRoutes = require('./routes/configuracoes');
const mlRoutes = require('./routes/ml');

// Importar middleware
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Inicializar banco de dados
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy
app.set('trust proxy', 1);

// Middleware de segurança
app.use(helmet());

// CORS - Configurar origens permitidas
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requisições por IP
});
app.use('/api/', limiter);

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/notas-fiscais', notaFiscalRoutes);
app.use('/api/romaneios', romaneioRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api/desmembramento', desmembramentoRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/ml', mlRoutes);

// Servir arquivos estáticos do frontend em produção
const frontendBuildPath = path.join(__dirname, '../frontend/build');

if (fs.existsSync(frontendBuildPath)) {
  // Servir arquivos estáticos do React
  app.use(express.static(frontendBuildPath));
  
  // Rota de health check (antes do catch-all)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Catch-all: enviar React app para todas as rotas não-API
  app.get('*', (req, res) => {
    // Não servir index.html para rotas da API
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
      });
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Modo desenvolvimento - apenas API
  // Rota de health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Rota raiz (apenas quando frontend não está buildado)
  app.get('/', (req, res) => {
    res.json({
      message: 'API Faturamento Logístico v1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        pedidos: '/api/pedidos',
        notasFiscais: '/api/notas-fiscais',
        romaneios: '/api/romaneios',
        relatorios: '/api/relatorios',
        erp: '/api/erp',
        desmembramento: '/api/desmembramento'
      },
      note: 'Frontend não encontrado. Execute "npm run frontend:build" para buildar o frontend.'
    });
  });
}

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicializar servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor iniciado na porta ${PORT}`);
      logger.info(`📡 API disponível em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  });

module.exports = app;


 * 
 * API REST para gestão de faturamento logístico, notas fiscais e desmembramento de cargas
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pedidoRoutes = require('./routes/pedidos');
const notaFiscalRoutes = require('./routes/notas-fiscais');
const romaneioRoutes = require('./routes/romaneios');
const relatorioRoutes = require('./routes/relatorios');
const erpRoutes = require('./routes/erp');
const desmembramentoRoutes = require('./routes/desmembramento');
const configuracoesRoutes = require('./routes/configuracoes');
const mlRoutes = require('./routes/ml');

// Importar middleware
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Inicializar banco de dados
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy
app.set('trust proxy', 1);

// Middleware de segurança
app.use(helmet());

// CORS - Configurar origens permitidas
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requisições por IP
});
app.use('/api/', limiter);

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/notas-fiscais', notaFiscalRoutes);
app.use('/api/romaneios', romaneioRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api/desmembramento', desmembramentoRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/ml', mlRoutes);

// Servir arquivos estáticos do frontend em produção
const frontendBuildPath = path.join(__dirname, '../frontend/build');

if (fs.existsSync(frontendBuildPath)) {
  // Servir arquivos estáticos do React
  app.use(express.static(frontendBuildPath));
  
  // Rota de health check (antes do catch-all)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Catch-all: enviar React app para todas as rotas não-API
  app.get('*', (req, res) => {
    // Não servir index.html para rotas da API
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
      });
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Modo desenvolvimento - apenas API
  // Rota de health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Rota raiz (apenas quando frontend não está buildado)
  app.get('/', (req, res) => {
    res.json({
      message: 'API Faturamento Logístico v1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        pedidos: '/api/pedidos',
        notasFiscais: '/api/notas-fiscais',
        romaneios: '/api/romaneios',
        relatorios: '/api/relatorios',
        erp: '/api/erp',
        desmembramento: '/api/desmembramento'
      },
      note: 'Frontend não encontrado. Execute "npm run frontend:build" para buildar o frontend.'
    });
  });
}

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicializar servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor iniciado na porta ${PORT}`);
      logger.info(`📡 API disponível em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  });

module.exports = app;


 * 
 * API REST para gestão de faturamento logístico, notas fiscais e desmembramento de cargas
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pedidoRoutes = require('./routes/pedidos');
const notaFiscalRoutes = require('./routes/notas-fiscais');
const romaneioRoutes = require('./routes/romaneios');
const relatorioRoutes = require('./routes/relatorios');
const erpRoutes = require('./routes/erp');
const desmembramentoRoutes = require('./routes/desmembramento');
const configuracoesRoutes = require('./routes/configuracoes');
const mlRoutes = require('./routes/ml');

// Importar middleware
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Inicializar banco de dados
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy
app.set('trust proxy', 1);

// Middleware de segurança
app.use(helmet());

// CORS - Configurar origens permitidas
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requisições por IP
});
app.use('/api/', limiter);

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/notas-fiscais', notaFiscalRoutes);
app.use('/api/romaneios', romaneioRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api/desmembramento', desmembramentoRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/ml', mlRoutes);

// Servir arquivos estáticos do frontend em produção
const frontendBuildPath = path.join(__dirname, '../frontend/build');

if (fs.existsSync(frontendBuildPath)) {
  // Servir arquivos estáticos do React
  app.use(express.static(frontendBuildPath));
  
  // Rota de health check (antes do catch-all)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Catch-all: enviar React app para todas as rotas não-API
  app.get('*', (req, res) => {
    // Não servir index.html para rotas da API
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
      });
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Modo desenvolvimento - apenas API
  // Rota de health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Rota raiz (apenas quando frontend não está buildado)
  app.get('/', (req, res) => {
    res.json({
      message: 'API Faturamento Logístico v1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        pedidos: '/api/pedidos',
        notasFiscais: '/api/notas-fiscais',
        romaneios: '/api/romaneios',
        relatorios: '/api/relatorios',
        erp: '/api/erp',
        desmembramento: '/api/desmembramento'
      },
      note: 'Frontend não encontrado. Execute "npm run frontend:build" para buildar o frontend.'
    });
  });
}

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicializar servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor iniciado na porta ${PORT}`);
      logger.info(`📡 API disponível em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  });

module.exports = app;

