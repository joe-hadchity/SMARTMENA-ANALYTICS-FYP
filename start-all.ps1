# SmartMENA Analytics - Start All Services (Windows PowerShell)
# This script launches backend, ML service, and frontend concurrently

Write-Host "🚀 Starting SmartMENA Analytics Platform..." -ForegroundColor Cyan
Write-Host ""

# Check if all services are ready
Write-Host "Checking services..." -ForegroundColor Blue

if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  backend\.env not found. Please copy backend\.env.example and configure it." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "⚠️  frontend\.env.local not found. Please copy frontend\.env.example and configure it." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

if (-not (Test-Path "ml-service\.venv")) {
    Write-Host "Setting up ML service virtual environment..." -ForegroundColor Yellow
    Set-Location ml-service
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    Set-Location ..
}

if (-not (Test-Path "ml-service\models\roi_model.joblib")) {
    Write-Host "Training ROI model (one-time setup)..." -ForegroundColor Yellow
    Set-Location ml-service
    .\.venv\Scripts\Activate.ps1
    python scripts/generate_dataset.py
    python -m app.train_roi
    Set-Location ..
}

Write-Host "✓ All dependencies ready" -ForegroundColor Green
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Blue
Write-Host "  • Backend API → http://localhost:4000"
Write-Host "  • ML Service → http://localhost:8000"
Write-Host "  • Frontend → http://localhost:3000"
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Start all services
Write-Host "✓ Backend starting..." -ForegroundColor Green
$backend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "backend" -PassThru -RedirectStandardOutput "logs\backend.log" -RedirectStandardError "logs\backend-error.log" -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "✓ ML Service starting..." -ForegroundColor Green
$mlservice = Start-Process -FilePath "cmd" -ArgumentList "/c", "ml-service\.venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000" -WorkingDirectory "." -PassThru -RedirectStandardOutput "logs\ml-service.log" -RedirectStandardError "logs\ml-service-error.log" -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "✓ Frontend starting..." -ForegroundColor Green
$frontend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "frontend" -PassThru -RedirectStandardOutput "logs\frontend.log" -RedirectStandardError "logs\frontend-error.log" -NoNewWindow

Write-Host ""
Write-Host "🎉 All services running!" -ForegroundColor Green
Write-Host "   Visit http://localhost:3000 to use the app" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 Service PIDs:" -ForegroundColor Cyan
Write-Host "   • Backend: $($backend.Id)"
Write-Host "   • ML Service: $($mlservice.Id)"
Write-Host "   • Frontend: $($frontend.Id)"
Write-Host ""
Write-Host "📋 To view logs:"
Write-Host "   • Get-Content logs\backend.log -Wait"
Write-Host "   • Get-Content logs\ml-service.log -Wait"
Write-Host "   • Get-Content logs\frontend.log -Wait"
Write-Host ""
Write-Host "To stop services, press Ctrl+C or close this window"
Write-Host ""

# Cleanup function
$cleanup = {
    Write-Host ""
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $mlservice.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Green
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action $cleanup

# Wait for user interrupt
try {
    while ($true) {
        Start-Sleep -Seconds 1

        # Check if any process died
        if ($backend.HasExited -or $mlservice.HasExited -or $frontend.HasExited) {
            Write-Host "⚠️  One or more services stopped unexpectedly. Check logs." -ForegroundColor Red
            & $cleanup
            exit 1
        }
    }
}
finally {
    & $cleanup
}
