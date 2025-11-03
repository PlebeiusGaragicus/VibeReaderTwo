# macOS Traffic Lights Spacing Fix

## Problem
The macOS window control buttons (red/yellow/green "traffic lights") were too close to the app's navigation buttons, creating a cramped appearance in the upper left corner.

## Solution Overview
This is a standard issue in Electron apps on macOS. The fix involves:

1. **Window Configuration**: Use `titleBarStyle: 'hiddenInset'` (already configured)
2. **Draggable Region**: Mark the header as draggable so users can move the window
3. **Non-draggable Elements**: Make buttons/interactive elements non-draggable
4. **Traffic Light Spacing**: Add 70px spacer on the left to accommodate the buttons

## Implementation

### 1. Electron Window Configuration (Already Done)
**File**: `desktop/main.js` line 33

```javascript
mainWindow = new BrowserWindow({
  // ...
  titleBarStyle: 'hiddenInset',  // ✅ Already configured
});
```

This hides the default title bar but keeps the traffic lights visible.

### 2. Header Markup Changes

#### BookViewer.tsx Header
**File**: `frontend/src/components/Reader/BookViewer.tsx`

**Before**:
```tsx
<header className="border-b px-4 py-3 flex items-center justify-between">
  <div className="flex items-center gap-2">
```

**After**:
```tsx
<header className="border-b px-4 py-3 flex items-center justify-between drag-region">
  {/* macOS traffic light spacer */}
  <div className="macos-traffic-light-spacer" />
  <div className="flex items-center gap-2 no-drag">
```

**Key Changes**:
- Added `drag-region` class to header → makes header draggable
- Added `macos-traffic-light-spacer` div → creates 70px space for buttons
- Added `no-drag` to button containers → buttons remain clickable
- Added `no-drag` to title and right-side buttons

#### BookGrid.tsx Header
**File**: `frontend/src/components/Library/BookGrid.tsx`

Applied same pattern to the library view header.

### 3. CSS Styles
**File**: `frontend/src/index.css`

```css
/* Electron window dragging region (macOS) */
.drag-region {
  -webkit-app-region: drag;
  app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

/* macOS traffic light spacer - creates space for red/yellow/green buttons */
.macos-traffic-light-spacer {
  width: 70px;
  height: 0;
  flex-shrink: 0;
}

/* Hide traffic light spacer on web (when not in Electron) */
body:not(.electron) .macos-traffic-light-spacer {
  display: none;
}
```

## How It Works

### Draggable Regions
The `-webkit-app-region: drag` CSS property tells Electron that this area can be used to drag the window. Think of it as creating a "handle" for the window.

### Non-draggable Elements
The `-webkit-app-region: no-drag` property makes specific elements clickable/interactive within a draggable region. Without this, you couldn't click buttons in the header.

### Traffic Light Spacing
macOS traffic lights are positioned at:
- **Left**: ~12px from window edge
- **Top**: ~12px from window edge  
- **Width**: ~52px total (including spacing between buttons)

Our 70px spacer provides comfortable clearance.

### Layout Structure
```
┌─────────────────────────────────────────────┐
│ ●●●                                         │ ← Traffic lights
│ [spacer] [X] [≡] [</>] [Title] [Aa] [🎨]... │
└─────────────────────────────────────────────┘
    70px    ↑_____________↑
           All clickable
```

## Visual Result

**Before**:
```
●●● [X] [≡]  ← Cramped! Buttons overlap visual space
```

**After**:
```
●●●        [X] [≡]  ← Comfortable spacing
```

## Platform Handling

### macOS (Electron)
- Traffic light spacer shows → 70px left padding
- Header is draggable → users can move window
- Buttons are non-draggable → buttons remain clickable

### Web Browser
- Traffic light spacer hidden → no wasted space
- Drag region has no effect → standard browser behavior
- Everything works as before

The `.macos-traffic-light-spacer` is automatically hidden on web with the `body:not(.electron)` selector.

## Testing

### macOS Electron App
1. ✅ Launch desktop app
2. ✅ Verify comfortable spacing between traffic lights and X button
3. ✅ Try dragging window by clicking empty header space → should work
4. ✅ Click all header buttons → should all be clickable
5. ✅ Test both library view and book reader view

### Web Browser (Verify No Regression)
1. ✅ Open in browser
2. ✅ Verify no extra spacing on left (spacer should be hidden)
3. ✅ Verify all buttons work normally

## Best Practices for Electron Apps

### Standard Title Bar Styles (macOS)
1. **`default`** - Standard macOS title bar with text
2. **`hidden`** - No title bar, traffic lights in normal position
3. **`hiddenInset`** ✅ - No title bar, traffic lights slightly inset (best for custom UIs)
4. **`customButtonsOnHover`** - Traffic lights appear on hover

### Typical Spacing Guidelines
- **Traffic light clearance**: 70-80px from left edge
- **Draggable area height**: At least 52px for comfortable dragging
- **Button spacing**: Leave at least 8-12px margin around interactive elements

### Common Patterns

#### Pattern 1: Full-width draggable header
```tsx
<header className="drag-region">
  <div className="macos-traffic-light-spacer" />
  <div className="no-drag">{/* Buttons */}</div>
</header>
```

#### Pattern 2: Split layout (sidebars)
```tsx
<div className="flex">
  <aside className="drag-region">
    <div className="macos-traffic-light-spacer" />
  </aside>
  <main className="no-drag">
    {/* Content */}
  </main>
</div>
```

#### Pattern 3: Centered content with drag regions
```tsx
<header className="flex">
  <div className="flex-1 drag-region">
    <div className="macos-traffic-light-spacer" />
  </div>
  <div className="no-drag">{/* Centered content */}</div>
  <div className="flex-1 drag-region" />
</header>
```

## Troubleshooting

### Issue: Can't drag window
**Solution**: Ensure header has `drag-region` class and some empty space (not covered by buttons)

### Issue: Buttons not clickable
**Solution**: Add `no-drag` class to button containers

### Issue: Spacer showing on web
**Solution**: Verify `body:not(.electron)` CSS selector is working, or add platform detection

### Issue: Traffic lights still overlap
**Solution**: Increase spacer width from 70px to 80px or adjust left padding

## Alternative Approaches

### Option A: Frameless Window (Not Recommended)
```javascript
new BrowserWindow({
  frame: false,
  titleBarStyle: 'hidden'
});
```
**Drawbacks**: Must implement custom window controls, more complex

### Option B: Custom Title Bar Position
```javascript
// macOS only
mainWindow.setWindowButtonPosition({ x: 20, y: 20 });
```
**Drawbacks**: API is macOS-specific, limited control

### Option C: Standard Title Bar (Our Choice) ✅
```javascript
new BrowserWindow({
  titleBarStyle: 'hiddenInset'
});
```
**Benefits**: Native look, simple implementation, works with system theme

## Files Modified

1. **`frontend/src/components/Reader/BookViewer.tsx`**
   - Added `drag-region` to header
   - Added traffic light spacer
   - Added `no-drag` to interactive elements

2. **`frontend/src/components/Library/BookGrid.tsx`**
   - Added `drag-region` to header
   - Added traffic light spacer
   - Added `no-drag` to interactive elements

3. **`frontend/src/index.css`**
   - Added `.drag-region` and `.no-drag` classes
   - Added `.macos-traffic-light-spacer` class
   - Added web browser hiding rule

## Related Documentation

- [Electron BrowserWindow Options](https://www.electronjs.org/docs/latest/api/browser-window#new-browserwindowoptions)
- [Electron Frameless Windows](https://www.electronjs.org/docs/latest/tutorial/window-customization)
- [macOS Human Interface Guidelines - Window Anatomy](https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/window-anatomy/)

## Future Enhancements

Potential improvements:
1. Add Windows-specific title bar handling
2. Implement custom traffic light button styling (if desired)
3. Add double-click header to maximize/restore window
4. Responsive spacing for different window sizes
5. Add visual indicator for draggable regions during development
