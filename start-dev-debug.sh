#!/bin/bash
# Development startup script for VibeReader v2.0 (DEBUG MODE)

set -e

echo "🐛 Starting VibeReader Development Environment (DEBUG MODE)"
echo "📝 Logs will be written to ~/VibeReader/debug.log and ~/VibeReader/frontend-debug.log"
echo ""

# Check if backend venv exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    echo "📥 Installing Python dependencies..."
    pip install -r requirements.txt
    cd ..
    echo "✅ Backend setup complete"
    echo ""
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend setup complete"
    echo ""
fi

# Check if desktop node_modules exists
if [ ! -d "desktop/node_modules" ]; then
    echo "📦 Installing desktop dependencies..."
    cd desktop
    npm install
    cd ..
    echo "✅ Desktop setup complete"
    echo ""
fi

echo "🔧 Starting Electron desktop app with DEBUG mode..."
echo "📍 This will start backend + frontend + Electron window"
echo "📝 Backend logs: ~/VibeReader/debug.log"
echo "📝 Frontend logs: ~/VibeReader/frontend-debug.log"
echo ""

# Export debug mode
export VIBEREADER_DEBUG=true

# Start frontend in background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

# Start desktop app (debug mode set via VIBEREADER_DEBUG env var)
cd desktop
npm run dev

# Cleanup on exit
trap "kill $FRONTEND_PID" EXIT
