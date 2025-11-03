# Debug Logging

VibeReader includes comprehensive file-based logging when running in DEBUG mode. This is useful for troubleshooting issues and understanding application behavior.

## Enabling Debug Mode

### Desktop App (Electron)

**Development Mode:**
```bash
# Start with debug flag
npm run dev -- --debug
```

Or set environment variable:
```bash
export VIBEREADER_DEBUG=true
npm run dev
```

**Production Build:**
```bash
# Launch app with debug flag
./VibeReader.app/Contents/MacOS/VibeReader --debug
```

### Backend Only

```bash
export VIBEREADER_DEBUG=true
uvicorn app.main:app --reload
```

## Log File Locations

When DEBUG mode is enabled, log files are written to:

```
~/VibeReader/
├── debug.log              # Backend logs (Python/FastAPI)
└── frontend-debug.log     # Frontend logs (TypeScript/React)
```

### Backend Logs (`debug.log`)

Contains all backend activity:
- HTTP requests/responses with timing
- Database operations
- File operations (EPUB imports, cover extractions)
- Error stack traces
- Startup configuration

**Example:**
```
2025-11-03 12:30:15 [INFO] vibereader: VibeReader Backend Starting
2025-11-03 12:30:15 [INFO] vibereader: Mode: Desktop
2025-11-03 12:30:15 [INFO] vibereader: Debug Mode: Enabled
2025-11-03 12:30:16 [INFO] vibereader: → GET /books
2025-11-03 12:30:16 [INFO] vibereader: ✓ GET /books → 200 (45ms)
```

### Frontend Logs (`frontend-debug.log`)

Contains all frontend activity:
- Component lifecycle events
- EPUB.js operations
- API calls
- User interactions
- Navigation events
- Error details

**Example:**
```
2025-11-03T12:30:20.123Z [INFO] Book: Loading book ID: 5
2025-11-03T12:30:20.234Z [DEBUG] EPUB: Initializing rendition
2025-11-03T12:30:20.456Z [INFO] Reader: Navigating to CFI: epubcfi(...)
2025-11-03T12:30:20.567Z [ERROR] Annotation: Failed to add highlight | {"error": "Invalid CFI"}
```

## Log Rotation

Both log files use automatic rotation:
- **Max file size**: 10MB
- **Backup count**: 3 files
- Oldest logs are automatically deleted

This prevents unlimited disk usage while preserving recent history.

## Log Levels

### Backend
- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARNING**: Warning messages
- **ERROR**: Error messages with stack traces

### Frontend
- **debug**: Detailed diagnostic information
- **info**: General informational messages
- **warn**: Warning messages
- **error**: Error messages with details

## Accessing Logs Programmatically

### Frontend (Browser Console)

The logger is exposed globally in development:

```javascript
// View all logs
vibeLogger.getLogs()

// Get logs by category
vibeLogger.getLogsByCategory('Reader')
vibeLogger.getLogsByCategory('API')

// Get logs by level
vibeLogger.getLogsByLevel('error')

// Export logs as JSON
vibeLogger.exportLogs()

// View summary
vibeLogger.getSummary()

// Clear logs
vibeLogger.clear()

// Enable/disable logging
vibeLogger.setEnabled(true)
```

## Common Use Cases

### Debugging Navigation Issues

1. Enable DEBUG mode
2. Navigate to the problem location in the book
3. Check `frontend-debug.log` for Reader/EPUB messages
4. Look for CFI-related errors or warnings

### Debugging API Errors

1. Enable DEBUG mode
2. Trigger the problematic action
3. Check `debug.log` for HTTP request details
4. Check `frontend-debug.log` for API client messages

### Debugging Import Issues

1. Enable DEBUG mode
2. Import a problematic EPUB
3. Check `debug.log` for file parsing errors
4. Look for ebooklib-related messages

## Performance Impact

**Debug mode has minimal performance impact:**
- File writes are asynchronous
- Log rotation prevents unlimited growth
- Console logging is already active in development

**Recommendation**: Use DEBUG mode freely during development and troubleshooting.

## Disabling Debug Mode

Simply remove the `--debug` flag or unset the environment variable:

```bash
unset VIBEREADER_DEBUG
npm run dev
```

Existing log files will remain but won't be written to.

## Viewing Logs

### macOS/Linux
```bash
# Tail logs in real-time
tail -f ~/VibeReader/debug.log
tail -f ~/VibeReader/frontend-debug.log

# View last 100 lines
tail -n 100 ~/VibeReader/debug.log

# Search for errors
grep ERROR ~/VibeReader/debug.log
grep error ~/VibeReader/frontend-debug.log
```

### Windows
```powershell
# Tail logs in real-time (PowerShell)
Get-Content ~\VibeReader\debug.log -Wait -Tail 50

# View last 100 lines
Get-Content ~\VibeReader\debug.log -Tail 100
```

## Log Categories

### Backend
- `vibereader`: Main application logger
- Includes HTTP method, path, status, and timing

### Frontend
- **API**: API client operations
- **Book**: Book loading and management
- **EPUB**: EPUB.js operations
- **Reader**: Reader view operations
- **Annotation**: Highlight, note, and chat operations
- **Storage**: Local storage operations
- **Settings**: Settings changes

## Troubleshooting

### Logs Not Appearing

1. **Verify DEBUG mode is enabled:**
   ```bash
   # Should show "Debug Mode: Enabled"
   grep "Debug Mode" ~/VibeReader/debug.log
   ```

2. **Check log file permissions:**
   ```bash
   ls -la ~/VibeReader/
   ```

3. **Verify directory exists:**
   ```bash
   mkdir -p ~/VibeReader
   ```

### Log Files Too Large

Debug mode automatically rotates logs at 10MB. If files are still too large:

1. Reduce log level in code (change DEBUG to INFO)
2. Manually delete old logs:
   ```bash
   rm ~/VibeReader/debug.log.*
   rm ~/VibeReader/frontend-debug.log.*
   ```

### Need More History

Increase backup count in code:
- Backend: `backend/app/middleware/logging.py` line 35
- Frontend: Logs are stored in memory (increase `maxLogs` in `frontend/src/lib/logger.ts`)
