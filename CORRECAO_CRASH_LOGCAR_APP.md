# Correção: Crash do LogCar App ao Abrir Romaneio

## Problema Identificado

O LogCar App estava fechando (crash) ao tentar abrir romaneios que continham pedidos inseridos via servidor ERP local. Romaneios criados anteriormente abriam normalmente.

## Causa Provável

Campos desnecessários ou com formato incorreto sendo enviados ao LogCar App:

1. **`cargoCreatedByName`** - Campo não utilizado pelo LogCar App (apenas `cargoCreatedBy` é usado)
2. **`status` e `statusCode`** - O LogCar App define automaticamente como `PEDIDO_FATURADO` quando recebe pedidos do ERP
3. **`noteNumber`** - O LogCar App define automaticamente como igual ao `orderNumber`
4. **`billingDate`** - Formato de data pode estar incorreto
5. **Campos `null` desnecessários** - Enviar campos como `null` explicitamente pode causar problemas

## Correção Implementada

### 1. Removidos Campos Desnecessários

**Removidos:**
- ❌ `cargoCreatedByName` - Não é usado pelo LogCar App
- ❌ `status` - LogCar App define automaticamente
- ❌ `statusCode` - LogCar App define automaticamente  
- ❌ `noteNumber` - LogCar App define automaticamente como `orderNumber`
- ❌ `clientPhone1` e `clientPhone2` - Não necessário enviar como `null`

### 2. Formato de Data Corrigido

**Antes:**
```javascript
billingDate: cargaData?.dataVencimento || null
```

**Agora:**
```javascript
// Formatar data de vencimento se disponível (formato YYYY-MM-DD)
let billingDate = null;
if (cargaData?.dataVencimento) {
  try {
    const date = new Date(cargaData.dataVencimento);
    if (!isNaN(date.getTime())) {
      billingDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  } catch (e) {
    billingDate = null;
  }
}
```

### 3. Dados Enviados Corrigidos

**Campos Enviados Agora:**
```javascript
{
  orderNumber: numeroPedido,
  cargoNumber: numeroRomaneio,
  clientName: cargaData?.cliente?.nome || cargaData?.clienteNome || numeroPedido,
  clientAddress: cargaData?.cliente?.endereco || cargaData?.clienteEndereco || null,
  cargoCreatedBy: 'ERP-SIMULATOR',
  billingDate: billingDate, // Formato YYYY-MM-DD ou null
  billingNotes: cargaData?.observacoesNF || null
}
```

## Campos que o LogCar App Define Automaticamente

O LogCar App define automaticamente os seguintes campos quando recebe pedidos do ERP:

- ✅ `status`: Sempre `PEDIDO_FATURADO` para novos pedidos
- ✅ `statusCode`: Sempre `PEDIDO_FATURADO` para novos pedidos
- ✅ `noteNumber`: Sempre igual ao `orderNumber`
- ✅ `createdAt`: Data/hora de criação
- ✅ `updatedAt`: Data/hora de atualização

## Teste

Após a correção, teste:

1. **Associar pedido ao romaneio:**
   ```bash
   npm run adicionar-pedidos-romaneio <romaneioId> <numeroCarga>
   ```

2. **Abrir o romaneio no LogCar App:**
   - Deve abrir normalmente sem crash
   - Pedidos devem aparecer corretamente
   - Dados do cliente devem estar completos

## Arquivos Modificados

- `scripts/adicionarPedidosRomaneio.js`: Removidos campos desnecessários e corrigido formato de data

## Notas Importantes

1. **Não enviar campos que o LogCar App define automaticamente** - pode causar conflitos
2. **Formatar datas corretamente** - sempre usar formato YYYY-MM-DD
3. **Não enviar campos como `null` explicitamente** - apenas omitir se não disponível
4. **Seguir exatamente o formato esperado pelo LogCar App** - consultar documentação se necessário








