# Reading Progress Architecture

## Overview

VibeReader uses a robust, multi-layered approach to track and restore reading progress across sessions. This document explains the architecture and best practices implemented.

## Core Concepts

### 1. CFI (Canonical Fragment Identifier)
- **What**: EPUB standard for referencing exact locations in a book
- **Role**: Primary source of truth for reader position
- **Format**: String like `epubcfi(/6/4[chap01ref]!/4/2/16[para05],/1:125,/3:561)`
- **Pros**: Precise, standard, works across different screen sizes
- **Cons**: Can become invalid if book structure changes

### 2. Locations Map
- **What**: Generated array dividing book into ~1024 character chunks
- **Role**: Enables percentage calculation from CFI
- **Storage**: Cached in `locations_data` field as JSON
- **Generation**: Done once per book, takes ~1-5 seconds
- **Performance**: Cached to avoid regeneration on every load

### 3. Location Index
- **What**: Numeric position in the locations array (0, 1, 2, ...)
- **Role**: Backup to CFI if CFI becomes invalid
- **Pros**: Simple, numeric, works even if CFI parsing fails
- **Cons**: Less precise than CFI, can drift with font size changes

### 4. Percentage
- **What**: Reading progress as 0-1 decimal (0.0 = 0%, 1.0 = 100%)
- **Role**: Cached for fast library display
- **Calculation**: Derived from CFI via `book.locations.percentageFromCfi(cfi)`

## Data Flow

### Saving Progress

```
User reads book
    ↓
Page turns / scroll events trigger location change
    ↓
Get current CFI from rendition
    ↓
Validate CFI (optional check, logs warning if invalid)
    ↓
Calculate percentage from CFI using locations map
    ↓
Calculate location_index from CFI (backup)
    ↓
Save to database: {
    current_cfi: string,        // Primary
    location_index: number,     // Backup
    percentage: number          // Cache for library
}
    ↓
Debounced API call (500ms delay to avoid excessive saves)
```

### Restoring Progress

```
Open book
    ↓
Load locations map (from cache or generate if missing)
    ↓
Load saved progress from database
    ↓
Try: Display book at current_cfi
    ↓
If CFI fails: Try display at location_index converted to CFI
    ↓
If all fails: Display from beginning
    ↓
Enable progress tracking after rendering completes
```

## Database Schema

```python
# backend/app/models/book.py
class Book:
    current_cfi: Optional[str]          # Primary: exact location
    location_index: Optional[int]       # Backup: numeric location
    percentage: Optional[float]          # Cached: 0-1 decimal
    locations_data: Optional[str]        # Cached: locations JSON
    last_read_date: Optional[datetime]   # Last interaction
```

## API Endpoint

```python
PATCH /api/books/{book_id}/progress
{
    "current_cfi": "epubcfi(...)",     # Required
    "location_index": 42,               # Optional but recommended
    "percentage": 0.42,                 # Optional, calculated on frontend
    "locations_data": "[...]"           # Optional, for caching
}
```

## Frontend Implementation

### Key Services

**epubService.ts**
- `getProgressData()` - Get all progress data at once
- `validateCfi(cfi)` - Check if CFI is valid
- `getPercentageFromCfi(cfi)` - Calculate percentage
- `getLocationIndexFromCfi(cfi)` - Get backup location
- `getCfiFromLocationIndex(index)` - Convert index back to CFI
- `loadOrGenerateLocations(cached)` - Load or generate locations map

**BookViewer.tsx**
- `saveProgress(cfi, percentage)` - Save with validation and backups
- `loadBook()` - Restore with fallback logic

## Best Practices Implemented

### ✅ Multi-Layer Redundancy
- **Primary**: CFI (most precise)
- **Backup**: location_index (if CFI fails)
- **Cache**: percentage (for library display)
- **Fallback**: Display from beginning (last resort)

### ✅ Performance Optimization
- Locations map cached in database
- Progress saves debounced (500ms)
- Locations generated once per book

### ✅ Error Recovery
- CFI validation before saving (logs warning)
- Automatic fallback to location_index
- Graceful degradation to book start

### ✅ Cross-Mode Compatibility
- Works in both paginated and scroll modes
- Uses `location.start.cfi` for consistency
- Handles different reading modes seamlessly

### ✅ Precision
- CFI for exact character-level positioning
- Percentage as 0-1 decimal for precision
- Location index for numeric backup

## Common Issues & Solutions

### Issue: Progress not saving
**Cause**: Initial load flag prevents saves during setup
**Solution**: `isInitialLoadRef` cleared after rendering completes

### Issue: Position wrong after reopening
**Cause**: CFI became invalid or book structure changed
**Solution**: Automatic fallback to location_index

### Issue: Percentage shows 0% despite progress
**Cause**: Locations not generated yet
**Solution**: Locations generated before display, cached for next time

### Issue: Slow book loading
**Cause**: Generating locations on every open
**Solution**: Locations cached in database

## Migration Guide

If you have existing data without `location_index`:

1. Run the migration script:
   ```bash
   cd backend
   python migrate_add_location_index.py
   ```

2. The field is optional, so existing data works fine

3. New saves will automatically include location_index

## Testing Checklist

- [ ] Open book, close, reopen - should resume at exact position
- [ ] Read in paginated mode, reopen in scroll mode - should work
- [ ] Clear locations_data, reopen - should regenerate and cache
- [ ] Manually corrupt CFI, reopen - should fallback to location_index
- [ ] Read to 50%, check library - should show 50% progress
- [ ] Turn pages rapidly - should not spam API (debounced)

## Performance Metrics

- **Locations generation**: 1-5 seconds (one-time per book)
- **Progress save frequency**: Max 2/second (500ms debounce)
- **CFI validation**: <1ms (optional, logs only)
- **Fallback recovery**: <100ms (if needed)

## Why Not Just Use Page Numbers?

Page numbers are:
- ❌ Device-dependent (change with screen size)
- ❌ Font-dependent (change with settings)
- ❌ Not part of EPUB standard
- ❌ Imprecise (can't resume mid-page)

CFI + locations is the industry standard approach used by:
- Adobe Digital Editions
- Calibre
- Google Play Books
- Apple Books

## References

- [EPUB CFI Specification](http://idpf.org/epub/linking/cfi/)
- [EPUB.js Documentation](https://github.com/futurepress/epub.js)
- [EPUB.js Locations API](https://github.com/futurepress/epub.js/wiki/Tips-and-Tricks#generate-locations)
