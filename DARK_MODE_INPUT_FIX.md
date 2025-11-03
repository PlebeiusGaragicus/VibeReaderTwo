# Dark Mode Input/Textarea Fix

## Problem
Input fields and textareas in dialogs had white backgrounds with white text in dark mode, making them unreadable.

## Root Cause
The input elements were missing Tailwind CSS theme-aware classes:
- `bg-background` - Uses theme's background color (white in light, dark in dark mode)
- `text-foreground` - Uses theme's text color (dark in light, light in dark mode)

Without these classes, the inputs defaulted to browser default styles which don't respect the app's theme.

## Fixed Components

### 1. NoteDialog.tsx
**Location**: `frontend/src/components/Reader/NoteDialog.tsx`

**Before**:
```tsx
<textarea
  className="w-full h-32 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
/>
```

**After**:
```tsx
<textarea
  className="w-full h-32 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
/>
```

### 2. ChatDialog.tsx
**Location**: `frontend/src/components/Reader/ChatDialog.tsx`

**Before**:
```tsx
<textarea
  className="mt-1 w-full min-h-[120px] p-3 border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary"
/>
```

**After**:
```tsx
<textarea
  className="mt-1 w-full min-h-[120px] p-3 border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
/>
```

### 3. ReaderSettings.tsx
**Location**: `frontend/src/components/Reader/ReaderSettings.tsx`

**Before**:
```tsx
<select
  className="w-full px-3 py-2 border rounded-md bg-background"
>
```

**After**:
```tsx
<select
  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
>
```

## How Tailwind Theme Classes Work

These utility classes are defined in `frontend/src/index.css` and automatically adapt to the theme:

```css
:root {
  --background: 0 0% 100%;    /* White in light mode */
  --foreground: 222.2 84% 4.9%; /* Dark text in light mode */
}

.dark {
  --background: 222.2 84% 4.9%; /* Dark in dark mode */
  --foreground: 210 40% 98%;    /* Light text in dark mode */
}
```

When you use `bg-background`, Tailwind converts it to:
```css
background-color: hsl(var(--background));
```

This ensures the input background automatically matches the theme.

## Testing

### Test in Light Mode
1. ✅ Open a book
2. ✅ Select text and add a note
3. ✅ Verify textarea has white background with dark text
4. ✅ Select text and start a chat
5. ✅ Verify textarea has white background with dark text
6. ✅ Open text formatting settings
7. ✅ Verify font family dropdown is readable

### Test in Dark Mode
1. ✅ Switch to dark theme
2. ✅ Select text and add a note
3. ✅ Verify textarea has dark background with light text
4. ✅ Select text and start a chat
5. ✅ Verify textarea has dark background with light text
6. ✅ Open text formatting settings
7. ✅ Verify font family dropdown has dark background with light text

### Test in Sepia Mode
1. ✅ Switch to sepia theme
2. ✅ Repeat above tests
3. ✅ Verify inputs have sepia-toned backgrounds with appropriate text colors

## Files Modified

1. **`frontend/src/components/Reader/NoteDialog.tsx`**
   - Added `bg-background text-foreground` to textarea

2. **`frontend/src/components/Reader/ChatDialog.tsx`**
   - Added `bg-background text-foreground` to textarea

3. **`frontend/src/components/Reader/ReaderSettings.tsx`**
   - Added `text-foreground` to select element

## Best Practices Going Forward

When creating new input elements, always include theme-aware classes:

```tsx
// ✅ Good - Theme aware
<input className="... bg-background text-foreground" />
<textarea className="... bg-background text-foreground" />
<select className="... bg-background text-foreground" />

// ❌ Bad - Will break in dark mode
<input className="..." />
<textarea className="..." />
<select className="..." />
```

## Additional Notes

- **Placeholder text**: Already handled by Tailwind's default styles
- **Border colors**: Use `border` class which respects `--border` CSS variable
- **Focus rings**: Use `focus:ring-primary` or `focus:ring-ring` for theme-aware focus states
- **Disabled states**: Consider adding `disabled:opacity-50 disabled:cursor-not-allowed`

## Related Issues Fixed

This fix is part of the broader theme implementation that includes:
1. ✅ System theme detection
2. ✅ Theme persistence in database
3. ✅ Resize handling for EPUB content
4. ✅ Unified settings application
5. ✅ Input field dark mode support (this fix)
