@echo off
echo ========================================
echo   Simulador de Envio de Notas Fiscais
echo   Data: 01/01/2026
echo ========================================
echo.
cd backend
call npm run simular-erp-hoje %*
pause





