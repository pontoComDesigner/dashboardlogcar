# Como Importar Histórico de Faturamentos

Este guia explica como importar o histórico de faturamentos do PDF para o sistema, permitindo que o desmembramento automático aprenda com dados reais.

## Formato do Arquivo CSV

O arquivo CSV deve ter o seguinte formato:

```
Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,1
NF-123456,50080,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
NF-123456,19500,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
NF-123456,9675,CIMENTO VOTORAN 50KG TODAS OBRAS,UN,20
```

**Colunas:**
1. **Número da Nota Fiscal**: Número da nota fiscal (ex: NF-123456, V209675)
2. **Cód do Produto**: Código do produto (ex: 6000, 50080, 9675)
3. **Descrição**: Descrição do produto
4. **Un.**: Unidade de medida (ex: UN, CA, MT)
5. **Quantidade**: Quantidade do produto na nota fiscal

## Produtos Especiais

Os seguintes códigos são automaticamente cadastrados como produtos especiais (só podem ter 1 unidade por carga):
- **6000**: AREIA MEDIA * CARRADA 5 METROS *
- **50080**: (produto que só pode ter 1 unidade por carga)
- **19500**: ARGAMASSA REBOCO * CARRADA 5 METROS *

**Regra:** Se uma nota fiscal tiver 10 unidades do código 6000, o sistema criará automaticamente 10 cargas (cada uma com 1 unidade).

## Como Importar

### 1. Preparar o Arquivo CSV

1. Abra seu arquivo PDF no Excel ou similar
2. Selecione as colunas: Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
3. Salve como CSV (separador: vírgula)

### 2. Executar o Script

```bash
cd backend
npm run importar-historico <caminho/do/arquivo.csv>
```

**Exemplo:**
```bash
npm run importar-historico historico_faturamentos.csv
```

### 3. Verificar Resultado

O script irá:
- ✅ Processar todas as linhas do CSV
- ✅ Cadastrar automaticamente as regras de produtos especiais (6000, 50080, 19500)
- ✅ Importar o histórico de desmembramentos reais
- ✅ Exibir um resumo da importação

## O Que o Sistema Faz com os Dados

### 1. Cadastro de Regras de Produtos Especiais

Os produtos especiais são automaticamente cadastrados com a regra de **1 unidade por carga**.

**Exemplo:**
- Se uma NF tiver 5 unidades do código 6000
- O sistema criará 5 cargas desmembradas
- Cada carga terá 1 unidade do código 6000

### 2. Aprendizado para Desmembramento Automático

O histórico importado é usado pelo sistema para:
- Sugerir número de cargas baseado em notas fiscais similares
- Identificar padrões de desmembramento
- Melhorar a distribuição de itens entre cargas

### 3. Validação de Desmembramentos

O histórico pode ser usado para validar se um desmembramento está seguindo os padrões históricos.

## Endpoints da API

### Listar Regras de Produtos Especiais

```http
GET /api/desmembramento/regras-produtos-especiais
```

**Resposta:**
```json
{
  "success": true,
  "regras": [
    {
      "id": "...",
      "codigoProduto": "6000",
      "descricaoProduto": "AREIA MEDIA * CARRADA 5 METROS *",
      "quantidadeMaximaPorCarga": 1,
      "observacoes": "Produto especial: só pode ter 1 unidade por carga"
    }
  ]
}
```

### Criar/Atualizar Regra

```http
POST /api/desmembramento/regras-produtos-especiais
Content-Type: application/json

{
  "codigoProduto": "6000",
  "descricaoProduto": "AREIA MEDIA * CARRADA 5 METROS *",
  "quantidadeMaximaPorCarga": 1,
  "observacoes": "Produto especial"
}
```

### Remover Regra

```http
DELETE /api/desmembramento/regras-produtos-especiais/:codigoProduto
```

### Consultar Histórico

```http
GET /api/desmembramento/historico-reais?numeroNotaFiscal=NF-123456&codigoProduto=6000
```

**Parâmetros:**
- `numeroNotaFiscal` (opcional): Filtrar por número da nota fiscal
- `codigoProduto` (opcional): Filtrar por código do produto
- `limit` (opcional, padrão: 100): Número de registros por página
- `offset` (opcional, padrão: 0): Número de registros a pular

## Exemplo Prático

### Arquivo CSV: `historico.csv`

```csv
Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,5
NF-123456,9675,CIMENTO VOTORAN 50KG TODAS OBRAS,UN,10
NF-123457,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,3
NF-123457,19500,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,2
```

### Comando:

```bash
npm run importar-historico historico.csv
```

### Resultado:

```
✅ 4 itens válidos processados
✅ 2 regras inseridas (6000, 19500)
📦 2 notas fiscais encontradas
✅ IMPORTAÇÃO CONCLUÍDA
   • 4 desmembramentos processados
   • 4 registros inseridos
```

### Desmembramento Automático:

Quando uma nota fiscal com 5 unidades do código 6000 for desmembrada:
- Sistema criará automaticamente **5 cargas**
- Cada carga terá **1 unidade** do código 6000
- Baseado na regra cadastrada automaticamente

## Observações Importantes

1. **Produtos Especiais**: Os códigos 6000, 50080 e 19500 são automaticamente cadastrados como produtos especiais
2. **CSV com Cabeçalho**: O script remove automaticamente a primeira linha se contiver "número" ou "numero"
3. **Validação**: O script valida:
   - Campos obrigatórios (NF, Código, Quantidade)
   - Quantidade deve ser um número positivo
   - Formato do CSV (5 colunas separadas por vírgula)

## Troubleshooting

### Erro: "Arquivo não encontrado"
- Verifique o caminho do arquivo CSV
- Use caminho absoluto ou relativo ao diretório `backend`

### Erro: "Formato inválido"
- Verifique se o CSV tem exatamente 5 colunas
- Certifique-se de que está usando vírgula como separador
- Remova espaços extras antes/depois dos valores

### Erro: "Quantidade inválida"
- Certifique-se de que a coluna "Quantidade" contém apenas números
- Verifique se não há caracteres especiais ou letras






Este guia explica como importar o histórico de faturamentos do PDF para o sistema, permitindo que o desmembramento automático aprenda com dados reais.

## Formato do Arquivo CSV

O arquivo CSV deve ter o seguinte formato:

```
Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,1
NF-123456,50080,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
NF-123456,19500,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
NF-123456,9675,CIMENTO VOTORAN 50KG TODAS OBRAS,UN,20
```

**Colunas:**
1. **Número da Nota Fiscal**: Número da nota fiscal (ex: NF-123456, V209675)
2. **Cód do Produto**: Código do produto (ex: 6000, 50080, 9675)
3. **Descrição**: Descrição do produto
4. **Un.**: Unidade de medida (ex: UN, CA, MT)
5. **Quantidade**: Quantidade do produto na nota fiscal

## Produtos Especiais

Os seguintes códigos são automaticamente cadastrados como produtos especiais (só podem ter 1 unidade por carga):
- **6000**: AREIA MEDIA * CARRADA 5 METROS *
- **50080**: (produto que só pode ter 1 unidade por carga)
- **19500**: ARGAMASSA REBOCO * CARRADA 5 METROS *

**Regra:** Se uma nota fiscal tiver 10 unidades do código 6000, o sistema criará automaticamente 10 cargas (cada uma com 1 unidade).

## Como Importar

### 1. Preparar o Arquivo CSV

1. Abra seu arquivo PDF no Excel ou similar
2. Selecione as colunas: Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
3. Salve como CSV (separador: vírgula)

### 2. Executar o Script

```bash
cd backend
npm run importar-historico <caminho/do/arquivo.csv>
```

**Exemplo:**
```bash
npm run importar-historico historico_faturamentos.csv
```

### 3. Verificar Resultado

O script irá:
- ✅ Processar todas as linhas do CSV
- ✅ Cadastrar automaticamente as regras de produtos especiais (6000, 50080, 19500)
- ✅ Importar o histórico de desmembramentos reais
- ✅ Exibir um resumo da importação

## O Que o Sistema Faz com os Dados

### 1. Cadastro de Regras de Produtos Especiais

Os produtos especiais são automaticamente cadastrados com a regra de **1 unidade por carga**.

**Exemplo:**
- Se uma NF tiver 5 unidades do código 6000
- O sistema criará 5 cargas desmembradas
- Cada carga terá 1 unidade do código 6000

### 2. Aprendizado para Desmembramento Automático

O histórico importado é usado pelo sistema para:
- Sugerir número de cargas baseado em notas fiscais similares
- Identificar padrões de desmembramento
- Melhorar a distribuição de itens entre cargas

### 3. Validação de Desmembramentos

O histórico pode ser usado para validar se um desmembramento está seguindo os padrões históricos.

## Endpoints da API

### Listar Regras de Produtos Especiais

```http
GET /api/desmembramento/regras-produtos-especiais
```

**Resposta:**
```json
{
  "success": true,
  "regras": [
    {
      "id": "...",
      "codigoProduto": "6000",
      "descricaoProduto": "AREIA MEDIA * CARRADA 5 METROS *",
      "quantidadeMaximaPorCarga": 1,
      "observacoes": "Produto especial: só pode ter 1 unidade por carga"
    }
  ]
}
```

### Criar/Atualizar Regra

```http
POST /api/desmembramento/regras-produtos-especiais
Content-Type: application/json

{
  "codigoProduto": "6000",
  "descricaoProduto": "AREIA MEDIA * CARRADA 5 METROS *",
  "quantidadeMaximaPorCarga": 1,
  "observacoes": "Produto especial"
}
```

### Remover Regra

```http
DELETE /api/desmembramento/regras-produtos-especiais/:codigoProduto
```

### Consultar Histórico

```http
GET /api/desmembramento/historico-reais?numeroNotaFiscal=NF-123456&codigoProduto=6000
```

**Parâmetros:**
- `numeroNotaFiscal` (opcional): Filtrar por número da nota fiscal
- `codigoProduto` (opcional): Filtrar por código do produto
- `limit` (opcional, padrão: 100): Número de registros por página
- `offset` (opcional, padrão: 0): Número de registros a pular

## Exemplo Prático

### Arquivo CSV: `historico.csv`

```csv
Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,5
NF-123456,9675,CIMENTO VOTORAN 50KG TODAS OBRAS,UN,10
NF-123457,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,3
NF-123457,19500,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,2
```

### Comando:

```bash
npm run importar-historico historico.csv
```

### Resultado:

```
✅ 4 itens válidos processados
✅ 2 regras inseridas (6000, 19500)
📦 2 notas fiscais encontradas
✅ IMPORTAÇÃO CONCLUÍDA
   • 4 desmembramentos processados
   • 4 registros inseridos
```

### Desmembramento Automático:

Quando uma nota fiscal com 5 unidades do código 6000 for desmembrada:
- Sistema criará automaticamente **5 cargas**
- Cada carga terá **1 unidade** do código 6000
- Baseado na regra cadastrada automaticamente

## Observações Importantes

1. **Produtos Especiais**: Os códigos 6000, 50080 e 19500 são automaticamente cadastrados como produtos especiais
2. **CSV com Cabeçalho**: O script remove automaticamente a primeira linha se contiver "número" ou "numero"
3. **Validação**: O script valida:
   - Campos obrigatórios (NF, Código, Quantidade)
   - Quantidade deve ser um número positivo
   - Formato do CSV (5 colunas separadas por vírgula)

## Troubleshooting

### Erro: "Arquivo não encontrado"
- Verifique o caminho do arquivo CSV
- Use caminho absoluto ou relativo ao diretório `backend`

### Erro: "Formato inválido"
- Verifique se o CSV tem exatamente 5 colunas
- Certifique-se de que está usando vírgula como separador
- Remova espaços extras antes/depois dos valores

### Erro: "Quantidade inválida"
- Certifique-se de que a coluna "Quantidade" contém apenas números
- Verifique se não há caracteres especiais ou letras






Este guia explica como importar o histórico de faturamentos do PDF para o sistema, permitindo que o desmembramento automático aprenda com dados reais.

## Formato do Arquivo CSV

O arquivo CSV deve ter o seguinte formato:

```
Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,1
NF-123456,50080,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
NF-123456,19500,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,1
NF-123456,9675,CIMENTO VOTORAN 50KG TODAS OBRAS,UN,20
```

**Colunas:**
1. **Número da Nota Fiscal**: Número da nota fiscal (ex: NF-123456, V209675)
2. **Cód do Produto**: Código do produto (ex: 6000, 50080, 9675)
3. **Descrição**: Descrição do produto
4. **Un.**: Unidade de medida (ex: UN, CA, MT)
5. **Quantidade**: Quantidade do produto na nota fiscal

## Produtos Especiais

Os seguintes códigos são automaticamente cadastrados como produtos especiais (só podem ter 1 unidade por carga):
- **6000**: AREIA MEDIA * CARRADA 5 METROS *
- **50080**: (produto que só pode ter 1 unidade por carga)
- **19500**: ARGAMASSA REBOCO * CARRADA 5 METROS *

**Regra:** Se uma nota fiscal tiver 10 unidades do código 6000, o sistema criará automaticamente 10 cargas (cada uma com 1 unidade).

## Como Importar

### 1. Preparar o Arquivo CSV

1. Abra seu arquivo PDF no Excel ou similar
2. Selecione as colunas: Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
3. Salve como CSV (separador: vírgula)

### 2. Executar o Script

```bash
cd backend
npm run importar-historico <caminho/do/arquivo.csv>
```

**Exemplo:**
```bash
npm run importar-historico historico_faturamentos.csv
```

### 3. Verificar Resultado

O script irá:
- ✅ Processar todas as linhas do CSV
- ✅ Cadastrar automaticamente as regras de produtos especiais (6000, 50080, 19500)
- ✅ Importar o histórico de desmembramentos reais
- ✅ Exibir um resumo da importação

## O Que o Sistema Faz com os Dados

### 1. Cadastro de Regras de Produtos Especiais

Os produtos especiais são automaticamente cadastrados com a regra de **1 unidade por carga**.

**Exemplo:**
- Se uma NF tiver 5 unidades do código 6000
- O sistema criará 5 cargas desmembradas
- Cada carga terá 1 unidade do código 6000

### 2. Aprendizado para Desmembramento Automático

O histórico importado é usado pelo sistema para:
- Sugerir número de cargas baseado em notas fiscais similares
- Identificar padrões de desmembramento
- Melhorar a distribuição de itens entre cargas

### 3. Validação de Desmembramentos

O histórico pode ser usado para validar se um desmembramento está seguindo os padrões históricos.

## Endpoints da API

### Listar Regras de Produtos Especiais

```http
GET /api/desmembramento/regras-produtos-especiais
```

**Resposta:**
```json
{
  "success": true,
  "regras": [
    {
      "id": "...",
      "codigoProduto": "6000",
      "descricaoProduto": "AREIA MEDIA * CARRADA 5 METROS *",
      "quantidadeMaximaPorCarga": 1,
      "observacoes": "Produto especial: só pode ter 1 unidade por carga"
    }
  ]
}
```

### Criar/Atualizar Regra

```http
POST /api/desmembramento/regras-produtos-especiais
Content-Type: application/json

{
  "codigoProduto": "6000",
  "descricaoProduto": "AREIA MEDIA * CARRADA 5 METROS *",
  "quantidadeMaximaPorCarga": 1,
  "observacoes": "Produto especial"
}
```

### Remover Regra

```http
DELETE /api/desmembramento/regras-produtos-especiais/:codigoProduto
```

### Consultar Histórico

```http
GET /api/desmembramento/historico-reais?numeroNotaFiscal=NF-123456&codigoProduto=6000
```

**Parâmetros:**
- `numeroNotaFiscal` (opcional): Filtrar por número da nota fiscal
- `codigoProduto` (opcional): Filtrar por código do produto
- `limit` (opcional, padrão: 100): Número de registros por página
- `offset` (opcional, padrão: 0): Número de registros a pular

## Exemplo Prático

### Arquivo CSV: `historico.csv`

```csv
Número da Nota Fiscal, Cód do Produto, Descrição, Un., Quantidade
NF-123456,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,5
NF-123456,9675,CIMENTO VOTORAN 50KG TODAS OBRAS,UN,10
NF-123457,6000,AREIA MEDIA * CARRADA 5 METROS *,CA,3
NF-123457,19500,ARGAMASSA REBOCO * CARRADA 5 METROS *,CA,2
```

### Comando:

```bash
npm run importar-historico historico.csv
```

### Resultado:

```
✅ 4 itens válidos processados
✅ 2 regras inseridas (6000, 19500)
📦 2 notas fiscais encontradas
✅ IMPORTAÇÃO CONCLUÍDA
   • 4 desmembramentos processados
   • 4 registros inseridos
```

### Desmembramento Automático:

Quando uma nota fiscal com 5 unidades do código 6000 for desmembrada:
- Sistema criará automaticamente **5 cargas**
- Cada carga terá **1 unidade** do código 6000
- Baseado na regra cadastrada automaticamente

## Observações Importantes

1. **Produtos Especiais**: Os códigos 6000, 50080 e 19500 são automaticamente cadastrados como produtos especiais
2. **CSV com Cabeçalho**: O script remove automaticamente a primeira linha se contiver "número" ou "numero"
3. **Validação**: O script valida:
   - Campos obrigatórios (NF, Código, Quantidade)
   - Quantidade deve ser um número positivo
   - Formato do CSV (5 colunas separadas por vírgula)

## Troubleshooting

### Erro: "Arquivo não encontrado"
- Verifique o caminho do arquivo CSV
- Use caminho absoluto ou relativo ao diretório `backend`

### Erro: "Formato inválido"
- Verifique se o CSV tem exatamente 5 colunas
- Certifique-se de que está usando vírgula como separador
- Remova espaços extras antes/depois dos valores

### Erro: "Quantidade inválida"
- Certifique-se de que a coluna "Quantidade" contém apenas números
- Verifique se não há caracteres especiais ou letras






