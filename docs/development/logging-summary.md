# Logging & Debugging System - Summary

## What Was Added

### 1. Backend Logging (`/backend/app/middleware/logging.py`)
- ✅ Request/response logging with timing
- ✅ Detailed startup information
- ✅ Book operation logging
- ✅ Error tracking with context

### 2. Frontend Logger (`/frontend/src/lib/logger.ts`)
- ✅ Categorized logging (API, Book, EPUB, etc.)
- ✅ Log levels (debug, info, warn, error)
- ✅ Performance timing
- ✅ Log storage and export
- ✅ Console styling with emojis

### 3. Diagnostics Tool (`/frontend/src/lib/diagnostics.ts`)
- ✅ System health checks
- ✅ API connectivity tests
- ✅ Book loading tests
- ✅ Log export functionality
- ✅ Browser console commands

### 4. Enhanced API Client
- ✅ Request/response logging
- ✅ Timing measurements
- ✅ Error tracking

## How to Use

### For Active Testing (User)

**Open Electron DevTools:**
```
Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
```

**Run diagnostics:**
```javascript
vibeDiagnostics.runDiagnostics()
```

**Test specific book:**
```javascript
vibeDiagnostics.testBookLoading(1)  // Replace 1 with book ID
```

**View logs:**
```javascript
vibeLogger.getSummary()
```

**Export logs:**
```javascript
vibeDiagnostics.exportLogs()
```

### For Debugging (Developer)

**Backend logs** (Terminal):
- Shows all HTTP requests
- Shows book file operations
- Shows database queries (if enabled)
- Shows errors with full context

**Frontend logs** (Console):
- Shows API calls with timing
- Shows book operations
- Shows EPUB loading
- Shows errors with stack traces

**Example workflow:**
1. User reports "book not rendering"
2. Ask user to run: `vibeDiagnostics.testBookLoading(bookId)`
3. User shares console output
4. You can see exactly where it fails:
   - API request failed?
   - File not found?
   - EPUB parsing error?

## Log Output Examples

### Backend (Terminal)
```
============================================================
VibeReader Backend Starting
============================================================
Mode: Desktop
Database: sqlite+aiosqlite:////Users/satoshi/VibeReader/vibereader.db
Data Directory: /Users/satoshi/VibeReader
Books Directory: /Users/satoshi/VibeReader/books
============================================================
✓ Database initialized
✓ API Ready!

12:34:56 [INFO] vibereader: → GET /api/books
12:34:56 [INFO] vibereader: ✓ GET /api/books → 200 (15ms)

12:35:02 [INFO] vibereader.books: 📖 Fetching EPUB file for book_id=1
12:35:02 [INFO] vibereader.books: 📚 Found book: 'Example Book' by Author
12:35:02 [INFO] vibereader.books: 📁 File path: /Users/.../books/abc123.epub
12:35:02 [INFO] vibereader.books: ✓ Serving EPUB file: 2.45MB
12:35:02 [INFO] vibereader: ✓ GET /api/books/1/file → 200 (234ms)
```

### Frontend (Console)
```
[12:34:56] ℹ️ App VibeReader initialized
[12:34:56] ℹ️ App Platform: Electron
[12:34:56] ℹ️ API Client Desktop mode - API URL: http://localhost:8000
[12:34:57] 🌐 API Request GET /api/books → 200 (15ms)
[12:35:02] 📖 EPUB Loading book ID: 1
[12:35:02] 🌐 API Request GET /api/books/1/file → 200 (234ms)
[12:35:03] ✓ EPUB Book loaded successfully
```

## Diagnostic Commands

| Command | What It Does |
|---------|-------------|
| `vibeDiagnostics.help()` | Show all available commands |
| `vibeDiagnostics.runDiagnostics()` | Run full system check |
| `vibeDiagnostics.checkAPI()` | Test API connectivity |
| `vibeDiagnostics.testBookLoading(id)` | Test loading specific book |
| `vibeLogger.getSummary()` | Show log statistics |
| `vibeLogger.getLogs()` | Get all log entries |
| `vibeDiagnostics.exportLogs()` | Download logs as JSON |

## Troubleshooting Book Rendering

If a book isn't rendering, run this in console:

```javascript
// 1. Check system health
await vibeDiagnostics.runDiagnostics()

// 2. Test specific book (replace 1 with actual book ID)
await vibeDiagnostics.testBookLoading(1)

// 3. Check for errors
vibeLogger.getLogsByLevel('error')

// 4. Export logs for sharing
vibeDiagnostics.exportLogs()
```

The output will tell you exactly where the problem is:
- ❌ API unreachable → Backend not running
- ❌ Book not found → Database issue
- ❌ File not found → File system issue
- ❌ File download failed → Network/CORS issue
- ✓ All checks pass → EPUB.js rendering issue

## Next Steps

1. **Start the app**: `./start-dev.sh` (option 4)
2. **Open DevTools**: Cmd+Option+I
3. **Try loading a book**: Click on a book in the library
4. **Check console**: Look for errors or run diagnostics
5. **Share logs**: If there's an issue, run `vibeDiagnostics.exportLogs()`

## Files Modified

- `backend/app/middleware/logging.py` - New logging middleware
- `backend/app/main.py` - Added logging middleware
- `backend/app/routers/books.py` - Added detailed logging
- `frontend/src/lib/logger.ts` - New logger utility
- `frontend/src/lib/diagnostics.ts` - New diagnostics tool
- `frontend/src/services/apiClient.ts` - Added logging
- `frontend/src/App.tsx` - Initialize logging

## Documentation

- [Debugging Guide](debugging-guide.md) - Complete debugging guide
- [Troubleshooting](../getting-started/troubleshooting.md) - Common issues and solutions

## Benefits

✅ **Instant diagnosis** - Know exactly what's failing
✅ **Remote debugging** - Users can share logs
✅ **Performance monitoring** - See request timings
✅ **Error tracking** - Full error context
✅ **Development speed** - Faster bug fixes
