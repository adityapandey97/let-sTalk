@echo off
setlocal
title Let's Talk - Backend Server

echo =============================================================================
echo Starting Let's Talk Backend Server on http://localhost:8080 ...
echo =============================================================================
cd "%~dp0backend"

IF NOT EXIST "uploads" (
    mkdir uploads
    mkdir uploads\profile
    mkdir uploads\images
    mkdir uploads\videos
    mkdir uploads\documents
    mkdir uploads\voice
    mkdir uploads\stories
)

call .\mvnw.cmd spring-boot:run
pause
