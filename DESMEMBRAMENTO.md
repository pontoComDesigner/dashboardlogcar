# Sistema de Desmembramento Logístico Pós-Faturamento

## 📋 Visão Geral

Sistema terceirizado para desmembramento logístico de notas fiscais já faturadas. O sistema recebe dados do ERP, permite desmembrar NFs em múltiplas cargas e retorna os dados formatados para impressão (SPOOL).

## 🔄 Fluxo Principal

1. **ERP → Sistema**: Envia nota fiscal faturada via API
2. **Sistema**: Armazena NF com status `PENDENTE_DESMEMBRAMENTO`
3. **Usuário**: Visualiza lista de NFs pendentes em tela flutuante
4. **Usuário**: Seleciona NF e clica em "Desmembrar"
5. **Sistema**: 
   - Sugere número de cargas baseado em histórico
   - Distribui itens entre cargas automaticamente
   - Valida que totais batem
6. **Sistema**: Atualiza status para `DESMEMBRADA`
7. **ERP → Sistema**: Busca cargas via API (formato SPOOL)
8. **ERP**: Imprime romaneios e controla expedição

## 🔌 APIs do ERP

### Receber Nota Fiscal (Webhook)

```http
POST /api/erp/notas-fiscais
Headers:
  X-API-Key: sua-api-key
Content-Type: application/json

{
  "erpId": "NF-12345",
  "numeroNota": "12345",
  "serie": "1",
  "numeroPedido": "PED-001",
  "clienteNome": "Empresa XYZ",
  "clienteCnpjCpf": "12.345.678/0001-90",
  "clienteEndereco": "Rua Exemplo, 123",
  "clienteCidade": "São Paulo",
  "clienteEstado": "SP",
  "clienteCep": "01234-567",
  "dataEmissao": "2024-01-15",
  "valorTotal": 50000.00,
  "pesoTotal": 25000,
  "volumeTotal": 60,
  "chaveAcesso": "35200112345678000190550000000123451234567890",
  "observacoes": "Entrega urgente",
  "itens": [
    {
      "descricao": "Produto A",
      "quantidade": 100,
      "unidade": "UN",
      "valorUnitario": 100.00,
      "valorTotal": 10000.00,
      "peso": 5000,
      "volume": 10,
      "ncm": "12345678",
      "cfop": "5102",
      "codigoProduto": "PROD-001"
    }
  ]
}
```

### Buscar Cargas (SPOOL)

```http
GET /api/erp/cargas/:notaFiscalId
Headers:
  X-API-Key: sua-api-key
```

**Resposta:**
```json
{
  "success": true,
  "notaFiscalId": "uuid-da-nota",
  "quantidadeCargas": 2,
  "cargas": [
    {
      "numeroCarga": "12345-C01",
      "numeroNota": "12345",
      "numeroPedido": "PED-001",
      "cliente": {
        "nome": "Empresa XYZ",
        "endereco": "Rua Exemplo, 123",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01234-567"
      },
      "observacoes": "Entrega urgente",
      "transportadora": null,
      "veiculo": null,
      "motorista": null,
      "pesoTotal": 12000,
      "volumeTotal": 30,
      "valorTotal": 25000.00,
      "status": "CRIADA",
      "itens": [...]
    }
  ]
}
```

## 🧠 Inteligência de Desmembramento

### Sugestão Automática

O sistema sugere número de cargas baseado em:

1. **Histórico**: Busca padrões de desmembramentos similares
   - Mesmo cliente (CNPJ/CPF)
   - Valor total similar (±30%)
   - Mesmo tipo de produto

2. **Heurísticas**: Se não há histórico, usa regras:
   - Capacidade de peso: 25.000 kg/caminhão
   - Capacidade de volume: 80 m³/caminhão
   - Capacidade de valor: R$ 500.000/caminhão
   - Pega o maior (mais restritivo)

### Distribuição de Itens

Algoritmo "First Fit Decreasing":
1. Ordena itens por peso (maior primeiro)
2. Distribui item na carga com menor peso total
3. Garante distribuição equilibrada

## ✅ Validações

- ✅ Soma das cargas = Nota fiscal original
- ✅ Não excede quantidades faturadas
- ✅ Não altera valores fiscais
- ✅ Cada carga vinculada a uma única NF
- ✅ Log de auditoria completo

## 📊 Status das Cargas

- `CRIADA`: Carga criada, aguardando separação
- `SEPARADA`: Itens separados no estoque
- `ENVIADA`: Enviada ao ERP (SPOOL)
- `FINALIZADA`: Entrega confirmada

## 🔐 Autenticação ERP

Configure a API Key no `.env`:

```env
ERP_API_KEY=sua-chave-secreta-aqui
```

Envie no header: `X-API-Key: sua-chave-secreta-aqui`

## 📝 Estrutura do Banco

### Tabelas Principais

- `notas_fiscais`: Notas recebidas do ERP
- `nota_fiscal_itens`: Itens das notas fiscais
- `cargas`: Cargas criadas pelo desmembramento
- `carga_itens`: Itens de cada carga
- `desmembramentos_historico`: Histórico de desmembramentos
- `padroes_desmembramento`: Padrões aprendidos (futuro ML)
- `auditoria`: Log completo de ações

## 🚀 Próximos Passos (Opcional)

- [ ] Machine Learning para sugestões mais precisas
- [ ] Desmembramento manual (arrastar itens entre cargas)
- [ ] Regras customizadas por cliente/produto
- [ ] Integração com sistemas de rastreamento
- [ ] Dashboard de métricas de desmembramento










