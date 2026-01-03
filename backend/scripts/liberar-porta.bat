@echo off
echo Procurando processo na porta 3001...
netstat -ano | findstr :3001
echo.
echo Para encerrar o processo, execute:
echo taskkill /PID [PID_NUMBER] /F
echo.
pause






