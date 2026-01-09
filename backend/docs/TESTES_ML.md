# Guia de Testes - Módulo ML

## ✅ Estado Atual

- **Dados de Treinamento**: 58 registros em `ml_training_data` ✅
- **Status**: Sistema pronto para treinamento (mínimo de 50 atingido)
- **Modelos ML**: 0 (sistema usando fallback com regras fixas + histórico)
- **Predições Realizadas**: 0

## 🧪 Testes Disponíveis

### 1. Testar Estatísticas do Módulo ML

```bash
cd backend
node scripts/testar-ml-stats.js
```

**O que verifica:**
- Quantidade de dados de treinamento
- Modelos disponíveis
- Predições realizadas
- Status do sistema

### 2. Testar Predição ML via API

**Endpoint**: `POST /api/ml/predict`

**Requisitos:**
- Autenticação (token JWT)
- Papel: LOGISTICA ou ADMINISTRATIVO
- Body: `{ "notaFiscalId": "id-da-nota-fiscal" }`

**Exemplo de teste (via curl ou Postman):**
```bash
curl -X POST http://localhost:3001/api/ml/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"notaFiscalId": "id-da-nota-fiscal"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "predicao": {
    "numeroCargasSugerido": 5,
    "confianca": 0.7,
    "modeloVersao": null,
    "metodo": "FALLBACK_REGRAS_FIXAS",
    "features": { ... },
    "predicaoId": "uuid"
  }
}
```

### 3. Testar Desmembramento Automático no Frontend

**Onde testar:**
- Página: `DesmembramentoNovo.js`
- Ação: Botão "🔄 Desmembrar Automaticamente"

**O que testa:**
- Preview automático usando ML/heurística
- Sugestão de número de cargas
- Distribuição de itens entre cargas
- Integração com histórico

**Endpoint usado**: `POST /api/desmembramento/preview-automatico`

### 4. Testar Sugestão de Cargas

**Endpoint**: `GET /api/desmembramento/sugerir/:notaId`

**O que testa:**
- Integração do serviço de desmembramento com ML
- Uso de regras fixas + histórico
- Cálculo automático de número de cargas

### 5. Verificar Integração com Histórico

O sistema já está usando o histórico para sugerir desmembramentos:

- **Produtos Especiais** (6000, 50080, 19500): 1 unidade por carga
- **Produtos Normais**: Consulta histórico para padrões similares
- **Fallback**: Se não houver histórico, coloca tudo em 1 carga

## 📊 Endpoints ML Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/ml/predict` | POST | Fazer predição para uma NF |
| `/api/ml/models` | GET | Listar modelos disponíveis |
| `/api/ml/models/ativo` | GET | Buscar modelo ativo |
| `/api/ml/stats` | GET | Estatísticas do módulo ML |

## 🔄 Fluxo de Teste Completo

1. **Verificar estado atual**
   ```bash
   node scripts/testar-ml-stats.js
   ```

2. **Criar uma nota fiscal de teste** (se necessário)
   - Via frontend ou API

3. **Testar predição ML**
   - Via endpoint `/api/ml/predict`
   - Ou via preview automático no frontend

4. **Testar desmembramento automático**
   - Via frontend: botão "Desmembrar Automaticamente"
   - Verificar sugestão de cargas
   - Verificar distribuição de itens

5. **Verificar logs**
   - Verificar se predições estão sendo registradas
   - Verificar se histórico está sendo consultado

## ⚠️ Notas Importantes

- **Modelo ML Real**: Ainda não implementado. Sistema usa fallback (regras fixas + histórico).
- **Treinamento**: Não há modelo treinado ainda. Quando implementado, será via `POST /api/ml/train`.
- **Performance**: Sistema funciona bem mesmo sem modelo ML real, usando heurísticas baseadas em histórico.

## 🚀 Próximos Passos (Futuro)

1. Implementar treinamento de modelo ML real
2. Ativar modelo após treinamento
3. Testar predições com modelo real
4. Comparar performance: heurístico vs. modelo ML real


