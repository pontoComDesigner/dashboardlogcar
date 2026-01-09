# ✅ Resumo das Alterações - API `/api/erp/carga/:numeroCarga`

## 📋 Alterações Realizadas

### 1. ✅ Estrutura do Banco de Dados

**Arquivo:** `backend/database/init.js`
- Adicionados campos na tabela `notas_fiscais`:
  - `vendedorId TEXT`
  - `vendedorNome TEXT`
  - `clienteTelefone1 TEXT`
  - `clienteTelefone2 TEXT`

**Arquivo:** `backend/scripts/criar-migracao-tabelas.js`
- Adicionadas migrações para os novos campos

**Arquivo:** `backend/scripts/adicionar-campos-vendedor-telefone.js` (NOVO)
- Script de migração para adicionar os campos em bancos existentes
- Execute: `node scripts/adicionar-campos-vendedor-telefone.js`

---

### 2. ✅ Recebimento de Nota Fiscal

**Arquivo:** `backend/routes/erp.js` (endpoint POST `/api/erp/notas-fiscais`)
- Atualizado para salvar `vendedorId`, `vendedorNome`, `clienteTelefone1`, `clienteTelefone2` quando a NF é recebida do ERP

**Arquivo:** `backend/routes/notas-fiscais.js` (endpoint POST `/api/notas-fiscais`)
- Atualizado para salvar `vendedorId`, `vendedorNome`, `clienteTelefone1`, `clienteTelefone2` quando a NF é criada manualmente

---

### 3. ✅ Endpoint `/api/erp/carga/:numeroCarga`

**Arquivo:** `backend/routes/erp.js`

**Campos adicionados na resposta:**

```json
{
  "success": true,
  "carga": {
    // ... campos existentes ...
    
    // ✅ NOVO: Vendedor (da NF original)
    "vendedor": {
      "id": "VEND-001",
      "nome": "João Vendedor"
    },
    "vendedorId": "VEND-001",
    "vendedorNome": "João Vendedor",
    
    // ✅ NOVO: Data de Faturamento (data de emissão da NF)
    "dataEmissao": "2026-01-02",
    "dataFaturamento": "2026-01-02",
    
    // ✅ NOVO: Telefones do Cliente (da NF original)
    "cliente": {
      // ... campos existentes ...
      "telefone1": "11987654321",
      "telefone2": "11987654322"
    },
    "clienteTelefone1": "11987654321",
    "clienteTelefone2": "11987654322",
    
    // ✅ NOVO: Objeto notaFiscal (referência à NF original)
    "notaFiscal": {
      "numeroNota": "NF-1767404582616",
      "dataEmissao": "2026-01-02",
      "vendedorId": "VEND-001",
      "vendedorNome": "João Vendedor"
    }
  }
}
```

---

### 4. ✅ Correção no LogCar App

**Arquivo:** `app/src/main/java/com/example/logcar/ui/screen/OrderDetailScreen.kt`
- Corrigido para usar `billingDate` ao invés de `scheduledDate` para exibir "Data de Faturamento"
- Agora exibe corretamente a data de faturamento recebida do ERP

---

## 🔄 Fluxo Completo

### 1. ERP Envia NF
```
POST /api/erp/notas-fiscais
{
  "numeroNota": "NF-1767404582616",
  "dataEmissao": "2026-01-02",
  "vendedorId": "VEND-001",
  "vendedorNome": "João Vendedor",
  "clienteTelefone1": "11987654321",
  "clienteTelefone2": "11987654322",
  ...
}
```

### 2. DashboardLogCar Salva
- Salva todos os campos na tabela `notas_fiscais`
- Incluindo: `vendedorId`, `vendedorNome`, `clienteTelefone1`, `clienteTelefone2`, `dataEmissao`

### 3. DashboardLogCar Desmembra
- Cria cargas (pedidos desmembrados)
- Cada carga referencia a NF original via `notaFiscalId`

### 4. ERP Consulta Carga
```
GET /api/erp/carga/NF-1767404582616-C03
```

**Resposta inclui:**
- ✅ Número da NF original (`numeroNota`)
- ✅ Vendedor (`vendedorId`, `vendedorNome`)
- ✅ Data de Faturamento (`dataEmissao`, `dataFaturamento`)
- ✅ Telefones do Cliente (`clienteTelefone1`, `clienteTelefone2`)
- ✅ Dados do cliente
- ✅ Itens do pedido

### 5. ERP Envia ao LogCar App
```
POST /api/orders/from-erp
{
  "orderNumber": "NF-1767404582616-C03",
  "noteNumber": "NF-1767404582616",  // NF original
  "splitOrderNumber": "NF-1767404582616-C03",  // Pedido desmembrado
  "sellerId": "VEND-001",
  "sellerName": "João Vendedor",
  "billingDate": "2026-01-02",
  "clientPhone1": "11987654321",
  "clientPhone2": "11987654322",
  ...
}
```

### 6. LogCar App Exibe
- ✅ Nota Fiscal: `NF-1767404582616`
- ✅ N° Pedido Desmembrado: `NF-1767404582616-C03`
- ✅ Vendedor: `João Vendedor`
- ✅ Data de Faturamento: `2026-01-02`
- ✅ Telefones para Notificação: `(11) 98765-4321`, `(11) 98765-4322`

---

## 🚀 Como Aplicar as Alterações

### Passo 1: Executar Migração do Banco de Dados

No projeto DashboardLogCar:

```bash
cd backend
node scripts/adicionar-campos-vendedor-telefone.js
```

Isso adicionará os campos na tabela `notas_fiscais`:
- `vendedorId`
- `vendedorNome`
- `clienteTelefone1`
- `clienteTelefone2`

### Passo 2: Reiniciar o Backend

Reinicie o servidor do DashboardLogCar para aplicar as alterações.

### Passo 3: Testar

```bash
# No Servidor ERP Local
npm run testar-api-carga NF-1767404582616-C03
```

O script deve mostrar:
- ✅ Número da NF original: OK
- ✅ Vendedor: OK
- ✅ Data de Faturamento: OK
- ✅ Cliente: OK (com telefones)
- ✅ Itens: OK

---

## ✅ Checklist de Verificação

- [x] Campos adicionados na tabela `notas_fiscais`
- [x] Script de migração criado
- [x] Endpoint `/api/erp/carga/:numeroCarga` atualizado
- [x] Recebimento de NF atualizado para salvar vendedor e telefones
- [x] Tela do LogCar corrigida para usar `billingDate`
- [ ] **Executar migração no banco de dados** ⚠️
- [ ] **Reiniciar backend do DashboardLogCar** ⚠️
- [ ] **Testar com nova NF** ⚠️

---

## 📝 Notas Importantes

1. **Dados da NF Original:** Todos os campos (vendedor, data de faturamento, telefones) vêm da NF original, não da carga individual
2. **Compatibilidade:** A API retorna tanto objetos aninhados (`vendedor.id`) quanto campos diretos (`vendedorId`)
3. **Migração:** Execute o script de migração antes de usar as novas funcionalidades









