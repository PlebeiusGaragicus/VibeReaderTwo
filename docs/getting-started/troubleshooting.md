# Troubleshooting Guide

## Issues Fixed in This Update

### ✅ Fixed: SQLAlchemy Greenlet Error

**Error:**
```
ValueError: the greenlet library is required to use this function. No module named 'greenlet'
```

**Solution:**
Added `greenlet==3.0.3` to `requirements.txt`. This is required for SQLAlchemy's async operations.

**To fix:**
```bash
cd backend
source venv/bin/activate
pip install greenlet==3.0.3
# Or reinstall all:
pip install -r requirements.txt
```

### ✅ Fixed: npm Deprecation Warnings

**Warnings:**
- `inflight@1.0.6` deprecated
- `glob@7.2.3` deprecated  
- `boolean@3.2.0` deprecated

**Solution:**
Updated `desktop/package.json`:
- Electron: `28.0.0` → `33.2.0`
- electron-builder: `24.9.1` → `25.1.8`
- electron-store: `8.1.0` → `10.0.0`
- Added `overrides` to replace deprecated packages

**To fix:**
```bash
cd desktop
rm -rf node_modules package-lock.json
npm install
```

## Quick Fix Script

Run this to fix all dependencies:

```bash
./fix-dependencies.sh
```

## Common Issues

### 1. Backend Won't Start

#### Python Version Too Old
```
ERROR: Python 3.11+ required
```

**Solution:**
```bash
python3 --version  # Check version
# If < 3.11, install newer Python
brew install python@3.11  # macOS
```

#### Missing Dependencies
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

#### Port Already in Use
```
ERROR: [Errno 48] Address already in use
```

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>

# Or use a different port
uvicorn app.main:app --port 8001
```

### 2. Frontend Issues

#### Can't Connect to Backend
```
Failed to fetch
```

**Solution:**
1. Verify backend is running:
   ```bash
   curl http://localhost:8000/health
   ```

2. Check CORS settings in `backend/app/config.py`:
   ```python
   cors_origins = ["http://localhost:5173"]
   ```

3. Check API URL in frontend:
   ```typescript
   // Should auto-detect, but verify in console
   console.log(apiClient.getBaseUrl());
   ```

#### Vite Port Conflict
```
Port 5173 is in use, trying another one...
```

**Solution:**
This is normal - Vite will use 5174, 5175, etc. Update Electron if needed:
```javascript
// desktop/main.js
mainWindow.loadURL('http://localhost:5174');  // Update port
```

### 3. Electron Issues

#### Backend Not Starting in Electron
```
Backend process exited with code 3
```

**Solution:**
1. Check Python path in `desktop/main.js`:
   ```javascript
   pythonCmd = path.join(backendPath, 'venv/bin/python');
   ```

2. Verify venv exists:
   ```bash
   ls backend/venv/bin/python
   ```

3. Test backend standalone:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --port 8000
   ```

#### Blank Electron Window
```
White screen, no content
```

**Solution:**
1. Open DevTools (Cmd+Option+I)
2. Check Console for errors
3. Verify frontend URL:
   ```javascript
   // In dev mode, should load from Vite
   mainWindow.loadURL('http://localhost:5173');
   ```

#### Permission Denied
```
Error: spawn EACCES
```

**Solution:**
```bash
chmod +x backend/venv/bin/python
```

### 4. Database Issues

#### Database Locked
```
sqlite3.OperationalError: database is locked
```

**Solution:**
```bash
# Close all connections
pkill -f uvicorn

# If persistent, delete and recreate
rm ~/VibeReader/vibereader.db
# Restart backend (will recreate)
```

#### Schema Mismatch
```
sqlalchemy.exc.OperationalError: no such table
```

**Solution:**
```bash
# Delete database
rm ~/VibeReader/vibereader.db

# Restart backend (will create tables)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### 5. Build Issues

#### PyInstaller Not Found
```
ModuleNotFoundError: No module named 'PyInstaller'
```

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install pyinstaller
```

#### electron-builder Fails
```
Error: Cannot find module 'app-builder-bin'
```

**Solution:**
```bash
cd desktop
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Debugging Tips

### Enable Verbose Logging

#### Backend
```python
# backend/app/database.py
engine = create_async_engine(
    settings.database_url,
    echo=True,  # Enable SQL logging
)
```

#### Frontend
```typescript
// Add to apiClient.ts
console.log('API Request:', endpoint, options);
console.log('API Response:', response);
```

#### Electron
```javascript
// desktop/main.js
mainWindow.webContents.openDevTools();  // Always open DevTools

// Log all backend output
backendProcess.stdout.on('data', (data) => {
  console.log('[Backend]', data.toString());
});
```

### Check Logs

#### Backend Logs
Terminal output when running uvicorn

#### Frontend Logs
Browser/Electron DevTools Console

#### Database Contents
```bash
sqlite3 ~/VibeReader/vibereader.db

.tables
.schema books
SELECT * FROM books;
```

#### File System
```bash
# Check storage directory
ls -la ~/VibeReader/
ls -la ~/VibeReader/books/
```

## Environment Variables

### Backend (.env)
```bash
VIBEREADER_DESKTOP=true
API_HOST=127.0.0.1
API_PORT=8000
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000
```

## Clean Slate Reset

If all else fails, start fresh:

```bash
# 1. Delete all generated files
rm -rf backend/venv
rm -rf backend/__pycache__
rm -rf desktop/node_modules
rm -rf frontend/node_modules
rm -rf ~/VibeReader

# 2. Reinstall
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../desktop
npm install

cd ../frontend
npm install

# 3. Test
./start-dev.sh
```

## Getting Help

### Check Documentation
- [Development Setup](development.md) - Setup guide
- [Migration Guide](../development/migration-guide.md) - Migration details
- [Next Steps](../development/next-steps.md) - What to do next

### Verify Versions
```bash
# Python
python3 --version  # Should be 3.11+

# Node
node --version  # Should be 18+

# npm
npm --version  # Should be 9+
```

### Test Components Individually

1. **Backend only:**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   # Visit http://localhost:8000/docs
   ```

2. **Frontend only:**
   ```bash
   cd frontend
   npm run dev
   # Visit http://localhost:5173
   ```

3. **Desktop:**
   ```bash
   ./start-dev.sh
   # Choose option 4
   ```

## Still Having Issues?

1. Check error messages carefully
2. Search for the specific error in this guide
3. Verify all dependencies are installed
4. Try the clean slate reset
5. Check that ports aren't in use
