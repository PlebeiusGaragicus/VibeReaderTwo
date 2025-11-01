# Clear Database (Remove Test Books)

If you have duplicate books from testing and want to start fresh:

## Option 1: Browser DevTools (Recommended)

1. Open http://localhost:5173
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Find **IndexedDB** in the left sidebar
5. Expand **VibeReaderDB**
6. Right-click on **VibeReaderDB** → **Delete database**
7. Refresh the page (Cmd+R or F5)

## Option 2: Console Command

Open browser console and run:

```javascript
// Delete all books
indexedDB.deleteDatabase('VibeReaderDB');
location.reload();
```

## Option 3: Selective Delete

To delete specific books (keep some, remove others):

```javascript
// First, see all books
const db = await import('/src/lib/db.ts').then(m => m.db);
const books = await db.books.toArray();
console.table(books);

// Delete a specific book by ID
await db.books.delete(1);  // Replace 1 with the book ID

// Or delete multiple books
await db.books.bulkDelete([1, 2, 3]);  // Replace with IDs to delete

// Refresh to see changes
location.reload();
```

## After Clearing

The app will show the empty state with "No books yet" message and you can start fresh with importing books.
