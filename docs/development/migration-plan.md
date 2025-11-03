# Migration Plan - IndexedDB to API

## Current Status

✅ **Completed:**
- Backend API (all endpoints working)
- API client services (bookApiService, annotationApiService, settingsApiService)
- Logging and diagnostics
- epubService (book loading)
- BookViewer (progress tracking)

## Components Still Using IndexedDB

### Priority 1: Core Functionality (CRITICAL)

1. **`BookGrid.tsx`** - Library view
   - Uses: `useLiveQuery(db.books.toArray())`
   - Needs: `bookApiService.getBooks()`
   - Impact: Can't see imported books

2. **`ImportButton.tsx`** - Book import
   - Uses: `epubService.importEpub()` (now fixed)
   - Should work with current fix

3. **`BookCard.tsx`** - Book display
   - Uses: `type Book` from db
   - Needs: Update to use API Book type

4. **`BookCardMenu.tsx`** - Delete book
   - Uses: `db.books.delete()`
   - Needs: `bookApiService.deleteBook()`

### Priority 2: Annotations (HIGH)

5. **`annotationService.ts`** - Annotation operations
   - Uses: `db.highlights`, `db.notes`, `db.chatContexts`
   - Needs: Replace with `annotationApiService`
   - Impact: Highlights, notes, chat won't persist

6. **`AnnotationsSidebar.tsx`** - View annotations
   - Uses: `annotationService` (which uses db)
   - Will work once annotationService is migrated

7. **`UnifiedAnnotationOverlay.tsx`** - Annotation display
   - Uses: `annotationService`
   - Will work once annotationService is migrated

### Priority 3: Settings (MEDIUM)

8. **`ReaderSettings.tsx`** - Reader settings
   - Uses: `db.settings`
   - Needs: `settingsApiService`
   - Impact: Settings won't persist

### Priority 4: Chat (MEDIUM)

9. **`chatService.ts`** - Chat operations
   - Uses: `db.settings` for API config
   - Needs: `settingsApiService`

10. **`ChatOverlay.tsx`** - Chat interface
    - Uses: `db` for general chats
    - Needs: API endpoint for general chats (not yet implemented)

### Priority 5: Type Definitions (LOW)

11. **Type imports** - Various components
    - Many components import types from `lib/db`
    - Needs: Create shared types file or use API types

## Migration Order

### Phase 1: Library (Now)
1. ✅ Create shared types
2. ✅ Migrate BookGrid
3. ✅ Migrate BookCard
4. ✅ Migrate BookCardMenu
5. ✅ Test: Import, view, delete books

### Phase 2: Annotations (Next)
1. ✅ Migrate annotationService to use API
2. ✅ Update all annotation components
3. ✅ Test: Create, view, edit, delete annotations

### Phase 3: Settings (Then)
1. ✅ Migrate ReaderSettings
2. ✅ Migrate chatService
3. ✅ Test: Settings persistence

### Phase 4: Cleanup (Finally)
1. ✅ Remove old db.ts
2. ✅ Remove dexie dependencies
3. ✅ Remove old services
4. ✅ Final testing

## Estimated Time

- Phase 1: 30-45 minutes
- Phase 2: 45-60 minutes
- Phase 3: 20-30 minutes
- Phase 4: 15-20 minutes

**Total: ~2-3 hours**

## Let's Start!
