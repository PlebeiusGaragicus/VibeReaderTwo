# Next Steps - VibeReader v2.0

## ✅ What's Done

You now have a **complete production-ready architecture**:

### Backend (FastAPI)
- ✅ SQLite/PostgreSQL database with SQLAlchemy
- ✅ Full REST API for books, annotations, settings
- ✅ EPUB processing (metadata, covers, hashing)
- ✅ Environment-aware configuration (desktop/web)
- ✅ File storage in `~/VibeReader/`

### Desktop (Electron)
- ✅ Main process with window management
- ✅ Backend spawning and health checks
- ✅ IPC bridge for native features
- ✅ electron-builder configuration

### Frontend Services
- ✅ Platform-aware API client
- ✅ Type-safe service layers
- ✅ Ready to replace IndexedDB

## 🎯 Immediate Next Steps

### 0. Fix Dependencies (REQUIRED - 2 minutes)

**You encountered a missing dependency error. Run this first:**

```bash
./fix-dependencies.sh
```

This will:
- Install `greenlet` (required for SQLAlchemy async)
- Update Electron and npm packages to fix deprecation warnings

### 1. Test the Backend (5 minutes)

```bash
# Quick test
./start-dev.sh
# Choose option 1 (Backend only)

# Then visit:
# http://localhost:8000/docs
```

Try importing a book through the API docs interface!

### 2. Start Frontend Migration (1-2 hours per component)

**Recommended order:**

#### Step 1: Library Component
File: `frontend/src/components/Library/Library.tsx`

Replace:
```typescript
import { db } from '../lib/db';
const books = await db.books.toArray();
```

With:
```typescript
import { bookApiService } from '../services/bookApiService';
const books = await bookApiService.getBooks();
```

#### Step 2: Reader Component  
File: `frontend/src/components/Reader/Reader.tsx`

Replace:
```typescript
const book = await db.books.get(bookId);
const epubUrl = URL.createObjectURL(book.epubFile);
```

With:
```typescript
const epubUrl = bookApiService.getBookFileUrl(bookId);
```

#### Step 3: Settings Component
File: `frontend/src/components/Reader/ReaderSettings.tsx`

Replace:
```typescript
const saved = await db.settings.toArray();
```

With:
```typescript
const settings = await settingsApiService.getSettings();
```

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for complete details.

### 3. Test Desktop App (10 minutes)

```bash
./start-dev.sh
# Choose option 4 (Desktop app)
```

This will:
1. Start Vite dev server (frontend)
2. Start FastAPI backend via Electron
3. Open Electron window

## 📋 Full Roadmap

### Week 1: Frontend Migration
- [ ] Migrate `Library.tsx`
- [ ] Migrate `Reader.tsx`
- [ ] Migrate `ReaderSettings.tsx`
- [ ] Migrate `AnnotationPanel.tsx`
- [ ] Migrate `UnifiedContextMenu.tsx`
- [ ] Migrate `NoteDialog.tsx`
- [ ] Migrate `ChatPanel.tsx`
- [ ] Remove old IndexedDB code

### Week 2: Desktop Build
- [ ] Set up PyInstaller for Python bundling
- [ ] Create build scripts
- [ ] Test on macOS
- [ ] Test on Windows (if available)
- [ ] Test on Linux (if available)
- [ ] Set up code signing

### Week 3: Polish & Features
- [ ] Add data export/import
- [ ] Implement search
- [ ] Add keyboard shortcuts
- [ ] Improve error handling
- [ ] Add loading states
- [ ] Write tests

### Week 4: Nostr Integration
- [ ] Implement NIP-84 (highlights)
- [ ] Add Nostr key management
- [ ] Publish/subscribe to annotations
- [ ] Test with real relays

### Week 5+: AI & Cloud
- [ ] Integrate LangGraph for AI chat
- [ ] Set up cloud deployment (web version)
- [ ] Implement PostgreSQL storage adapter
- [ ] Add S3/Blossom file storage
- [ ] Set up auto-updates

## 🚀 Quick Commands

### Start Development
```bash
./start-dev.sh
```

### Backend Only
```bash
cd backend
source venv/bin/activate
export VIBEREADER_DESKTOP=true
uvicorn app.main:app --reload
```

### Frontend Only
```bash
cd frontend
npm run dev
```

### Desktop App
```bash
cd desktop
npm run dev
```

### View Database
```bash
sqlite3 ~/VibeReader/vibereader.db
.tables
SELECT * FROM books;
```

### Test API
```bash
# Health check
curl http://localhost:8000/health

# Get books
curl http://localhost:8000/api/books

# Import book
curl -X POST http://localhost:8000/api/books/import \
  -F "file=@/path/to/book.epub"
```

## 📚 Documentation Reference

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete dev setup
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step migration
- **[REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md)** - What was built
- **[ELECTRON.md](./ELECTRON.md)** - Desktop architecture
- **Backend API**: http://localhost:8000/docs (when running)

## 🎓 Learning Resources

### FastAPI
- Docs: https://fastapi.tiangolo.com
- Tutorial: https://fastapi.tiangolo.com/tutorial/

### SQLAlchemy 2.0
- Docs: https://docs.sqlalchemy.org/
- Async: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html

### Electron
- Docs: https://www.electronjs.org/docs
- IPC: https://www.electronjs.org/docs/latest/tutorial/ipc

### epub.js
- Docs: https://github.com/futurepress/epub.js/

## 💡 Tips

### Development Workflow
1. Start backend first to test API changes
2. Use API docs (http://localhost:8000/docs) for testing
3. Keep DevTools open in Electron for debugging
4. Check `~/VibeReader/` for database and files

### Debugging
- Backend logs: Terminal output
- Frontend logs: Browser/Electron DevTools
- Database: `sqlite3 ~/VibeReader/vibereader.db`
- API requests: Network tab in DevTools

### Common Issues
- **Port 8000 in use**: Kill existing process or change port
- **Backend won't start**: Check Python version (need 3.11+)
- **Frontend can't connect**: Verify backend is running
- **Electron blank screen**: Check console for errors

## 🎉 You're Ready!

The hard architectural work is done. Now it's just:
1. Migrate frontend components one by one
2. Test as you go
3. Remove old code
4. Build and ship!

**Start with:** `./start-dev.sh` and choose option 1 to test the backend.

Good luck! 🚀
