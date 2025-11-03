# VibeReader - Electron Desktop Architecture

## Overview

VibeReader will be built as a **cross-platform application** with two deployment targets:

1. **Web Application**: Browser-based, cloud-hosted backend
2. **Desktop Application**: Electron-based, local-first with embedded FastAPI backend

Both versions share **100% of the frontend code** and **~95% of the backend code**, differing only in storage layer implementation.

---

## Architecture Decision: Electron + Embedded FastAPI

### Why This Approach?

- ✅ **Maximum Code Reuse**: Same FastAPI backend, same React frontend
- ✅ **Local-First Desktop**: Fast, offline-capable, private by default
- ✅ **Flexible Publishing**: Users control what data syncs to Nostr
- ✅ **Familiar Stack**: Leverages existing FastAPI/React expertise
- ✅ **Future-Proof**: Easy to add features to both versions simultaneously

### Trade-offs

- ⚠️ **Bundle Size**: ~150-200MB (acceptable for modern desktop apps)
- ⚠️ **Packaging Complexity**: One-time setup cost for Python embedding
- ⚠️ **Update Strategy**: App updates include Python runtime

---

## System Architecture

### Desktop Application (Electron)

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Desktop App                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐              ┌───────────────────┐   │
│  │  Main Process    │              │ Renderer Process  │   │
│  │  (Node.js)       │              │ (React UI)        │   │
│  │                  │              │                   │   │
│  │ • Window mgmt    │     IPC      │ • 100% shared     │   │
│  │ • Python spawn   │◄────────────►│   with web        │   │
│  │ • Auto-updater   │              │ • epub.js         │   │
│  │ • Native menus   │              │ • TailwindCSS     │   │
│  │ • File dialogs   │              │ • shadcn/ui       │   │
│  └────────┬─────────┘              └─────────┬─────────┘   │
│           │                                  │             │
│           ▼                                  │             │
│  ┌────────────────────────────────────┐      │             │
│  │   Embedded FastAPI Backend         │      │             │
│  │   (Python subprocess)              │◄─────┘             │
│  │                                    │  HTTP              │
│  │ • Runs on localhost:PORT           │  localhost:8000    │
│  │ • SQLite database                  │                    │
│  │ • Local file I/O                   │                    │
│  │ • Nostr client (publish)           │                    │
│  │ • Blossom client (upload)          │                    │
│  │ • Same code as web backend         │                    │
│  └────────────────┬───────────────────┘                    │
│                   │                                        │
│                   ▼                                        │
│         Local File System                                 │
│         ~/VibeReader/                                     │
│         ├── books/           (EPUB files)                 │
│         ├── covers/          (Cover images)               │
│         └── vibereader.db    (SQLite database)            │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
          External Services
          ├── LangGraph API (AI features)
          ├── Nostr Relays (shared annotations)
          └── Blossom Servers (published files)
```

### Web Application

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Browser (React SPA)                      │ │
│  │                                                       │ │
│  │  • Same React code as desktop                        │ │
│  │  • epub.js                                           │ │
│  │  • TailwindCSS + shadcn/ui                           │ │
│  │  • IndexedDB cache (offline PWA)                     │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │ HTTPS                         │
│                            ▼                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         FastAPI Backend (Cloud-Hosted)                │ │
│  │                                                       │ │
│  │  • PostgreSQL database                               │ │
│  │  • S3/Blossom file storage                           │ │
│  │  • Nostr client (auto-publish)                       │ │
│  │  • Same code as desktop backend                      │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                               │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
                   External Services
                   ├── LangGraph API (AI features)
                   ├── Nostr Relays (shared annotations)
                   └── Blossom Servers (file storage)
```

---

## Feature Comparison

| Feature | Desktop (Electron) | Web (Browser) |
|---------|-------------------|---------------|
| **Storage Backend** | SQLite | PostgreSQL |
| **EPUB Files** | Local file system (`~/VibeReader/books/`) | S3 or Blossom server |
| **Cover Images** | Local file system (`~/VibeReader/covers/`) | S3 or Blossom server |
| **Annotations** | Local SQLite first | Database first |
| **Reading Progress** | Local SQLite | Database |
| **Publish to Nostr** | ✅ Manual "Publish" button | ✅ Auto-publish on create |
| **Discover Public Annotations** | ✅ Query Nostr relays | ✅ Query Nostr relays |
| **AI Chat (LangGraph)** | ✅ Remote API | ✅ Remote API |
| **Offline Reading** | ✅ Full support | ⚠️ Limited (PWA cache) |
| **Auto-sync Across Devices** | ⚠️ Manual publish to Nostr | ✅ Automatic via database |
| **Backend Code** | 🟢 Same FastAPI codebase | 🟢 Same FastAPI codebase |
| **Frontend Code** | 🟢 Same React codebase | 🟢 Same React codebase |
| **Privacy** | 🔒 Local-first, opt-in sharing | 🌐 Cloud-first, opt-in privacy |
| **Installation** | Download .dmg/.exe/.AppImage | Visit URL |
| **Updates** | Auto-updater (electron-updater) | Instant (reload page) |

---

## Code Sharing Strategy

### 100% Shared Frontend

```typescript
// src/services/apiService.ts
// Platform detection
const API_BASE = window.electron 
  ? 'http://localhost:8000'              // Desktop: local FastAPI
  : 'https://api.vibereader.app';        // Web: remote FastAPI

export const api = {
  async importBook(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/books/import`, {
      method: 'POST',
      body: formData,
    });
  },
  
  async publishBook(bookId: string) {
    // Desktop-only feature
    if (!window.electron) {
      throw new Error('Publish only available in desktop app');
    }
    return fetch(`${API_BASE}/books/${bookId}/publish`, {
      method: 'POST',
    });
  },
};
```

### ~95% Shared Backend

```python
# backend/main.py
from fastapi import FastAPI, UploadFile
import os
from pathlib import Path

app = FastAPI()

# Environment detection
IS_DESKTOP = os.getenv("VIBEREADER_DESKTOP") == "true"

# Storage configuration
if IS_DESKTOP:
    # Desktop: Local storage
    DB_URL = f"sqlite:///{Path.home()}/VibeReader/vibereader.db"
    BOOKS_DIR = Path.home() / "VibeReader" / "books"
    COVERS_DIR = Path.home() / "VibeReader" / "covers"
else:
    # Web: Cloud storage
    DB_URL = os.getenv("DATABASE_URL")  # PostgreSQL
    BOOKS_DIR = None  # Use S3/Blossom
    COVERS_DIR = None

# Initialize storage
from .storage import get_storage_adapter
storage = get_storage_adapter(IS_DESKTOP)

@app.post("/books/import")
async def import_book(file: UploadFile):
    """Import EPUB - works for both desktop and web"""
    
    # Save file (adapter handles local vs cloud)
    file_path = await storage.save_epub(file)
    
    # Extract metadata (same logic)
    metadata = extract_epub_metadata(file_path)
    
    # Create database record (same logic)
    book = await db.create_book(metadata)
    
    # Desktop: Keep local, don't auto-publish
    # Web: Auto-publish to Nostr
    if not IS_DESKTOP:
        await publish_to_nostr(book)
    
    return book

@app.post("/books/{book_id}/publish")
async def publish_book(book_id: str):
    """Desktop-only: Manually publish local book to Nostr"""
    
    if not IS_DESKTOP:
        raise HTTPException(400, "Only available in desktop app")
    
    book = await db.get_book(book_id)
    
    # Upload EPUB to Blossom
    blossom_hash = await upload_to_blossom(book.local_path)
    
    # Create Nostr event (kind 30001)
    event = create_book_event(book, blossom_hash)
    await publish_to_relays(event)
    
    # Update book record
    book.published = True
    book.blossom_hash = blossom_hash
    await db.update_book(book)
    
    return {"status": "published", "hash": blossom_hash}
```

### Storage Adapter Pattern

```python
# backend/storage/adapter.py
from abc import ABC, abstractmethod

class StorageAdapter(ABC):
    @abstractmethod
    async def save_epub(self, file: UploadFile) -> str:
        """Save EPUB file, return path/URL"""
        pass
    
    @abstractmethod
    async def get_epub(self, identifier: str) -> bytes:
        """Retrieve EPUB file"""
        pass

# backend/storage/local.py
class LocalStorageAdapter(StorageAdapter):
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_epub(self, file: UploadFile) -> str:
        file_path = self.base_dir / f"{uuid.uuid4()}.epub"
        with open(file_path, "wb") as f:
            f.write(await file.read())
        return str(file_path)
    
    async def get_epub(self, identifier: str) -> bytes:
        with open(identifier, "rb") as f:
            return f.read()

# backend/storage/cloud.py
class CloudStorageAdapter(StorageAdapter):
    def __init__(self, s3_client):
        self.s3 = s3_client
    
    async def save_epub(self, file: UploadFile) -> str:
        key = f"books/{uuid.uuid4()}.epub"
        await self.s3.upload_fileobj(file.file, "vibereader", key)
        return f"s3://vibereader/{key}"
    
    async def get_epub(self, identifier: str) -> bytes:
        # Parse S3 URL and download
        return await self.s3.get_object(...)
```

---

## Development Roadmap

### Phase 1: Web Application Foundation (Weeks 1-8)

**Goal**: Build fully functional web version with all core features.

#### 1.1 Backend Setup (Week 1)
- [ ] Initialize FastAPI project structure
- [ ] Set up PostgreSQL database
- [ ] Configure S3/Blossom client
- [ ] Implement Nostr client (nostr-sdk Python)
- [ ] Create database models (SQLAlchemy)
- [ ] Set up environment configuration

#### 1.2 Frontend Setup (Week 1)
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure TailwindCSS + shadcn/ui
- [ ] Set up routing (React Router)
- [ ] Create base layout components
- [ ] Configure API client (fetch/axios)

#### 1.3 Book Management (Week 2-3)
- [ ] EPUB import endpoint (FastAPI)
- [ ] EPUB metadata extraction (ebooklib)
- [ ] File upload to S3/Blossom
- [ ] Library view (React)
- [ ] Book card components
- [ ] Search and filtering

#### 1.4 Reading Interface (Week 3-4)
- [ ] Integrate epub.js
- [ ] Book viewer component
- [ ] Chapter navigation
- [ ] Reading progress tracking
- [ ] Reader settings (font, theme, layout)
- [ ] Progress persistence (Nostr events)

#### 1.5 Annotations (Week 5-6)
- [ ] Text selection detection
- [ ] Highlight creation (UI + backend)
- [ ] Note creation and editing
- [ ] Annotations sidebar
- [ ] Nostr event publishing (kinds 30004, 30005)
- [ ] Privacy toggle (encryption)

#### 1.6 AI Integration (Week 7-8)
- [ ] LangGraph API client
- [ ] Chat panel UI
- [ ] Context management (selected text)
- [ ] Streaming responses (WebSocket)
- [ ] Chat history persistence (Nostr events)

#### 1.7 Collaborative Features (Week 8)
- [ ] Discover public annotations (query Nostr)
- [ ] Annotation layer switcher
- [ ] Reader profiles
- [ ] Popular highlights aggregation

**Deliverable**: Fully functional web application deployed at `https://vibereader.app`

---

### Phase 2: Desktop Support (Weeks 9-11)

**Goal**: Add Electron wrapper with embedded FastAPI backend.

#### 2.1 Electron Setup (Week 9)
- [ ] Initialize Electron project
- [ ] Configure electron-builder
- [ ] Create main process (window management)
- [ ] Set up IPC bridge (preload.js)
- [ ] Configure auto-updater (electron-updater)

#### 2.2 Python Embedding (Week 9-10)
- [ ] Bundle Python runtime (PyInstaller/PyOxidizer)
- [ ] Package FastAPI backend with dependencies
- [ ] Create startup script (spawn Python subprocess)
- [ ] Port detection (find available port)
- [ ] Health check (wait for FastAPI ready)
- [ ] Graceful shutdown (kill subprocess on app quit)

#### 2.3 Storage Adapter (Week 10)
- [ ] Implement LocalStorageAdapter
- [ ] SQLite database setup
- [ ] Local file system structure (`~/VibeReader/`)
- [ ] Migration from PostgreSQL schema to SQLite
- [ ] Test data persistence

#### 2.4 Desktop-Specific Features (Week 10)
- [ ] Native file picker (import EPUB)
- [ ] Native menus (File, Edit, View, Help)
- [ ] Keyboard shortcuts
- [ ] System tray integration (optional)
- [ ] "Publish to Nostr" feature
- [ ] Settings panel (Nostr relays, LangGraph endpoint)

#### 2.5 Platform Detection (Week 11)
- [ ] Update frontend API client (detect Electron)
- [ ] Conditional features (publish button)
- [ ] Environment flag in backend (`VIBEREADER_DESKTOP=true`)
- [ ] Test both web and desktop builds

#### 2.6 Packaging (Week 11)
- [ ] Configure electron-builder for all platforms
  - macOS: .dmg (Apple Silicon + Intel)
  - Windows: .exe (installer + portable)
  - Linux: .AppImage, .deb, .rpm
- [ ] Code signing setup (macOS, Windows)
- [ ] Auto-update configuration
- [ ] GitHub Actions CI/CD pipeline

**Deliverable**: Desktop apps for macOS, Windows, Linux

---

### Phase 3: Distribution & Polish (Week 12)

#### 3.1 Distribution
- [ ] Create download page (`https://vibereader.app/download`)
- [ ] Set up GitHub Releases
- [ ] Configure auto-update server
- [ ] Write installation guides
- [ ] Create demo videos

#### 3.2 Documentation
- [ ] User guide (web vs desktop)
- [ ] Developer documentation
- [ ] API documentation (FastAPI auto-docs)
- [ ] Nostr integration guide

#### 3.3 Testing
- [ ] End-to-end tests (Playwright)
- [ ] Cross-platform testing
- [ ] Nostr relay integration tests
- [ ] Performance optimization

**Deliverable**: Production-ready applications

---

## Project Structure

```
VibeReaderTwo/
├── backend/                      # FastAPI backend (shared)
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Environment detection
│   │   ├── routers/
│   │   │   ├── books.py
│   │   │   ├── annotations.py
│   │   │   ├── chat.py
│   │   │   └── nostr.py
│   │   ├── services/
│   │   │   ├── nostr_service.py
│   │   │   ├── blossom_service.py
│   │   │   ├── langgraph_client.py
│   │   │   └── epub_parser.py
│   │   ├── storage/
│   │   │   ├── adapter.py       # Abstract base
│   │   │   ├── local.py         # Desktop: SQLite + files
│   │   │   └── cloud.py         # Web: PostgreSQL + S3
│   │   └── models/
│   │       ├── book.py
│   │       ├── annotation.py
│   │       └── chat.py
│   ├── requirements.txt
│   └── pyproject.toml
│
├── frontend/                     # React frontend (shared)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── Library/
│   │   │   ├── Reader/
│   │   │   ├── Annotations/
│   │   │   └── Chat/
│   │   ├── services/
│   │   │   ├── apiService.ts    # Platform-aware API client
│   │   │   ├── nostrService.ts
│   │   │   └── epubService.ts
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── desktop/                      # Electron wrapper
│   ├── main.js                  # Main process
│   ├── preload.js               # IPC bridge
│   ├── python/                  # Embedded Python
│   │   ├── build.sh             # PyInstaller script
│   │   └── startup.py           # FastAPI launcher
│   ├── resources/               # App icons, etc.
│   ├── package.json             # electron-builder config
│   └── electron-builder.yml
│
├── docs/
│   ├── SPECIFICATION.md
│   ├── NOSTR.md
│   ├── ELECTRON.md              # This file
│   └── API.md
│
├── docker-compose.yml           # Web development
└── README.md
```

---

## Technical Stack

### Frontend (Shared)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **EPUB Rendering**: epub.js
- **State Management**: React Context API + Zustand
- **Routing**: React Router

### Backend (Shared)
- **Framework**: FastAPI (Python 3.11+)
- **Database**: 
  - Desktop: SQLite (via SQLAlchemy)
  - Web: PostgreSQL (via SQLAlchemy)
- **ORM**: SQLAlchemy 2.0
- **Nostr**: nostr-sdk (Python)
- **File Storage**:
  - Desktop: Local file system
  - Web: S3 or Blossom server
- **AI**: LangGraph API client

### Desktop-Specific
- **Framework**: Electron 28+
- **Bundler**: electron-builder
- **Auto-Updater**: electron-updater
- **Python Bundler**: PyInstaller or PyOxidizer
- **IPC**: Electron IPC (contextBridge)

### Web-Specific
- **Deployment**: Docker + Railway/Fly.io
- **Database**: PostgreSQL (Supabase/Neon)
- **File Storage**: S3 or Blossom
- **CDN**: Cloudflare

---

## Packaging Details

### Desktop App Bundle

```
VibeReader.app/                    # macOS example
├── Contents/
│   ├── MacOS/
│   │   └── VibeReader             # Electron executable
│   ├── Resources/
│   │   ├── app.asar               # React frontend bundle
│   │   ├── python/                # Embedded Python runtime
│   │   │   ├── python3.11
│   │   │   ├── lib/               # Python stdlib
│   │   │   ├── site-packages/     # FastAPI + deps
│   │   │   └── backend/           # Your FastAPI code
│   │   └── icon.icns
│   └── Info.plist
```

**Size Breakdown**:
- Electron runtime: ~80MB
- React bundle: ~5MB
- Python runtime: ~40MB
- FastAPI + dependencies: ~30MB
- **Total**: ~150-200MB

### Build Commands

```bash
# Development
npm run dev:web          # Web version (Vite dev server)
npm run dev:desktop      # Desktop version (Electron + Python)

# Production
npm run build:web        # Build React SPA
npm run build:desktop    # Build Electron apps (all platforms)

# Output
dist/
├── web/                 # Static files for web deployment
├── mac/
│   ├── VibeReader-1.0.0-arm64.dmg
│   └── VibeReader-1.0.0-x64.dmg
├── win/
│   ├── VibeReader-Setup-1.0.0.exe
│   └── VibeReader-1.0.0-portable.exe
└── linux/
    ├── VibeReader-1.0.0-x86_64.AppImage
    ├── VibeReader-1.0.0-amd64.deb
    └── VibeReader-1.0.0-x86_64.rpm
```

---

## Auto-Update Strategy

### Desktop (electron-updater)

```javascript
// desktop/main.js
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  // Check for updates on startup
  autoUpdater.checkForUpdatesAndNotify();
  
  // Check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 4 * 60 * 60 * 1000);
});

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available. Downloading now...',
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. Restart to install.',
    buttons: ['Restart', 'Later'],
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

**Update Server**: GitHub Releases (free) or custom S3 bucket

### Web (Instant)
- Users always get latest version on page load
- Optional: Service Worker for offline PWA

---

## Security Considerations

### Desktop
- **Code Signing**: Required to avoid OS warnings
  - macOS: Apple Developer certificate ($99/year)
  - Windows: Code signing certificate (~$200/year)
- **Sandboxing**: Electron security best practices
- **Local Data**: Encrypted SQLite database (optional)
- **Nostr Keys**: Stored in OS keychain (electron-store)

### Web
- **HTTPS**: Required for all endpoints
- **CORS**: Configured for frontend domain
- **API Keys**: Environment variables (never in frontend)
- **Nostr Keys**: Browser localStorage (encrypted)

---

## Development Workflow

### Day-to-Day Development

```bash
# Terminal 1: Backend (FastAPI)
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend (React)
cd frontend
npm run dev

# Terminal 3: Desktop (Electron)
cd desktop
npm run dev
```

### Testing Both Versions

```bash
# Test web version
VIBEREADER_DESKTOP=false npm run dev:web

# Test desktop version
VIBEREADER_DESKTOP=true npm run dev:desktop
```

---

## Deployment

### Web Application

```bash
# Build frontend
cd frontend
npm run build

# Deploy backend (Railway example)
cd backend
railway up

# Deploy frontend (Cloudflare Pages example)
cd frontend/dist
wrangler pages deploy
```

### Desktop Application

```bash
# Build all platforms (requires macOS for .dmg)
npm run build:desktop

# Upload to GitHub Releases
gh release create v1.0.0 dist/*.{dmg,exe,AppImage}

# Auto-updater will detect new release
```

---

## Migration Path for Users

### Desktop → Web
1. Export library (JSON)
2. Import in web version
3. Files re-uploaded to cloud

### Web → Desktop
1. Download desktop app
2. Sign in with Nostr key
3. Pull published books from Nostr
4. Download EPUBs from Blossom to local storage

### Sync Between Both
- **Shared Annotations**: Both query Nostr relays
- **Private Data**: 
  - Desktop: Local SQLite
  - Web: Cloud database
  - Manual publish to sync

---

## Success Metrics

### Phase 1 (Web) Complete When:
- [ ] Can import and read EPUB files
- [ ] Annotations sync across browser sessions
- [ ] AI chat works with book context
- [ ] Public annotations discoverable via Nostr
- [ ] Deployed and accessible at vibereader.app

### Phase 2 (Desktop) Complete When:
- [ ] Installable on macOS, Windows, Linux
- [ ] Works 100% offline
- [ ] Can publish local books to Nostr
- [ ] Auto-updates work
- [ ] Feature parity with web version

---

## Next Steps

1. **Start with Phase 1.1**: Set up FastAPI backend with PostgreSQL
2. **Parallel Phase 1.2**: Set up React frontend with Vite
3. **Iterate on web version** until all features complete
4. **Add desktop wrapper** in Phase 2
5. **Ship both versions** simultaneously

**Estimated Timeline**: 12 weeks from start to production-ready applications

---

## Questions to Resolve

- [ ] LangGraph endpoint URL (self-hosted or managed service?)
- [ ] Nostr relay preferences (public relays or custom?)
- [ ] Blossom server (self-hosted or use existing?)
- [ ] Code signing certificates (purchase or skip for beta?)
- [ ] Analytics/telemetry (privacy-respecting option?)

---

## Resources

### Electron
- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [electron-updater](https://www.electron.build/auto-update)

### Python Embedding
- [PyInstaller](https://pyinstaller.org/)
- [PyOxidizer](https://pyoxidizer.readthedocs.io/)

### FastAPI
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/)

### Nostr
- [nostr-sdk Python](https://github.com/rust-nostr/nostr-sdk-python)
- [NIPs Repository](https://github.com/nostr-protocol/nips)

### React
- [Vite](https://vitejs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [epub.js](https://github.com/futurepress/epub.js/)
