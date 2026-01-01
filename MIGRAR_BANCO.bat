@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════
echo    Migração do Banco de Dados
echo ═══════════════════════════════════════════════════════════
echo.
echo Este script adiciona colunas faltantes nas tabelas existentes.
echo.
echo ⚠️  IMPORTANTE: Faça backup do banco antes de executar!
echo.

cd /d "%~dp0\backend"

node scripts\criar-migracao-tabelas.js

echo.
pause


