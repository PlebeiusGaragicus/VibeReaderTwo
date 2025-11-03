# Development Setup

Quick setup guide after cloning the repository.

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **npm**

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Frontend Setup

```bash
cd frontend
npm install
```

## Desktop Setup

```bash
cd desktop
npm install
```

## Running in Development

### Quick Start (Recommended)

**Desktop App (single command):**
```bash
./start-dev.sh
# Then select option 4
```

**Desktop App with DEBUG logging:**
```bash
./start-dev-debug.sh
# Logs written to ~/VibeReader/debug.log and ~/VibeReader/frontend-debug.log
```

The script auto-installs dependencies and starts all processes.

### Manual Setup (3 terminals)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
export VIBEREADER_DESKTOP=true
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Electron:**
```bash
cd desktop
npm run dev
```

## Debug Mode

Use the debug script (easiest):
```bash
./start-dev-debug.sh
```

Or manually set environment variable:
```bash
export VIBEREADER_DEBUG=true
./start-dev.sh  # Select option 4
```

Logs written to:
- `~/VibeReader/debug.log` (backend)
- `~/VibeReader/frontend-debug.log` (frontend)

## Project Structure

```
VibeReaderTwo/
├── backend/          # FastAPI + SQLAlchemy
├── frontend/         # React + Vite + TailwindCSS
├── desktop/          # Electron wrapper
└── docs/             # MkDocs documentation
```

## Common Issues

**Backend port already in use:**
```bash
lsof -ti:8000 | xargs kill -9
```

**Database reset:**
```bash
rm ~/VibeReader/vibereader.db
```

**Clear node_modules:**
```bash
rm -rf frontend/node_modules desktop/node_modules
cd frontend && npm install
cd ../desktop && npm install
```

## Documentation

Full docs: `docs/` - run with `mkdocs serve`

See also:
- [Getting Started](docs/getting-started/quickstart.md)
- [Debug Logging](docs/development/debug-logging.md)
- [Architecture](docs/technical/specification.md)
