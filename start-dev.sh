#!/bin/bash
# Development startup script for VibeReader v2.0

set -e

echo "🚀 Starting VibeReader Development Environment"
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

echo "🎯 Choose startup mode:"
echo "  1) Backend only (API server)"
echo "  2) Frontend only (Vite dev server)"
echo "  3) Backend + Frontend (full web dev)"
echo "  4) Desktop app (Electron + Backend + Frontend)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Starting FastAPI backend..."
        echo "📍 API will be available at: http://localhost:8000"
        echo "📚 API docs at: http://localhost:8000/docs"
        echo ""
        cd backend
        source venv/bin/activate
        export VIBEREADER_DESKTOP=true
        uvicorn app.main:app --reload --port 8000
        ;;
    2)
        echo ""
        echo "🔧 Starting Vite dev server..."
        echo "📍 Frontend will be available at: http://localhost:5173"
        echo ""
        cd frontend
        npm run dev
        ;;
    3)
        echo ""
        echo "🔧 Starting backend and frontend..."
        echo "📍 Backend: http://localhost:8000"
        echo "📍 Frontend: http://localhost:5173"
        echo ""
        
        # Start backend in background
        cd backend
        source venv/bin/activate
        export VIBEREADER_DESKTOP=true
        uvicorn app.main:app --reload --port 8000 &
        BACKEND_PID=$!
        cd ..
        
        # Wait for backend to start
        sleep 3
        
        # Start frontend
        cd frontend
        npm run dev
        
        # Cleanup on exit
        trap "kill $BACKEND_PID" EXIT
        ;;
    4)
        echo ""
        echo "🔧 Starting Electron desktop app..."
        echo "📍 This will start backend + frontend + Electron window"
        echo ""
        
        # Start frontend in background
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..
        
        # Wait for frontend to start
        sleep 3
        
        # Start desktop app (which will start backend)
        cd desktop
        npm run dev
        
        # Cleanup on exit
        trap "kill $FRONTEND_PID" EXIT
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
