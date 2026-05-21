@echo off
REM SmartMENA Analytics - Start All Services (Windows Batch)
REM Simple launcher that starts all three services in separate windows

echo.
echo Starting SmartMENA Analytics Platform...
echo.

REM Create logs directory
if not exist "logs" mkdir logs

echo Starting Backend API (port 4000)...
start "SmartMENA Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting ML Service (port 8000)...
start "SmartMENA ML Service" cmd /k "cd ml-service && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend (port 3000)...
start "SmartMENA Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================
echo   All services started!
echo ====================================
echo.
echo   Backend API:  http://localhost:4000
echo   ML Service:   http://localhost:8000
echo   Frontend:     http://localhost:3000
echo.
echo   Visit http://localhost:3000 to use the app
echo.
echo Close the terminal windows to stop services
echo.
pause
