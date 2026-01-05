@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════
echo    Simulador de Envio de Notas Fiscais do ERP
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "%~dp0\.."

if "%1"=="" (
    set QUANTIDADE=3
    echo Quantidade não informada, usando padrão: 3 notas fiscais
) else (
    set QUANTIDADE=%1
    echo Quantidade definida: %QUANTIDADE% notas fiscais
)

echo.
echo Executando simulação...
echo.

node scripts\simular-erp-envio.js %QUANTIDADE%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erro ao executar script!
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
pause









