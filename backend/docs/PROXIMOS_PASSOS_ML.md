# Próximos Passos - Módulo ML

## 🎯 Objetivo Final
Ter um módulo ML totalmente funcional que:
- Treina modelos com dados históricos
- Faz predições com boa confiança
- Aprende continuamente com novos dados
- Reduz tempo operacional no desmembramento

## 📋 Plano de Ação (Ordem de Execução)

### Fase 1: Preparação e Infraestrutura ✅ (COMPLETO)
- [x] Estrutura de dados
- [x] Serviços base
- [x] APIs
- [x] Integração

### Fase 2: Preparar Dados de Treinamento (PRÓXIMO)

#### Passo 1: Criar Tabelas ML
```bash
cd backend
npm run criar-tabelas-ml
```

#### Passo 2: Preparar Dados do Histórico
**Objetivo**: Popular `ml_training_data` com dados do histórico existente

**Script a criar**: `backend/scripts/preparar-dados-treinamento-ml.js`

**O que fazer**:
1. Ler dados de `historico_desmembramentos_reais`
2. Agrupar por `numeroNotaFiscal`
3. Para cada NF do histórico:
   - Extrair features usando `mlFeatureEngineeringService`
   - Calcular label (número de cargas reais)
   - Inserir em `ml_training_data`

**Resultado esperado**:
- Tabela `ml_training_data` populada
- Dados prontos para treinamento
- Pelo menos 50-100 registros (quanto mais, melhor)

### Fase 3: Treinamento Básico

#### Opção A: Modelo Heurístico Melhorado (RECOMENDADO para início)
**Por quê**: 
- Rápido de implementar
- Não requer bibliotecas ML complexas
- Funciona bem com poucos dados
- Pode ser melhorado incrementalmente

**O que fazer**:
1. Criar função de treinamento heurístico
2. Calcular padrões dos dados de treinamento:
   - Média de cargas por faixa de peso
   - Média de cargas por faixa de volume
   - Média de cargas por quantidade de produtos especiais
   - Correlações entre features e número de cargas
3. Salvar padrões como "modelo" na tabela `ml_models`
4. Usar padrões para melhorar predição heurística

**Endpoint**: `POST /api/ml/train` (heurístico)

#### Opção B: Modelo ML Real (Quando tiver 100+ registros)
**Biblioteca recomendada**: 
- Python: scikit-learn (microserviço) OU
- Node.js: @tensorflow/tfjs-node (mais simples)

**Algoritmo**: Random Forest Regressor

**O que fazer**:
1. Implementar treinamento real
2. Dividir dados (80% train, 20% test)
3. Treinar modelo
4. Avaliar métricas (MAE, RMSE, R²)
5. Salvar modelo
6. Ativar modelo

### Fase 4: Melhorias e Otimização

#### Passo 1: Sistema de Re-treinamento
- Agendamento automático (ex: semanal)
- Detectar quando há novos dados suficientes
- Re-treinar automaticamente

#### Passo 2: Aprendizado Contínuo
- Quando usuário aceita/ajusta predição
- Adicionar ao dataset de treinamento
- Re-treinar periodicamente

#### Passo 3: Dashboard de Métricas (Opcional)
- Interface para ver:
  - Taxa de aceitação
  - Performance do modelo
  - Predições recentes
  - Gráficos de evolução

## 🚀 Ação Imediata (Hoje)

### 1. Criar Tabelas
```bash
cd backend
npm run criar-tabelas-ml
```

### 2. Criar Script de Preparação de Dados
Criar `backend/scripts/preparar-dados-treinamento-ml.js` que:
- Busca histórico de desmembramentos reais
- Agrupa por nota fiscal
- Extrai features
- Calcula labels (número de cargas)
- Insere em `ml_training_data`

### 3. Executar Preparação
```bash
npm run preparar-dados-ml
```

### 4. Verificar Dados
- Quantos registros foram criados?
- Features estão corretas?
- Labels fazem sentido?

### 5. Implementar Treinamento Básico
- Modelo heurístico melhorado
- Ou modelo ML simples (se tiver dados suficientes)

## 📊 Critérios de Sucesso

### Mínimo Viável (MVP)
- ✅ Tabelas criadas
- ✅ Dados de treinamento preparados
- ✅ Predição funciona (mesmo que heurística)
- ✅ Sistema registra predições

### Versão 1.0
- ✅ Modelo treinado com dados históricos
- ✅ Predição melhor que regras fixas sozinhas
- ✅ Taxa de aceitação > 70%
- ✅ Sistema de re-treinamento básico

### Versão 2.0
- ✅ Aprendizado contínuo
- ✅ Dashboard de métricas
- ✅ Re-treinamento automático
- ✅ Múltiplos modelos (A/B testing)

## ⚠️ Pontos de Atenção

1. **Quantidade de Dados**
   - Mínimo recomendado: 50 registros
   - Ideal: 200+ registros
   - Se tiver poucos dados, começar com heurística melhorada

2. **Qualidade dos Dados**
   - Verificar se histórico está correto
   - Remover outliers se necessário
   - Validar labels (número de cargas real)

3. **Validação**
   - Sempre testar predições antes de ativar modelo
   - Comparar com regras fixas
   - Monitorar taxa de aceitação

4. **Fallback**
   - Sempre manter fallback para regras fixas
   - Nunca confiar 100% no ML
   - Validação humana sempre necessária

## 📝 Checklist Próximos Passos

- [ ] **Passo 1**: Executar `npm run criar-tabelas-ml`
- [ ] **Passo 2**: Criar script `preparar-dados-treinamento-ml.js`
- [ ] **Passo 3**: Executar preparação de dados
- [ ] **Passo 4**: Verificar quantidade de dados preparados
- [ ] **Passo 5**: Decidir: Heurística melhorada OU Modelo ML real
- [ ] **Passo 6**: Implementar treinamento escolhido
- [ ] **Passo 7**: Treinar primeiro modelo
- [ ] **Passo 8**: Ativar modelo
- [ ] **Passo 9**: Testar predições em produção
- [ ] **Passo 10**: Monitorar taxa de aceitação
- [ ] **Passo 11**: Ajustar e melhorar

## 🔄 Ciclo de Melhoria Contínua

```
1. Coletar dados históricos
   ↓
2. Preparar dados de treinamento
   ↓
3. Treinar modelo
   ↓
4. Ativar modelo
   ↓
5. Monitorar performance
   ↓
6. Coletar feedback (aceitações/rejeições)
   ↓
7. Adicionar feedback ao dataset
   ↓
8. Re-treinar periodicamente
   ↓
(volta ao passo 3)
```

## 💡 Recomendação

**Começar com Opção A (Heurística Melhorada)** porque:
1. Mais rápido de implementar
2. Funciona bem com poucos dados
3. Mais interpretável
4. Pode evoluir para ML real depois
5. Menor risco

**Quando evoluir para ML real**:
- Quando tiver 100+ registros no histórico
- Quando heurística não for suficiente
- Quando quiser melhor performance


## 🎯 Objetivo Final
Ter um módulo ML totalmente funcional que:
- Treina modelos com dados históricos
- Faz predições com boa confiança
- Aprende continuamente com novos dados
- Reduz tempo operacional no desmembramento

## 📋 Plano de Ação (Ordem de Execução)

### Fase 1: Preparação e Infraestrutura ✅ (COMPLETO)
- [x] Estrutura de dados
- [x] Serviços base
- [x] APIs
- [x] Integração

### Fase 2: Preparar Dados de Treinamento (PRÓXIMO)

#### Passo 1: Criar Tabelas ML
```bash
cd backend
npm run criar-tabelas-ml
```

#### Passo 2: Preparar Dados do Histórico
**Objetivo**: Popular `ml_training_data` com dados do histórico existente

**Script a criar**: `backend/scripts/preparar-dados-treinamento-ml.js`

**O que fazer**:
1. Ler dados de `historico_desmembramentos_reais`
2. Agrupar por `numeroNotaFiscal`
3. Para cada NF do histórico:
   - Extrair features usando `mlFeatureEngineeringService`
   - Calcular label (número de cargas reais)
   - Inserir em `ml_training_data`

**Resultado esperado**:
- Tabela `ml_training_data` populada
- Dados prontos para treinamento
- Pelo menos 50-100 registros (quanto mais, melhor)

### Fase 3: Treinamento Básico

#### Opção A: Modelo Heurístico Melhorado (RECOMENDADO para início)
**Por quê**: 
- Rápido de implementar
- Não requer bibliotecas ML complexas
- Funciona bem com poucos dados
- Pode ser melhorado incrementalmente

**O que fazer**:
1. Criar função de treinamento heurístico
2. Calcular padrões dos dados de treinamento:
   - Média de cargas por faixa de peso
   - Média de cargas por faixa de volume
   - Média de cargas por quantidade de produtos especiais
   - Correlações entre features e número de cargas
3. Salvar padrões como "modelo" na tabela `ml_models`
4. Usar padrões para melhorar predição heurística

**Endpoint**: `POST /api/ml/train` (heurístico)

#### Opção B: Modelo ML Real (Quando tiver 100+ registros)
**Biblioteca recomendada**: 
- Python: scikit-learn (microserviço) OU
- Node.js: @tensorflow/tfjs-node (mais simples)

**Algoritmo**: Random Forest Regressor

**O que fazer**:
1. Implementar treinamento real
2. Dividir dados (80% train, 20% test)
3. Treinar modelo
4. Avaliar métricas (MAE, RMSE, R²)
5. Salvar modelo
6. Ativar modelo

### Fase 4: Melhorias e Otimização

#### Passo 1: Sistema de Re-treinamento
- Agendamento automático (ex: semanal)
- Detectar quando há novos dados suficientes
- Re-treinar automaticamente

#### Passo 2: Aprendizado Contínuo
- Quando usuário aceita/ajusta predição
- Adicionar ao dataset de treinamento
- Re-treinar periodicamente

#### Passo 3: Dashboard de Métricas (Opcional)
- Interface para ver:
  - Taxa de aceitação
  - Performance do modelo
  - Predições recentes
  - Gráficos de evolução

## 🚀 Ação Imediata (Hoje)

### 1. Criar Tabelas
```bash
cd backend
npm run criar-tabelas-ml
```

### 2. Criar Script de Preparação de Dados
Criar `backend/scripts/preparar-dados-treinamento-ml.js` que:
- Busca histórico de desmembramentos reais
- Agrupa por nota fiscal
- Extrai features
- Calcula labels (número de cargas)
- Insere em `ml_training_data`

### 3. Executar Preparação
```bash
npm run preparar-dados-ml
```

### 4. Verificar Dados
- Quantos registros foram criados?
- Features estão corretas?
- Labels fazem sentido?

### 5. Implementar Treinamento Básico
- Modelo heurístico melhorado
- Ou modelo ML simples (se tiver dados suficientes)

## 📊 Critérios de Sucesso

### Mínimo Viável (MVP)
- ✅ Tabelas criadas
- ✅ Dados de treinamento preparados
- ✅ Predição funciona (mesmo que heurística)
- ✅ Sistema registra predições

### Versão 1.0
- ✅ Modelo treinado com dados históricos
- ✅ Predição melhor que regras fixas sozinhas
- ✅ Taxa de aceitação > 70%
- ✅ Sistema de re-treinamento básico

### Versão 2.0
- ✅ Aprendizado contínuo
- ✅ Dashboard de métricas
- ✅ Re-treinamento automático
- ✅ Múltiplos modelos (A/B testing)

## ⚠️ Pontos de Atenção

1. **Quantidade de Dados**
   - Mínimo recomendado: 50 registros
   - Ideal: 200+ registros
   - Se tiver poucos dados, começar com heurística melhorada

2. **Qualidade dos Dados**
   - Verificar se histórico está correto
   - Remover outliers se necessário
   - Validar labels (número de cargas real)

3. **Validação**
   - Sempre testar predições antes de ativar modelo
   - Comparar com regras fixas
   - Monitorar taxa de aceitação

4. **Fallback**
   - Sempre manter fallback para regras fixas
   - Nunca confiar 100% no ML
   - Validação humana sempre necessária

## 📝 Checklist Próximos Passos

- [ ] **Passo 1**: Executar `npm run criar-tabelas-ml`
- [ ] **Passo 2**: Criar script `preparar-dados-treinamento-ml.js`
- [ ] **Passo 3**: Executar preparação de dados
- [ ] **Passo 4**: Verificar quantidade de dados preparados
- [ ] **Passo 5**: Decidir: Heurística melhorada OU Modelo ML real
- [ ] **Passo 6**: Implementar treinamento escolhido
- [ ] **Passo 7**: Treinar primeiro modelo
- [ ] **Passo 8**: Ativar modelo
- [ ] **Passo 9**: Testar predições em produção
- [ ] **Passo 10**: Monitorar taxa de aceitação
- [ ] **Passo 11**: Ajustar e melhorar

## 🔄 Ciclo de Melhoria Contínua

```
1. Coletar dados históricos
   ↓
2. Preparar dados de treinamento
   ↓
3. Treinar modelo
   ↓
4. Ativar modelo
   ↓
5. Monitorar performance
   ↓
6. Coletar feedback (aceitações/rejeições)
   ↓
7. Adicionar feedback ao dataset
   ↓
8. Re-treinar periodicamente
   ↓
(volta ao passo 3)
```

## 💡 Recomendação

**Começar com Opção A (Heurística Melhorada)** porque:
1. Mais rápido de implementar
2. Funciona bem com poucos dados
3. Mais interpretável
4. Pode evoluir para ML real depois
5. Menor risco

**Quando evoluir para ML real**:
- Quando tiver 100+ registros no histórico
- Quando heurística não for suficiente
- Quando quiser melhor performance


## 🎯 Objetivo Final
Ter um módulo ML totalmente funcional que:
- Treina modelos com dados históricos
- Faz predições com boa confiança
- Aprende continuamente com novos dados
- Reduz tempo operacional no desmembramento

## 📋 Plano de Ação (Ordem de Execução)

### Fase 1: Preparação e Infraestrutura ✅ (COMPLETO)
- [x] Estrutura de dados
- [x] Serviços base
- [x] APIs
- [x] Integração

### Fase 2: Preparar Dados de Treinamento (PRÓXIMO)

#### Passo 1: Criar Tabelas ML
```bash
cd backend
npm run criar-tabelas-ml
```

#### Passo 2: Preparar Dados do Histórico
**Objetivo**: Popular `ml_training_data` com dados do histórico existente

**Script a criar**: `backend/scripts/preparar-dados-treinamento-ml.js`

**O que fazer**:
1. Ler dados de `historico_desmembramentos_reais`
2. Agrupar por `numeroNotaFiscal`
3. Para cada NF do histórico:
   - Extrair features usando `mlFeatureEngineeringService`
   - Calcular label (número de cargas reais)
   - Inserir em `ml_training_data`

**Resultado esperado**:
- Tabela `ml_training_data` populada
- Dados prontos para treinamento
- Pelo menos 50-100 registros (quanto mais, melhor)

### Fase 3: Treinamento Básico

#### Opção A: Modelo Heurístico Melhorado (RECOMENDADO para início)
**Por quê**: 
- Rápido de implementar
- Não requer bibliotecas ML complexas
- Funciona bem com poucos dados
- Pode ser melhorado incrementalmente

**O que fazer**:
1. Criar função de treinamento heurístico
2. Calcular padrões dos dados de treinamento:
   - Média de cargas por faixa de peso
   - Média de cargas por faixa de volume
   - Média de cargas por quantidade de produtos especiais
   - Correlações entre features e número de cargas
3. Salvar padrões como "modelo" na tabela `ml_models`
4. Usar padrões para melhorar predição heurística

**Endpoint**: `POST /api/ml/train` (heurístico)

#### Opção B: Modelo ML Real (Quando tiver 100+ registros)
**Biblioteca recomendada**: 
- Python: scikit-learn (microserviço) OU
- Node.js: @tensorflow/tfjs-node (mais simples)

**Algoritmo**: Random Forest Regressor

**O que fazer**:
1. Implementar treinamento real
2. Dividir dados (80% train, 20% test)
3. Treinar modelo
4. Avaliar métricas (MAE, RMSE, R²)
5. Salvar modelo
6. Ativar modelo

### Fase 4: Melhorias e Otimização

#### Passo 1: Sistema de Re-treinamento
- Agendamento automático (ex: semanal)
- Detectar quando há novos dados suficientes
- Re-treinar automaticamente

#### Passo 2: Aprendizado Contínuo
- Quando usuário aceita/ajusta predição
- Adicionar ao dataset de treinamento
- Re-treinar periodicamente

#### Passo 3: Dashboard de Métricas (Opcional)
- Interface para ver:
  - Taxa de aceitação
  - Performance do modelo
  - Predições recentes
  - Gráficos de evolução

## 🚀 Ação Imediata (Hoje)

### 1. Criar Tabelas
```bash
cd backend
npm run criar-tabelas-ml
```

### 2. Criar Script de Preparação de Dados
Criar `backend/scripts/preparar-dados-treinamento-ml.js` que:
- Busca histórico de desmembramentos reais
- Agrupa por nota fiscal
- Extrai features
- Calcula labels (número de cargas)
- Insere em `ml_training_data`

### 3. Executar Preparação
```bash
npm run preparar-dados-ml
```

### 4. Verificar Dados
- Quantos registros foram criados?
- Features estão corretas?
- Labels fazem sentido?

### 5. Implementar Treinamento Básico
- Modelo heurístico melhorado
- Ou modelo ML simples (se tiver dados suficientes)

## 📊 Critérios de Sucesso

### Mínimo Viável (MVP)
- ✅ Tabelas criadas
- ✅ Dados de treinamento preparados
- ✅ Predição funciona (mesmo que heurística)
- ✅ Sistema registra predições

### Versão 1.0
- ✅ Modelo treinado com dados históricos
- ✅ Predição melhor que regras fixas sozinhas
- ✅ Taxa de aceitação > 70%
- ✅ Sistema de re-treinamento básico

### Versão 2.0
- ✅ Aprendizado contínuo
- ✅ Dashboard de métricas
- ✅ Re-treinamento automático
- ✅ Múltiplos modelos (A/B testing)

## ⚠️ Pontos de Atenção

1. **Quantidade de Dados**
   - Mínimo recomendado: 50 registros
   - Ideal: 200+ registros
   - Se tiver poucos dados, começar com heurística melhorada

2. **Qualidade dos Dados**
   - Verificar se histórico está correto
   - Remover outliers se necessário
   - Validar labels (número de cargas real)

3. **Validação**
   - Sempre testar predições antes de ativar modelo
   - Comparar com regras fixas
   - Monitorar taxa de aceitação

4. **Fallback**
   - Sempre manter fallback para regras fixas
   - Nunca confiar 100% no ML
   - Validação humana sempre necessária

## 📝 Checklist Próximos Passos

- [ ] **Passo 1**: Executar `npm run criar-tabelas-ml`
- [ ] **Passo 2**: Criar script `preparar-dados-treinamento-ml.js`
- [ ] **Passo 3**: Executar preparação de dados
- [ ] **Passo 4**: Verificar quantidade de dados preparados
- [ ] **Passo 5**: Decidir: Heurística melhorada OU Modelo ML real
- [ ] **Passo 6**: Implementar treinamento escolhido
- [ ] **Passo 7**: Treinar primeiro modelo
- [ ] **Passo 8**: Ativar modelo
- [ ] **Passo 9**: Testar predições em produção
- [ ] **Passo 10**: Monitorar taxa de aceitação
- [ ] **Passo 11**: Ajustar e melhorar

## 🔄 Ciclo de Melhoria Contínua

```
1. Coletar dados históricos
   ↓
2. Preparar dados de treinamento
   ↓
3. Treinar modelo
   ↓
4. Ativar modelo
   ↓
5. Monitorar performance
   ↓
6. Coletar feedback (aceitações/rejeições)
   ↓
7. Adicionar feedback ao dataset
   ↓
8. Re-treinar periodicamente
   ↓
(volta ao passo 3)
```

## 💡 Recomendação

**Começar com Opção A (Heurística Melhorada)** porque:
1. Mais rápido de implementar
2. Funciona bem com poucos dados
3. Mais interpretável
4. Pode evoluir para ML real depois
5. Menor risco

**Quando evoluir para ML real**:
- Quando tiver 100+ registros no histórico
- Quando heurística não for suficiente
- Quando quiser melhor performance


