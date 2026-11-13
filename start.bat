@echo off
cd /d "%~dp0"
title EXCEL DASHBOARD (Port 8001)
color 0E
set PATH=%~dp0node-embed;%PATH%
echo [1/3] Building React Frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed! Check your React code.
    pause
    exit /b %errorlevel%
)
cd ..



echo [3/3] Starting FastAPI Backend on Port 8001...
.\python-embed\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001 

pause