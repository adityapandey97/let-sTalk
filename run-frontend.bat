@echo off
setlocal
title Let's Talk - Frontend Server

echo Starting Let's Talk Frontend ...
cd "%~dp0frontend"

where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo Launching with npx serve on port 3000...
    call npx -y serve -s . -l 3000
    exit /b 0
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    echo Launching with Python HTTP Server on port 3000...
    python -m http.server 3000
    exit /b 0
)

echo Opening frontend in default browser...
start index.html
pause
