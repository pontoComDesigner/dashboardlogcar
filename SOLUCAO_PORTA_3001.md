# 🔴 Erro: Porta 3001 já está em uso

## O que significa?

O erro `EADDRINUSE: address already in use :::3001` significa que já existe um processo usando a porta 3001.

## ✅ Solução Mais Simples

### 1. Verifique se há outro terminal com o servidor rodando

- Procure por terminais abertos que podem ter o servidor rodando
- Se encontrar, vá até aquele terminal e pressione `Ctrl + C`
- Isso vai finalizar o servidor normalmente

### 2. Se não encontrar o terminal, use o Gerenciador de Tarefas

1. Pressione `Ctrl + Shift + Esc` (ou `Ctrl + Alt + Del` > Gerenciador de Tarefas)
2. Vá na aba **"Detalhes"**
3. Procure por `node.exe`
4. Clique com botão direito em cada um > **Finalizar tarefa**
5. Confirme a ação

### 3. Ou use o script fornecido

Execute na raiz do projeto:

```cmd
FINALIZAR_PORTA_3001.bat
```

## 🚀 Depois de finalizar

1. Verifique se a porta está livre:
   ```cmd
   netstat -ano | findstr :3001
   ```
   (Se não mostrar nada, está livre!)

2. Inicie o servidor novamente:
   ```cmd
   cd backend
   npm run dev
   ```

## 💡 Dica para o Futuro

Sempre finalize o servidor com `Ctrl + C` antes de fechar o terminal ou iniciar novamente. Isso evita esse problema!

## 🔄 Alternativa: Usar Outra Porta

Se preferir usar outra porta temporariamente, edite `backend/.env`:

```env
PORT=3002
```

Mas lembre-se de atualizar também o frontend!



