# Database Reset Script

## Purpose

The `reset-database.sh` script provides a safe way to completely clear all VibeReader data for a "first install" experience.

## What It Deletes

- ✅ SQLite database (`~/VibeReader/vibereader.db`)
- ✅ All EPUB book files (`~/VibeReader/books/`)
- ✅ All annotations (highlights, notes, chat contexts)
- ✅ All reading progress
- ✅ All settings

## Usage

```bash
./reset-database.sh
```

## Safety Features

1. **Double confirmation required**
   - First prompt: "Are you sure? (yes/no)"
   - Second prompt: "Type 'DELETE' to confirm"

2. **Stops running processes**
   - Automatically stops any running backend processes
   - Prevents database lock issues

3. **Recreates directory structure**
   - Ensures `~/VibeReader/books/` exists
   - Ready for fresh start

## Example Session

```bash
$ ./reset-database.sh

🗑️  VibeReader Database Reset
================================

This will DELETE ALL:
  - Books and their files
  - Highlights and annotations
  - Notes and chat contexts
  - Settings
  - Reading progress

Location: /Users/satoshi/VibeReader

Are you sure you want to continue? (yes/no): yes

🔴 FINAL WARNING: This cannot be undone!
Type 'DELETE' to confirm: DELETE

🗑️  Deleting all data...

1️⃣  Stopping any running backend processes...
2️⃣  Deleting database: /Users/satoshi/VibeReader/vibereader.db
   ✓ Database deleted
3️⃣  Deleting book files: /Users/satoshi/VibeReader/books
   ✓ Book files deleted
4️⃣  Recreating directory structure...
   ✓ Directories created

✅ Database reset complete!

The database will be automatically recreated when you start the backend.

To start fresh:
  ./start-dev.sh
```

## After Reset

1. The database will be automatically recreated when you start the backend
2. Default settings will be initialized
3. You'll need to import books again
4. All annotations and progress will be gone

## Use Cases

- **Testing**: Test the first-run experience
- **Development**: Clear test data
- **Troubleshooting**: Fix database corruption
- **Demo**: Show fresh installation to others
- **Privacy**: Remove all reading history

## Alternative: Selective Deletion

If you only want to delete specific data, use SQL commands:

```bash
# Delete all books
sqlite3 ~/VibeReader/vibereader.db "DELETE FROM books;"

# Delete all annotations
sqlite3 ~/VibeReader/vibereader.db "DELETE FROM highlights;"
sqlite3 ~/VibeReader/vibereader.db "DELETE FROM notes;"
sqlite3 ~/VibeReader/vibereader.db "DELETE FROM chat_contexts;"

# Reset settings to defaults
sqlite3 ~/VibeReader/vibereader.db "DELETE FROM settings;"
```

## Backup Before Reset

If you want to keep a backup:

```bash
# Backup database
cp ~/VibeReader/vibereader.db ~/VibeReader/vibereader.db.backup

# Backup books
cp -r ~/VibeReader/books ~/VibeReader/books.backup

# Then run reset
./reset-database.sh

# To restore later
cp ~/VibeReader/vibereader.db.backup ~/VibeReader/vibereader.db
cp -r ~/VibeReader/books.backup ~/VibeReader/books
```

## Troubleshooting

### "Database is locked"
The script automatically stops the backend, but if you still get this error:
```bash
# Manually stop all Python processes
pkill -9 python

# Then run reset again
./reset-database.sh
```

### "Permission denied"
Make sure the script is executable:
```bash
chmod +x reset-database.sh
```

### Script doesn't exist
Make sure you're in the project root:
```bash
cd /Users/satoshi/Downloads/VibeReaderTwo
./reset-database.sh
```
