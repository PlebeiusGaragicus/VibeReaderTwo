#!/bin/bash
# Test the logging system

echo "🧪 Testing VibeReader Logging System"
echo ""

# Check if backend is running
echo "1. Checking if backend is running..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✓ Backend is running"
else
    echo "   ✗ Backend is not running"
    echo "   Start it with: ./start-dev.sh (option 1)"
    exit 1
fi

echo ""
echo "2. Testing API endpoints..."

# Test health endpoint
echo "   Testing /health..."
curl -s http://localhost:8000/health | jq '.' || echo "   (Install jq for pretty output)"

# Test books endpoint
echo ""
echo "   Testing /api/books..."
curl -s http://localhost:8000/api/books | jq 'length' || echo "   (Install jq for pretty output)"

echo ""
echo "3. Check backend logs in the terminal where you started the backend"
echo "   You should see:"
echo "   → GET /health"
echo "   ✓ GET /health → 200 (Xms)"
echo "   → GET /api/books"
echo "   ✓ GET /api/books → 200 (Xms)"

echo ""
echo "4. Frontend logging test:"
echo "   - Open the app in Electron or browser"
echo "   - Open DevTools (Cmd+Option+I)"
echo "   - In console, run: vibeDiagnostics.runDiagnostics()"
echo "   - You should see detailed diagnostic output"

echo ""
echo "✓ Logging system test complete!"
