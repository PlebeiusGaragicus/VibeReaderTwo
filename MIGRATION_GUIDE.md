# Migration Guide: IndexedDB → FastAPI Backend

This guide explains how to migrate the frontend from IndexedDB (Dexie) to the new FastAPI backend.

## Architecture Changes

### Before (v1.0 - Proof of Concept)
```
Frontend (React + Vite)
    ↓
IndexedDB (Dexie.js)
    ↓
Browser Storage
```

### After (v2.0 - Production)
```
Frontend (React + Vite)
    ↓
API Client
    ↓
FastAPI Backend
    ↓
SQLite (Desktop) / PostgreSQL (Web)
```

## Migration Steps

### 1. Service Layer Replacement

Replace the old services with new API-based ones:

#### Old (IndexedDB):
```typescript
import { db } from './lib/db';
import { epubService } from './services/epubService';
import { annotationService } from './services/annotationService';
```

#### New (API):
```typescript
import { bookApiService } from './services/bookApiService';
import { annotationApiService } from './services/annotationApiService';
import { settingsApiService } from './services/settingsApiService';
```

### 2. Book Operations

#### Import Book
**Old:**
```typescript
const bookId = await epubService.importEpub(file);
```

**New:**
```typescript
const book = await bookApiService.importBook(file);
const bookId = book.id;
```

#### Get Books
**Old:**
```typescript
const books = await db.books.toArray();
```

**New:**
```typescript
const books = await bookApiService.getBooks();
```

#### Update Progress
**Old:**
```typescript
await db.books.update(bookId, {
  currentCFI: cfi,
  percentage: progress,
  lastReadDate: new Date(),
});
```

**New:**
```typescript
await bookApiService.updateProgress(bookId, {
  current_cfi: cfi,
  percentage: progress,
});
```

### 3. Annotation Operations

#### Create Highlight
**Old:**
```typescript
await annotationService.createHighlight(bookId, cfiRange, text, color);
```

**New:**
```typescript
await annotationApiService.createHighlight(bookId, cfiRange, text, color);
```

#### Get Highlights
**Old:**
```typescript
const highlights = await annotationService.getHighlights(bookId);
```

**New:**
```typescript
const highlights = await annotationApiService.getHighlights(bookId);
```

### 4. Settings Operations

#### Load Settings
**Old:**
```typescript
const saved = await db.settings.toArray();
const settings = saved.length > 0 ? saved[0].reading : defaultSettings;
```

**New:**
```typescript
const settings = await settingsApiService.getSettings();
```

#### Save Settings
**Old:**
```typescript
const existing = await db.settings.toArray();
if (existing.length > 0) {
  await db.settings.update(existing[0].id!, { reading: newSettings });
} else {
  await db.settings.add({ reading: newSettings });
}
```

**New:**
```typescript
await settingsApiService.updateReadingSettings(newSettings);
```

### 5. EPUB File Loading

#### Old (Blob from IndexedDB):
```typescript
const book = await db.books.get(bookId);
const epubUrl = URL.createObjectURL(book.epubFile);
await epubService.loadBook(epubUrl);
```

#### New (URL from API):
```typescript
const epubUrl = bookApiService.getBookFileUrl(bookId);
await epubService.loadBook(epubUrl);
```

### 6. Field Name Changes

Note the snake_case → camelCase conversions:

| Old (IndexedDB) | New (API) |
|----------------|-----------|
| `currentCFI` | `current_cfi` |
| `currentChapter` | `current_chapter` |
| `lastReadDate` | `last_read_date` |
| `importDate` | `import_date` |
| `fileSize` | `file_size` |
| `fileHash` | `file_hash` |
| `coverImage` | `cover_image` |
| `noteContent` | `note_content` |
| `cfiRange` | `cfi_range` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### 7. Error Handling

#### Old:
```typescript
try {
  await db.books.add(book);
} catch (error) {
  console.error('Database error:', error);
}
```

#### New:
```typescript
try {
  await bookApiService.importBook(file);
} catch (error) {
  // API errors include detail message
  console.error('API error:', error.message);
}
```

## Components to Update

### Priority 1 (Core Functionality)
- [ ] `Library.tsx` - Book list and import
- [ ] `Reader.tsx` - Book loading and progress
- [ ] `ReaderSettings.tsx` - Settings management
- [ ] `AnnotationPanel.tsx` - Highlights and notes display

### Priority 2 (Annotations)
- [ ] `UnifiedContextMenu.tsx` - Highlight creation
- [ ] `NoteDialog.tsx` - Note creation/editing
- [ ] `ChatPanel.tsx` - Chat context storage

### Priority 3 (Utilities)
- [ ] `epubService.ts` - Update to use API URLs
- [ ] Remove `db.ts` (IndexedDB)
- [ ] Remove old `annotationService.ts`
- [ ] Remove old `chatService.ts`

## Testing Checklist

After migration, test these workflows:

- [ ] Import EPUB file
- [ ] View library
- [ ] Open book and read
- [ ] Create highlight
- [ ] Add note
- [ ] Change highlight color
- [ ] Delete annotation
- [ ] Update reading settings
- [ ] Close and reopen book (progress saved)
- [ ] Restart app (data persisted)

## Data Migration (Optional)

If you want to migrate existing IndexedDB data to the new backend:

```typescript
// Export from IndexedDB
const books = await db.books.toArray();
const highlights = await db.highlights.toArray();
const notes = await db.notes.toArray();

// Import to API
for (const book of books) {
  // Re-import EPUB files
  const file = new File([book.epubFile], `${book.title}.epub`);
  const newBook = await bookApiService.importBook(file);
  
  // Migrate annotations
  const bookHighlights = highlights.filter(h => h.bookId === book.id);
  for (const h of bookHighlights) {
    await annotationApiService.createHighlight(
      newBook.id,
      h.cfiRange,
      h.text,
      h.color
    );
  }
}
```

## Rollback Plan

If you need to rollback to IndexedDB:

1. Keep the old `db.ts` and services in a `legacy/` folder
2. Use feature flags to switch between implementations
3. Test both paths during transition period

```typescript
const USE_API = import.meta.env.VITE_USE_API === 'true';

if (USE_API) {
  await bookApiService.importBook(file);
} else {
  await epubService.importEpub(file);
}
```

## Next Steps

1. Start with `Library.tsx` - simplest component
2. Update `Reader.tsx` - core functionality
3. Migrate annotation components
4. Remove old IndexedDB code
5. Test thoroughly in both desktop and web modes
