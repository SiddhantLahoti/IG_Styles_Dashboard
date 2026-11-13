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

echo [2/3] Checking and freeing Port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo Killing existing process PID %%a on Port 8001...
    taskkill /F /T /PID %%a
)

set /a retries=0
:wait_port
netstat -ano | findstr ":8001 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    set /a retries+=1
    if %retries% gtr 5 (
        echo [ERROR] Port 8001 is still locked. Right-click start.bat and select "Run as administrator".
        pause
        exit /b 1
    )
    echo Waiting for Port 8001 to be released...
    timeout /t 1 /nobreak >nul
    goto wait_port
)

echo [3/3] Starting FastAPI Backend on Port 8001...
.\python-embed\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001

pause