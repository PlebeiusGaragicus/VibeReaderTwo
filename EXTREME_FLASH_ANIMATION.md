# Extreme Flash Animation for Annotations

## Feature

When you click on an annotation in the sidebar to navigate to it, ALL annotations on that page will flash with an **EXTREME, IMPOSSIBLE-TO-MISS** animation.

## Animation Details

### Visual Effects
- **Bright yellow background** (rgba(255, 255, 0, 0.95))
- **Gold highlight** at peak (rgba(255, 215, 0, 0.95))
- **Scale up to 120%** of original size
- **Massive glow effect** (50px box shadow)
- **3 complete cycles** of the animation
- **1.8 seconds total** duration (0.6s × 3)

### Animation Sequence

Each cycle (0.6 seconds):
1. **0%** - Normal (transparent, no scale, no glow)
2. **25%** - Yellow flash + 15% scale + medium glow
3. **50%** - GOLD PEAK + 20% scale + MASSIVE glow
4. **75%** - Yellow flash + 15% scale + medium glow
5. **100%** - Back to normal

This repeats **3 times** for maximum visibility!

## Implementation

### CSS Animation
```css
@keyframes extreme-flash {
  0%, 100% {
    background-color: rgba(255, 255, 0, 0);
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 255, 0, 0);
  }
  25% {
    background-color: rgba(255, 255, 0, 0.95);
    transform: scale(1.15);
    box-shadow: 0 0 30px 10px rgba(255, 255, 0, 0.8);
  }
  50% {
    background-color: rgba(255, 215, 0, 0.95);
    transform: scale(1.2);
    box-shadow: 0 0 50px 20px rgba(255, 215, 0, 0.9);
  }
  75% {
    background-color: rgba(255, 255, 0, 0.95);
    transform: scale(1.15);
    box-shadow: 0 0 30px 10px rgba(255, 255, 0, 0.8);
  }
}

.annotation-flash-extreme {
  animation: extreme-flash 0.6s ease-in-out 3 !important;
  animation-fill-mode: forwards !important;
  display: inline-block !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  transition: all 0.2s ease-out !important;
}
```

### JavaScript Integration

1. **CSS Injection** - Styles are injected into the EPUB iframe on each page render
2. **Navigation Handler** - When navigating to annotation:
   - Navigate to CFI location
   - Re-render all annotations
   - Wait 300ms for page to render
   - Find all annotation marks in the iframe
   - Add `.annotation-flash-extreme` class to each
   - Remove class after 2 seconds

### Files Modified

1. **`index.css`** - Added CSS animation (also available in main app)
2. **`BookViewer.tsx`** - Two changes:
   - Inject CSS into iframe on `rendered` event
   - Apply animation class in `handleNavigateToAnnotation()`

## Why It Works

### Iframe CSS Injection
EPUB content is rendered in an iframe, which has its own isolated CSS context. We inject the animation styles directly into the iframe's `<head>` so the animation works on the book content.

### Multiple Annotations Flash
The effect applies to **ALL** annotations on the current page, not just the one you clicked. This ensures you see:
- The annotation you clicked on
- Any other annotations nearby
- The context of where you are in the book

### Impossible to Miss
With:
- 3 full cycles
- 20% size increase
- 50px glowing shadow
- Bright yellow/gold colors
- 1.8 second duration

**There is NO WAY a user can miss this!** 🎯

## Testing

```bash
# Restart to load changes
./start-dev.sh

# Test:
1. Create multiple highlights/notes in different parts of book
2. Open annotations sidebar
3. Click on an annotation
4. Watch the EXTREME flash animation
5. All annotations on that page should flash dramatically
```

## User Experience

**Before:** User clicks annotation, page changes, but might not immediately see where the annotation is.

**After:** User clicks annotation, page changes, and **BOOM!** - massive yellow/gold flashing with glow effect makes it impossible to miss. The user's eyes are immediately drawn to the annotations.

## Performance

- ✅ CSS animations (hardware accelerated)
- ✅ No JavaScript animation loops
- ✅ Automatic cleanup after 2 seconds
- ✅ Minimal performance impact

## Customization

To make it even more extreme, adjust in `BookViewer.tsx`:

```typescript
// More cycles
animation: extreme-flash 0.6s ease-in-out 5 !important;  // 5 cycles instead of 3

// Bigger scale
transform: scale(1.3);  // 30% instead of 20%

// Bigger glow
box-shadow: 0 0 80px 30px rgba(255, 215, 0, 0.9);  // Massive glow

// Longer duration
animation: extreme-flash 1s ease-in-out 3 !important;  // Slower, more dramatic
```

## Status

✅ **EXTREME FLASH ANIMATION ACTIVE!**

The animation is now live and will flash annotations dramatically when you navigate to them. It's impossible to miss! 🎉
