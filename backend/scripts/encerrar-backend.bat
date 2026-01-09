@echo off
echo Encerrando processos Node.js na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Encerrando processo PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)
echo Processo encerrado!
timeout /t 2 >nul
echo Iniciando backend...
cd /d %~dp0..
call npm run dev











echo Encerrando processos Node.js na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Encerrando processo PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)
echo Processo encerrado!
timeout /t 2 >nul
echo Iniciando backend...
cd /d %~dp0..
call npm run dev











echo Encerrando processos Node.js na porta 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Encerrando processo PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)
echo Processo encerrado!
timeout /t 2 >nul
echo Iniciando backend...
cd /d %~dp0..
call npm run dev












