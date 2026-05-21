# SmartMENA Analytics - Quick Start Guide

## 🎉 Services are Running!

All three services are currently running:

- **Frontend**: http://localhost:3000 (Next.js dashboard)
- **Backend API**: http://localhost:4000 (Express + Supabase)
- **ML Service**: http://localhost:8000 (FastAPI + Python ML models)

## 🚀 How to Use

1. **Open your browser** and go to: http://localhost:3000

2. **First-time setup**:
   - The app will automatically create a `demo` workspace if none exists
   - Click the **"Try with demo data"** button to seed sample accounts, posts, and insights
   - Explore the dashboard with pre-populated data!

3. **API Documentation**:
   - Swagger UI: http://localhost:4000/api/docs
   - Health checks:
     - Backend: http://localhost:4000/api/health
     - ML Service: http://localhost:8000/health

## 🛑 Stopping Services

The services are running in the background. To stop them:

**Option 1: Use the startup scripts**
- Run `start-all.bat` (opens separate windows - just close them)
- Or `start-all.ps1` (press Ctrl+C)

**Option 2: Find and kill processes manually**
```bash
# Windows (PowerShell)
Get-Process | Where-Object {$_.ProcessName -match "node|python"} | Stop-Process

# Or find specific ports
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :8000
# Then: taskkill /PID <pid> /F
```

## 🔄 Restarting Services

**Next time, use one of these startup scripts:**

### Windows (Batch) - Simplest
```bash
start-all.bat
```
Opens 3 separate terminal windows for each service. Close windows to stop.

### Windows (PowerShell) - Better control
```powershell
.\start-all.ps1
```
Runs all services with logging and graceful shutdown (Ctrl+C).

### Git Bash / WSL
```bash
bash start-all.sh
```
Unix-style launcher with colored output and signal handling.

## 📁 Project Structure

```
SMARTMENA-ANALYTICS-FYP/
├── backend/          # Express API (Node.js 20)
├── ml-service/       # ML predictions (Python 3.11)
├── frontend/         # Next.js 14 dashboard
├── logs/             # Service logs (auto-created)
├── start-all.bat     # Windows batch launcher
├── start-all.ps1     # PowerShell launcher
└── start-all.sh      # Bash launcher
```

## 🔧 Configuration Files

- `backend/.env` - Backend configuration (Supabase, Azure OpenAI, Meta OAuth)
- `frontend/.env.local` - Frontend API URL and workspace settings
- `ml-service/.venv/` - Python virtual environment

## 🐛 Troubleshooting

### Port Already in Use
If you get port errors, another instance might be running:
```powershell
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <pid> /F
```

### Frontend Build Errors
```bash
cd frontend
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run dev
```

### ML Model Not Found
```bash
cd ml-service
source .venv/Scripts/activate  # or .venv\Scripts\Activate.ps1
python scripts/generate_dataset.py
python -m app.train_roi
```

### Database Connection Errors
- Check `backend/.env` has valid `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Ensure all schema files were run in Supabase SQL editor

## 📚 Key Features

- **Overview Dashboard**: Real-time metrics, engagement trends, channel summaries
- **Social Connections**: Connect Instagram, Facebook (Meta OAuth)
- **Posts Management**: Sync and analyze posts with ML-powered sentiment
- **ROI Predictions**: ML model predicts engagement and return on investment
- **Audience Insights**: Geographic and demographic analysis
- **Trend Intelligence**: Discover trending topics and hashtags
- **Competitor Analysis**: Track competitor performance
- **Reports**: Export growth reports and share public links

## 🌍 Languages

The platform supports:
- **English** (default)
- **Arabic** (RTL layout with IBM Plex Sans Arabic font)
- Toggle language from the top-right menu

## 📞 Need Help?

- Backend logs: Check terminal or `logs/backend.log`
- ML service logs: Check terminal or `logs/ml-service.log`
- Frontend logs: Check terminal or `logs/frontend.log`
- Check CLAUDE.md for detailed project documentation

---

**Happy analyzing! 🚀**
