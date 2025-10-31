# VibeReader v2.0

A modern EPUB reader with annotations, AI features, and Nostr integration. Available as both a desktop app (Electron) and web application.

## 🎯 Features

- **EPUB Reading**: Full-featured EPUB reader with pagination and navigation
- **Annotations**: Highlights, notes, and AI-powered chat on selected text
- **Local-First**: Desktop app stores everything locally with optional Nostr publishing
- **Cross-Platform**: Desktop apps for macOS, Windows, and Linux
- **Modern UI**: Built with React, TailwindCSS, and shadcn/ui

## 🏗️ Architecture

### Desktop App (Electron)
```
Electron Window
    ↓
React Frontend (Vite)
    ↓
FastAPI Backend (localhost:8000)
    ↓
SQLite Database (~/.VibeReader/)
```

### Web App
```
Browser
    ↓
React Frontend (Vite)
    ↓
FastAPI Backend (Cloud)
    ↓
PostgreSQL Database
```

**Shared Code**: 100% of frontend, ~95% of backend

## 🚀 Quick Start

### Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions.

```bash
# 1. Start backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export VIBEREADER_DESKTOP=true
uvicorn app.main:app --reload

# 2. Start frontend
cd frontend
npm install
npm run dev

# 3. Run desktop app (optional)
cd desktop
npm install
npm run dev
```

## 📁 Project Structure

```
VibeReaderTwo/
├── backend/          # FastAPI backend (Python)
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routers/     # API endpoints
│   │   └── services/    # Business logic
│   └── requirements.txt
│
├── frontend/         # React frontend (TypeScript)
│   ├── src/
│   │   ├── components/  # UI components
│   │   └── services/    # API clients
│   └── package.json
│
├── desktop/          # Electron wrapper
│   ├── main.js          # Main process
│   └── preload.js       # IPC bridge
│
└── docs/
    ├── ELECTRON.md           # Desktop architecture
    ├── MIGRATION_GUIDE.md    # v1 → v2 migration
    ├── DEVELOPMENT.md        # Dev setup
    └── SPECIFICATION.md      # Full spec
```

## 📚 Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Setup and development workflow
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Migrating from IndexedDB to API
- **[ELECTRON.md](./ELECTRON.md)** - Desktop app architecture
- **[SPECIFICATION.md](./SPECIFICATION.md)** - Full feature specification
- **[NOSTR.md](./NOSTR.md)** - Nostr integration details

## 🔄 Current Status

**v2.0 Refactor** - Converting from proof-of-concept to production architecture

✅ **Completed:**
- FastAPI backend with SQLite/PostgreSQL support
- Database models (books, annotations, settings)
- REST API endpoints
- Electron main process setup
- API client services

🚧 **In Progress:**
- Frontend migration from IndexedDB to API
- Python bundling for desktop builds
- Auto-update functionality

📋 **Planned:**
- Nostr integration (NIP-84 for highlights)
- AI chat features (LangGraph)
- Cloud deployment (web version)

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- epub.js
- Lucide React icons

### Backend
- FastAPI (Python 3.11+)
- SQLAlchemy 2.0
- SQLite (desktop) / PostgreSQL (web)
- ebooklib (EPUB parsing)

### Desktop
- Electron 28+
- electron-builder
- Python embedded runtime

## 📝 API Documentation

When backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

This is currently in active development. See [DEVELOPMENT.md](./DEVELOPMENT.md) for setup instructions.

## 📄 License

MIT

## 🔗 References

- Nostr NIPs: https://github.com/nostr-protocol/nips
- epub.js: https://github.com/futurepress/epub.js
- FastAPI: https://fastapi.tiangolo.com
