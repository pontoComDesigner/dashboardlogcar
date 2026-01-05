@echo off
echo Simulando envio de Notas Fiscais do ERP com data 01/01/2026
echo.
cd /d %~dp0..
node scripts/simular-erp-envio-hoje.js %*










