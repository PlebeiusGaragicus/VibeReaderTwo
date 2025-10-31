#!/bin/bash
# Import a test EPUB book via API

echo "📚 Import EPUB Book via API"
echo ""

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ Backend is not running"
    echo "   Start it with: ./start-dev.sh (option 1 or 4)"
    exit 1
fi

# Check if file path provided
if [ -z "$1" ]; then
    echo "Usage: ./import-test-book.sh /path/to/book.epub"
    echo ""
    echo "Example:"
    echo "  ./import-test-book.sh ~/Downloads/mybook.epub"
    exit 1
fi

EPUB_FILE="$1"

# Check if file exists
if [ ! -f "$EPUB_FILE" ]; then
    echo "❌ File not found: $EPUB_FILE"
    exit 1
fi

echo "📖 Importing: $EPUB_FILE"
echo ""

# Import via API
RESPONSE=$(curl -s -X POST http://localhost:8000/api/books/import \
  -F "file=@$EPUB_FILE" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Book imported successfully!"
    echo ""
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo "📊 Check database:"
    sqlite3 ~/VibeReader/vibereader.db "SELECT id, title, author FROM books;" 2>/dev/null || echo "   (sqlite3 not installed)"
    echo ""
    echo "🎉 Ready to read! Open the app and click on the book."
else
    echo "❌ Import failed (HTTP $HTTP_CODE)"
    echo ""
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
