# Melhorias nos Endpoints da API

## Novos Endpoints Criados

### 1. GET /api/erp/carga/:numeroCarga

**Descrição:** Busca informações completas de uma carga específica pelo número da carga.

**Uso:** Útil para obter dados completos de um pedido desmembrado antes de enviar ao LogCar App.

**Autenticação:** Requer `X-API-Key` header.

**Parâmetros:**
- `numeroCarga` (path): Número da carga (ex: `NF-1767317825488-C03`)

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "carga": {
    "numeroCarga": "NF-1767317825488-C03",
    "numeroNota": "1767317825488",
    "numeroPedido": "PED-000123",
    "notaFiscalId": "uuid-da-nota-fiscal",
    "cliente": {
      "nome": "Construtora ABC Ltda",
      "cnpjCpf": "12.345.678/0001-90",
      "endereco": "Rua das Obras, 123, Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01234-567"
    },
    "clienteNome": "Construtora ABC Ltda",
    "clienteCnpjCpf": "12.345.678/0001-90",
    "clienteEndereco": "Rua das Obras, 123, Centro",
    "clienteCidade": "São Paulo",
    "clienteEstado": "SP",
    "clienteCep": "01234-567",
    "dataVencimento": "2026-01-31",
    "observacoesNF": "Entrega urgente",
    "pesoTotal": 2500.50,
    "volumeTotal": 15.750,
    "valorTotal": 50000.00,
    "status": "CRIADA",
    "itens": [
      {
        "descricao": "Cimento Portland CP II-E-32",
        "codigoProduto": "PROD-001",
        "codigoInterno": "CIM001",
        "codigoBarrasEan": "7891234567890",
        "quantidade": 100,
        "unidade": "SAC",
        "valorUnitario": 25.00,
        "valorTotal": 2500.00,
        "peso": 5000.00,
        "volume": 2.500,
        "ncm": "2523.29.00",
        "cfop": "5102"
      }
    ]
  }
}
```

**Resposta de Erro (404):**
```json
{
  "success": false,
  "message": "Carga não encontrada"
}
```

**Exemplo de Uso:**
```bash
curl -X GET \
  https://dashboardlogcar.onrender.com/api/erp/carga/NF-1767317825488-C03 \
  -H "X-API-Key: sua-api-key"
```

## Melhorias Implementadas

### 1. Script `adicionarPedidosRomaneio.js`

**Antes:**
- Enviava pedidos ao LogCar App sem informações completas
- Usava `numeroPedido` como `clientName` temporariamente

**Agora:**
- ✅ Busca informações completas da carga via novo endpoint
- ✅ Envia dados completos do cliente ao LogCar App
- ✅ Inclui informações adicionais (endereço, data de vencimento, observações)

### 2. Dados Enviados ao LogCar App

**Campos Enviados:**
- `orderNumber`: Número da carga (numeroCarga)
- `cargoNumber`: Número do romaneio
- `clientName`: Nome completo do cliente (obtido da carga)
- `clientAddress`: Endereço completo do cliente
- `billingDate`: Data de vencimento
- `billingNotes`: Observações da NF
- `noteNumber`: Número da nota (igual ao orderNumber)
- `status`: `PEDIDO_FATURADO`
- `statusCode`: `PEDIDO_FATURADO`

## Fluxo Completo

1. **Associar pedido ao romaneio no DashboardLogCar:**
   ```bash
   POST /api/erp/romaneios/:romaneioId/pedidos
   ```

2. **Buscar informações completas da carga:**
   ```bash
   GET /api/erp/carga/:numeroCarga
   ```

3. **Enviar pedido ao LogCar App:**
   ```bash
   POST /api/orders/from-erp (LogCar App)
   ```

## Benefícios

1. ✅ **Dados Completos:** Agora o LogCar App recebe informações completas do cliente
2. ✅ **Melhor Integração:** Comunicação mais robusta entre sistemas
3. ✅ **Rastreabilidade:** Fácil buscar informações de qualquer carga pelo número
4. ✅ **Manutenibilidade:** Endpoint dedicado facilita futuras melhorias

## Arquivos Modificados

- `backend/routes/erp.js`: Adicionado endpoint `GET /api/erp/carga/:numeroCarga`
- `scripts/adicionarPedidosRomaneio.js`: Atualizado para usar novo endpoint e enviar dados completos

## Próximos Passos

- [x] Criar endpoint para buscar carga por número
- [x] Atualizar script para buscar informações completas
- [x] Enviar dados completos ao LogCar App
- [ ] Adicionar suporte a telefones do cliente (quando disponível)
- [ ] Adicionar suporte a itens do pedido no LogCar App (se necessário)



