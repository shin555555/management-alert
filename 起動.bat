@echo off
title Management Alert System

echo ========================================
echo  Management Alert - Starting Server
echo ========================================
echo.

echo [1/4] Stopping existing Node processes...
taskkill /f /im node.exe >nul 2>&1
if exist "%~dp0app\.next\dev\lock" (
    del /f /q "%~dp0app\.next\dev\lock" >nul 2>&1
)
echo Done.

echo [2/4] Checking PostgreSQL...
sc query postgresql-x64-17 | findstr "RUNNING" >nul
if %errorlevel% neq 0 (
    net start postgresql-x64-17 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: PostgreSQL start failed. Run as Administrator.
        pause
        exit /b 1
    )
    echo Started.
) else (
    echo Already running.
)

echo [3/4] Opening browser...
start "" /min cmd /c "timeout /t 3 >nul && start http://localhost:3000"

echo [4/4] Starting dev server...
echo.
echo  URL   : http://localhost:3000
echo  Admin : admin@example.com / admin1234
echo  Staff : staff@example.com / staff1234
echo.
echo  * Close this window to stop the server.
echo ========================================
echo.

cd /d "%~dp0app"
npm run dev
