@echo off
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;C:\Windows\System32\WindowsPowerShell\v1.0"
cd /d "%~dp0.."
"C:\Program Files\nodejs\npm.cmd" run web -- --host lan > .expo-web.log 2> .expo-web.err.log
