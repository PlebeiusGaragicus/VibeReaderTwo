#!/bin/bash
# Fix dependencies after updating versions

set -e

echo "🔧 Fixing VibeReader Dependencies"
echo ""

# Fix backend
echo "📦 Updating backend dependencies..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    echo "✅ Backend dependencies updated"
else
    echo "⚠️  Backend venv not found. Run: python3 -m venv venv"
fi
cd ..
echo ""

# Fix desktop
echo "📦 Updating desktop dependencies..."
cd desktop
rm -rf node_modules package-lock.json
npm install
echo "✅ Desktop dependencies updated"
cd ..
echo ""

echo "✅ All dependencies fixed!"
echo ""
echo "Next steps:"
echo "  1. Test backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  2. Test desktop: ./start-dev.sh (choose option 4)"
