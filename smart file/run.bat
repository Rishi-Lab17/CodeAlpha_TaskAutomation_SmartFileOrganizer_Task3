@echo off
title Smart File Organizer - Premium Edition
color 0A

echo =======================================================
echo     Smart File Organizer - Premium Edition v2.0
echo     Soft Mint + Sage Green Design System
echo     CodeAlpha Task 3: Task Automation Suite
echo =======================================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Python environment detected.
echo [INFO] Installing / verifying required packages...
python -m pip install -r requirements.txt --quiet

echo.
echo [INFO] Starting Smart File Organizer at http://127.0.0.1:5000
echo [INFO] Press Ctrl+C in this window to stop the server.
echo.

:: Launch the browser automatically after 1.5 seconds
start "" timeout /t 2 /nobreak >nul & start http://127.0.0.1:5000

:: Start the Flask app
python app.py

pause

