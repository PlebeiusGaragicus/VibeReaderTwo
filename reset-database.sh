#!/bin/bash

# VibeReader Database Reset Script
# This script completely clears all data for a "first install" experience

set -e  # Exit on error

VIBE_DIR="$HOME/VibeReader"
DB_FILE="$VIBE_DIR/vibereader.db"
BOOKS_DIR="$VIBE_DIR/books"

echo "🗑️  VibeReader Database Reset"
echo "================================"
echo ""
echo "This will DELETE ALL:"
echo "  - Books and their files"
echo "  - Highlights and annotations"
echo "  - Notes and chat contexts"
echo "  - Settings"
echo "  - Reading progress"
echo ""
echo "Location: $VIBE_DIR"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🔴 FINAL WARNING: This cannot be undone!"
read -p "Type 'DELETE' to confirm: " -r
echo
if [[ $REPLY != "DELETE" ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🗑️  Deleting all data..."
echo ""

# Stop any running backend processes
echo "1️⃣  Stopping any running backend processes..."
pkill -f "uvicorn.*vibereader" || true
sleep 1

# Delete the database file
if [ -f "$DB_FILE" ]; then
    echo "2️⃣  Deleting database: $DB_FILE"
    rm "$DB_FILE"
    echo "   ✓ Database deleted"
else
    echo "2️⃣  Database not found (already clean)"
fi

# Delete all book files
if [ -d "$BOOKS_DIR" ]; then
    echo "3️⃣  Deleting book files: $BOOKS_DIR"
    rm -rf "$BOOKS_DIR"
    echo "   ✓ Book files deleted"
else
    echo "3️⃣  Books directory not found (already clean)"
fi

# Recreate the directory structure
echo "4️⃣  Recreating directory structure..."
mkdir -p "$VIBE_DIR/books"
echo "   ✓ Directories created"

echo ""
echo "✅ Database reset complete!"
echo ""
echo "The database will be automatically recreated when you start the backend."
echo ""
echo "To start fresh:"
echo "  ./start-dev.sh"
echo ""
