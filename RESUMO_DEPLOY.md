# 📋 Resumo Rápido - Deploy no Render

## ✅ O que foi preparado

1. ✅ **Backend configurado para servir frontend** - `server.js` atualizado
2. ✅ **Scripts de build criados** - `package.json` atualizado
3. ✅ **Guia completo** - `GUIA_DEPLOY_RENDER.md` criado
4. ✅ **Arquivo .gitignore** - Criado/atualizado
5. ✅ **render.yaml** - Template de configuração (opcional)

## 🚀 Passos Rápidos para Deploy

### 1. Commit no Git
```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

### 2. No Render Dashboard

1. **New +** → **Web Service**
2. Conecte repositório
3. Configure:
   - **Name**: `dashboardlogcar`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (teste) ou `Starter` (produção)

### 3. Variáveis de Ambiente

Adicione no painel do Render:

```env
PORT=10000
NODE_ENV=production
JWT_SECRET=<gere-um-secret-forte>
ERP_API_KEY=<gere-um-api-key-forte>
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
DB_PATH=./data/faturamento.db
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

### 4. Gerar Secrets

**JWT Secret:**
```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -hex 32
```

**API Key:**
```bash
# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

## ✅ Deploy Concluído!

Seu serviço está rodando em:
- **URL**: `https://dashboardlogcar.onrender.com`
- **API**: `https://dashboardlogcar.onrender.com/api`
- **Health Check**: `https://dashboardlogcar.onrender.com/health`

## 🔗 URLs e Comunicação

### Para o LogCar App:
Configure no LogCar App (painel Render):
```env
DASHBOARDLOGCAR_URL=https://dashboardlogcar.onrender.com
```

### Para o ERP:
- **Base URL**: `https://dashboardlogcar.onrender.com/api/erp`
- **Header**: `X-API-Key: <sua-ERP_API_KEY>`

**Endpoints:**
- `POST /api/erp/notas-fiscais` - Enviar nota fiscal
- `GET /api/erp/pedidos/:notaFiscalId` - Consultar pedidos desmembrados
- `POST /api/erp/romaneios` - Enviar romaneio para visualização

## ⚠️ Importante

1. **Banco SQLite**: Não persiste em instâncias gratuitas do Render
   - **Solução**: Upgrade para plano pago OU migre para PostgreSQL
   
2. **Primeira vez**: Pode levar 5-10 minutos para buildar

3. **Timeout**: Instâncias gratuitas "adormecem" após 15min de inatividade
   - Primeira requisição após dormir pode levar ~30s

## 📚 Documentação Completa

Veja `GUIA_DEPLOY_RENDER.md` para detalhes completos.


## ✅ O que foi preparado

1. ✅ **Backend configurado para servir frontend** - `server.js` atualizado
2. ✅ **Scripts de build criados** - `package.json` atualizado
3. ✅ **Guia completo** - `GUIA_DEPLOY_RENDER.md` criado
4. ✅ **Arquivo .gitignore** - Criado/atualizado
5. ✅ **render.yaml** - Template de configuração (opcional)

## 🚀 Passos Rápidos para Deploy

### 1. Commit no Git
```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

### 2. No Render Dashboard

1. **New +** → **Web Service**
2. Conecte repositório
3. Configure:
   - **Name**: `dashboardlogcar`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (teste) ou `Starter` (produção)

### 3. Variáveis de Ambiente

Adicione no painel do Render:

```env
PORT=10000
NODE_ENV=production
JWT_SECRET=<gere-um-secret-forte>
ERP_API_KEY=<gere-um-api-key-forte>
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
DB_PATH=./data/faturamento.db
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

### 4. Gerar Secrets

**JWT Secret:**
```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -hex 32
```

**API Key:**
```bash
# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

## ✅ Deploy Concluído!

Seu serviço está rodando em:
- **URL**: `https://dashboardlogcar.onrender.com`
- **API**: `https://dashboardlogcar.onrender.com/api`
- **Health Check**: `https://dashboardlogcar.onrender.com/health`

## 🔗 URLs e Comunicação

### Para o LogCar App:
Configure no LogCar App (painel Render):
```env
DASHBOARDLOGCAR_URL=https://dashboardlogcar.onrender.com
```

### Para o ERP:
- **Base URL**: `https://dashboardlogcar.onrender.com/api/erp`
- **Header**: `X-API-Key: <sua-ERP_API_KEY>`

**Endpoints:**
- `POST /api/erp/notas-fiscais` - Enviar nota fiscal
- `GET /api/erp/pedidos/:notaFiscalId` - Consultar pedidos desmembrados
- `POST /api/erp/romaneios` - Enviar romaneio para visualização

## ⚠️ Importante

1. **Banco SQLite**: Não persiste em instâncias gratuitas do Render
   - **Solução**: Upgrade para plano pago OU migre para PostgreSQL
   
2. **Primeira vez**: Pode levar 5-10 minutos para buildar

3. **Timeout**: Instâncias gratuitas "adormecem" após 15min de inatividade
   - Primeira requisição após dormir pode levar ~30s

## 📚 Documentação Completa

Veja `GUIA_DEPLOY_RENDER.md` para detalhes completos.


## ✅ O que foi preparado

1. ✅ **Backend configurado para servir frontend** - `server.js` atualizado
2. ✅ **Scripts de build criados** - `package.json` atualizado
3. ✅ **Guia completo** - `GUIA_DEPLOY_RENDER.md` criado
4. ✅ **Arquivo .gitignore** - Criado/atualizado
5. ✅ **render.yaml** - Template de configuração (opcional)

## 🚀 Passos Rápidos para Deploy

### 1. Commit no Git
```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

### 2. No Render Dashboard

1. **New +** → **Web Service**
2. Conecte repositório
3. Configure:
   - **Name**: `dashboardlogcar`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (teste) ou `Starter` (produção)

### 3. Variáveis de Ambiente

Adicione no painel do Render:

```env
PORT=10000
NODE_ENV=production
JWT_SECRET=<gere-um-secret-forte>
ERP_API_KEY=<gere-um-api-key-forte>
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
DB_PATH=./data/faturamento.db
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

### 4. Gerar Secrets

**JWT Secret:**
```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -hex 32
```

**API Key:**
```bash
# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

## ✅ Deploy Concluído!

Seu serviço está rodando em:
- **URL**: `https://dashboardlogcar.onrender.com`
- **API**: `https://dashboardlogcar.onrender.com/api`
- **Health Check**: `https://dashboardlogcar.onrender.com/health`

## 🔗 URLs e Comunicação

### Para o LogCar App:
Configure no LogCar App (painel Render):
```env
DASHBOARDLOGCAR_URL=https://dashboardlogcar.onrender.com
```

### Para o ERP:
- **Base URL**: `https://dashboardlogcar.onrender.com/api/erp`
- **Header**: `X-API-Key: <sua-ERP_API_KEY>`

**Endpoints:**
- `POST /api/erp/notas-fiscais` - Enviar nota fiscal
- `GET /api/erp/pedidos/:notaFiscalId` - Consultar pedidos desmembrados
- `POST /api/erp/romaneios` - Enviar romaneio para visualização

## ⚠️ Importante

1. **Banco SQLite**: Não persiste em instâncias gratuitas do Render
   - **Solução**: Upgrade para plano pago OU migre para PostgreSQL
   
2. **Primeira vez**: Pode levar 5-10 minutos para buildar

3. **Timeout**: Instâncias gratuitas "adormecem" após 15min de inatividade
   - Primeira requisição após dormir pode levar ~30s

## 📚 Documentação Completa

Veja `GUIA_DEPLOY_RENDER.md` para detalhes completos.

