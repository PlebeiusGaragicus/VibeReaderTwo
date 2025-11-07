# React Closure Bug Fix - Annotations Not Persisting

## The Problem

**Symptoms:**
- ✅ Annotations appear when first created
- ❌ Annotations disappear when page is turned and turned back
- ❌ Annotations don't appear when book is loaded/reloaded

**Root Cause: React Closure Problem**

The `relocated` event handler was capturing the initial (empty) `annotationsCache` state in its closure. When annotations were loaded later, the event handler still referenced the original empty cache.

```typescript
// BEFORE (BROKEN):
const [annotationsCache, setAnnotationsCache] = useState({...}); // Initially empty

useEffect(() => {
  rendition.on('relocated', () => {
    // This captures the INITIAL annotationsCache (empty!)
    // Even after loadAnnotationsIntoCache() runs, this still sees {}
    if (annotationsCache.highlights.size > 0) { // Always false!
      renderAllAnnotations();
    }
  });
}, []);

// Later...
loadAnnotationsIntoCache(); // Updates state, but event handler doesn't see it!
```

## The Solution

**Use a Ref for Event Handlers**

Refs don't have closure issues - they always point to the current value.

```typescript
// AFTER (FIXED):
const [annotationsCache, setAnnotationsCache] = useState({...}); // For React
const annotationsCacheRef = useRef({...}); // For event handlers

// Sync state to ref
useEffect(() => {
  annotationsCacheRef.current = annotationsCache;
}, [annotationsCache]);

// Event handler uses ref
rendition.on('relocated', () => {
  const cache = annotationsCacheRef.current; // Always latest!
  if (cache.highlights.size > 0) { // Now sees loaded annotations!
    renderAllAnnotations();
  }
});
```

## Implementation Details

### Files Modified
- `BookViewer.tsx` - Added `annotationsCacheRef` and updated all relevant functions

### Key Changes

1. **Added Ref**
```typescript
const annotationsCacheRef = useRef<{
  highlights: Map<string, Highlight>;
  notes: Map<string, Note>;
  chatContexts: Map<string, ChatContext[]>;
}>({ highlights: new Map(), notes: new Map(), chatContexts: new Map() });
```

2. **Sync State to Ref**
```typescript
useEffect(() => {
  annotationsCacheRef.current = annotationsCache;
}, [annotationsCache]);
```

3. **Updated Event Handlers**
```typescript
// relocated event
rendition.on('relocated', async (location: any) => {
  if (!isInitialLoadRef.current && annotationsLoadedRef.current) {
    const currentCache = annotationsCacheRef.current; // Use ref!
    logger.debug(`Cache has ${currentCache.highlights.size} highlights`);
    await renderAllAnnotations();
  }
});
```

4. **Updated Helper Functions**
```typescript
// getAnnotationsFromCache
const getAnnotationsFromCache = (cfiRange: string) => {
  const cache = annotationsCacheRef.current; // Use ref!
  return {
    highlight: cache.highlights.get(cfiRange),
    note: cache.notes.get(cfiRange),
    chatContexts: cache.chatContexts.get(cfiRange) || [],
  };
};

// renderAllAnnotations
const renderAllAnnotations = async () => {
  const cache = annotationsCacheRef.current; // Use ref!
  
  const allCfiRanges = new Set<string>();
  cache.highlights.forEach((_, cfi) => allCfiRanges.add(cfi));
  cache.notes.forEach((_, cfi) => allCfiRanges.add(cfi));
  cache.chatContexts.forEach((_, cfi) => allCfiRanges.add(cfi));
  
  // ... render annotations
};
```

5. **Immediate Ref Update on Load**
```typescript
const loadAnnotationsIntoCache = async () => {
  const [highlights, notes, chatContexts] = await Promise.all([...]);
  
  const newCache = { highlights: ..., notes: ..., chatContexts: ... };
  setAnnotationsCache(newCache); // Update state
  annotationsCacheRef.current = newCache; // Update ref immediately!
};
```

## Why This Works

### State vs Ref
- **State (`useState`)**: Triggers re-renders, but creates closures
- **Ref (`useRef`)**: No re-renders, always current value, no closures

### When to Use Each
- **State**: When you need React to re-render UI
- **Ref**: When you need latest value in event handlers/callbacks

### Our Approach
- Keep **both** state and ref
- State for UI updates (annotation overlay refresh key)
- Ref for event handlers (page navigation, text selection)
- Sync state → ref with useEffect

## Testing Checklist

### ✅ Test 1: Create and Navigate
1. Open a book
2. Create a highlight
3. ✅ Highlight appears
4. Turn page forward
5. Turn page back
6. ✅ **Highlight should still be visible**

### ✅ Test 2: Create Multiple and Navigate
1. Create 3 highlights on page 1
2. Navigate to page 5
3. Create 2 highlights on page 5
4. Navigate back to page 1
5. ✅ **All 3 original highlights should be visible**
6. Navigate to page 5
7. ✅ **Both highlights on page 5 should be visible**

### ✅ Test 3: Reload Book
1. Create highlights on multiple pages
2. Close book
3. Reopen book
4. ✅ **All highlights should load and be visible**
5. Navigate through pages
6. ✅ **Highlights persist on all pages**

### ✅ Test 4: Rapid Navigation
1. Create highlights
2. Rapidly click next/previous multiple times
3. ✅ **Highlights should appear on every page**
4. ✅ **No duplicates should appear**

### ✅ Test 5: Different Annotation Types
1. Create highlight on page 1
2. Create note on page 1
3. Create chat on page 2
4. Navigate away and back
5. ✅ **All annotations persist**
6. ✅ **Correct priority (highlight > note > chat)**

## Debugging

### Check if annotations are loaded
```javascript
// In browser console:
console.log(annotationsCacheRef.current);
// Should show Maps with annotations

console.log(annotationsCacheRef.current.highlights.size);
// Should be > 0 if you have highlights
```

### Check if event handler sees annotations
```javascript
// Add this temporarily to relocated event:
console.log('Page changed, cache size:', annotationsCacheRef.current.highlights.size);
// Should show correct count, not 0
```

### Check if EPUB.js has annotations
```javascript
// In browser console:
const iframe = document.querySelector('iframe');
const marks = iframe.contentDocument.querySelectorAll('[data-epubjs-type="highlight"]');
console.log('Visible highlights:', marks.length);
// Should match cache size on current page
```

## Common React Closure Pitfalls

### ❌ Don't Do This
```typescript
const [data, setData] = useState(initial);

useEffect(() => {
  someEventEmitter.on('event', () => {
    console.log(data); // STALE! Captured from when effect ran
  });
}, []); // Empty deps = only runs once = closure captures initial data
```

### ✅ Do This Instead
```typescript
const [data, setData] = useState(initial);
const dataRef = useRef(initial);

useEffect(() => {
  dataRef.current = data;
}, [data]);

useEffect(() => {
  someEventEmitter.on('event', () => {
    console.log(dataRef.current); // FRESH! Always latest
  });
}, []);
```

### Alternative: Use Deps (Not Recommended Here)
```typescript
// Could re-attach event on every data change, but inefficient:
useEffect(() => {
  const handler = () => console.log(data);
  someEventEmitter.on('event', handler);
  return () => someEventEmitter.off('event', handler);
}, [data]); // Re-runs on every change - expensive for EPUB.js events!
```

## Performance Impact

### Before
- Event handlers used stale cache
- Annotations didn't re-render (cache appeared empty)
- Result: Annotations disappeared

### After  
- Event handlers use current cache via ref
- Annotations re-render properly on navigation
- Result: Annotations persist correctly
- **No performance cost** (refs are just pointers)

## Conclusion

This was a classic React closure bug. Event handlers captured initial state and never saw updates. The fix uses refs to bypass closures while maintaining React's state management for UI updates.

**Key Takeaway:** When event handlers need latest values, use refs, not state!

✅ Annotations now persist correctly across page navigation
✅ Annotations load correctly when book opens
✅ No performance degradation
✅ Clean, maintainable solution
