# VibeReader - Desktop EPUB Reader

A modern, local-first EPUB reader built with React, TypeScript, and epub.js. Read your EPUB books with a clean interface, create highlights and notes, and customize your reading experience.

## Features

✅ **EPUB Import & Reading**
- Import EPUB files via file picker
- Beautiful book library with cover images
- Smooth page navigation (keyboard arrows, click zones, buttons)
- Table of contents navigation
- Reading progress tracking

✅ **Annotations**
- Highlight text in 5 colors (yellow, green, blue, pink, purple)
- Add notes to selected text
- View all highlights and notes in sidebar
- Navigate to annotations with one click
- Copy selected text to clipboard

✅ **Customization**
- 3 themes: Light, Dark, Sepia
- Adjustable font size (12-32px)
- Font family options (Serif, Sans Serif, Monospace)
- Line height control
- Paginated or scroll mode

✅ **Local Storage**
- All data stored locally in IndexedDB
- No cloud dependencies
- Fast offline access
- Privacy-first design

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **epub.js** - EPUB rendering
- **Dexie.js** - IndexedDB wrapper
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Usage

1. **Import a Book**: Click "Import EPUB" button and select an .epub file
2. **Read**: Click on any book cover to start reading
3. **Navigate**: Use arrow keys, click left/right edges, or navigation buttons
4. **Highlight**: Select text and choose a color from the popup menu
5. **Add Notes**: Select text and click "Note" to add your thoughts
6. **View Annotations**: Click the highlighter icon in the header
7. **Customize**: Click the settings icon to adjust fonts, themes, and layout

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── Library/         # Book library components
│   │   └── Reader/          # Reading interface components
│   ├── services/
│   │   ├── epubService.ts   # EPUB parsing and rendering
│   │   └── annotationService.ts  # Highlights and notes
│   ├── lib/
│   │   ├── db.ts            # IndexedDB database
│   │   └── utils.ts         # Utility functions
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── package.json
└── vite.config.ts
```

## Data Storage

All data is stored locally in your browser's IndexedDB:

- **Books**: EPUB files, metadata, cover images, reading progress
- **Highlights**: Text selections with colors and timestamps
- **Notes**: Text annotations with content
- **Settings**: Reading preferences (font, theme, layout)

## Future Enhancements

- Nostr integration for sharing annotations
- AI chat assistant for book discussions
- Full-text search within books
- Dictionary lookup
- Export annotations to Markdown/JSON
- Electron desktop app wrapper

## Development

Built with React + TypeScript + Vite

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
