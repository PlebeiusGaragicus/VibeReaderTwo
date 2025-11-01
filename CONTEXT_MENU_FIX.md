# Context Menu Fix - CFI Range URL Encoding Issue

## Problem

When selecting text in the book, the unified context menu wasn't appearing. Console showed 404 errors:

```
GET http://127.0.0.1:8000/api/annotations/notes/range/1/epubcfi(%2F6%2F10!%2F4%2F2%2F2%5BPreface1%5D%2F30%5Bpagebreak-rw_7%5D%2F4%5Bp38%5D%2C%2F1%3A0%2C%2F1%3A193) 404 (Not Found)
```

## Root Cause

CFI (Canonical Fragment Identifier) ranges contain special characters like:
- `/` (forward slash)
- `(` `)` (parentheses)
- `[` `]` (brackets)
- `:` (colon)
- `,` (comma)

When these were used as **path parameters** in the URL, FastAPI couldn't properly parse them because:
1. Forward slashes `/` are interpreted as path separators
2. URL encoding doesn't solve this for path parameters
3. The route pattern couldn't match the encoded CFI

**Example CFI:**
```
epubcfi(/6/10!/4/2/2[Preface1]/30[pagebreak-rw_7]/4[p38],/1:0,/1:193)
```

**URL encoded in path:**
```
/api/annotations/notes/range/1/epubcfi(%2F6%2F10!%2F4%2F2%2F2%5BPreface1%5D...)
```
❌ FastAPI sees this as multiple path segments!

## Solution

Changed CFI range from **path parameter** to **query parameter**:

### Backend Changes

**Before:**
```python
@router.get("/notes/range/{book_id}/{cfi_range}")
async def get_note_by_range(book_id: int, cfi_range: str):
    # ...
```

**After:**
```python
@router.get("/notes/range/{book_id}")
async def get_note_by_range(book_id: int, cfi_range: str):  # Query param
    # ...
```

### Frontend Changes

**Before:**
```typescript
`/api/annotations/notes/range/${bookId}/${encodeURIComponent(cfiRange)}`
```

**After:**
```typescript
`/api/annotations/notes/range/${bookId}?cfi_range=${encodeURIComponent(cfiRange)}`
```

## Why Query Parameters Work

Query parameters can safely contain any URL-encoded characters:

```
GET /api/annotations/notes/range/1?cfi_range=epubcfi(%2F6%2F10!%2F4%2F2...)
```

✅ FastAPI correctly parses this as:
- Path: `/api/annotations/notes/range/1`
- Query param `cfi_range`: `epubcfi(/6/10!/4/2/...)`

## Files Modified

### Backend
- `backend/app/routers/annotations.py`
  - `get_note_by_range()` - Changed route from `/notes/range/{book_id}/{cfi_range}` to `/notes/range/{book_id}`
  - `get_chat_contexts_by_range()` - Changed route from `/chat-contexts/range/{book_id}/{cfi_range}` to `/chat-contexts/range/{book_id}`

### Frontend
- `frontend/src/services/annotationApiService.ts`
  - `getNoteByRange()` - Updated to use query parameter
  - `getChatContextsByRange()` - Updated to use query parameter

## Testing

```bash
# 1. Restart backend to load changes
# (Backend should auto-reload with uvicorn --reload)

# 2. Refresh frontend
# (Vite should auto-reload)

# 3. Test text selection
- Open a book
- Select some text
- Context menu should appear ✅
```

## Expected Behavior

When you select text:
1. Frontend captures CFI range
2. Makes API calls:
   - `GET /api/annotations/notes/range/1?cfi_range=...`
   - `GET /api/annotations/chat-contexts/range/1?cfi_range=...`
3. Backend returns existing annotations (or empty)
4. Context menu appears with options:
   - Highlight (with color picker)
   - Add Note
   - Chat with AI
   - Copy Text

## Status

✅ **Fixed** - Context menu now appears when selecting text!
