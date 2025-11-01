# VibeReader - Quick Start Guide

## Get Started in 3 Steps

### 1. Install & Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### 2. Import Your First Book

1. Click the **"Import EPUB"** button
2. Select an `.epub` file from your computer
3. Wait for the import to complete (1-3 seconds)
4. Your book appears in the library!

### 3. Start Reading

1. Click on the book cover
2. Use **arrow keys** or **click left/right** to navigate pages
3. Select text to **highlight** or **add notes**
4. Click the **settings icon** to customize your reading experience

## Key Features

### 📚 Library Management
- Import EPUB files
- View all your books with covers
- Track reading progress
- Resume where you left off

### 📖 Reading Experience
- **Navigation**: Arrow keys, click zones, or buttons
- **Table of Contents**: Click menu icon (☰)
- **Progress Tracking**: Automatic save every page turn
- **Themes**: Light, Dark, or Sepia

### ✏️ Annotations
- **Highlight**: Select text → choose color
- **Notes**: Select text → click "Note" → write
- **View All**: Click highlighter icon (🖍️) in header
- **Navigate**: Click any annotation to jump to location

### ⚙️ Customization
- **Font Size**: 12-32px slider
- **Font Family**: Serif, Sans Serif, or Monospace
- **Line Height**: Adjust spacing
- **Theme**: Light, Dark, or Sepia
- **Page Mode**: Paginated or Scroll

## Keyboard Shortcuts

- `←` / `→` : Previous / Next page
- `Esc` : Close reader (return to library)

## Tips & Tricks

### Getting EPUB Files
- **Public Domain**: Project Gutenberg, Standard Ebooks
- **Your Library**: Many libraries offer EPUB lending
- **Purchase**: Most ebook stores sell DRM-free EPUBs

### Best Practices
- Import books one at a time for best performance
- Use highlights for important passages
- Add notes for your thoughts and insights
- Adjust font size for comfortable reading
- Try different themes for different lighting conditions

### Data Storage
- All data stored locally in your browser
- No account required
- No internet connection needed (after import)
- Clear browser data = lose your library (be careful!)

## Troubleshooting

### Book won't import
- Make sure it's a valid `.epub` file
- Try a different EPUB file to test
- Check browser console for errors

### Highlights not showing
- Make sure you selected text before clicking color
- Try refreshing the page
- Check annotations sidebar to verify they were saved

### Settings not saving
- Make sure browser allows IndexedDB
- Check if you're in private/incognito mode
- Try a different browser

## What's Next?

This is the MVP (Minimum Viable Product) version. Future updates will include:

- 🌐 **Nostr Integration**: Share annotations with others
- 🤖 **AI Chat**: Discuss books with AI assistant
- 💻 **Desktop App**: Electron wrapper for native experience
- 🔍 **Search**: Find text within books
- 📤 **Export**: Save annotations to Markdown/JSON

## Need Help?

- Check `IMPLEMENTATION_STATUS.md` for technical details
- Read `frontend/README.md` for development info
- Review `SPECIFICATION.md` for full feature list

## Enjoy Reading! 📚

VibeReader is designed to be simple, fast, and privacy-focused. All your data stays on your device. Happy reading!
