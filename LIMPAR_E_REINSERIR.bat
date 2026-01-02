@echo off
echo ========================================
echo Limpando banco de dados...
echo ========================================
cd backend
node scripts/limpar-banco.js
if errorlevel 1 (
    echo.
    echo ERRO ao limpar banco de dados!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Inserindo notas fiscais simuladas...
echo ========================================
echo.
echo Quantas notas fiscais deseja inserir? (padrao: 5)
set /p quantidade=Digite a quantidade: 
if "%quantidade%"=="" set quantidade=5

npm run simular-erp-hoje %quantidade%

echo.
echo ========================================
echo Processo concluido!
echo ========================================
pause



