# 🔧 Como Liberar a Porta 3001

Se você encontrar o erro `EADDRINUSE: address already in use :::3001`, significa que outro processo já está usando a porta 3001.

## Solução Rápida

### Opção 1: Usar o script automatizado

Execute o script que encerra o processo automaticamente:

```bash
cd backend/scripts
encerrar-backend.bat
```

Este script:
1. Identifica o processo na porta 3001
2. Encerra o processo automaticamente
3. Inicia o backend novamente

### Opção 2: Encerrar manualmente

1. **Identificar o processo:**
   ```bash
   netstat -ano | findstr :3001
   ```
   
   Você verá algo como:
   ```
   TCP    0.0.0.0:3001   0.0.0.0:0    LISTENING    7708
   ```
   
   O último número (7708) é o PID (Process ID).

2. **Encerrar o processo:**
   ```bash
   taskkill /PID 7708 /F
   ```
   
   Substitua `7708` pelo PID que apareceu no passo anterior.

### Opção 3: Usar o Gerenciador de Tarefas

1. Abra o **Gerenciador de Tarefas** (Ctrl + Shift + Esc)
2. Vá para a aba **Detalhes**
3. Clique na coluna **PID** para ordenar (se não estiver visível, clique com botão direito no cabeçalho e marque "PID")
4. Encontre o processo com o PID identificado no passo 1
5. Clique com botão direito e selecione **Finalizar tarefa**

### Opção 4: Encerrar todos os processos Node.js

```bash
taskkill /IM node.exe /F
```

⚠️ **Atenção**: Isso encerrará TODOS os processos Node.js em execução.

## Prevenção

Para evitar este problema no futuro:

- Sempre use `Ctrl + C` no terminal onde o backend está rodando antes de fechar
- Certifique-se de que não há múltiplas instâncias do backend rodando
- Use o script `encerrar-backend.bat` que já cuida de encerrar processos anteriores

## Verificar se a porta está livre

Após encerrar o processo, verifique se a porta está livre:

```bash
netstat -ano | findstr :3001
```

Se não retornar nada, a porta está livre e você pode iniciar o backend normalmente.



