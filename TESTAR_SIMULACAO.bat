@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════
echo    Teste de Simulação de Notas Fiscais
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "%~dp0\backend"

echo Verificando se o servidor está rodando...
echo.
curl -s http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Servidor não está rodando!
    echo.
    echo Por favor, inicie o servidor em outro terminal:
    echo    cd backend
    echo    npm run dev
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Servidor está rodando
    echo.
)

echo Executando simulação...
echo.

if "%1"=="" (
    node scripts\simular-erp-envio.js 1
) else (
    node scripts\simular-erp-envio.js %1
)

echo.
pause





