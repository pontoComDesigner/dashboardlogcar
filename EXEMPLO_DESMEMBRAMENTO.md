# Exemplo de Desmembramento Automático

## Produtos da Nota Fiscal

```
12599 - TABUA DE PINUS 10CMX3MT - 48 UN
12596 - TABUA DE PINUS 30CMX3MT - 36 UN
16505 - ESCORA 3 METROS EUCALIPTO - 20 UN
16243 - FERRO 3/8 10,0MM BARRA - 2 UN
28304 - PREGO CC 17X27 1KG A VANT - 20 UN
12501 - PREGO CC ACO 17X24 MARCAS - 2 UN
19500 - ARGAMASSA REBOCO 5METRO - 5 CA  ← PRODUTO ESPECIAL
9675 - CIMENT O VOTORAN 50KG TODAS - 14 UN
17704 - TIJOLOS 8 FUROS 11,5X19X19 - 1000 UN
```

## Como Funciona o Desmembramento

### 1. Produtos Especiais (19500)
- **Código:** 19500 - ARGAMASSA REBOCO 5METRO
- **Quantidade:** 5 CA
- **Regra:** Produto especial → **1 unidade por carga**
- **Resultado:** **5 cargas** (cada unidade vai para uma carga separada)

### 2. Produtos Normais (todos os outros)
Cada produto normal consulta o **histórico de faturamentos** para ver como foi desmembrado anteriormente:

#### Sem Histórico (padrão):
- Cada produto normal vai **sozinho em 1 carga** (toda quantidade junto)
- **Total de cargas normais:** 8 cargas (um para cada produto)
- **Total geral:** 5 (especiais) + 8 (normais) = **13 cargas**

#### Com Histórico (exemplo):
Suponha que o histórico mostre:
- **12599 (48 UN):** Média de 24 unidades por carga → 48 ÷ 24 = **2 cargas**
- **12596 (36 UN):** Média de 18 unidades por carga → 36 ÷ 18 = **2 cargas**
- **16505 (20 UN):** Média de 10 unidades por carga → 20 ÷ 10 = **2 cargas**
- **16243 (2 UN):** Sem histórico específico → **1 carga**
- **28304 (20 UN):** Média de 10 unidades por carga → 20 ÷ 10 = **2 cargas**
- **12501 (2 UN):** Sem histórico específico → **1 carga**
- **9675 (14 UN):** Média de 7 unidades por carga → 14 ÷ 7 = **2 cargas**
- **17704 (1000 UN):** Média de 250 unidades por carga → 1000 ÷ 250 = **4 cargas**

**Total de cargas normais:** 2 + 2 + 2 + 1 + 2 + 1 + 2 + 4 = **16 cargas**

**Total geral:** 5 (especiais) + 16 (normais) = **21 cargas**

## Distribuição Final (exemplo com histórico)

### Cargas para Produtos Especiais (5 cargas):
- **Carga 1:** 1x 19500
- **Carga 2:** 1x 19500
- **Carga 3:** 1x 19500
- **Carga 4:** 1x 19500
- **Carga 5:** 1x 19500

### Cargas para Produtos Normais (16 cargas):
- **Carga 6:** 24x 12599
- **Carga 7:** 24x 12599
- **Carga 8:** 18x 12596
- **Carga 9:** 18x 12596
- **Carga 10:** 10x 16505
- **Carga 11:** 10x 16505
- **Carga 12:** 2x 16243
- **Carga 13:** 10x 28304
- **Carga 14:** 10x 28304
- **Carga 15:** 2x 12501
- **Carga 16:** 7x 9675
- **Carga 17:** 7x 9675
- **Carga 18:** 250x 17704
- **Carga 19:** 250x 17704
- **Carga 20:** 250x 17704
- **Carga 21:** 250x 17704

## Importante

- O número exato de cargas **depende do histórico importado**
- Quanto mais histórico houver, mais preciso será o desmembramento
- Produtos especiais **sempre** geram 1 carga por unidade
- Produtos normais **sempre** consultam o histórico antes de desmembrar

