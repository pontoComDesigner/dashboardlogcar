@echo off
echo ========================================
echo TESTE COMPLETO - Limpar e Reinserir Dados
echo ========================================
echo.
echo Este script vai:
echo 1. Limpar todos os dados do banco
echo 2. Inserir novas notas fiscais com data 01/01/2026
echo.
echo IMPORTANTE: Certifique-se de que o servidor backend esta rodando!
echo.
pause

echo.
echo ========================================
echo Passo 1: Limpando banco de dados...
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
echo Passo 2: Inserindo notas fiscais...
echo ========================================
echo.
echo Quantas notas fiscais deseja inserir? (padrao: 5)
set /p quantidade=Digite a quantidade: 
if "%quantidade%"=="" set quantidade=5

echo.
echo Inserindo %quantidade% nota(s) fiscal(is) com data 01/01/2026...
npm run simular-erp-hoje %quantidade%

echo.
echo ========================================
echo Processo concluido!
echo ========================================
echo.
echo Próximos passos:
echo 1. Acesse http://localhost:3000/desmembramento
echo 2. Selecione uma nota fiscal
echo 3. Realize o desmembramento
echo 4. Verifique se as cargas mantem todos os dados da NF
echo.
pause











echo ========================================
echo TESTE COMPLETO - Limpar e Reinserir Dados
echo ========================================
echo.
echo Este script vai:
echo 1. Limpar todos os dados do banco
echo 2. Inserir novas notas fiscais com data 01/01/2026
echo.
echo IMPORTANTE: Certifique-se de que o servidor backend esta rodando!
echo.
pause

echo.
echo ========================================
echo Passo 1: Limpando banco de dados...
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
echo Passo 2: Inserindo notas fiscais...
echo ========================================
echo.
echo Quantas notas fiscais deseja inserir? (padrao: 5)
set /p quantidade=Digite a quantidade: 
if "%quantidade%"=="" set quantidade=5

echo.
echo Inserindo %quantidade% nota(s) fiscal(is) com data 01/01/2026...
npm run simular-erp-hoje %quantidade%

echo.
echo ========================================
echo Processo concluido!
echo ========================================
echo.
echo Próximos passos:
echo 1. Acesse http://localhost:3000/desmembramento
echo 2. Selecione uma nota fiscal
echo 3. Realize o desmembramento
echo 4. Verifique se as cargas mantem todos os dados da NF
echo.
pause











echo ========================================
echo TESTE COMPLETO - Limpar e Reinserir Dados
echo ========================================
echo.
echo Este script vai:
echo 1. Limpar todos os dados do banco
echo 2. Inserir novas notas fiscais com data 01/01/2026
echo.
echo IMPORTANTE: Certifique-se de que o servidor backend esta rodando!
echo.
pause

echo.
echo ========================================
echo Passo 1: Limpando banco de dados...
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
echo Passo 2: Inserindo notas fiscais...
echo ========================================
echo.
echo Quantas notas fiscais deseja inserir? (padrao: 5)
set /p quantidade=Digite a quantidade: 
if "%quantidade%"=="" set quantidade=5

echo.
echo Inserindo %quantidade% nota(s) fiscal(is) com data 01/01/2026...
npm run simular-erp-hoje %quantidade%

echo.
echo ========================================
echo Processo concluido!
echo ========================================
echo.
echo Próximos passos:
echo 1. Acesse http://localhost:3000/desmembramento
echo 2. Selecione uma nota fiscal
echo 3. Realize o desmembramento
echo 4. Verifique se as cargas mantem todos os dados da NF
echo.
pause












