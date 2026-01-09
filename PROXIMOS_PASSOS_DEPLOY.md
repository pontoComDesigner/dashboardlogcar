# ✅ Próximos Passos Após Deploy no Render

## 🎉 Deploy Concluído com Sucesso!

Seu DashboardLogCar está rodando em: **https://dashboardlogcar.onrender.com**

---

## ✅ Verificar se está funcionando

### 1. Acessar o Dashboard no navegador

1. Abra: **https://dashboardlogcar.onrender.com**
2. Você deve ver a tela de login
3. Faça login com:
   - **Usuário**: `admin`
   - **Senha**: `123456`

Se conseguir fazer login, está tudo funcionando! ✅

### 2. Testar a API

Você pode testar se a API está funcionando acessando:

- Health Check: https://dashboardlogcar.onrender.com/health
- API Info: https://dashboardlogcar.onrender.com/

---

## 🔧 Configurar Variáveis de Ambiente (se ainda não fez)

No painel do Render, vá em **"Environment"** e verifique se todas estão configuradas:

### Variáveis Obrigatórias:

```env
PORT=10000
NODE_ENV=production
JWT_SECRET=<deve ter um valor forte>
ERP_API_KEY=<deve ter um valor forte>
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
DB_PATH=./data/faturamento.db
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

**⚠️ IMPORTANTE**: Se você não configurou `JWT_SECRET` e `ERP_API_KEY`, configure agora com valores fortes!

---

## 🔗 Configurar Comunicação com LogCar App

### No LogCar App (já no Render)

No painel do serviço LogCar App no Render, adicione/atualize a variável de ambiente:

```env
DASHBOARDLOGCAR_URL=https://dashboardlogcar.onrender.com
```

Ou se o LogCar App precisar da URL da API:

```env
DASHBOARDLOGCAR_API_URL=https://dashboardlogcar.onrender.com/api
```

---

## 📡 Configurar Comunicação com ERP

### Para o ERP se comunicar com o DashboardLogCar

O ERP precisa fazer requisições para:

**Base URL:** `https://dashboardlogcar.onrender.com/api/erp`

**Headers obrigatórios:**
```
Content-Type: application/json
X-API-Key: <sua-ERP_API_KEY>
```

### Endpoints Disponíveis:

1. **Enviar Nota Fiscal**
   ```
   POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais
   ```
   
2. **Consultar Pedidos Desmembrados**
   ```
   GET https://dashboardlogcar.onrender.com/api/erp/pedidos/:notaFiscalId
   ```

3. **Enviar Romaneio para Visualização**
   ```
   POST https://dashboardlogcar.onrender.com/api/erp/romaneios
   ```

### Testar com Script de Simulação

Se você tem o script de simulação local, atualize-o para usar a URL do Render:

**Arquivo:** `backend/scripts/simular-erp-envio-hoje.js`

Substitua a URL base:
```javascript
const API_URL = 'https://dashboardlogcar.onrender.com/api/erp';
const API_KEY = 'sua-ERP_API_KEY'; // Mesma configurada no Render
```

---

## 🧪 Testar Comunicação

### Teste 1: Health Check

```bash
curl https://dashboardlogcar.onrender.com/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### Teste 2: Enviar Nota Fiscal (via script ou Postman)

Use o script de simulação ou Postman:

```bash
# Com curl (substitua pela sua API_KEY)
curl -X POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-ERP_API_KEY" \
  -d '{
    "numeroNota": "TEST-001",
    "clienteNome": "Cliente Teste",
    "clienteCnpjCpf": "12.345.678/0001-90",
    "dataEmissao": "2026-01-01",
    "itens": [
      {
        "descricao": "Produto Teste",
        "quantidade": 10,
        "unidade": "UN",
        "valorUnitario": 100.00
      }
    ]
  }'
```

---

## ⚠️ Considerações Importantes

### 1. Banco de Dados SQLite

⚠️ **ATENÇÃO**: Em instâncias gratuitas do Render, o banco de dados **não persiste** após reinicializações.

**Soluções:**
- ✅ **Recomendado**: Migrar para PostgreSQL (Render oferece gratuito)
- ⚠️ **Alternativa**: Upgrade para plano pago com disco persistente
- ⚠️ **Apenas testes**: Aceitar perda de dados em reinicializações

### 2. Timeout em Instâncias Gratuitas

- Instâncias gratuitas "adormecem" após 15 minutos de inatividade
- A primeira requisição após adormecer pode levar ~30 segundos
- Para evitar isso, use um serviço de "ping" periódico ou upgrade para plano pago

### 3. Segurança

🔐 **IMPORTANTE - Faça agora:**

1. **Altere as senhas padrão** após primeiro login:
   - Acesse: Usuários → Editar admin/logistica
   - Defina senhas fortes

2. **Use secrets fortes:**
   - `JWT_SECRET`: mínimo 32 caracteres aleatórios
   - `ERP_API_KEY`: mínimo 32 caracteres aleatórios

3. **Configure HTTPS** (já vem por padrão no Render ✅)

---

## 📋 Checklist Pós-Deploy

- [ ] Acessar https://dashboardlogcar.onrender.com e fazer login
- [ ] Verificar se variáveis de ambiente estão configuradas
- [ ] Testar health check da API
- [ ] Configurar variável `DASHBOARDLOGCAR_URL` no LogCar App
- [ ] Testar envio de nota fiscal do ERP
- [ ] Alterar senhas padrão dos usuários
- [ ] Verificar logs no Render (aba "Logs")
- [ ] Considerar migrar para PostgreSQL (recomendado)

---

## 🐛 Troubleshooting

### Dashboard não carrega

1. Verifique os logs no Render (aba "Logs")
2. Verifique se `REACT_APP_API_URL` está configurado corretamente
3. Verifique se o frontend foi buildado (deve aparecer "Build successful" nos logs)

### Erro de CORS

1. Verifique se `ALLOWED_ORIGINS` inclui a URL do Render
2. Deve ser: `https://dashboardlogcar.onrender.com`

### Erro 401 (Não autorizado) nas APIs

1. Verifique se `JWT_SECRET` está configurado
2. Para APIs do ERP, verifique se `X-API-Key` está correto

### Banco de dados perdido

Isso é normal em instâncias gratuitas. Considere migrar para PostgreSQL.

---

## 📚 Documentação

- **Guia Completo**: `GUIA_DEPLOY_RENDER.md`
- **API ERP**: `DOCUMENTACAO_API_ERP.md`
- **Resumo**: `RESUMO_DEPLOY.md`

---

## 🎯 Próximo Passo Recomendado

1. ✅ **Testar o acesso** ao dashboard
2. ✅ **Alterar senhas padrão**
3. ✅ **Configurar comunicação com LogCar App**
4. ✅ **Testar envio de nota fiscal do ERP**
5. ⚠️ **Considerar migração para PostgreSQL** (para persistência)

---

## 💡 Dicas

- **Logs em tempo real**: No painel do Render, aba "Logs"
- **Métricas**: Monitorar CPU, memória, etc.
- **Auto-deploy**: A cada push no Git, o Render atualiza automaticamente
- **Backup**: Se usar SQLite, considere fazer backup periódico dos dados











## 🎉 Deploy Concluído com Sucesso!

Seu DashboardLogCar está rodando em: **https://dashboardlogcar.onrender.com**

---

## ✅ Verificar se está funcionando

### 1. Acessar o Dashboard no navegador

1. Abra: **https://dashboardlogcar.onrender.com**
2. Você deve ver a tela de login
3. Faça login com:
   - **Usuário**: `admin`
   - **Senha**: `123456`

Se conseguir fazer login, está tudo funcionando! ✅

### 2. Testar a API

Você pode testar se a API está funcionando acessando:

- Health Check: https://dashboardlogcar.onrender.com/health
- API Info: https://dashboardlogcar.onrender.com/

---

## 🔧 Configurar Variáveis de Ambiente (se ainda não fez)

No painel do Render, vá em **"Environment"** e verifique se todas estão configuradas:

### Variáveis Obrigatórias:

```env
PORT=10000
NODE_ENV=production
JWT_SECRET=<deve ter um valor forte>
ERP_API_KEY=<deve ter um valor forte>
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
DB_PATH=./data/faturamento.db
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

**⚠️ IMPORTANTE**: Se você não configurou `JWT_SECRET` e `ERP_API_KEY`, configure agora com valores fortes!

---

## 🔗 Configurar Comunicação com LogCar App

### No LogCar App (já no Render)

No painel do serviço LogCar App no Render, adicione/atualize a variável de ambiente:

```env
DASHBOARDLOGCAR_URL=https://dashboardlogcar.onrender.com
```

Ou se o LogCar App precisar da URL da API:

```env
DASHBOARDLOGCAR_API_URL=https://dashboardlogcar.onrender.com/api
```

---

## 📡 Configurar Comunicação com ERP

### Para o ERP se comunicar com o DashboardLogCar

O ERP precisa fazer requisições para:

**Base URL:** `https://dashboardlogcar.onrender.com/api/erp`

**Headers obrigatórios:**
```
Content-Type: application/json
X-API-Key: <sua-ERP_API_KEY>
```

### Endpoints Disponíveis:

1. **Enviar Nota Fiscal**
   ```
   POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais
   ```
   
2. **Consultar Pedidos Desmembrados**
   ```
   GET https://dashboardlogcar.onrender.com/api/erp/pedidos/:notaFiscalId
   ```

3. **Enviar Romaneio para Visualização**
   ```
   POST https://dashboardlogcar.onrender.com/api/erp/romaneios
   ```

### Testar com Script de Simulação

Se você tem o script de simulação local, atualize-o para usar a URL do Render:

**Arquivo:** `backend/scripts/simular-erp-envio-hoje.js`

Substitua a URL base:
```javascript
const API_URL = 'https://dashboardlogcar.onrender.com/api/erp';
const API_KEY = 'sua-ERP_API_KEY'; // Mesma configurada no Render
```

---

## 🧪 Testar Comunicação

### Teste 1: Health Check

```bash
curl https://dashboardlogcar.onrender.com/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### Teste 2: Enviar Nota Fiscal (via script ou Postman)

Use o script de simulação ou Postman:

```bash
# Com curl (substitua pela sua API_KEY)
curl -X POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-ERP_API_KEY" \
  -d '{
    "numeroNota": "TEST-001",
    "clienteNome": "Cliente Teste",
    "clienteCnpjCpf": "12.345.678/0001-90",
    "dataEmissao": "2026-01-01",
    "itens": [
      {
        "descricao": "Produto Teste",
        "quantidade": 10,
        "unidade": "UN",
        "valorUnitario": 100.00
      }
    ]
  }'
```

---

## ⚠️ Considerações Importantes

### 1. Banco de Dados SQLite

⚠️ **ATENÇÃO**: Em instâncias gratuitas do Render, o banco de dados **não persiste** após reinicializações.

**Soluções:**
- ✅ **Recomendado**: Migrar para PostgreSQL (Render oferece gratuito)
- ⚠️ **Alternativa**: Upgrade para plano pago com disco persistente
- ⚠️ **Apenas testes**: Aceitar perda de dados em reinicializações

### 2. Timeout em Instâncias Gratuitas

- Instâncias gratuitas "adormecem" após 15 minutos de inatividade
- A primeira requisição após adormecer pode levar ~30 segundos
- Para evitar isso, use um serviço de "ping" periódico ou upgrade para plano pago

### 3. Segurança

🔐 **IMPORTANTE - Faça agora:**

1. **Altere as senhas padrão** após primeiro login:
   - Acesse: Usuários → Editar admin/logistica
   - Defina senhas fortes

2. **Use secrets fortes:**
   - `JWT_SECRET`: mínimo 32 caracteres aleatórios
   - `ERP_API_KEY`: mínimo 32 caracteres aleatórios

3. **Configure HTTPS** (já vem por padrão no Render ✅)

---

## 📋 Checklist Pós-Deploy

- [ ] Acessar https://dashboardlogcar.onrender.com e fazer login
- [ ] Verificar se variáveis de ambiente estão configuradas
- [ ] Testar health check da API
- [ ] Configurar variável `DASHBOARDLOGCAR_URL` no LogCar App
- [ ] Testar envio de nota fiscal do ERP
- [ ] Alterar senhas padrão dos usuários
- [ ] Verificar logs no Render (aba "Logs")
- [ ] Considerar migrar para PostgreSQL (recomendado)

---

## 🐛 Troubleshooting

### Dashboard não carrega

1. Verifique os logs no Render (aba "Logs")
2. Verifique se `REACT_APP_API_URL` está configurado corretamente
3. Verifique se o frontend foi buildado (deve aparecer "Build successful" nos logs)

### Erro de CORS

1. Verifique se `ALLOWED_ORIGINS` inclui a URL do Render
2. Deve ser: `https://dashboardlogcar.onrender.com`

### Erro 401 (Não autorizado) nas APIs

1. Verifique se `JWT_SECRET` está configurado
2. Para APIs do ERP, verifique se `X-API-Key` está correto

### Banco de dados perdido

Isso é normal em instâncias gratuitas. Considere migrar para PostgreSQL.

---

## 📚 Documentação

- **Guia Completo**: `GUIA_DEPLOY_RENDER.md`
- **API ERP**: `DOCUMENTACAO_API_ERP.md`
- **Resumo**: `RESUMO_DEPLOY.md`

---

## 🎯 Próximo Passo Recomendado

1. ✅ **Testar o acesso** ao dashboard
2. ✅ **Alterar senhas padrão**
3. ✅ **Configurar comunicação com LogCar App**
4. ✅ **Testar envio de nota fiscal do ERP**
5. ⚠️ **Considerar migração para PostgreSQL** (para persistência)

---

## 💡 Dicas

- **Logs em tempo real**: No painel do Render, aba "Logs"
- **Métricas**: Monitorar CPU, memória, etc.
- **Auto-deploy**: A cada push no Git, o Render atualiza automaticamente
- **Backup**: Se usar SQLite, considere fazer backup periódico dos dados











## 🎉 Deploy Concluído com Sucesso!

Seu DashboardLogCar está rodando em: **https://dashboardlogcar.onrender.com**

---

## ✅ Verificar se está funcionando

### 1. Acessar o Dashboard no navegador

1. Abra: **https://dashboardlogcar.onrender.com**
2. Você deve ver a tela de login
3. Faça login com:
   - **Usuário**: `admin`
   - **Senha**: `123456`

Se conseguir fazer login, está tudo funcionando! ✅

### 2. Testar a API

Você pode testar se a API está funcionando acessando:

- Health Check: https://dashboardlogcar.onrender.com/health
- API Info: https://dashboardlogcar.onrender.com/

---

## 🔧 Configurar Variáveis de Ambiente (se ainda não fez)

No painel do Render, vá em **"Environment"** e verifique se todas estão configuradas:

### Variáveis Obrigatórias:

```env
PORT=10000
NODE_ENV=production
JWT_SECRET=<deve ter um valor forte>
ERP_API_KEY=<deve ter um valor forte>
ALLOWED_ORIGINS=https://dashboardlogcar.onrender.com
DB_PATH=./data/faturamento.db
REACT_APP_API_URL=https://dashboardlogcar.onrender.com/api
```

**⚠️ IMPORTANTE**: Se você não configurou `JWT_SECRET` e `ERP_API_KEY`, configure agora com valores fortes!

---

## 🔗 Configurar Comunicação com LogCar App

### No LogCar App (já no Render)

No painel do serviço LogCar App no Render, adicione/atualize a variável de ambiente:

```env
DASHBOARDLOGCAR_URL=https://dashboardlogcar.onrender.com
```

Ou se o LogCar App precisar da URL da API:

```env
DASHBOARDLOGCAR_API_URL=https://dashboardlogcar.onrender.com/api
```

---

## 📡 Configurar Comunicação com ERP

### Para o ERP se comunicar com o DashboardLogCar

O ERP precisa fazer requisições para:

**Base URL:** `https://dashboardlogcar.onrender.com/api/erp`

**Headers obrigatórios:**
```
Content-Type: application/json
X-API-Key: <sua-ERP_API_KEY>
```

### Endpoints Disponíveis:

1. **Enviar Nota Fiscal**
   ```
   POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais
   ```
   
2. **Consultar Pedidos Desmembrados**
   ```
   GET https://dashboardlogcar.onrender.com/api/erp/pedidos/:notaFiscalId
   ```

3. **Enviar Romaneio para Visualização**
   ```
   POST https://dashboardlogcar.onrender.com/api/erp/romaneios
   ```

### Testar com Script de Simulação

Se você tem o script de simulação local, atualize-o para usar a URL do Render:

**Arquivo:** `backend/scripts/simular-erp-envio-hoje.js`

Substitua a URL base:
```javascript
const API_URL = 'https://dashboardlogcar.onrender.com/api/erp';
const API_KEY = 'sua-ERP_API_KEY'; // Mesma configurada no Render
```

---

## 🧪 Testar Comunicação

### Teste 1: Health Check

```bash
curl https://dashboardlogcar.onrender.com/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### Teste 2: Enviar Nota Fiscal (via script ou Postman)

Use o script de simulação ou Postman:

```bash
# Com curl (substitua pela sua API_KEY)
curl -X POST https://dashboardlogcar.onrender.com/api/erp/notas-fiscais \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-ERP_API_KEY" \
  -d '{
    "numeroNota": "TEST-001",
    "clienteNome": "Cliente Teste",
    "clienteCnpjCpf": "12.345.678/0001-90",
    "dataEmissao": "2026-01-01",
    "itens": [
      {
        "descricao": "Produto Teste",
        "quantidade": 10,
        "unidade": "UN",
        "valorUnitario": 100.00
      }
    ]
  }'
```

---

## ⚠️ Considerações Importantes

### 1. Banco de Dados SQLite

⚠️ **ATENÇÃO**: Em instâncias gratuitas do Render, o banco de dados **não persiste** após reinicializações.

**Soluções:**
- ✅ **Recomendado**: Migrar para PostgreSQL (Render oferece gratuito)
- ⚠️ **Alternativa**: Upgrade para plano pago com disco persistente
- ⚠️ **Apenas testes**: Aceitar perda de dados em reinicializações

### 2. Timeout em Instâncias Gratuitas

- Instâncias gratuitas "adormecem" após 15 minutos de inatividade
- A primeira requisição após adormecer pode levar ~30 segundos
- Para evitar isso, use um serviço de "ping" periódico ou upgrade para plano pago

### 3. Segurança

🔐 **IMPORTANTE - Faça agora:**

1. **Altere as senhas padrão** após primeiro login:
   - Acesse: Usuários → Editar admin/logistica
   - Defina senhas fortes

2. **Use secrets fortes:**
   - `JWT_SECRET`: mínimo 32 caracteres aleatórios
   - `ERP_API_KEY`: mínimo 32 caracteres aleatórios

3. **Configure HTTPS** (já vem por padrão no Render ✅)

---

## 📋 Checklist Pós-Deploy

- [ ] Acessar https://dashboardlogcar.onrender.com e fazer login
- [ ] Verificar se variáveis de ambiente estão configuradas
- [ ] Testar health check da API
- [ ] Configurar variável `DASHBOARDLOGCAR_URL` no LogCar App
- [ ] Testar envio de nota fiscal do ERP
- [ ] Alterar senhas padrão dos usuários
- [ ] Verificar logs no Render (aba "Logs")
- [ ] Considerar migrar para PostgreSQL (recomendado)

---

## 🐛 Troubleshooting

### Dashboard não carrega

1. Verifique os logs no Render (aba "Logs")
2. Verifique se `REACT_APP_API_URL` está configurado corretamente
3. Verifique se o frontend foi buildado (deve aparecer "Build successful" nos logs)

### Erro de CORS

1. Verifique se `ALLOWED_ORIGINS` inclui a URL do Render
2. Deve ser: `https://dashboardlogcar.onrender.com`

### Erro 401 (Não autorizado) nas APIs

1. Verifique se `JWT_SECRET` está configurado
2. Para APIs do ERP, verifique se `X-API-Key` está correto

### Banco de dados perdido

Isso é normal em instâncias gratuitas. Considere migrar para PostgreSQL.

---

## 📚 Documentação

- **Guia Completo**: `GUIA_DEPLOY_RENDER.md`
- **API ERP**: `DOCUMENTACAO_API_ERP.md`
- **Resumo**: `RESUMO_DEPLOY.md`

---

## 🎯 Próximo Passo Recomendado

1. ✅ **Testar o acesso** ao dashboard
2. ✅ **Alterar senhas padrão**
3. ✅ **Configurar comunicação com LogCar App**
4. ✅ **Testar envio de nota fiscal do ERP**
5. ⚠️ **Considerar migração para PostgreSQL** (para persistência)

---

## 💡 Dicas

- **Logs em tempo real**: No painel do Render, aba "Logs"
- **Métricas**: Monitorar CPU, memória, etc.
- **Auto-deploy**: A cada push no Git, o Render atualiza automaticamente
- **Backup**: Se usar SQLite, considere fazer backup periódico dos dados











