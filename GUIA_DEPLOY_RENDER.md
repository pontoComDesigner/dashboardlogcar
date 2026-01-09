# 🚀 Guia de Deploy do DashboardLogCar no Render

Este guia explica como fazer o deploy do DashboardLogCar no Render para facilitar a comunicação entre os sistemas.

---

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto DashboardLogCar commitado no repositório

---

## 🏗️ Arquitetura de Deploy

No Render, vamos fazer o deploy de **um único serviço** que serve tanto o backend quanto o frontend:

- Backend Express na porta configurada pelo Render
- Frontend React buildado e servido como arquivos estáticos pelo Express
- Banco de dados SQLite (persistente no sistema de arquivos do Render)

---

## 📝 Passo a Passo

### 1. Preparar o Projeto Localmente

#### 1.1. Criar arquivo `.gitignore` (se não existir)

Certifique-se de que o `.gitignore` inclui:

```
node_modules/
.env
.env.local
.env.*.local
*.log
.DS_Store
backend/data/*.db
backend/data/*.db-journal
frontend/build/
dist/
```

#### 1.2. Commit e Push para o Repositório

```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

### 2. Criar Serviço no Render

#### 2.1. Acessar o Dashboard do Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Faça login ou crie uma conta

#### 2.2. Criar Novo Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório Git
3. Selecione o repositório do DashboardLogCar

#### 2.3. Configurar o Serviço

**Configurações básicas:**

- **Name**: `dashboardlogcar` (ou o nome que preferir)
- **Environment**: `Node`
- **Region**: Escolha a região mais próxima (ex: `Oregon (US West)`)
- **Branch**: `main` (ou sua branch principal)
- **Root Directory**: Deixe em branco (raiz do projeto)
- **Build Command**: 
  ```bash
  npm run install:all && npm run frontend:build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
  
  **Nota**: O comando `npm start` executa `npm run backend:start`, que inicia o servidor Express. O servidor automaticamente serve o frontend buildado se o diretório `frontend/build` existir.

**Configurações de instância:**

- **Instance Type**: `Free` (para testes) ou `Starter` (recomendado para produção)
- **Auto-Deploy**: `Yes` (atualiza automaticamente a cada push)

### 3. Configurar Variáveis de Ambiente

No painel do serviço, vá em **"Environment"** e adicione as seguintes variáveis:

#### Variáveis Obrigatórias

```env
# Porta (Render define automaticamente via PORT, mas podemos definir)
PORT=10000

# Secret JWT (gere um novo para produção)
JWT_SECRET=seu-jwt-secret-super-seguro-aqui-gerar-com-openssl-rand-hex-32

# API Key para comunicação com ERP (defina uma chave segura)
ERP_API_KEY=sua-chave-api-erp-super-segura-aqui

# CORS - URL do frontend (será a URL do Render)
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com

# Caminho do banco de dados (usar diretório persistente)
DB_PATH=./data/faturamento.db

# URL da API para o frontend (será a URL do Render)
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

#### Gerar JWT Secret Seguro

No terminal local:

```bash
# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -hex 32
```

#### Gerar API Key Segura

```bash
# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

### 4. Ajustar Código para Produção

O código já está preparado para produção, mas vamos garantir:

#### 4.1. Backend já serve arquivos estáticos

O `server.js` já está configurado para servir o frontend buildado em produção.

#### 4.2. Frontend usa variável de ambiente

O frontend já usa `REACT_APP_API_URL` para definir a URL da API.

### 5. Fazer Deploy

1. Após configurar tudo, clique em **"Create Web Service"**
2. O Render começará a fazer o build
3. Aguarde o build completar (pode levar 5-10 minutos na primeira vez)
4. Quando concluir, o serviço estará disponível em: `https://dashboardlogcar.onrender.com`

### 6. Verificar Deploy

1. Acesse a URL do serviço no navegador
2. Você deve ver a tela de login do DashboardLogCar
3. Faça login com as credenciais padrão:
   - Usuário: `admin`
   - Senha: `123456`

---

## 🔄 Comunicando com o LogCar App

Após o deploy, você terá uma URL pública (ex: `https://dashboardlogcar.onrender.com`).

### Para o LogCar App se comunicar com o DashboardLogCar

O LogCar App (já no Render) precisará conhecer a URL do DashboardLogCar.

**No LogCar App, configure:**

- Variável de ambiente `DASHBOARDLOGCAR_URL` = `https://dashboardlogcar.onrender.com`

### Para o ERP se comunicar com o DashboardLogCar

O ERP precisará fazer requisições para:

- **URL Base**: `https://dashboardlogcar.onrender.com/api/erp`
- **API Key**: A mesma configurada em `ERP_API_KEY`

**Endpoints disponíveis:**

1. `POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Body: JSON com dados da nota fiscal

2. `GET https://dashboardlogcar.onrender.com/api/erp/pedidos/:notaFiscalId`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Retorna pedidos desmembrados

3. `POST https://dashboardlogcar.onrender.com/api/erp/romaneios`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Body: JSON com dados do romaneio

---

## ⚠️ Considerações Importantes

### Banco de Dados SQLite no Render

⚠️ **IMPORTANTE**: O Render **não persiste dados** no sistema de arquivos em instâncias gratuitas ou após reinicializações.

**Soluções:**

1. **Upgrade para instância paga** com disco persistente
2. **Migrar para PostgreSQL** (Render oferece banco PostgreSQL gratuito)
3. **Usar serviço externo** de banco de dados

### Recomendação: Migrar para PostgreSQL

Para produção, recomenda-se migrar para PostgreSQL. O Render oferece PostgreSQL gratuito.

**Vantagens:**
- ✅ Persistência garantida
- ✅ Backup automático
- ✅ Melhor performance
- ✅ Escalável

**Próximos passos para PostgreSQL:**
1. Criar banco PostgreSQL no Render
2. Atualizar código para usar PostgreSQL (usando `pg` ao invés de `sqlite3`)
3. Configurar variável `DATABASE_URL` no Render

---

## 🔧 Troubleshooting

### Erro: "Cannot find module"

**Solução**: Verifique se o build command está instalando todas as dependências:
```bash
npm run install:all && npm run frontend:build
```

### Frontend não carrega

**Solução**: Verifique se:
1. O build do frontend foi concluído (`frontend/build` existe)
2. A variável `REACT_APP_API_URL` está configurada corretamente
3. O backend está servindo arquivos estáticos corretamente

### Erro de CORS

**Solução**: Verifique se `ALLOWED_ORIGINS` inclui a URL do Render:
```
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
```

### Banco de dados não persiste

**Solução**: Como mencionado acima, considere migrar para PostgreSQL ou upgrade para instância paga.

---

## 📊 Monitoramento

O Render oferece:
- **Logs em tempo real** (aba "Logs" no painel)
- **Métricas** de CPU, memória, etc.
- **Alertas** por email (configurável)

---

## 🔐 Segurança em Produção

1. **Altere as senhas padrão** após o primeiro login
2. **Use JWT secret forte** (gerado com openssl)
3. **Use API Key forte** para comunicação com ERP
4. **Configure HTTPS** (já vem por padrão no Render)
5. **Revise permissões** de usuários regularmente

---

## 📞 Suporte

Para problemas específicos do Render, consulte:
- [Documentação do Render](https://render.com/docs)
- [Status do Render](https://status.render.com)

Para problemas específicos do DashboardLogCar, consulte os logs no painel do Render.


Este guia explica como fazer o deploy do DashboardLogCar no Render para facilitar a comunicação entre os sistemas.

---

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto DashboardLogCar commitado no repositório

---

## 🏗️ Arquitetura de Deploy

No Render, vamos fazer o deploy de **um único serviço** que serve tanto o backend quanto o frontend:

- Backend Express na porta configurada pelo Render
- Frontend React buildado e servido como arquivos estáticos pelo Express
- Banco de dados SQLite (persistente no sistema de arquivos do Render)

---

## 📝 Passo a Passo

### 1. Preparar o Projeto Localmente

#### 1.1. Criar arquivo `.gitignore` (se não existir)

Certifique-se de que o `.gitignore` inclui:

```
node_modules/
.env
.env.local
.env.*.local
*.log
.DS_Store
backend/data/*.db
backend/data/*.db-journal
frontend/build/
dist/
```

#### 1.2. Commit e Push para o Repositório

```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

### 2. Criar Serviço no Render

#### 2.1. Acessar o Dashboard do Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Faça login ou crie uma conta

#### 2.2. Criar Novo Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório Git
3. Selecione o repositório do DashboardLogCar

#### 2.3. Configurar o Serviço

**Configurações básicas:**

- **Name**: `dashboardlogcar` (ou o nome que preferir)
- **Environment**: `Node`
- **Region**: Escolha a região mais próxima (ex: `Oregon (US West)`)
- **Branch**: `main` (ou sua branch principal)
- **Root Directory**: Deixe em branco (raiz do projeto)
- **Build Command**: 
  ```bash
  npm run install:all && npm run frontend:build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
  
  **Nota**: O comando `npm start` executa `npm run backend:start`, que inicia o servidor Express. O servidor automaticamente serve o frontend buildado se o diretório `frontend/build` existir.

**Configurações de instância:**

- **Instance Type**: `Free` (para testes) ou `Starter` (recomendado para produção)
- **Auto-Deploy**: `Yes` (atualiza automaticamente a cada push)

### 3. Configurar Variáveis de Ambiente

No painel do serviço, vá em **"Environment"** e adicione as seguintes variáveis:

#### Variáveis Obrigatórias

```env
# Porta (Render define automaticamente via PORT, mas podemos definir)
PORT=10000

# Secret JWT (gere um novo para produção)
JWT_SECRET=seu-jwt-secret-super-seguro-aqui-gerar-com-openssl-rand-hex-32

# API Key para comunicação com ERP (defina uma chave segura)
ERP_API_KEY=sua-chave-api-erp-super-segura-aqui

# CORS - URL do frontend (será a URL do Render)
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com

# Caminho do banco de dados (usar diretório persistente)
DB_PATH=./data/faturamento.db

# URL da API para o frontend (será a URL do Render)
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

#### Gerar JWT Secret Seguro

No terminal local:

```bash
# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -hex 32
```

#### Gerar API Key Segura

```bash
# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

### 4. Ajustar Código para Produção

O código já está preparado para produção, mas vamos garantir:

#### 4.1. Backend já serve arquivos estáticos

O `server.js` já está configurado para servir o frontend buildado em produção.

#### 4.2. Frontend usa variável de ambiente

O frontend já usa `REACT_APP_API_URL` para definir a URL da API.

### 5. Fazer Deploy

1. Após configurar tudo, clique em **"Create Web Service"**
2. O Render começará a fazer o build
3. Aguarde o build completar (pode levar 5-10 minutos na primeira vez)
4. Quando concluir, o serviço estará disponível em: `https://dashboardlogcar.onrender.com`

### 6. Verificar Deploy

1. Acesse a URL do serviço no navegador
2. Você deve ver a tela de login do DashboardLogCar
3. Faça login com as credenciais padrão:
   - Usuário: `admin`
   - Senha: `123456`

---

## 🔄 Comunicando com o LogCar App

Após o deploy, você terá uma URL pública (ex: `https://dashboardlogcar.onrender.com`).

### Para o LogCar App se comunicar com o DashboardLogCar

O LogCar App (já no Render) precisará conhecer a URL do DashboardLogCar.

**No LogCar App, configure:**

- Variável de ambiente `DASHBOARDLOGCAR_URL` = `https://dashboardlogcar.onrender.com`

### Para o ERP se comunicar com o DashboardLogCar

O ERP precisará fazer requisições para:

- **URL Base**: `https://dashboardlogcar.onrender.com/api/erp`
- **API Key**: A mesma configurada em `ERP_API_KEY`

**Endpoints disponíveis:**

1. `POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Body: JSON com dados da nota fiscal

2. `GET https://dashboardlogcar.onrender.com/api/erp/pedidos/:notaFiscalId`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Retorna pedidos desmembrados

3. `POST https://dashboardlogcar.onrender.com/api/erp/romaneios`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Body: JSON com dados do romaneio

---

## ⚠️ Considerações Importantes

### Banco de Dados SQLite no Render

⚠️ **IMPORTANTE**: O Render **não persiste dados** no sistema de arquivos em instâncias gratuitas ou após reinicializações.

**Soluções:**

1. **Upgrade para instância paga** com disco persistente
2. **Migrar para PostgreSQL** (Render oferece banco PostgreSQL gratuito)
3. **Usar serviço externo** de banco de dados

### Recomendação: Migrar para PostgreSQL

Para produção, recomenda-se migrar para PostgreSQL. O Render oferece PostgreSQL gratuito.

**Vantagens:**
- ✅ Persistência garantida
- ✅ Backup automático
- ✅ Melhor performance
- ✅ Escalável

**Próximos passos para PostgreSQL:**
1. Criar banco PostgreSQL no Render
2. Atualizar código para usar PostgreSQL (usando `pg` ao invés de `sqlite3`)
3. Configurar variável `DATABASE_URL` no Render

---

## 🔧 Troubleshooting

### Erro: "Cannot find module"

**Solução**: Verifique se o build command está instalando todas as dependências:
```bash
npm run install:all && npm run frontend:build
```

### Frontend não carrega

**Solução**: Verifique se:
1. O build do frontend foi concluído (`frontend/build` existe)
2. A variável `REACT_APP_API_URL` está configurada corretamente
3. O backend está servindo arquivos estáticos corretamente

### Erro de CORS

**Solução**: Verifique se `ALLOWED_ORIGINS` inclui a URL do Render:
```
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
```

### Banco de dados não persiste

**Solução**: Como mencionado acima, considere migrar para PostgreSQL ou upgrade para instância paga.

---

## 📊 Monitoramento

O Render oferece:
- **Logs em tempo real** (aba "Logs" no painel)
- **Métricas** de CPU, memória, etc.
- **Alertas** por email (configurável)

---

## 🔐 Segurança em Produção

1. **Altere as senhas padrão** após o primeiro login
2. **Use JWT secret forte** (gerado com openssl)
3. **Use API Key forte** para comunicação com ERP
4. **Configure HTTPS** (já vem por padrão no Render)
5. **Revise permissões** de usuários regularmente

---

## 📞 Suporte

Para problemas específicos do Render, consulte:
- [Documentação do Render](https://render.com/docs)
- [Status do Render](https://status.render.com)

Para problemas específicos do DashboardLogCar, consulte os logs no painel do Render.


Este guia explica como fazer o deploy do DashboardLogCar no Render para facilitar a comunicação entre os sistemas.

---

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto DashboardLogCar commitado no repositório

---

## 🏗️ Arquitetura de Deploy

No Render, vamos fazer o deploy de **um único serviço** que serve tanto o backend quanto o frontend:

- Backend Express na porta configurada pelo Render
- Frontend React buildado e servido como arquivos estáticos pelo Express
- Banco de dados SQLite (persistente no sistema de arquivos do Render)

---

## 📝 Passo a Passo

### 1. Preparar o Projeto Localmente

#### 1.1. Criar arquivo `.gitignore` (se não existir)

Certifique-se de que o `.gitignore` inclui:

```
node_modules/
.env
.env.local
.env.*.local
*.log
.DS_Store
backend/data/*.db
backend/data/*.db-journal
frontend/build/
dist/
```

#### 1.2. Commit e Push para o Repositório

```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

### 2. Criar Serviço no Render

#### 2.1. Acessar o Dashboard do Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Faça login ou crie uma conta

#### 2.2. Criar Novo Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório Git
3. Selecione o repositório do DashboardLogCar

#### 2.3. Configurar o Serviço

**Configurações básicas:**

- **Name**: `dashboardlogcar` (ou o nome que preferir)
- **Environment**: `Node`
- **Region**: Escolha a região mais próxima (ex: `Oregon (US West)`)
- **Branch**: `main` (ou sua branch principal)
- **Root Directory**: Deixe em branco (raiz do projeto)
- **Build Command**: 
  ```bash
  npm run install:all && npm run frontend:build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
  
  **Nota**: O comando `npm start` executa `npm run backend:start`, que inicia o servidor Express. O servidor automaticamente serve o frontend buildado se o diretório `frontend/build` existir.

**Configurações de instância:**

- **Instance Type**: `Free` (para testes) ou `Starter` (recomendado para produção)
- **Auto-Deploy**: `Yes` (atualiza automaticamente a cada push)

### 3. Configurar Variáveis de Ambiente

No painel do serviço, vá em **"Environment"** e adicione as seguintes variáveis:

#### Variáveis Obrigatórias

```env
# Porta (Render define automaticamente via PORT, mas podemos definir)
PORT=10000

# Secret JWT (gere um novo para produção)
JWT_SECRET=seu-jwt-secret-super-seguro-aqui-gerar-com-openssl-rand-hex-32

# API Key para comunicação com ERP (defina uma chave segura)
ERP_API_KEY=sua-chave-api-erp-super-segura-aqui

# CORS - URL do frontend (será a URL do Render)
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com

# Caminho do banco de dados (usar diretório persistente)
DB_PATH=./data/faturamento.db

# URL da API para o frontend (será a URL do Render)
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

#### Gerar JWT Secret Seguro

No terminal local:

```bash
# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -hex 32
```

#### Gerar API Key Segura

```bash
# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

### 4. Ajustar Código para Produção

O código já está preparado para produção, mas vamos garantir:

#### 4.1. Backend já serve arquivos estáticos

O `server.js` já está configurado para servir o frontend buildado em produção.

#### 4.2. Frontend usa variável de ambiente

O frontend já usa `REACT_APP_API_URL` para definir a URL da API.

### 5. Fazer Deploy

1. Após configurar tudo, clique em **"Create Web Service"**
2. O Render começará a fazer o build
3. Aguarde o build completar (pode levar 5-10 minutos na primeira vez)
4. Quando concluir, o serviço estará disponível em: `https://dashboardlogcar.onrender.com`

### 6. Verificar Deploy

1. Acesse a URL do serviço no navegador
2. Você deve ver a tela de login do DashboardLogCar
3. Faça login com as credenciais padrão:
   - Usuário: `admin`
   - Senha: `123456`

---

## 🔄 Comunicando com o LogCar App

Após o deploy, você terá uma URL pública (ex: `https://dashboardlogcar.onrender.com`).

### Para o LogCar App se comunicar com o DashboardLogCar

O LogCar App (já no Render) precisará conhecer a URL do DashboardLogCar.

**No LogCar App, configure:**

- Variável de ambiente `DASHBOARDLOGCAR_URL` = `https://dashboardlogcar.onrender.com`

### Para o ERP se comunicar com o DashboardLogCar

O ERP precisará fazer requisições para:

- **URL Base**: `https://dashboardlogcar.onrender.com/api/erp`
- **API Key**: A mesma configurada em `ERP_API_KEY`

**Endpoints disponíveis:**

1. `POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Body: JSON com dados da nota fiscal

2. `GET https://dashboardlogcar.onrender.com/api/erp/pedidos/:notaFiscalId`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Retorna pedidos desmembrados

3. `POST https://dashboardlogcar.onrender.com/api/erp/romaneios`
   - Header: `X-API-Key: sua-chave-api-erp`
   - Body: JSON com dados do romaneio

---

## ⚠️ Considerações Importantes

### Banco de Dados SQLite no Render

⚠️ **IMPORTANTE**: O Render **não persiste dados** no sistema de arquivos em instâncias gratuitas ou após reinicializações.

**Soluções:**

1. **Upgrade para instância paga** com disco persistente
2. **Migrar para PostgreSQL** (Render oferece banco PostgreSQL gratuito)
3. **Usar serviço externo** de banco de dados

### Recomendação: Migrar para PostgreSQL

Para produção, recomenda-se migrar para PostgreSQL. O Render oferece PostgreSQL gratuito.

**Vantagens:**
- ✅ Persistência garantida
- ✅ Backup automático
- ✅ Melhor performance
- ✅ Escalável

**Próximos passos para PostgreSQL:**
1. Criar banco PostgreSQL no Render
2. Atualizar código para usar PostgreSQL (usando `pg` ao invés de `sqlite3`)
3. Configurar variável `DATABASE_URL` no Render

---

## 🔧 Troubleshooting

### Erro: "Cannot find module"

**Solução**: Verifique se o build command está instalando todas as dependências:
```bash
npm run install:all && npm run frontend:build
```

### Frontend não carrega

**Solução**: Verifique se:
1. O build do frontend foi concluído (`frontend/build` existe)
2. A variável `REACT_APP_API_URL` está configurada corretamente
3. O backend está servindo arquivos estáticos corretamente

### Erro de CORS

**Solução**: Verifique se `ALLOWED_ORIGINS` inclui a URL do Render:
```
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
```

### Banco de dados não persiste

**Solução**: Como mencionado acima, considere migrar para PostgreSQL ou upgrade para instância paga.

---

## 📊 Monitoramento

O Render oferece:
- **Logs em tempo real** (aba "Logs" no painel)
- **Métricas** de CPU, memória, etc.
- **Alertas** por email (configurável)

---

## 🔐 Segurança em Produção

1. **Altere as senhas padrão** após o primeiro login
2. **Use JWT secret forte** (gerado com openssl)
3. **Use API Key forte** para comunicação com ERP
4. **Configure HTTPS** (já vem por padrão no Render)
5. **Revise permissões** de usuários regularmente

---

## 📞 Suporte

Para problemas específicos do Render, consulte:
- [Documentação do Render](https://render.com/docs)
- [Status do Render](https://status.render.com)

Para problemas específicos do DashboardLogCar, consulte os logs no painel do Render.

