#!/bin/bash

# VibeReader Documentation Server
# Builds and serves the MkDocs documentation locally

echo "📚 VibeReader Documentation"
echo "=============================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo "❌ pip is not installed. Please install pip first."
    exit 1
fi

# Install dependencies if needed
if ! command -v mkdocs &> /dev/null; then
    echo "📦 Installing MkDocs and dependencies..."
    pip install -q -r docs-requirements.txt
    echo "✅ Dependencies installed"
    echo ""
fi

# Serve the documentation
echo "🚀 Starting documentation server..."
echo "📖 Open http://127.0.0.1:8000 in your browser"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

mkdocs serve
