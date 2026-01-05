@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════
echo    Finalizar Processo na Porta 3001
echo ═══════════════════════════════════════════════════════════
echo.

echo Verificando processos na porta 3001...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo.
    echo ✅ Processo encontrado: PID %%a
    echo.
    echo Tentando finalizar...
    taskkill /PID %%a /F 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Processo finalizado com sucesso!
    ) else (
        echo.
        echo ❌ Não foi possível finalizar (pode precisar de permissões)
        echo.
        echo 💡 SOLUÇÕES:
        echo.
        echo 1. Vá até o terminal onde o servidor está rodando e pressione Ctrl+C
        echo.
        echo 2. Abra PowerShell como Administrador e execute:
        echo    Get-Process -Id %%a ^| Stop-Process -Force
        echo.
        echo 3. Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc)
        echo    Vá em "Detalhes" e finalize processos "node.exe"
        echo.
    )
)

echo.
echo Aguardando 2 segundos...
timeout /t 2 >nul

echo.
echo Verificando novamente...
netstat -ano | findstr :3001 >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Porta 3001 ainda está em uso
    echo.
    echo Por favor, finalize manualmente o servidor que está rodando.
) else (
    echo ✅ Porta 3001 está livre!
    echo.
    echo Agora você pode iniciar o servidor normalmente:
    echo    cd backend
    echo    npm run dev
)

echo.
pause










