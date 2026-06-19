@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0import_headcount_snapshot.ps1" %*
echo.
pause
