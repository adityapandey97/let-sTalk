@echo off
setlocal
title Let's Talk - Backend Server

echo Starting Let's Talk Backend on http://localhost:8080 ...
cd "%~dp0backend"
call "%~dp0backend\mvnw.cmd" spring-boot:run
pause
