# Correção: Associação de Pedidos Desmembrados ao Romaneio

## Problema Identificado

Ao tentar associar pedidos desmembrados (cargas) a um romaneio usando o script `adicionar-pedidos-romaneio`, o sistema retornava sucesso mas não associava os pedidos (`pedidosAssociados: 0`).

**Causa**: O endpoint `/api/erp/romaneios/:romaneioId/pedidos` estava procurando apenas na tabela `pedidos`, mas os pedidos desmembrados são na verdade **cargas** na tabela `cargas`. Quando o ERP consulta `/api/erp/pedidos/:notaFiscalId`, o sistema retorna `carga.numeroCarga` como `numeroPedido`, mas a associação ao romaneio não estava procurando em `cargas`.

## Solução Implementada

### 1. Criação da Tabela `romaneio_cargas`

Criada nova tabela para relacionar romaneios com cargas (pedidos desmembrados):

```sql
CREATE TABLE IF NOT EXISTS romaneio_cargas (
  id TEXT PRIMARY KEY,
  romaneioId TEXT NOT NULL,
  cargaId TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  FOREIGN KEY (romaneioId) REFERENCES romaneios(id) ON DELETE CASCADE,
  FOREIGN KEY (cargaId) REFERENCES cargas(id) ON DELETE CASCADE,
  UNIQUE(romaneioId, cargaId)
)
```

### 2. Atualização do Endpoint `/api/erp/romaneios/:romaneioId/pedidos`

O endpoint agora:
1. **Primeiro** busca em `cargas` usando `numeroCarga` (pedidos desmembrados)
2. Se não encontrar, busca em `pedidos` usando `numeroPedido` (pedidos manuais)
3. Associa na tabela apropriada (`romaneio_cargas` ou `romaneio_pedidos`)

### 3. Atualização do Endpoint GET `/api/romaneios/:id`

Agora retorna tanto pedidos quanto cargas associadas ao romaneio, combinados em uma única lista ordenada.

### 4. Atualização do Endpoint GET `/api/romaneios`

O contador `totalPedidos` agora conta tanto pedidos quanto cargas.

## Arquivos Modificados

- `backend/database/init.js`: Adicionada tabela `romaneio_cargas`
- `backend/routes/erp.js`: Corrigido endpoint de associação de pedidos
- `backend/routes/romaneios.js`: Atualizado para retornar pedidos e cargas

## Script de Migração

Criado script `backend/scripts/criar-tabela-romaneio-cargas.js` para criar a tabela manualmente se necessário.

**Executar migração** (se necessário):
```bash
cd backend
node scripts/criar-tabela-romaneio-cargas.js
```

## Como Testar

1. **Criar um romaneio:**
   ```bash
   npm run criar-romaneio
   ```

2. **Desmembrar uma NF e obter o número do pedido:**
   - No DashboardLogCar, vá em "Desmembramento"
   - Desmembre uma NF
   - Anote o `numeroCarga` (ex: `NF-1767312118673-C02`)

3. **Associar pedido ao romaneio:**
   ```bash
   npm run adicionar-pedidos-romaneio <romaneioId> <numeroCarga>
   ```
   
   Exemplo:
   ```bash
   npm run adicionar-pedidos-romaneio c59f16d9-0a65-4e5e-9149-730e616d894c NF-1767312118673-C02
   ```

4. **Verificar no DashboardLogCar:**
   - Vá em "Romaneios"
   - Visualize o romaneio criado
   - Deve mostrar o pedido/carga associado

## Próximos Passos

- [ ] Verificar se o LogCar App precisa receber as cargas associadas ao romaneio
- [ ] Testar o fluxo completo end-to-end
- [ ] Documentar o formato de dados para o LogCar App (se necessário)

## Notas Importantes

- **Pedidos desmembrados** = `cargas` na tabela `cargas`
- **Pedidos manuais** = `pedidos` na tabela `pedidos`
- O sistema agora suporta ambos os tipos no mesmo romaneio
- O `numeroPedido` retornado pelo endpoint `/api/erp/pedidos/:notaFiscalId` é na verdade o `numeroCarga`








