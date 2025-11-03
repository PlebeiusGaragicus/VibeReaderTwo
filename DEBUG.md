# Debug Mode

Enable detailed file logging for troubleshooting issues.

## Quick Start

### Development
```bash
# Enable debug mode
export VIBEREADER_DEBUG=true

# Start backend
cd backend
uvicorn app.main:app --reload

# Start frontend (in another terminal)
cd frontend
npm run dev

# Start desktop app (in another terminal)
cd desktop
npm run dev -- --debug
```

### Production Desktop App
```bash
# macOS
./VibeReader.app/Contents/MacOS/VibeReader --debug

# Windows
VibeReader.exe --debug

# Linux
./vibereader --debug
```

## Log Files

Logs are written to `~/VibeReader/`:

- **debug.log** - Backend logs (FastAPI, database, file operations)
- **frontend-debug.log** - Frontend logs (React, EPUB.js, user interactions)

## Viewing Logs

```bash
# Watch logs in real-time
tail -f ~/VibeReader/debug.log
tail -f ~/VibeReader/frontend-debug.log

# Search for errors
grep ERROR ~/VibeReader/debug.log
```

## Documentation

See full documentation: [docs/development/debug-logging.md](docs/development/debug-logging.md)

Or visit: https://your-docs-site/development/debug-logging/
