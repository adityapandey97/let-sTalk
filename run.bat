@echo off
setlocal
title Let's Talk - Real-Time Messaging & Calling Platform

echo =======================================================
echo          Starting Let's Talk Application
echo =======================================================
echo.

:: Check Java Installation
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java is not installed or not in PATH!
    echo Please install JDK 17 or higher from https://adoptium.net/
    echo.
    pause
    exit /b 1
)

echo [INFO] Java detected.
echo [INFO] Starting Spring Boot server on http://localhost:8080 ...
echo [INFO] (Press Ctrl+C to stop the server)
echo.

cd "%~dp0backend"
call "%~dp0backend\mvnw.cmd" spring-boot:run

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Application failed to start.
    echo Please check if port 8080 is available.
    echo.
)

pause
