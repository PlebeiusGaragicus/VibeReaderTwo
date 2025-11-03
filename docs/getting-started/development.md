# Development Guide

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend (desktop mode)
export VIBEREADER_DESKTOP=true
uvicorn app.main:app --reload --port 8000
```

Backend will be available at: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend will be available at: http://localhost:5173

### 3. Desktop (Electron) Setup

```bash
cd desktop

# Install dependencies
npm install

# Run in development mode
npm run dev
```

This will:
1. Start the FastAPI backend (from `../backend`)
2. Load the frontend from Vite dev server (http://localhost:5173)
3. Open Electron window

## Project Structure

```
VibeReaderTwo/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI app
│   │   ├── config.py       # Environment config
│   │   ├── database.py     # SQLAlchemy setup
│   │   ├── models/         # Database models
│   │   ├── routers/        # API endpoints
│   │   └── services/       # Business logic
│   └── requirements.txt
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── services/      # API clients
│   │   │   ├── apiClient.ts
│   │   │   ├── bookApiService.ts
│   │   │   ├── annotationApiService.ts
│   │   │   └── settingsApiService.ts
│   │   └── lib/           # Utilities
│   └── package.json
│
└── desktop/               # Electron wrapper
    ├── main.js           # Main process
    ├── preload.js        # IPC bridge
    └── package.json
```

## Development Workflows

### Backend Development

```bash
cd backend
source venv/bin/activate

# Run with auto-reload
uvicorn app.main:app --reload --port 8000

# Run tests (when implemented)
pytest

# Check types
mypy app/
```

### Frontend Development

```bash
cd frontend

# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

### Desktop Development

```bash
cd desktop

# Development mode (uses Vite dev server)
npm run dev

# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux
```

## Environment Variables

### Backend (.env)

```bash
# Mode
VIBEREADER_DESKTOP=true

# API
API_HOST=127.0.0.1
API_PORT=8000

# Database (web mode only)
# DATABASE_URL=postgresql://user:pass@localhost/vibereader
```

### Frontend (.env)

```bash
# API URL (web mode only)
VITE_API_URL=http://localhost:8000
```

## Database Management

### View Database (Desktop Mode)

```bash
# SQLite database location
~/VibeReader/vibereader.db

# Open with sqlite3
sqlite3 ~/VibeReader/vibereader.db

# View tables
.tables

# View books
SELECT id, title, author FROM books;
```

### Reset Database

```bash
# Delete database file
rm ~/VibeReader/vibereader.db

# Restart backend (will recreate tables)
```

## API Testing

### Using curl

```bash
# Health check
curl http://localhost:8000/health

# Get books
curl http://localhost:8000/api/books

# Import book
curl -X POST http://localhost:8000/api/books/import \
  -F "file=@/path/to/book.epub"

# Get settings
curl http://localhost:8000/api/settings
```

### Using the API docs

Visit http://localhost:8000/docs for interactive API documentation.

## Debugging

### Backend Debugging

```python
# Add to app/main.py for SQL query logging
engine = create_async_engine(
    settings.database_url,
    echo=True,  # Enable SQL logging
)
```

### Frontend Debugging

```typescript
// Enable API client logging
console.log('API Request:', endpoint, options);
```

### Electron Debugging

```javascript
// In desktop/main.js
mainWindow.webContents.openDevTools();

// View backend logs
backendProcess.stdout.on('data', (data) => {
  console.log('[Backend]', data.toString());
});
```

## Common Issues

### Backend won't start

```bash
# Check Python version (need 3.11+)
python3 --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check port availability
lsof -i :8000
```

### Frontend can't connect to backend

```bash
# Verify backend is running
curl http://localhost:8000/health

# Check CORS settings in backend/app/config.py
cors_origins = ["http://localhost:5173"]
```

### Electron backend not starting

```bash
# Check Python path in desktop/main.js
# Development mode uses: ../backend/venv/bin/python

# Verify backend works standalone
cd backend
source venv/bin/activate
uvicorn app.main:app --port 8000
```

## Building for Production

### 1. Build Frontend

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### 2. Build Desktop App

```bash
cd desktop
npm run build
# Output: desktop/dist/
```

### 3. Package includes:
- Electron runtime
- Frontend bundle (from frontend/dist)
- Backend code (from backend/)
- Python runtime (TODO: needs PyInstaller setup)

## Next Steps

1. Complete frontend migration (see [Migration Guide](../development/migration-guide.md))
2. Set up Python bundling with PyInstaller
3. Add auto-update functionality
4. Implement Nostr integration
5. Add AI chat features
