# Annotation System

## Overview

The VibeReader annotation system supports three types of annotations that can be applied to any text selection:

1. **Highlights** - Color-coded text highlighting
2. **Notes** - Personal annotations with text content
3. **Chat Contexts** - AI-powered conversations about selected text

## Visual Indicators

### Highlights
- Text is highlighted with the selected color (yellow, green, blue, pink, or purple)
- Highlights are always visible when present

### Notes (RED Underline)
- If a selection has a note but NO highlight: **RED solid underline** (rgb(220, 38, 38))
- If a selection has both a note AND a highlight: Only the highlight color is shown

### Chat Contexts (BLUE Dotted Underline)
- If a selection has chat context(s) but NO highlight: **BLUE dotted underline** (rgb(37, 99, 235))
- If a selection has both chat context(s) AND a highlight: Only the highlight color is shown

## Unified Context Menu

When you select text or click on an existing annotation, a unified context menu appears with the following sections:

### HIGHLIGHT Section
- **If no highlight exists**: "Add Highlight" button
- **If highlight exists**: 
  - "Change Color" - Opens color picker showing current color
  - "Remove Highlight" - Deletes the highlight

### NOTE Section
- **If no note exists**: "Add Note" button
- **If note exists**:
  - Shows a snippet of the note content (clickable to view/edit)
  - "Remove Note" - Deletes the note

### CHAT Section
- **"New Chat"** - Start a new AI conversation about the selected text
- **"View Chats (N)"** - View list of previous chats (if any exist)
  - Shows user's prompt and creation date
  - Click to view full conversation

### OTHER ACTIONS
- **"Copy Text"** - Copy selected text to clipboard

## Features

### Multiple Annotations per Selection
Any text selection can have:
- ✅ A highlight (one color at a time)
- ✅ A note (one note per selection)
- ✅ Multiple chat contexts (unlimited conversations)

### Chat Integration
The chat feature integrates with OpenAI-compatible APIs:

1. **Configuration**: Set up API credentials in `.env` file:
   ```bash
   VITE_API_BASE_URL=https://api.openai.com/v1
   VITE_API_MODEL_NAME=gpt-4
   VITE_API_KEY=your-api-key-here
   ```

2. **Usage**:
   - Select text → Click "New Chat" from context menu
   - Enter your question or prompt
   - AI response is saved with the selection
   - View past conversations anytime

### Editing Annotations
- **Highlights**: Click on highlighted text → "Change Color" or "Remove Highlight"
- **Notes**: Click on underlined text → View/edit note content or remove
- **Chats**: Click on dotted underline → View chat history

## Database Schema

### Highlights Table
```typescript
interface Highlight {
  id?: number;
  bookId: number;
  cfiRange: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Notes Table
```typescript
interface Note {
  id?: number;
  bookId: number;
  cfiRange: string;
  text: string;
  noteContent: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chat Contexts Table
```typescript
interface ChatContext {
  id?: number;
  bookId: number;
  cfiRange: string;
  text: string;
  userPrompt: string;
  aiResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Services

### Annotation Service
Located in `/frontend/src/services/annotationService.ts`

Key methods:
- `createHighlight()`, `updateHighlightColor()`, `deleteHighlight()`
- `createNote()`, `updateNote()`, `deleteNote()`
- `createChatContext()`, `getChatContextsByRange()`, `deleteChatContext()`
- `getAnnotationsByRange()` - Get all annotations for a CFI range

### Chat Service
Located in `/frontend/src/services/chatService.ts`

Key methods:
- `initialize()` - Load API settings
- `chatAboutText()` - Send chat request with text context
- `updateSettings()` - Update API configuration

## Components

### UnifiedContextMenu
`/frontend/src/components/Reader/UnifiedContextMenu.tsx`
- Single context menu for all annotation operations
- Shows existing annotations and available actions
- Handles highlight colors, notes, and chat navigation

### ChatDialog
`/frontend/src/components/Reader/ChatDialog.tsx`
- Dialog for creating new chat conversations
- Shows selected text and prompt input
- Handles API communication and loading states

### ChatViewDialog
`/frontend/src/components/Reader/ChatViewDialog.tsx`
- View past chat conversations
- Shows selected text, user prompt, and AI response
- Read-only view of chat history

## Setup Instructions

1. **Copy environment file**:
   ```bash
   cd frontend
   cp .env.sample .env
   ```

2. **Configure API credentials** in `.env`:
   - Set your OpenAI-compatible API base URL
   - Set your model name
   - Add your API key

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. **Use annotations**:
   - Select any text in a book
   - Choose from highlight, note, or chat options
   - Click existing annotations to view or modify them

## Notes

- The database automatically migrates to version 3 to support chat contexts
- All annotations are stored locally in IndexedDB
- Chat API calls require internet connection
- Visual rendering prioritizes highlights over underlines for clarity
