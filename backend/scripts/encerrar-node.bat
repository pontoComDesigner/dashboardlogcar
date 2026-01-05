@echo off
echo ========================================
echo   Encerrando processos Node.js
echo ========================================
echo.

echo Encerrando processos node.exe...
taskkill /IM node.exe /F 2>nul
if %errorlevel% equ 0 (
    echo Processos Node.js encerrados com sucesso!
) else (
    echo Nenhum processo Node.js encontrado ou erro ao encerrar.
)

echo.
echo Aguardando 2 segundos...
timeout /t 2 >nul

echo.
echo Verificando porta 3001...
netstat -ano | findstr :3001
if %errorlevel% equ 0 (
    echo AINDA HÁ PROCESSOS NA PORTA 3001!
    echo.
    echo Por favor, encerre manualmente via Gerenciador de Tarefas:
    echo 1. Abra Gerenciador de Tarefas (Ctrl+Shift+Esc)
    echo 2. Aba "Detalhes"
    echo 3. Ordene por PID
    echo 4. Encontre o processo na porta 3001
    echo 5. Finalizar tarefa
    pause
) else (
    echo Porta 3001 liberada!
)











