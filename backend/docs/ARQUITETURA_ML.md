# Arquitetura do Módulo de Machine Learning para Desmembramento

## 📋 Visão Geral

Este documento descreve a arquitetura do módulo de Inteligência Artificial (Machine Learning supervisionado) para sugerir automaticamente o desmembramento de notas fiscais em cargas, baseado em padrões históricos.

## 🎯 Objetivos

- **Reduzir tempo operacional** no processo de desmembramento
- **Minimizar erros humanos** através de sugestões inteligentes
- **Padronizar o processo** com base em padrões históricos
- **Manter controle humano** - sempre sugestão + validação

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  • Interface de desmembramento                              │
│  • Visualização de sugestões ML                             │
│  • Validação/ajuste manual                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/API
┌──────────────────────┴──────────────────────────────────────┐
│              BACKEND API (Node.js/Express)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Rotas de Desmembramento (existentes)                │  │
│  │  • POST /api/desmembramento/desmembrar               │  │
│  │  • POST /api/desmembramento/preview-automatico       │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────┴───────────────────────────────────────┐  │
│  │  Serviço de Desmembramento (modificado)              │  │
│  │  • Integração com ML Service                         │  │
│  │  • Fallback para regras fixas                        │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────┴───────────────────────────────────────┐  │
│  │  ML Service (NOVO)                                    │  │
│  │  • Extração de Features                              │  │
│  │  • Treinamento de Modelos                            │  │
│  │  • Predição de Desmembramentos                       │  │
│  │  • Gerenciamento de Modelos                          │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────┴───────────────────────────────────────┐  │
│  │  Feature Engineering Service (NOVO)                   │  │
│  │  • Extração de features do histórico                 │  │
│  │  • Normalização de dados                             │  │
│  │  • Preparação de dataset                             │  │
│  └──────────────┬───────────────────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│              BANCO DE DADOS (SQLite)                        │
│  • historico_desmembramentos_reais (já existe)             │
│  • ml_training_data (NOVO)                                  │
│  • ml_models (NOVO)                                         │
│  • ml_predictions (NOVO)                                    │
│  • ml_audit_log (NOVO)                                      │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Modelo de Dados

### Tabela: `ml_training_data`

Armazena dados preparados para treinamento (features + labels).

```sql
CREATE TABLE IF NOT EXISTS ml_training_data (
  id TEXT PRIMARY KEY,
  numeroNotaFiscal TEXT NOT NULL,
  
  -- FEATURES (entradas do modelo)
  totalItens INTEGER,
  totalProdutosUnicos INTEGER,
  pesoTotal REAL,
  volumeTotal REAL,
  valorTotal REAL,
  temProdutosEspeciais INTEGER, -- 0 ou 1
  quantidadeProdutosEspeciais INTEGER,
  listaCodigosProdutos TEXT, -- JSON array
  listaQuantidades TEXT, -- JSON array
  listaValores TEXT, -- JSON array
  
  -- LABELS (saídas esperadas)
  numeroCargas INTEGER, -- quantidade de cargas
  distribuicaoCargas TEXT, -- JSON: [{carga: 1, produtos: [...], quantidades: [...]}, ...]
  
  -- METADADOS
  metodoOrigem TEXT, -- 'HISTORICO', 'MANUAL', 'AUTOMATICO'
  confiancaOrigem REAL, -- 0.0 a 1.0
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  processedAt TEXT,
  usedInTraining INTEGER DEFAULT 0
);
```

### Tabela: `ml_models`

Gerencia versões de modelos treinados.

```sql
CREATE TABLE IF NOT EXISTS ml_models (
  id TEXT PRIMARY KEY,
  versao TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  algoritmo TEXT NOT NULL, -- 'RANDOM_FOREST', 'GRADIENT_BOOSTING', etc.
  parametros TEXT, -- JSON com hiperparâmetros
  metricas TEXT, -- JSON com métricas de avaliação
  arquivoModelo TEXT, -- caminho para arquivo do modelo (pickle/JSON)
  status TEXT, -- 'TREINANDO', 'ATIVO', 'INATIVO', 'ERRO'
  accuracy REAL,
  precision REAL,
  recall REAL,
  f1Score REAL,
  trainedAt TEXT,
  trainedBy TEXT,
  observacoes TEXT
);
```

### Tabela: `ml_predictions`

Registra todas as predições feitas pelo modelo.

```sql
CREATE TABLE IF NOT EXISTS ml_predictions (
  id TEXT PRIMARY KEY,
  notaFiscalId TEXT NOT NULL,
  modeloVersao TEXT,
  
  -- INPUT
  features TEXT, -- JSON com features utilizadas
  
  -- OUTPUT (predição)
  numeroCargasSugerido INTEGER,
  distribuicaoSugerida TEXT, -- JSON com distribuição sugerida
  confianca REAL, -- 0.0 a 1.0
  
  -- RESULTADO FINAL
  aceito INTEGER DEFAULT 0, -- 0 = não aceito, 1 = aceito
  distribuicaoFinal TEXT, -- JSON com distribuição final (aceita ou ajustada)
  ajustadoManualmente INTEGER DEFAULT 0,
  
  -- METADADOS
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  usadoParaTreinar INTEGER DEFAULT 0
);
```

### Tabela: `ml_audit_log`

Auditoria completa do módulo ML.

```sql
CREATE TABLE IF NOT EXISTS ml_audit_log (
  id TEXT PRIMARY KEY,
  acao TEXT NOT NULL, -- 'TREINAMENTO_INICIADO', 'PREDICAO_FEITA', 'MODELO_ATIVADO', etc.
  usuarioId TEXT,
  usuarioNome TEXT,
  detalhes TEXT, -- JSON com detalhes da ação
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 🔬 Algoritmos Recomendados

### 1. **Random Forest Regressor/Classifier** (Recomendado para início)

**Vantagens:**
- Lida bem com features categóricas e numéricas
- Não requer normalização extensiva
- Boa interpretabilidade
- Menor tendência ao overfitting
- Rápido para treinar

**Uso:**
- **Tarefa 1**: Prever número de cargas (Regressor)
- **Tarefa 2**: Prever distribuição de produtos (Classification ou Clustering)

### 2. **Gradient Boosting (XGBoost/LightGBM)**

**Vantagens:**
- Alta performance
- Boa com datasets pequenos/médios
- Permite feature importance

**Desvantagens:**
- Mais complexo
- Pode overfitting se não ajustado

### 3. **Clustering (K-Means ou DBSCAN)**

**Uso:**
- Agrupar produtos similares que costumam ir juntos
- Identificar padrões de combinação de produtos

### 4. **Híbrido (Recomendado)**

**Abordagem em 2 estágios:**

1. **Estágio 1**: Random Forest para prever **número de cargas**
2. **Estágio 2**: 
   - Se número de cargas = 1: toda NF em 1 carga
   - Se número de cargas > 1:
     - Aplicar regras fixas para produtos especiais
     - Usar clustering/heurística para distribuir produtos normais

## 📈 Features (Entradas do Modelo)

### Features Numéricas

```javascript
{
  // Métricas da NF
  totalItens: 25,
  totalProdutosUnicos: 8,
  pesoTotal: 15000.5,
  volumeTotal: 45.2,
  valorTotal: 125000.75,
  
  // Produtos especiais
  temProdutosEspeciais: 1, // 0 ou 1
  quantidadeProdutosEspeciais: 5,
  percentualProdutosEspeciais: 0.2, // 20%
  
  // Distribuições
  mediaQuantidadePorItem: 3.125,
  desvioPadraoQuantidades: 2.5,
  mediaValorPorItem: 5000.03,
  
  // Padrões do histórico
  frequenciaMediaProdutos: 15.2, // média de vezes que esses produtos aparecem juntos
  similaridadeComHistorico: 0.85 // 0.0 a 1.0
}
```

### Features Categóricas (One-Hot Encoded)

```javascript
{
  // Combinação de códigos de produtos (top 20 mais frequentes)
  temProduto6000: 1,
  temProduto50080: 1,
  temProduto19500: 0,
  temProduto9675: 1,
  // ... outros produtos mais frequentes
  
  // Categorias de produtos (se houver)
  categoriaDominante: 'CONSTRUCAO',
  
  // Faixas (binning)
  faixaPeso: 'MEDIO', // BAIXO, MEDIO, ALTO
  faixaVolume: 'MEDIO',
  faixaValor: 'ALTO'
}
```

### Features de Sequência (Embedding/TF-IDF)

```javascript
{
  // Vetor de códigos de produtos (bag of codes)
  vetorCodigosProdutos: [6000, 50080, 9675, 17704, ...],
  
  // Frequência de combinações (n-grams de produtos)
  combinacaoFrequente: '6000-9675' // produtos que costumam aparecer juntos
}
```

## 🎯 Labels (Saídas do Modelo)

### Label Principal: Número de Cargas

```javascript
numeroCargas: 5 // número inteiro
```

### Label Secundária: Distribuição de Produtos (Opcional, mais complexo)

```javascript
distribuicaoCargas: [
  {
    carga: 1,
    produtos: ['6000'],
    quantidades: [1],
    pesoTotal: 5000,
    volumeTotal: 5
  },
  {
    carga: 2,
    produtos: ['9675', '17704'],
    quantidades: [14, 1000],
    pesoTotal: 3500,
    volumeTotal: 8
  },
  // ...
]
```

**Nota**: Inicialmente, focar apenas em prever **número de cargas**. A distribuição pode ser feita pelas regras existentes após saber o número de cargas.

## 🔄 Fluxo de Integração

### 1. Fluxo de Predição (Sugestão)

```
┌─────────────────┐
│  Nova NF        │
│  (Pendente)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Frontend: Solicita         │
│  desmembramento             │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  API: POST /api/            │
│  desmembramento/            │
│  preview-automatico         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Serviço de Desmembramento  │
│  1. Extrai features da NF   │
│  2. Chama ML Service        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  ML Service                 │
│  1. Carrega modelo ativo    │
│  2. Faz predição            │
│  3. Calcula confiança       │
│  4. Retorna sugestão        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Decisão de Fallback        │
│  • Se confiança < 0.6:      │
│    → Usar regras fixas      │
│  • Se confiança >= 0.6:     │
│    → Usar sugestão ML       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Distribui itens (regras    │
│  existentes)                │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Retorna preview para       │
│  validação humana           │
└─────────────────────────────┘
```

### 2. Fluxo de Treinamento

```
┌─────────────────────────────┐
│  Trigger: Re-treinamento    │
│  (manual ou agendado)       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Feature Engineering        │
│  1. Busca histórico         │
│  2. Extrai features         │
│  3. Prepara dataset         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  ML Service: Treinamento    │
│  1. Divide dataset          │
│     (train/validation/test) │
│  2. Treina modelo           │
│  3. Avalia métricas         │
│  4. Salva modelo            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Validação Manual           │
│  (opcional)                 │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Ativação do Modelo         │
│  (marca como ATIVO)         │
└─────────────────────────────┘
```

### 3. Fluxo de Aprendizado Contínuo

```
┌─────────────────────────────┐
│  Usuário aceita/ajusta      │
│  desmembramento             │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Sistema armazena:          │
│  • Predição original        │
│  • Distribuição final       │
│  • Flag: ajustado?          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Processo Agendado:         │
│  (ex: semanal)              │
│  1. Coleta ajustes          │
│  2. Adiciona ao dataset     │
│  3. Re-treina modelo        │
└─────────────────────────────┘
```

## 🔌 APIs do Módulo ML

### 1. Predição

```http
POST /api/ml/predict
Content-Type: application/json
Authorization: Bearer <token>

{
  "notaFiscalId": "uuid-da-nota",
  "incluirDistribuicao": false
}

Response:
{
  "success": true,
  "predicao": {
    "numeroCargasSugerido": 5,
    "confianca": 0.87,
    "modeloVersao": "v1.2.0",
    "distribuicaoSugerida": null, // opcional
    "features": {...}
  }
}
```

### 2. Treinamento

```http
POST /api/ml/train
Content-Type: application/json
Authorization: Bearer <token> (ADMIN)

{
  "algoritmo": "RANDOM_FOREST",
  "parametros": {
    "n_estimators": 100,
    "max_depth": 10
  },
  "testSize": 0.2
}

Response:
{
  "success": true,
  "modelo": {
    "id": "uuid",
    "versao": "v1.3.0",
    "status": "TREINANDO",
    "metricas": {
      "accuracy": 0.92,
      "precision": 0.89,
      "recall": 0.91,
      "f1Score": 0.90
    }
  }
}
```

### 3. Listar Modelos

```http
GET /api/ml/models
Authorization: Bearer <token>

Response:
{
  "success": true,
  "modelos": [
    {
      "id": "uuid",
      "versao": "v1.2.0",
      "status": "ATIVO",
      "accuracy": 0.92,
      "trainedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 4. Ativar Modelo

```http
POST /api/ml/models/:modelId/activate
Authorization: Bearer <token> (ADMIN)

Response:
{
  "success": true,
  "message": "Modelo ativado com sucesso"
}
```

## 🛡️ Fallback e Validação

### Estratégia de Fallback

```javascript
async function sugerirDesmembramento(notaFiscal) {
  // 1. Tentar ML primeiro
  try {
    const predicaoML = await mlService.predict(notaFiscal);
    
    if (predicaoML.confianca >= 0.6) {
      // Usar sugestão ML
      return {
        metodo: 'ML',
        numeroCargas: predicaoML.numeroCargasSugerido,
        confianca: predicaoML.confianca,
        distribuicao: await distribuirComRegras(notaFiscal, predicaoML.numeroCargasSugerido)
      };
    }
  } catch (error) {
    logger.warn('Erro na predição ML, usando fallback', error);
  }
  
  // 2. Fallback: Regras existentes
  return {
    metodo: 'REGRAS_FIXAS',
    numeroCargas: await calcularNumeroCargasPorProdutosEspeciais(notaFiscal.itens),
    confianca: 1.0, // regras são determinísticas
    distribuicao: await distribuirItensEntreCargas(notaFiscal.itens, numeroCargas)
  };
}
```

## 📝 Logging e Auditoria

Todas as ações do módulo ML devem ser registradas:

- **Predições feitas**: timestamp, features, predição, confianca
- **Aceitação/rejeição**: se usuário aceitou ou ajustou
- **Treinamentos**: quando, por quem, métricas
- **Ativação de modelos**: qual modelo foi ativado

## 🚀 Fases de Implementação

### Fase 1: Infraestrutura Base (Semana 1-2)
- [x] Criar tabelas de dados
- [ ] Implementar Feature Engineering Service
- [ ] Criar estrutura básica do ML Service
- [ ] APIs básicas (predição e listagem)

### Fase 2: Modelo Inicial (Semana 3-4)
- [ ] Treinar modelo baseline (Random Forest)
- [ ] Integração com serviço de desmembramento
- [ ] Sistema de fallback
- [ ] Testes com dados reais

### Fase 3: Melhorias e Otimização (Semana 5-6)
- [ ] Feature engineering avançado
- [ ] Teste de diferentes algoritmos
- [ ] Sistema de re-treinamento
- [ ] Dashboard de métricas

### Fase 4: Produção (Semana 7-8)
- [ ] Validação completa
- [ ] Documentação
- [ ] Treinamento de usuários
- [ ] Monitoramento contínuo

## 📚 Bibliotecas Recomendadas

### Python (se optar por serviço separado)
- `scikit-learn`: Algoritmos ML
- `pandas`: Manipulação de dados
- `numpy`: Cálculos numéricos
- `joblib`: Serialização de modelos

### Node.js (implementação em JS)
- `@tensorflow/tfjs-node`: TensorFlow.js (alternativa)
- `ml-matrix`: Operações matriciais
- `ml-random-forest`: Random Forest (se disponível)
- **OU**: Chamar serviço Python via API/processo

### Recomendação

Para este caso, recomendo:
1. **Início**: Implementar em Node.js com biblioteca simples (se disponível)
2. **Evolução**: Se necessário mais complexidade, criar microserviço Python

## ⚠️ Considerações Importantes

1. **Sempre manter regras fixas como fallback**
2. **Nunca substituir decisão humana** - apenas sugerir
3. **Logging completo** para auditoria e aprendizado
4. **Validação de dados** antes de treinar
5. **Testes A/B** para comparar performance
6. **Monitoramento contínuo** de métricas em produção

