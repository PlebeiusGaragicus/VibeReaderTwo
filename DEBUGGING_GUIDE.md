# Debugging Guide - VibeReader v2.0

## Quick Diagnostic Commands

### In Browser Console (Electron DevTools)

```javascript
// Run full diagnostics
vibeDiagnostics.runDiagnostics()

// Test specific book loading
vibeDiagnostics.testBookLoading(1)  // Replace 1 with book ID

// View logs
vibeLogger.getSummary()
vibeLogger.getLogs()

// Export logs for sharing
vibeDiagnostics.exportLogs()
```

## Logging System

### Backend Logging (Terminal)

The backend now logs:
- ✅ Startup information (mode, database, directories)
- 🌐 All HTTP requests with timing
- 📖 Book file operations with details
- ❌ Errors with full context

**Example output:**
```
============================================================
VibeReader Backend Starting
============================================================
Mode: Desktop
Database: sqlite+aiosqlite:////Users/you/VibeReader/vibereader.db
Data Directory: /Users/you/VibeReader
Books Directory: /Users/you/VibeReader/books
============================================================
✓ Database initialized
✓ API Ready!
→ GET /api/books
✓ GET /api/books → 200 (15ms)
📖 Fetching EPUB file for book_id=1
📚 Found book: 'Example Book' by Author Name
📁 File path: /Users/you/VibeReader/books/abc123.epub
✓ Serving EPUB file: 2.45MB
✓ GET /api/books/1/file → 200 (234ms)
```

### Frontend Logging (Browser Console)

The frontend now logs:
- 🌐 API requests with timing
- 📚 Book operations
- 📖 EPUB loading
- ⚙️ Settings changes
- ❌ Errors with stack traces

**Example output:**
```
[12:34:56] ℹ️ App VibeReader initialized
[12:34:56] 🌐 API Client Desktop mode - API URL: http://localhost:8000
[12:34:57] 🌐 API Request GET /api/books → 200 (15ms)
[12:35:02] 📖 EPUB Loading book ID: 1
[12:35:02] 🌐 API Request GET /api/books/1/file → 200 (234ms)
```

## Diagnostic Workflow

### 1. Book Not Rendering Issue

**Step 1: Check if backend is running**
```javascript
vibeDiagnostics.checkAPI()
```

Expected output:
```
🌐 API Connectivity:
  Base URL: http://localhost:8000
  ✓ Health check passed (5ms)
  Status: { status: 'healthy' }
```

**Step 2: Check if books exist**
```javascript
// In console
fetch('http://localhost:8000/api/books')
  .then(r => r.json())
  .then(books => console.table(books))
```

**Step 3: Test specific book loading**
```javascript
vibeDiagnostics.testBookLoading(1)  // Use actual book ID
```

Expected output:
```
📚 Testing book loading for ID: 1
✓ Book metadata: { id: 1, title: '...', ... }
📁 File URL: http://localhost:8000/api/books/1/file
✓ File response: 200 OK
  Content-Type: application/epub+zip
  Content-Length: 2567890 bytes
✓ File downloaded: 2.45MB
```

**Step 4: Check browser console for errors**
- Look for red error messages
- Check Network tab for failed requests
- Look for CORS errors

### 2. Common Issues & Solutions

#### Issue: "Book file not found"

**Backend logs show:**
```
❌ EPUB file not found: /path/to/file.epub
```

**Solution:**
```bash
# Check if file exists
ls -la ~/VibeReader/books/

# Check database
sqlite3 ~/VibeReader/vibereader.db "SELECT id, title, file_path FROM books;"
```

#### Issue: "CORS error"

**Console shows:**
```
Access to fetch at 'http://localhost:8000/api/books' from origin 'http://localhost:5174' 
has been blocked by CORS policy
```

**Solution:**
Check `backend/app/config.py`:
```python
cors_origins: list[str] = [
    "http://localhost:5173",
    "http://localhost:5174",  # Add this if Vite uses 5174
]
```

#### Issue: "API unreachable"

**Console shows:**
```
✗ API unreachable: TypeError: Failed to fetch
```

**Solution:**
1. Check backend is running:
   ```bash
   curl http://localhost:8000/health
   ```

2. Check Electron is starting backend:
   ```bash
   # Look for backend logs in terminal
   ps aux | grep uvicorn
   ```

#### Issue: "EPUB won't load in reader"

**Check epub.js errors:**
```javascript
// In console, check if epub.js is loaded
console.log(typeof ePub)

// Check for epub.js errors in console
// Look for messages like:
// "Failed to load EPUB"
// "Invalid EPUB file"
```

**Solution:**
1. Verify EPUB file is valid:
   ```bash
   # Try opening in another reader
   # Or check file size
   ls -lh ~/VibeReader/books/*.epub
   ```

2. Check Content-Type header:
   ```javascript
   fetch('http://localhost:8000/api/books/1/file')
     .then(r => console.log(r.headers.get('content-type')))
   // Should be: application/epub+zip
   ```

## Log Collection for Bug Reports

### Collect All Logs

```javascript
// 1. Get frontend logs
vibeDiagnostics.exportLogs()

// 2. Get backend logs (from terminal)
// Copy the terminal output

// 3. Run diagnostics
vibeDiagnostics.runDiagnostics()

// 4. Get log summary
vibeLogger.getSummary()
```

### What to Include in Bug Report

1. **Environment:**
   - OS version
   - Electron version (if desktop)
   - Browser version (if web)

2. **Logs:**
   - Frontend logs (exported JSON)
   - Backend terminal output
   - Diagnostic results

3. **Steps to Reproduce:**
   - What you clicked
   - What you expected
   - What actually happened

4. **Screenshots:**
   - Console errors
   - Network tab
   - UI state

## Advanced Debugging

### Enable Verbose Logging

**Backend:**
```python
# backend/app/database.py
engine = create_async_engine(
    settings.database_url,
    echo=True,  # Enable SQL logging
)
```

**Frontend:**
```javascript
// In console
localStorage.setItem('vibereader_debug', 'true')
location.reload()
```

### Monitor Network Requests

**Chrome/Electron DevTools:**
1. Open DevTools (Cmd+Option+I)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Watch for:
   - Failed requests (red)
   - Slow requests (>1s)
   - Wrong status codes

### Inspect Database

```bash
# Open SQLite database
sqlite3 ~/VibeReader/vibereader.db

# List tables
.tables

# Check books
SELECT id, title, author, file_path FROM books;

# Check if file exists
SELECT id, title, 
  CASE 
    WHEN length(file_path) > 0 THEN 'Has path'
    ELSE 'No path'
  END as status
FROM books;

# Exit
.quit
```

### Test API Directly

```bash
# Health check
curl http://localhost:8000/health

# Get books
curl http://localhost:8000/api/books

# Get specific book
curl http://localhost:8000/api/books/1

# Download EPUB (save to file)
curl http://localhost:8000/api/books/1/file -o test.epub

# Check file size
ls -lh test.epub
```

## Performance Profiling

### Measure API Response Times

```javascript
// In console
const measureAPI = async () => {
  const endpoints = [
    '/api/books',
    '/api/books/1',
    '/api/settings',
  ];
  
  for (const endpoint of endpoints) {
    const start = performance.now();
    await fetch(`http://localhost:8000${endpoint}`);
    const duration = performance.now() - start;
    console.log(`${endpoint}: ${duration.toFixed(0)}ms`);
  }
};

measureAPI();
```

### Check EPUB Loading Time

```javascript
// In console
const measureEPUB = async (bookId) => {
  const start = performance.now();
  const response = await fetch(`http://localhost:8000/api/books/${bookId}/file`);
  const blob = await response.blob();
  const duration = performance.now() - start;
  console.log(`EPUB download: ${duration.toFixed(0)}ms`);
  console.log(`File size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Speed: ${(blob.size / 1024 / (duration / 1000)).toFixed(0)} KB/s`);
};

measureEPUB(1);
```

## Electron-Specific Debugging

### Check Backend Process

```javascript
// In Electron main process logs (terminal)
// Look for:
Starting FastAPI backend...
[Backend] ✓ API Ready!

// If not starting:
// 1. Check Python path
// 2. Check venv exists
// 3. Check port not in use
```

### Check IPC Communication

```javascript
// In renderer console
console.log(window.electron)
// Should show: { isElectron: true, getApiUrl: f, ... }

// Test IPC
window.electron.getApiUrl().then(console.log)
// Should show: http://127.0.0.1:8000
```

## Getting Help

If you're still stuck after trying these steps:

1. Run full diagnostics:
   ```javascript
   vibeDiagnostics.runDiagnostics()
   ```

2. Export logs:
   ```javascript
   vibeDiagnostics.exportLogs()
   ```

3. Share:
   - Diagnostic results
   - Exported logs
   - Backend terminal output
   - Console screenshots
   - Steps to reproduce

## Quick Reference

| Command | Purpose |
|---------|---------|
| `vibeDiagnostics.help()` | Show all commands |
| `vibeDiagnostics.runDiagnostics()` | Run full diagnostic |
| `vibeDiagnostics.testBookLoading(id)` | Test specific book |
| `vibeLogger.getSummary()` | Get log statistics |
| `vibeDiagnostics.exportLogs()` | Download logs |
| `curl http://localhost:8000/health` | Test backend |
| `sqlite3 ~/VibeReader/vibereader.db` | Inspect database |
