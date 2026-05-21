#!/bin/bash
# SmartMENA Analytics - Start All Services
# This script launches backend, ML service, and frontend concurrently

set -e

echo "🚀 Starting SmartMENA Analytics Platform..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if all services are ready
echo -e "${BLUE}Checking services...${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found. Please copy backend/.env.example and configure it.${NC}"
    exit 1
fi

if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  frontend/.env.local not found. Please copy frontend/.env.example and configure it.${NC}"
    exit 1
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

if [ ! -d "ml-service/.venv" ]; then
    echo -e "${YELLOW}Setting up ML service virtual environment...${NC}"
    cd ml-service
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

if [ ! -f "ml-service/models/roi_model.joblib" ]; then
    echo -e "${YELLOW}Training ROI model (one-time setup)...${NC}"
    cd ml-service
    source .venv/bin/activate
    python scripts/generate_dataset.py
    python -m app.train_roi
    cd ..
fi

echo -e "${GREEN}✓ All dependencies ready${NC}"
echo ""
echo -e "${BLUE}Starting services...${NC}"
echo -e "  • Backend API → http://localhost:4000"
echo -e "  • ML Service → http://localhost:8000"
echo -e "  • Frontend → http://localhost:3000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Start all services in background
cd backend && npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

cd ../ml-service && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000 > ../logs/ml-service.log 2>&1 &
ML_PID=$!
echo -e "${GREEN}✓ ML Service started (PID: $ML_PID)${NC}"

cd ../frontend && npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}🎉 All services running!${NC}"
echo -e "   Visit ${BLUE}http://localhost:3000${NC} to use the app"
echo ""
echo "📋 Service logs:"
echo "   • tail -f logs/backend.log"
echo "   • tail -f logs/ml-service.log"
echo "   • tail -f logs/frontend.log"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    kill $BACKEND_PID $ML_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

trap cleanup INT TERM

# Wait for all background processes
wait
