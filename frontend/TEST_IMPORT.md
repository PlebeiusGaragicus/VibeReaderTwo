# Testing EPUB Import

## Steps to Test:

1. Open the browser at http://localhost:5173
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Click "Import EPUB" button
5. Select an EPUB file

## What to Look For:

### In Console:
You should see these logs:
```
Starting EPUB import for: [filename].epub
Parsing metadata...
Metadata: {title: "...", author: "..."}
Extracting cover...
Cover extracted: Yes/No
Saving to database...
Book saved with ID: 1
```

### Common Issues:

1. **"ePub is not a function"** or **"ePub is undefined"**
   - Issue with epubjs import
   - Check if epubjs is installed: `npm list epubjs`

2. **"Failed to fetch"** or CORS error
   - Issue with cover image extraction
   - This is non-critical, book should still import

3. **Database error**
   - Check IndexedDB is enabled in browser
   - Try clearing browser data and reloading

4. **File picker doesn't open**
   - Check if button is clickable
   - Try clicking directly on the button text

## Manual Test:

Open browser console and run:
```javascript
// Test if epubjs is available
import('epubjs').then(ePub => console.log('epubjs loaded:', ePub))

// Test database
import('/src/lib/db.ts').then(({db}) => {
  db.books.toArray().then(books => console.log('Books in DB:', books))
})
```

## If Import Still Fails:

1. Check the exact error message in console
2. Try a different EPUB file (some may be corrupted)
3. Check browser compatibility (Chrome/Firefox/Safari latest)
4. Clear IndexedDB: DevTools → Application → IndexedDB → Delete "VibeReaderDB"
5. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
