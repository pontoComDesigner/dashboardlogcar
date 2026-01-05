# 🚀 Instruções para Aplicar as Alterações

## ⚠️ IMPORTANTE: Execute na Ordem

### Passo 1: Executar Migração do Banco de Dados

No projeto DashboardLogCar, execute:

```bash
cd backend
node scripts/adicionar-campos-vendedor-telefone.js
```

**O que faz:**
- Adiciona campos `vendedorId`, `vendedorNome`, `clienteTelefone1`, `clienteTelefone2` na tabela `notas_fiscais`
- Seguro: ignora se os campos já existirem

**Resultado esperado:**
```
✅ Conectado ao banco de dados
📋 Adicionando campos de vendedor e telefones...

   ✅ notas_fiscais.vendedorId adicionada (1/4)
   ✅ notas_fiscais.vendedorNome adicionada (2/4)
   ✅ notas_fiscais.clienteTelefone1 adicionada (3/4)
   ✅ notas_fiscais.clienteTelefone2 adicionada (4/4)

📊 Resumo: 4 migrações aplicadas, 0 erros
✅ Migração concluída com sucesso!
```

---

### Passo 2: Reiniciar o Backend do DashboardLogCar

Reinicie o servidor para aplicar as alterações no código:

```bash
# Se estiver rodando, pare (Ctrl+C) e inicie novamente:
npm start
# ou
npm run dev
```

---

### Passo 3: Testar com Nova NF

#### 3.1. Enviar NF com Vendedor e Telefones

No Servidor ERP Local:

```bash
npm run enviar-nf
```

A NF de exemplo já inclui:
- `vendedorId: "VEND-001"`
- `vendedorNome: "João Vendedor"`
- `dataEmissao: "2026-01-02"`

**Nota:** A NF de exemplo não inclui telefones ainda. Você pode adicionar manualmente no script `enviarNotaFiscal.js` se quiser testar.

#### 3.2. Fazer Desmembramento

1. Acesse o DashboardLogCar
2. Vá em "Notas Fiscais"
3. Desmembre a NF recém-enviada

#### 3.3. Testar a API

```bash
npm run testar-api-carga NF-1767404582616-C03
```

**Resultado esperado:**
```
✅ Campos OK: 5/5
✅ Todos os campos críticos estão presentes!
```

---

## ✅ Verificação Final

Após aplicar as alterações, teste o fluxo completo:

1. **Enviar NF** → `npm run enviar-nf`
2. **Desmembrar** → No DashboardLogCar
3. **Consultar Pedidos** → `npm run consultar-pedidos <notaFiscalId>`
4. **Testar API** → `npm run testar-api-carga <numeroCarga>`
5. **Adicionar ao Romaneio** → `npm run adicionar-pedidos-romaneio <romaneioId> <numeroCarga>`
6. **Verificar no LogCar App** → Todos os campos devem estar preenchidos

---

## 📋 Campos que Agora Estão Disponíveis

### Na API `/api/erp/carga/:numeroCarga`:

- ✅ `numeroNota` - Número da NF original
- ✅ `vendedor.id` / `vendedorId` - ID do vendedor
- ✅ `vendedor.nome` / `vendedorNome` - Nome do vendedor
- ✅ `dataEmissao` / `dataFaturamento` - Data de faturamento
- ✅ `cliente.telefone1` / `clienteTelefone1` - Telefone 1
- ✅ `cliente.telefone2` / `clienteTelefone2` - Telefone 2
- ✅ `notaFiscal` - Objeto com dados da NF original

### No LogCar App:

- ✅ Nota Fiscal: Número da NF original
- ✅ N° Pedido Desmembrado: Número do pedido desmembrado
- ✅ Vendedor: Nome do vendedor
- ✅ Data de Faturamento: Data de emissão da NF
- ✅ Telefones para Notificação: Telefones do cliente

---

## 🔧 Se Algo Não Funcionar

### Erro: "no such column: vendedorId"

**Causa:** Migração não foi executada

**Solução:**
```bash
cd backend
node scripts/adicionar-campos-vendedor-telefone.js
```

### Erro: "API não retorna vendedor"

**Causa:** Backend não foi reiniciado após as alterações

**Solução:** Reinicie o backend do DashboardLogCar

### Erro: "Vendedor não encontrado na resposta"

**Causa:** A NF não foi enviada com vendedor

**Solução:** Envie uma nova NF com `vendedorId` e `vendedorNome`

---

## 📝 Arquivos Modificados

### DashboardLogCar:
- `backend/database/init.js` - Estrutura da tabela
- `backend/routes/erp.js` - Endpoint `/api/erp/carga/:numeroCarga` e recebimento de NF
- `backend/routes/notas-fiscais.js` - Recebimento de NF (criação manual)
- `backend/scripts/criar-migracao-tabelas.js` - Migrações atualizadas
- `backend/scripts/adicionar-campos-vendedor-telefone.js` - Script de migração (NOVO)

### LogCar App:
- `app/src/main/java/com/example/logcar/ui/screen/OrderDetailScreen.kt` - Correção para usar `billingDate`

### Servidor ERP Local:
- `scripts/enviarNotaFiscal.js` - Inclui vendedor na NF de exemplo
- `scripts/adicionarPedidosRomaneio.js` - Busca e envia todos os campos
- `scripts/testarApiCarga.js` - Script de teste (NOVO)
- `scripts/consultarPedidos.js` - Correção para mostrar descrição dos itens








