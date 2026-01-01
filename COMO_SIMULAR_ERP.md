# 📦 Como Simular Envio de Notas Fiscais do ERP

Este guia explica como usar os scripts de simulação para enviar notas fiscais ao sistema, simulando o envio do ERP.

## 🚀 Scripts Disponíveis

### 1. Simulação com Data Atual (Aleatória)
**Script:** `simular-erp-envio.js`

Simula envios com datas aleatórias dos últimos 7 dias.

```bash
# Na pasta backend
npm run simular-erp [quantidade]

# Exemplo: enviar 5 notas fiscais
npm run simular-erp 5
```

### 2. Simulação com Data Fixa (01/01/2026) ⭐ RECOMENDADO
**Script:** `simular-erp-envio-hoje.js`

Simula envios com data de faturamento fixa = **01/01/2026** (hoje).

```bash
# Na pasta backend
npm run simular-erp-hoje [quantidade] [numero_inicial]

# Exemplos:
npm run simular-erp-hoje 5          # Envia 5 notas, começando do número 5000 (padrão)
npm run simular-erp-hoje 10 8000    # Envia 10 notas, começando do número 8000
npm run simular-erp-hoje 5 10000    # Envia 5 notas, começando do número 10000
```

## 🪟 Usando no Windows

### Opção 1: Script Batch (Mais Fácil)
Execute o arquivo batch na raiz do projeto:

```batch
# Duplo clique ou execute no CMD:
SIMULAR_ERP_HOJE.bat 5
```

### Opção 2: Diretamente via Node
```batch
cd backend
node scripts/simular-erp-envio-hoje.js 5
```

## 📋 Pré-requisitos

1. **Backend rodando**: Certifique-se que o servidor backend está em execução
   ```bash
   cd backend
   npm run dev
   ```

2. **API Key configurada**: Verifique o arquivo `.env` ou `dashboardlogcar.env`
   ```env
   ERP_API_KEY=sua-api-key-secreta-aqui
   API_URL=http://localhost:3001/api
   ```

## 📊 Dados Gerados

Os scripts geram notas fiscais com:

- ✅ **Clientes**: 6 empresas diferentes (construtoras e materiais)
- ✅ **Produtos**: 18 tipos de materiais de construção
- ✅ **Itens**: 4 a 10 produtos por nota fiscal
- ✅ **Totais**: Valor, peso e volume calculados automaticamente
- ✅ **Chave de Acesso**: Chave NFe simulada
- ✅ **Dados Completos**: Todos os campos obrigatórios preenchidos

### Exemplo de Nota Fiscal Gerada

```json
{
  "numeroNota": "00001001",
  "serie": "1",
  "numeroPedido": "PED-000001",
  "clienteNome": "Construtora ABC Ltda",
  "clienteCnpjCpf": "12.345.678/0001-90",
  "dataEmissao": "2026-01-01",
  "valorTotal": 15234.56,
  "pesoTotal": 45678.90,
  "volumeTotal": 123.456,
  "itens": [...]
}
```

## 🔍 Verificar Resultado

Após executar o script:

1. **Acesse a interface web:**
   ```
   http://localhost:3000/desmembramento
   ```

2. **Use os filtros:**
   - Data: 01/01/2026
   - Busca: Número da NF (se necessário)

3. **Verifique as notas:**
   - As notas aparecerão com status "PENDENTE_DESMEMBRAMENTO"
   - Clique em uma nota para iniciar o desmembramento

## ⚙️ Configuração Avançada

### Alterar Número Inicial
```bash
# O padrão agora é 5000, mas você pode alterar:
npm run simular-erp-hoje 5 8000   # Começar do número 8000
npm run simular-erp-hoje 5 10000  # Começar do número 10000
```

### Alterar Quantidade de Itens
Edite o arquivo `backend/scripts/simular-erp-envio-hoje.js`:
```javascript
const quantidadeItens = gerarNumeroAleatorio(4, 10); // Mude aqui
```

### Adicionar Mais Produtos/Clientes
Edite os arrays `clientes` e `produtos` no arquivo do script.

## ❌ Solução de Problemas

### Erro: "API Key inválida"
- Verifique se o `ERP_API_KEY` no `.env` está correto
- Certifique-se que o valor é o mesmo usado no script

### Erro: "Cannot connect"
- Verifique se o backend está rodando (`npm run dev` na pasta backend)
- Verifique se a porta 3001 está acessível

### Notas não aparecem na interface
- Verifique se o filtro de data está correto (01/01/2026)
- Verifique os logs do backend para erros
- Recarregue a página

### Erro: "Nota fiscal já recebida"
- O número da nota fiscal já existe no banco
- Use um número inicial diferente:
  ```bash
  npm run simular-erp-hoje 5 5000
  ```

## 📝 Logs

O script exibe informações detalhadas:
- ✅ Status de cada nota enviada
- ✅ Resumo com taxa de sucesso
- ✅ Detalhes de erros (se houver)
- ✅ Valores e quantidades geradas

## 💡 Dicas

1. **Teste com poucas notas primeiro:**
   ```bash
   npm run simular-erp-hoje 3
   ```

2. **Use números iniciais diferentes para evitar conflitos:**
   ```bash
   npm run simular-erp-hoje 5 1000  # Primeiro lote
   npm run simular-erp-hoje 5 2000  # Segundo lote
   ```

3. **Verifique o banco de dados diretamente** (se necessário):
   - Localização: `backend/data/faturamento.db`
   - Use uma ferramenta SQLite para visualizar
