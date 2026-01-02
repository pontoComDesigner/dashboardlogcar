# Como Finalizar Servidor na Porta 3001

## 🔴 Problema: Porta 3001 já está em uso

Quando você vê o erro `EADDRINUSE: address already in use :::3001`, significa que já existe um servidor rodando na porta 3001.

## ✅ Soluções

### Opção 1: Finalizar no Terminal (Mais Fácil)

Se o servidor está rodando em outro terminal:

1. Vá até o terminal onde o servidor está rodando
2. Pressione `Ctrl + C` para finalizar
3. Ou simplesmente feche aquele terminal

### Opção 2: Usar o Gerenciador de Tarefas

1. Pressione `Ctrl + Shift + Esc` para abrir o Gerenciador de Tarefas
2. Vá na aba "Detalhes"
3. Procure por processos `node.exe`
4. Clique com botão direito > Finalizar tarefa

### Opção 3: Usar PowerShell como Administrador

1. Abra PowerShell como Administrador (botão direito > Executar como administrador)
2. Execute:

```powershell
Get-Process -Id 21908 | Stop-Process -Force
```

(Substitua 21908 pelo PID que aparecer quando você executar `netstat -ano | findstr :3001`)

### Opção 4: Mudar a Porta (Alternativa)

Se você quiser usar outra porta temporariamente, edite o arquivo `backend/.env`:

```env
PORT=3002
```

E depois inicie o servidor normalmente. Mas lembre-se de atualizar o frontend também!

## 🔍 Verificar se a porta está livre

Execute no terminal:

```cmd
netstat -ano | findstr :3001
```

Se não retornar nada, a porta está livre!

## 💡 Dica

Para evitar isso no futuro, sempre finalize o servidor com `Ctrl + C` antes de iniciar novamente, ou use:

```cmd
taskkill /IM node.exe /F
```

Mas cuidado! Isso vai finalizar TODOS os processos Node.js rodando!



