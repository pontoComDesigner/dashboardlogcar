# Sistema de Faturamento Logístico

Sistema web completo para gestão de faturamento logístico, notas fiscais e desmembramento de cargas/romaneios.

## 📋 Características

- **Desmembramento Inteligente**: Sugestão automática de cargas baseada em histórico
- **Integração com ERP**: Recebe notas fiscais via webhook e retorna cargas formatadas (SPOOL)
- **Validações Rigorosas**: Garante conformidade fiscal (soma das cargas = NF original)
- **Histórico e Padrões**: Aprende com desmembramentos anteriores
- **Auditoria Completa**: Log de todas as ações do sistema
- **Interface Moderna**: Tela flutuante para lista de NFs pendentes
- **Dois tipos de usuários**:
  - **ADMINISTRATIVO**: Controle total do sistema, gestão de usuários
  - **LOGISTICA**: Desmembramento de notas fiscais

## 🚀 Tecnologias

### Backend
- Node.js + Express
- SQLite (banco de dados)
- JWT (autenticação)
- Bcrypt (criptografia de senhas)

### Frontend
- React 18
- React Router
- Axios (requisições HTTP)

## 📦 Instalação

### Pré-requisitos
- Node.js 16+ instalado
- npm ou yarn

### Passo 1: Instalar dependências

```bash
# Instalar dependências do projeto raiz
npm install

# Ou instalar manualmente em cada pasta
cd backend
npm install

cd ../frontend
npm install
```

### Passo 2: Configurar Backend

1. Copie o arquivo `.env.example` para `.env` na pasta `backend`:

```bash
cd backend
cp .env.example .env
```

2. Edite o arquivo `.env` e configure:

```env
PORT=3001
JWT_SECRET=sua_chave_secreta_super_segura_aqui
ALLOWED_ORIGINS=http://localhost:3000
DB_PATH=./data/faturamento.db
ERP_API_KEY=sua-api-key-secreta-aqui
```

**IMPORTANTE**: Gere uma chave JWT_SECRET segura! Você pode usar:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Passo 3: Inicializar Banco de Dados

O banco de dados será criado automaticamente na primeira execução do servidor.

## ▶️ Executar

### Modo Desenvolvimento (Backend + Frontend simultaneamente)

```bash
# Na raiz do projeto
npm run dev
```

### Executar separadamente

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm start
```

O sistema estará disponível em:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 👤 Usuários Padrão

O sistema cria automaticamente os seguintes usuários:

- **Administrador**: 
  - Usuário: `admin`
  - Senha: `123456`
  - Role: ADMINISTRATIVO

- **Logística**: 
  - Usuário: `logistica`
  - Senha: `123456`
  - Role: LOGISTICA

⚠️ **IMPORTANTE**: Altere as senhas padrão em produção!

## 📡 Estrutura da API

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Informações do usuário autenticado

### Pedidos
- `GET /api/pedidos` - Lista pedidos
- `GET /api/pedidos/:id` - Busca pedido específico
- `POST /api/pedidos` - Cria pedido (LOGISTICA)
- `PUT /api/pedidos/:id` - Atualiza pedido (LOGISTICA)
- `DELETE /api/pedidos/:id` - Remove pedido (ADMINISTRATIVO)

### Notas Fiscais
- `GET /api/notas-fiscais` - Lista notas fiscais
- `GET /api/notas-fiscais/:id` - Busca nota fiscal específica
- `POST /api/notas-fiscais` - Cria nota fiscal (LOGISTICA)
- `PUT /api/notas-fiscais/:id` - Atualiza nota fiscal (LOGISTICA)
- `DELETE /api/notas-fiscais/:id` - Remove nota fiscal (ADMINISTRATIVO)

### Romaneios
- `GET /api/romaneios` - Lista romaneios
- `GET /api/romaneios/:id` - Busca romaneio específico
- `POST /api/romaneios` - Cria romaneio (LOGISTICA)
- `PUT /api/romaneios/:id` - Atualiza romaneio (LOGISTICA)
- `POST /api/romaneios/:id/pedidos` - Adiciona pedidos ao romaneio
- `POST /api/romaneios/:id/desmembrar` - Desmembra romaneio
- `DELETE /api/romaneios/:id` - Remove romaneio (ADMINISTRATIVO)

### Usuários (apenas ADMINISTRATIVO)
- `GET /api/users` - Lista usuários
- `GET /api/users/:id` - Busca usuário específico
- `POST /api/users` - Cria usuário
- `PUT /api/users/:id` - Atualiza usuário
- `DELETE /api/users/:id` - Remove usuário

### Relatórios
- `GET /api/relatorios/dashboard` - Dados do dashboard

## 📁 Estrutura do Projeto

```
DashboardLogCar/
├── backend/
│   ├── data/              # Banco de dados SQLite
│   ├── database/          # Scripts de inicialização
│   ├── middleware/        # Middlewares (auth, errors)
│   ├── routes/            # Rotas da API
│   ├── utils/             # Utilitários
│   ├── server.js          # Servidor principal
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Contextos (Auth)
│   │   ├── pages/         # Páginas
│   │   ├── services/      # Serviços (API)
│   │   └── App.js
│   └── package.json
└── package.json           # Scripts para executar tudo
```

## 🔒 Permissões

### ADMINISTRATIVO
- Acesso a todas as funcionalidades
- Gestão de usuários
- Exclusão de registros

### LOGISTICA
- Criação e edição de pedidos
- Criação e edição de notas fiscais
- Criação e edição de romaneios
- Desmembramento de romaneios
- Visualização de relatórios

## 🔄 Fluxo de Trabalho

1. **ERP envia NF**: POST `/api/erp/notas-fiscais` (webhook)
2. **Usuário visualiza**: Lista de NFs pendentes na interface
3. **Usuário desmembra**: Seleciona NF e clica em "Desmembrar"
4. **Sistema processa**: 
   - Sugere número de cargas (histórico + heurísticas)
   - Distribui itens automaticamente
   - Valida conformidade fiscal
5. **ERP busca cargas**: GET `/api/erp/cargas/:notaFiscalId` (formato SPOOL)
6. **ERP imprime**: Romaneios e controla expedição

## 📝 Próximos Passos

Este é um projeto local para testes. Após concluir os testes, você pode:

1. Configurar API Key do ERP no `.env`
2. Configurar variáveis de ambiente para produção
3. Implementar Machine Learning para sugestões mais precisas
4. Adicionar desmembramento manual (arrastar itens)
5. Implementar backup automático do banco de dados
6. Adicionar testes automatizados
7. Configurar CI/CD

> 📚 **Documentação de Integração**: Veja [DESMEMBRAMENTO.md](DESMEMBRAMENTO.md) para exemplos de API e fluxo completo

## 🤝 Suporte

Para questões ou problemas, verifique os logs do servidor no console.

## 📄 Licença

ISC

