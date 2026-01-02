# 📚 Documentação da API de Integração com ERP

## Visão Geral

Esta documentação descreve a integração entre o Sistema de Desmembramento Logístico e o ERP principal. O sistema funciona como uma camada externa que recebe notas fiscais já faturadas e retorna cargas desmembradas para impressão via SPOOL.

---

## 🔐 Autenticação

Todas as requisições devem incluir o header de autenticação:

```
X-API-Key: <sua-api-key>
```

A API Key é configurada via variável de ambiente `ERP_API_KEY` no servidor.

---

## 📥 Recebimento de Nota Fiscal (POST)

### Endpoint

```
POST /api/erp/notas-fiscais
```

### Descrição

Recebe uma nota fiscal já faturada do ERP para processamento de desmembramento.

### Headers

```
Content-Type: application/json
X-API-Key: <sua-api-key>
```

### Body (JSON)

#### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `numeroNota` | string | Número da nota fiscal |
| `serie` | string | Série da nota fiscal (padrão: "1") |
| `clienteNome` | string | Nome completo do cliente |
| `clienteCnpjCpf` | string | CNPJ ou CPF do cliente |
| `dataEmissao` | string (ISO 8601) | Data de emissão da NF (ex: "2026-01-01") |
| `itens` | array | Lista de itens da nota fiscal |

#### Campos Opcionais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `erpId` | string | ID único da nota fiscal no ERP |
| `numeroPedido` | string | Número do pedido original |
| `clienteEndereco` | string | Endereço completo do cliente |
| `clienteCidade` | string | Cidade do cliente |
| `clienteEstado` | string | Estado do cliente (UF - 2 caracteres) |
| `clienteCep` | string | CEP do cliente |
| `dataVencimento` | string (ISO 8601) | Data de vencimento/entrega |
| `valorTotal` | number | Valor total da nota fiscal (calculado automaticamente se não informado) |
| `pesoTotal` | number | Peso total em kg (calculado automaticamente se não informado) |
| `volumeTotal` | number | Volume total em m³ (calculado automaticamente se não informado) |
| `chaveAcesso` | string | Chave de acesso da NF-e |
| `observacoes` | string | Observações gerais da nota fiscal |

#### Estrutura dos Itens (`itens` array)

Cada item deve conter:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `descricao` | string | ✅ | Descrição do produto |
| `quantidade` | number | ✅ | Quantidade do item |
| `unidade` | string | ✅ | Unidade de medida (UN, KG, M², M³, SAC, etc.) |
| `valorUnitario` | number | ✅ | Valor unitário do item |
| `valorTotal` | number | ⚠️ | Valor total do item (calculado se não informado) |
| `peso` | number | ❌ | Peso do item em kg |
| `volume` | number | ❌ | Volume do item em m³ |
| `ncm` | string | ❌ | NCM do produto |
| `cfop` | string | ❌ | CFOP da operação |
| `codigoProduto` | string | ❌ | Código do produto no sistema |
| `codigoInterno` | string | ❌ | **Código interno do produto (para conferência)** |
| `codigoBarrasEan` | string | ❌ | **Código de barras EAN (para conferência)** |

### Exemplo de Requisição

```json
{
  "erpId": "ERP-NF-00001234",
  "numeroNota": "00001234",
  "serie": "1",
  "numeroPedido": "PED-000123",
  "clienteNome": "Construtora ABC Ltda",
  "clienteCnpjCpf": "12.345.678/0001-90",
  "clienteEndereco": "Rua das Obras, 123, Centro",
  "clienteCidade": "São Paulo",
  "clienteEstado": "SP",
  "clienteCep": "01234-567",
  "dataEmissao": "2026-01-01",
  "dataVencimento": "2026-01-31",
  "valorTotal": 50000.00,
  "pesoTotal": 2500.50,
  "volumeTotal": 15.750,
  "chaveAcesso": "35201234567890123456789012345678901234567890",
  "observacoes": "Entrega urgente - Entregar até 15:00h",
  "itens": [
    {
      "descricao": "Cimento Portland CP II-E-32",
      "quantidade": 200,
      "unidade": "SAC",
      "valorUnitario": 25.00,
      "valorTotal": 5000.00,
      "peso": 10000.00,
      "volume": 5.000,
      "ncm": "2523.29.00",
      "cfop": "5102",
      "codigoProduto": "PROD-001",
      "codigoInterno": "CIM001",
      "codigoBarrasEan": "7891234567890"
    },
    {
      "descricao": "Areia média lavada",
      "quantidade": 10,
      "unidade": "M³",
      "valorUnitario": 80.00,
      "valorTotal": 800.00,
      "peso": 15000.00,
      "volume": 10.000,
      "ncm": "2505.10.00",
      "cfop": "5102",
      "codigoProduto": "PROD-002",
      "codigoInterno": "ARE001",
      "codigoBarrasEan": "7891234567891"
    }
  ]
}
```

### Resposta de Sucesso

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Nota fiscal recebida com sucesso",
  "notaFiscalId": "uuid-da-nota-fiscal",
  "status": "PENDENTE_DESMEMBRAMENTO"
}
```

### Respostas de Erro

#### 400 Bad Request - Dados obrigatórios faltando

```json
{
  "success": false,
  "message": "Dados obrigatórios faltando: numeroNota, clienteNome, clienteCnpjCpf, itens"
}
```

#### 401 Unauthorized - API Key inválida

```json
{
  "success": false,
  "message": "API Key inválida"
}
```

#### 409 Conflict - Nota fiscal já recebida

```json
{
  "success": false,
  "message": "Nota fiscal já recebida",
  "notaFiscalId": "uuid-da-nota-existente"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Erro ao processar nota fiscal"
}
```

---

## 📤 Retorno de Cargas Desmembradas (GET) - Legado

### Endpoint

```
GET /api/erp/cargas/:notaFiscalId
```

### Descrição

⚠️ **DEPRECIADO**: Use o endpoint `/api/erp/pedidos/:notaFiscalId` que retorna os pedidos desmembrados.

Este endpoint retorna todas as cargas desmembradas de uma nota fiscal. Mantido para compatibilidade.

---

## 📤 Consulta de Carga Específica (GET)

### Endpoint

```
GET /api/erp/carga/:numeroCarga
```

### Descrição

Busca informações completas de uma carga específica pelo número da carga. Útil para obter dados completos antes de enviar ao LogCar App.

### Headers

```
X-API-Key: <sua-api-key>
```

### Parâmetros

- `numeroCarga` (path): Número da carga (ex: `NF-1767317825488-C03`)

### Resposta de Sucesso

**Status Code:** `200 OK`

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
    "itens": [...]
  }
}
```

### Respostas de Erro

#### 404 Not Found - Carga não encontrada

```json
{
  "success": false,
  "message": "Carga não encontrada"
}
```

---

## 📤 Retorno de Pedidos Desmembrados (GET)

### Endpoint

```
GET /api/erp/pedidos/:notaFiscalId
```

### Descrição

Retorna todos os pedidos desmembrados (cargas) de uma nota fiscal para o ERP. O ERP deve usar este endpoint para obter os pedidos desmembrados e montar os romaneios.

### Headers

```
X-API-Key: <sua-api-key>
```

### Parâmetros da URL

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `notaFiscalId` | string (UUID) | ID da nota fiscal retornado no POST |

### Resposta de Sucesso

**Status Code:** `200 OK`

```json
{
  "success": true,
  "notaFiscalId": "uuid-da-nota-fiscal",
  "quantidadePedidos": 2,
  "pedidos": [
    {
      "numeroPedido": "00001234-C01",
      "numeroNota": "00001234",
      "numeroPedidoOriginal": "PED-000123",
      "notaFiscalId": "uuid-da-nota-fiscal",
      "cliente": {
        "nome": "Construtora ABC Ltda",
        "cnpjCpf": "12.345.678/0001-90",
        "endereco": "Rua das Obras, 123, Centro",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01234-567"
      },
      "dataVencimento": "2026-01-31",
      "observacoesNF": "Entrega urgente - Entregar até 15:00h",
      "pesoTotal": 12500.25,
      "volumeTotal": 7.875,
      "valorTotal": 25000.00,
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
  ]
}
```

---

## 📦 Recebimento de Romaneios para Visualização (POST)

### Endpoint

```
POST /api/erp/romaneios
```

### Descrição

Recebe informações de romaneios montados pelo ERP para visualização no DashboardLogCar. O ERP monta os romaneios com os pedidos desmembrados e envia apenas as informações para o DashboardLogCar. O sistema apenas salva para visualização, associando os pedidos existentes ao romaneio.

### Headers

```
X-API-Key: <sua-api-key>
```

### Parâmetros da URL

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `notaFiscalId` | string (UUID) | ID da nota fiscal retornado no POST |

### Resposta de Sucesso

**Status Code:** `200 OK`

```json
{
  "success": true,
  "notaFiscalId": "uuid-da-nota-fiscal",
  "quantidadeCargas": 2,
  "cargas": [
    {
      "numeroCarga": "00001234-C01",
      "numeroNota": "00001234",
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
      "dataVencimento": "2026-01-31",
      "observacoesNF": "Entrega urgente - Entregar até 15:00h",
      "transportadora": null,
      "veiculo": null,
      "motorista": null,
      "dataSaida": null,
      "dataPrevisaoEntrega": null,
      "pesoTotal": 12500.25,
      "volumeTotal": 7.875,
      "valorTotal": 25000.00,
      "status": "CRIADA",
      "itens": [
        {
          "descricao": "Cimento Portland CP II-E-32",
          "codigoProduto": "PROD-001",
          "codigoInterno": "CIM001",
          "codigoBarrasEan": "7891234567890",
          "quantidade": 100,
          "unidade": "SAC",
          "valorTotal": 2500.00,
          "peso": 5000.00,
          "volume": 2.500,
          "ncm": "2523.29.00",
          "cfop": "5102"
        },
        {
          "descricao": "Areia média lavada",
          "codigoProduto": "PROD-002",
          "codigoInterno": "ARE001",
          "codigoBarrasEan": "7891234567891",
          "quantidade": 5,
          "unidade": "M³",
          "valorTotal": 400.00,
          "peso": 7500.00,
          "volume": 5.000,
          "ncm": "2505.10.00",
          "cfop": "5102"
        }
      ]
    },
    {
      "numeroCarga": "00001234-C02",
      "numeroNota": "00001234",
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
      "dataVencimento": "2026-01-31",
      "observacoesNF": "Entrega urgente - Entregar até 15:00h",
      "transportadora": null,
      "veiculo": null,
      "motorista": null,
      "dataSaida": null,
      "dataPrevisaoEntrega": null,
      "pesoTotal": 12500.25,
      "volumeTotal": 7.875,
      "valorTotal": 25000.00,
      "status": "CRIADA",
      "itens": [
        {
          "descricao": "Cimento Portland CP II-E-32",
          "codigoProduto": "PROD-001",
          "codigoInterno": "CIM001",
          "codigoBarrasEan": "7891234567890",
          "quantidade": 100,
          "unidade": "SAC",
          "valorTotal": 2500.00,
          "peso": 5000.00,
          "volume": 2.500,
          "ncm": "2523.29.00",
          "cfop": "5102"
        },
        {
          "descricao": "Areia média lavada",
          "codigoProduto": "PROD-002",
          "codigoInterno": "ARE001",
          "codigoBarrasEan": "7891234567891",
          "quantidade": 5,
          "unidade": "M³",
          "valorTotal": 400.00,
          "peso": 7500.00,
          "volume": 5.000,
          "ncm": "2505.10.00",
          "cfop": "5102"
        }
      ]
    }
  ]
}
```

### Campos da Resposta

#### Carga

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `numeroCarga` | string | Número único da carga (formato: `{numeroNota}-C{numero}`) |
| `numeroNota` | string | Número da nota fiscal original |
| `numeroPedido` | string | Número do pedido original |
| `notaFiscalId` | string | ID da nota fiscal (UUID) |
| `cliente` | object | Dados do cliente (ver abaixo) |
| `dataVencimento` | string | Data de vencimento/entrega |
| `observacoesNF` | string | Observações da nota fiscal original |
| `transportadora` | string \| null | Transportadora (preenchido posteriormente) |
| `veiculo` | string \| null | Veículo/caminhão (preenchido posteriormente) |
| `motorista` | string \| null | Motorista (preenchido posteriormente) |
| `dataSaida` | string \| null | Data de saída (preenchido posteriormente) |
| `dataPrevisaoEntrega` | string \| null | Data prevista de entrega |
| `pesoTotal` | number | Peso total da carga em kg |
| `volumeTotal` | number | Volume total da carga em m³ |
| `valorTotal` | number | Valor total da carga |
| `status` | string | Status da carga: `CRIADA`, `SEPARADA`, `ENVIADA`, `FINALIZADA` |
| `itens` | array | Lista de itens da carga (ver abaixo) |

#### Cliente

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome` | string | Nome completo do cliente |
| `cnpjCpf` | string | CNPJ ou CPF do cliente |
| `endereco` | string | Endereço completo |
| `cidade` | string | Cidade |
| `estado` | string | Estado (UF - 2 caracteres) |
| `cep` | string | CEP |

#### Item da Carga

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `descricao` | string | Descrição do produto |
| `codigoProduto` | string | Código do produto no sistema |
| `codigoInterno` | string | **Código interno para conferência** |
| `codigoBarrasEan` | string | **Código de barras EAN para conferência** |
| `quantidade` | number | Quantidade desmembrada |
| `unidade` | string | Unidade de medida |
| `valorTotal` | number | Valor total do item nesta carga |
| `peso` | number | Peso do item nesta carga (kg) |
| `volume` | number | Volume do item nesta carga (m³) |
| `ncm` | string | NCM do produto |
| `cfop` | string | CFOP da operação |

### Respostas de Erro

#### 401 Unauthorized - API Key inválida

```json
{
  "success": false,
  "message": "API Key inválida"
}
```

#### 404 Not Found - Nenhuma carga encontrada

```json
{
  "success": false,
  "message": "Nenhuma carga encontrada para esta nota fiscal"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Erro ao processar requisição"
}
```

---

## 📝 Status das Cargas

| Status | Descrição | Formato Exibição |
|--------|-----------|------------------|
| `CRIADA` | Carga criada após desmembramento | CRIADA |
| `SEPARADA` | Carga separada no estoque | SEPARADA |
| `ENVIADA` | Carga enviada ao ERP | ENVIADA |
| `FINALIZADA` | Carga finalizada/delivered | FINALIZADA |
| `PENDENTE_DESMEMBRAMENTO` | Nota fiscal aguardando desmembramento | **PENDENTE DE DESMEMBRAMENTO** |

---

## 📦 Recebimento de Romaneios (POST)

### Endpoint

```
POST /api/erp/romaneios
```

### Descrição

Recebe romaneios montados pelo ERP. O ERP cria os romaneios a partir das cargas desmembradas e envia para o DashboardLogCar. O sistema cria pedidos a partir das cargas e automaticamente envia os romaneios para o APP LogCar.

### Headers

```
Content-Type: application/json
X-API-Key: <sua-api-key>
```

### Body (JSON)

#### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `numeroRomaneio` | string | Número único do romaneio |
| `pedidos` | array | Lista de números de pedidos (strings) que compõem o romaneio |

#### Campos Opcionais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `transportadora` | string | Nome da transportadora |
| `veiculo` | string | Placa/identificação do veículo |
| `motorista` | string | Nome do motorista |
| `dataSaida` | string (ISO 8601) | Data de saída prevista |
| `dataPrevisaoEntrega` | string (ISO 8601) | Data prevista de entrega |
| `observacoes` | string | Observações gerais do romaneio |

#### Estrutura dos Pedidos (`pedidos` array)

Array simples de strings com os números dos pedidos (que são os números das cargas desmembradas):

```json
[
  "00001234-C01",
  "00001234-C02"
]
```

### Exemplo de Requisição

```json
{
  "numeroRomaneio": "ROM-2026-001",
  "transportadora": "Transportadora XYZ",
  "veiculo": "ABC-1234",
  "motorista": "João Silva",
  "dataSaida": "2026-01-02",
  "dataPrevisaoEntrega": "2026-01-03",
  "observacoes": "Entrega programada",
  "pedidos": [
    "00001234-C01",
    "00001234-C02"
  ]
}
```

### Resposta de Sucesso

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Romaneio recebido com sucesso para visualização",
  "romaneioId": "uuid-do-romaneio",
  "numeroRomaneio": "ROM-2026-001",
  "pedidosAssociados": 2
}
```

**Observação**: Os pedidos que não forem encontrados no sistema serão ignorados (isso é normal, pois os pedidos podem ainda não ter sido criados quando o romaneio é enviado).

### Respostas de Erro

#### 400 Bad Request - Dados obrigatórios faltando

```json
{
  "success": false,
  "message": "Dados obrigatórios faltando: numeroRomaneio, cargas (array)"
}
```

#### 409 Conflict - Romaneio já existe

```json
{
  "success": false,
  "message": "Romaneio já existe",
  "romaneioId": "uuid-do-romaneio-existente"
}
```

---

## 🔄 Fluxo de Integração Completo

### Fluxo 1: Desmembramento de Notas Fiscais

1. **ERP fatura NF** → `POST /api/erp/notas-fiscais`
   - ERP envia nota fiscal já faturada
   - Nota fiscal recebida com status `PENDENTE_DESMEMBRAMENTO`
   
2. **DashboardLogCar processa desmembramento**
   - Operador realiza desmembramento via interface web
   - Sistema cria múltiplas cargas (pedidos desmembrados)
   - Status da NF muda para `DESMEMBRADA`
   
3. **ERP consulta pedidos desmembrados** → `GET /api/erp/pedidos/:notaFiscalId`
   - ERP recebe todos os pedidos desmembrados (cargas)
   - Cada carga desmembrada é um pedido independente
   - ERP usa esses pedidos para montar os romaneios

### Fluxo 2: Montagem e Envio de Romaneios

4. **ERP monta romaneios**
   - ERP agrupa os pedidos desmembrados conforme necessário
   - ERP cria os romaneios no sistema ERP
   - **ERP envia romaneios diretamente para o APP LogCar** (comunicação direta ERP → APP)

5. **ERP envia informações para visualização** → `POST /api/erp/romaneios`
   - ERP envia informações dos romaneios montados para o DashboardLogCar
   - DashboardLogCar apenas salva para visualização na tela de Romaneios
   - Sistema associa pedidos existentes aos romaneios (se encontrados)

### Fluxo 3: APP LogCar

6. **APP LogCar recebe romaneios**
   - APP LogCar recebe os romaneios diretamente do ERP (não via DashboardLogCar)
   - APP gerencia a expedição e entrega
   - APP controla o status dos romaneios e pedidos

---

## 🔍 Observações Importantes

1. **Códigos de Produto**: Os campos `codigoInterno` e `codigoBarrasEan` são essenciais para conferência na hora de carregar os caminhões.

2. **Dados Completos da NF**: Cada carga mantém todas as informações da nota fiscal original (cliente, endereço, observações, data de vencimento).

3. **Validação de Soma**: A soma das quantidades, valores, pesos e volumes de todas as cargas é sempre igual à nota fiscal original.

4. **Formato SPOOL**: O formato de retorno já está preparado para integração direta com sistemas SPOOL de impressão.

5. **Matriz/Filial**: O ERP deve decidir o direcionamento das cargas baseado nos dados fornecidos (endereço do cliente, tipo de produto, etc.).

6. **Pedidos Desmembrados**: As cargas criadas no desmembramento são os pedidos desmembrados. O número da carga (`numeroCarga`) é o número do pedido que o ERP deve usar.

7. **Romaneios para Visualização**: O endpoint `POST /api/erp/romaneios` é apenas para salvar informações no DashboardLogCar para visualização. O DashboardLogCar não envia romaneios ao APP - essa comunicação é direta entre ERP e APP LogCar.

8. **Associação de Pedidos**: Quando o ERP envia um romaneio, o sistema tenta associar os pedidos pelo número. Se o pedido não for encontrado (normal se ainda não foi criado), ele será ignorado silenciosamente.

---

## 📞 Suporte

Para dúvidas ou problemas com a integração, consulte a equipe de desenvolvimento.


