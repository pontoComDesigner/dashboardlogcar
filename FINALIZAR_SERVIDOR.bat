@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════
echo    Finalizar Servidor na Porta 3001
echo ═══════════════════════════════════════════════════════════
echo.

echo Procurando processos na porta 3001...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    set PID=%%a
    echo Processo encontrado: PID %%a
    echo Finalizando processo...
    taskkill /PID %%a /F >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Processo finalizado com sucesso!
    ) else (
        echo ❌ Erro ao finalizar processo (pode precisar de permissões de administrador)
    )
)

echo.
echo Verificando se a porta está livre...
timeout /t 2 >nul

netstat -ano | findstr :3001 >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Porta 3001 ainda está em uso
    echo.
    echo Tentando novamente como administrador...
    echo (Você pode precisar executar como Administrador)
) else (
    echo ✅ Porta 3001 está livre!
)

echo.
pause


