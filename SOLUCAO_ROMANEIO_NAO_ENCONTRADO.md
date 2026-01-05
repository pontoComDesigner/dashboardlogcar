# Solução: Romaneio Não Encontrado

## Problema

Ao tentar associar pedidos a um romaneio, o erro "Romaneio não encontrado" ocorre porque o ID do romaneio não existe no banco de dados.

**Possíveis causas:**
1. O banco SQLite no Render é **efêmero** - dados são perdidos quando o serviço reinicia (se não usar persistent disk)
2. O romaneio foi criado anteriormente mas o banco foi reiniciado
3. O ID do romaneio está incorreto

## Solução Implementada

### 1. Endpoint GET `/api/erp/romaneios`

Criado endpoint para listar todos os romaneios disponíveis:

```bash
GET https://dashboardlogcar.onrender.com/api/erp/romaneios
Headers: X-API-Key: <sua-api-key>
```

### 2. Script `listar-romaneios`

Criado script no servidor local para listar romaneios:

```bash
npm run listar-romaneios
```

Este script mostra:
- ID de cada romaneio
- Número do romaneio
- Transportadora, veículo, motorista
- Total de pedidos associados
- Status
- Data de criação

## Como Usar

### Opção 1: Listar Romaneios Existentes

1. **Liste os romaneios disponíveis:**
   ```bash
   npm run listar-romaneios
   ```

2. **Copie o ID do romaneio desejado** da listagem

3. **Associe pedidos usando o ID correto:**
   ```bash
   npm run adicionar-pedidos-romaneio <ID_DO_ROMANEIO> <numeroPedido1> <numeroPedido2>
   ```

### Opção 2: Criar Novo Romaneio

Se nenhum romaneio existir ou você precisar de um novo:

1. **Crie um novo romaneio:**
   ```bash
   npm run criar-romaneio
   ```

2. **Copie o `romaneioId`** retornado no log

3. **Associe pedidos:**
   ```bash
   npm run adicionar-pedidos-romaneio <romaneioId> <numeroPedido1>
   ```

## Exemplo Completo

```bash
# 1. Listar romaneios existentes
npm run listar-romaneios

# Saída esperada:
# 🚚 ROMANEIO 1:
#    ID: a1e36670-e31e-443c-b582-081e8975a088
#    Número: ROM-1767315842941
#    ...
#    💡 Para adicionar pedidos a este romaneio, execute:
#       npm run adicionar-pedidos-romaneio a1e36670-e31e-443c-b582-081e8975a088 <numeroPedido1> ...

# 2. Associar pedidos usando o ID correto
npm run adicionar-pedidos-romaneio a1e36670-e31e-443c-b582-081e8975a088 NF-1767312118673-C02
```

## Verificação

Após associar os pedidos, verifique:

1. **No DashboardLogCar (via navegador):**
   - Acesse: https://dashboardlogcar.onrender.com
   - Vá em "Romaneios"
   - Visualize o romaneio
   - Verifique se os pedidos estão associados

2. **Ou use o script novamente:**
   ```bash
   npm run listar-romaneios
   ```
   - O campo "Total Pedidos" deve mostrar a quantidade correta

## Importante

⚠️ **Nota sobre SQLite no Render:**
- O SQLite no Render Free Tier é **efêmero**
- Dados são perdidos quando o serviço reinicia após inatividade
- Para produção, considere:
  - Usar PostgreSQL no Render (pago)
  - Ou implementar backup automático do banco SQLite
  - Ou usar persistent disk (se disponível no seu plano)

## Arquivos Modificados

- `backend/routes/erp.js`: Adicionado endpoint GET `/api/erp/romaneios`
- `scripts/listarRomaneios.js`: Novo script para listar romaneios
- `package.json`: Adicionado comando `listar-romaneios`

## Próximos Passos

1. ✅ Fazer deploy das alterações no Render
2. ✅ Testar `npm run listar-romaneios`
3. ✅ Criar novo romaneio se necessário
4. ✅ Associar pedidos usando o ID correto








