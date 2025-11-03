# UI Selection Fix - Desktop App Behavior

## Problem

UI elements (navbar, icons, buttons) were selectable and would highlight when click-dragging, which is not typical desktop app behavior. This made the app feel like a web page rather than a native application.

> **Note:** UI elements would highlight blue when dragging/selecting, making the interface feel web-like instead of native.

## Solution

Added CSS to disable text selection on all UI elements by default, while explicitly enabling it only for:
- Book content (where users need to select text)
- Input fields
- Textareas
- Contenteditable elements

## Changes Made

### `frontend/src/index.css`

```css
body {
  /* Prevent text selection on UI elements (desktop app behavior) */
  user-select: none;
  -webkit-user-select: none;
}

/* Allow text selection only in book content and input fields */
.epub-container,
.epub-view,
input,
textarea,
[contenteditable="true"] {
  user-select: text !important;
  -webkit-user-select: text !important;
}
```

### `frontend/src/components/Reader/BookViewer.tsx`

Added `epub-container` class to the viewer div:

```tsx
<div 
  ref={viewerRef} 
  className="absolute inset-0 epub-container"
/>
```

## How It Works

1. **Default behavior**: All elements have `user-select: none`
   - Navbar text can't be selected
   - Icons can't be selected
   - Buttons can't be selected
   - UI chrome behaves like native desktop apps

2. **Exceptions**: Only specific elements allow selection
   - `.epub-container` - The book content area
   - `input` - Text input fields
   - `textarea` - Multi-line text areas
   - `[contenteditable="true"]` - Editable content

## Browser Compatibility

- `user-select` - Standard CSS property (all modern browsers)
- `-webkit-user-select` - For older WebKit browsers (Electron uses Chromium)

Both are included for maximum compatibility.

## Testing

After the frontend reloads:

1. ✅ Try to select the book title in navbar → Can't select
2. ✅ Try to select icons → Can't select
3. ✅ Try to select text in the book → Can select (works normally)
4. ✅ Try to select text in input fields → Can select

## Result

The app now feels like a proper desktop application where:
- UI chrome is not selectable (like native apps)
- Book content is fully selectable (as expected)
- Input fields work normally

This is standard behavior for desktop applications built with Electron, VS Code, Slack, Discord, etc.
