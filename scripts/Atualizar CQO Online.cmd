@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -ExecutionPolicy Bypass -File "%~dp0import_cqo_snapshot.ps1" %*
echo.
pause
