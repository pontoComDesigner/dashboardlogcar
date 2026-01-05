# 🔴 Solução para Erro 500 ao Enviar Notas Fiscais

## Problema

Ao executar o script de simulação, você recebe erro 500 "Erro ao processar nota fiscal".

## Causa

O banco de dados foi criado antes das atualizações nas tabelas. Faltam algumas colunas nas tabelas `notas_fiscais` e `nota_fiscal_itens`.

## ✅ Solução: Executar Migração

### Opção 1: Usar o Script .bat (Mais Fácil)

Na raiz do projeto:

```cmd
MIGRAR_BANCO.bat
```

### Opção 2: Via npm

```cmd
cd backend
npm run migrar
```

### Opção 3: Diretamente via Node.js

```cmd
cd backend
node scripts/criar-migracao-tabelas.js
```

## 📋 O que o Script Faz

O script adiciona as seguintes colunas faltantes:

**Tabela `notas_fiscais`:**
- numeroPedido
- clienteCidade
- clienteEstado
- clienteCep
- erpId
- recebidoDoErp
- pesoTotal
- volumeTotal

**Tabela `nota_fiscal_itens`:**
- quantidadeDesmembrada
- peso
- volume
- codigoProduto

## ✅ Depois da Migração

1. Reinicie o servidor backend (se estiver rodando):
   ```cmd
   # Pressione Ctrl+C para parar
   # Depois inicie novamente:
   npm run dev
   ```

2. Execute o script de simulação novamente:
   ```cmd
   npm run simular-erp 5
   ```

## 🔄 Alternativa: Recriar o Banco (Se Preferir)

Se preferir começar do zero:

1. Pare o servidor
2. Delete o arquivo do banco:
   ```cmd
   del backend\data\faturamento.db
   ```
3. Inicie o servidor novamente (ele criará o banco automaticamente):
   ```cmd
   npm run dev
   ```

⚠️ **ATENÇÃO**: Isso vai apagar todos os dados existentes!

## 🐛 Verificar Logs do Servidor

Se ainda tiver erro após a migração, verifique os logs do servidor backend. Ele mostrará o erro específico que está ocorrendo.

O erro mais comum será mostrado como:
```
[ERROR] Erro ao inserir item X: ...
```

Isso ajudará a identificar qual campo está causando o problema.










