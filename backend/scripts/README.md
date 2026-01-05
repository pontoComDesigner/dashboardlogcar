# Scripts de Simulação

## Simular Envio de Notas Fiscais do ERP

Script para simular o envio de notas fiscais do ERP para o sistema de desmembramento.

### Uso

#### Via Node.js (qualquer sistema):

```bash
# Enviar 3 notas fiscais (padrão)
node scripts/simular-erp-envio.js

# Enviar quantidade específica
node scripts/simular-erp-envio.js 5
```

#### Via npm script:

```bash
cd backend
npm run simular-erp 5
```

#### Via .bat (Windows):

```bash
# Na raiz do projeto
SIMULAR_ERP.bat 5

# Ou dentro de backend/scripts
scripts\simular-erp-envio.bat 5
```

### Configuração

O script usa as variáveis de ambiente do arquivo `.env`:

- `API_URL`: URL da API (padrão: http://localhost:3001/api)
- `ERP_API_KEY`: Chave de API para autenticação

### Dados Gerados

O script gera notas fiscais com:

- **Clientes**: 4 clientes diferentes do ramo de construção
- **Produtos**: 12 tipos de produtos (cimento, areia, brita, tijolos, etc.)
- **Valores realistas**: Baseados em preços de mercado
- **Peso e Volume**: Calculados automaticamente por item
- **Quantidades variadas**: Entre 3 a 8 itens por nota fiscal
- **Dados completos**: CNPJ, endereço, NCM, CFOP, etc.

### Exemplo de Saída

```
🚀 Simulador de Envio de Notas Fiscais do ERP

📡 API URL: http://localhost:3001/api
🔑 API Key: default-api...
📦 Quantidade: 5 nota(s) fiscal(is)

────────────────────────────────────────────────────────────

[1/5] Enviando NF 00001001... ✅ OK
   Cliente: Construtora ABC Ltda
   Valor: R$ 45.230,50
   Itens: 5
   Peso: 12.450,50 kg
   Volume: 8,250 m³

[2/5] Enviando NF 00001002... ✅ OK
   ...

📊 Resumo:
   ✅ Sucessos: 5
   ❌ Erros: 0
   📈 Taxa de sucesso: 100.0%

💡 Dica: Acesse http://localhost:3000/desmembramento para ver as notas fiscais pendentes!
```

### Notas

- O script adiciona um pequeno delay entre requisições para não sobrecarregar o servidor
- Notas duplicadas (mesmo número) serão rejeitadas pelo sistema
- Os números de nota começam em 1001 e incrementam
- As datas de emissão são dos últimos 7 dias











