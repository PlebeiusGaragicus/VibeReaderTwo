# VibeReader - Technical Specification

## 1. Project Overview

**VibeReader** is a modern ebook reader application with integrated AI chat capabilities, built with React. It enables users to read EPUB files, annotate text, and interact with an AI assistant using selected content as context.

### 1.1 Core Value Proposition
- Read EPUB books with a clean, distraction-free interface
- Annotate and highlight text seamlessly
- Chat with AI using book content as context
- Preserve reading progress and annotations across sessions
- **Collaborative Reading**: Share books and annotations with others (NotebookLM-style)
- **Multi-perspective Views**: See annotations from any reader of the same book
- **Privacy Control**: Toggle individual highlights/notes/chats as private (encrypted)

---

## 2. Technical Stack

### 2.1 Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Context API + useReducer (or Zustand if complexity grows)

### 2.2 Backend
- **Framework**: Python FastAPI
- **Purpose**: 
  - AI chat orchestration (LangGraph agents)
  - RAG pipeline for book content
  - Passage summarization
  - Nostr event relay (optional proxy)
  - Blossom file management
- **API**: RESTful + WebSocket for real-time chat

### 2.3 EPUB Processing
- **Parser**: epub.js (or epubjs)
- **Format Support**: EPUB 2 and EPUB 3

### 2.4 AI Integration
- **API**: OpenAI-compatible API: https://webui.plebchat.me/api
- **Model**: qwen3-coder-30b-a3b-instruct-mlx
- **Agent Framework**: LangGraph
- **Agents**:
  - Chat agent (conversational Q&A about book content)
  - Summarization agent (chapter/passage summaries)
  - RAG agent (retrieval-augmented generation from book text)
  - Analysis agent (themes, characters, literary analysis)
- **Backend Integration**: FastAPI endpoints orchestrate LangGraph workflows

### 2.5 Data Persistence & Storage Architecture
- **Backend Server**: Python FastAPI (AI orchestration, RAG, optional Nostr proxy)
- **Nostr Events (NIP-33)**: Metadata, progress, settings, highlights, notes, chat
- **Blossom (BUD-01)**: EPUB files, cover images, exports
- **Local Cache**: IndexedDB (via Dexie.js) for offline EPUB access
- **Identity**: Nostr keypair (user owns their data)
- **Vector Store**: For RAG (embeddings of book content)

**See [NOSTR.md](./NOSTR.md) for complete architecture details.**

---

## 3. Feature Specifications

### 3.1 Book Management

#### 3.1.1 Library View
- **Display**: Grid/list view of imported books
- **Information**: Cover image, title, author, reading progress
- **Actions**: 
  - Import EPUB files (drag-and-drop or file picker)
  - Delete books from library
  - Search/filter books
  - Sort by title, author, date added, last read

#### 3.1.2 EPUB Import
- **File Input**: Support drag-and-drop and file selection
- **Validation**: Verify EPUB format before import
- **Extraction**: Parse metadata (title, author, cover, TOC)
- **Storage**: 
  - Upload EPUB to Blossom server (content-addressed)
  - Upload cover image to Blossom
  - Create Nostr event (kind 30001) with metadata and Blossom references
  - Cache EPUB locally in IndexedDB for offline access
- **Error Handling**: Display user-friendly errors for corrupted files

### 3.2 Reading Interface

#### 3.2.1 Book Viewer
- **Layout**: 
  - Main reading pane (center)
  - Optional sidebar for TOC/notes
  - Top navigation bar
  - Bottom progress indicator
- **Rendering**: 
  - Display EPUB content with original formatting
  - Support for embedded images
  - Responsive text sizing
  - Pagination or continuous scroll (user preference)

#### 3.2.2 Navigation
- **Chapter Navigation**: 
  - Previous/Next chapter buttons
  - Table of Contents sidebar
  - Chapter dropdown
- **Page Navigation**:
  - Arrow keys for page turning
  - Click zones (left/right edges)
  - Swipe gestures (mobile)
- **Progress Tracking**:
  - Visual progress bar
  - Page numbers (X of Y)
  - Percentage complete

#### 3.2.3 Reading Customization
- **Font Settings**:
  - Font family (serif, sans-serif, custom)
  - Font size (adjustable)
  - Line height
  - Letter spacing
- **Theme Settings**:
  - Light mode
  - Dark mode
  - Sepia mode
  - Custom background/text colors
- **Layout Settings**:
  - Page width
  - Margins
  - Pagination vs. scroll

### 3.3 Text Selection & Annotation

#### 3.3.1 Text Selection
- **Selection Method**: Standard browser text selection
- **Selection Actions**: Context menu appears on selection
- **Actions Available**:
  - Highlight (with color options)
  - Add note
  - Use for AI chat
  - Copy text
  - Define word (dictionary lookup)

#### 3.3.2 Highlights
- **Color Options**: Yellow, green, blue, pink, purple
- **Visual Display**: Background color on selected text
- **Persistence**: 
  - Each highlight stored as addressable event (kind 30004)
  - Addressable by unique ID
  - Editable (color changes replace event)
  - Synced across devices via Nostr relays
- **Management**: 
  - View all highlights
  - Edit highlight color (publishes updated event)
  - Delete highlights (publishes deletion marker)
  - **Publish highlight** (creates NIP-84 kind 9802 event for sharing)
  - Export highlights

#### 3.3.3 Notes
- **Creation**: Attach notes to selected text
- **Display**: 
  - Indicator icon on annotated text
  - Popover on hover/click
- **Persistence**:
  - Each note stored as addressable event (kind 30005)
  - Addressable by unique ID
  - Editable (updates replace event)
  - Synced across devices via Nostr relays
- **Editing**: Full CRUD operations (via Nostr event updates)
- **Organization**:
  - View all notes in sidebar
  - Search notes
  - **Publish note** (creates NIP-84 kind 9802 event with note as comment)
  - Export notes (Markdown, JSON)

### 3.4 AI Chat Integration

#### 3.4.1 Chat Interface
- **Layout**: 
  - Slide-out panel from right side
  - Resizable width
  - Chat history display
  - Input field at bottom
- **Chat Features**:
  - Message history
  - Markdown rendering in responses
  - Code syntax highlighting
  - Copy response button
  - Regenerate response
  - **Publish conversation** (share chat thread as NIP-84 events)

#### 3.4.2 Context Management
- **Selected Text Context**:
  - "Use for chat" action adds text to context
  - Visual indicator showing active context
  - Context preview in chat panel
  - Clear context button
- **Automatic Context**:
  - Current chapter/section metadata
  - Book title and author
  - Previous conversation history

#### 3.4.3 AI Capabilities
- **Question Answering**: Answer questions about book content
- **Summarization**: Summarize chapters or selections
- **Analysis**: Analyze themes, characters, writing style
- **Definitions**: Explain concepts or terms
- **Discussion**: Engage in literary discussion

#### 3.4.4 API Configuration
- **Settings**:
  - API key input (stored securely)
  - Model selection
  - Temperature/creativity settings
  - Max tokens
- **Provider Support**: 
  - OpenAI (primary)
  - Anthropic Claude (future)
  - Local models (future)

### 3.5 Collaborative Reading & Discovery

#### 3.5.1 Privacy Toggle
- **Per-Item Privacy**: Each highlight, note, and chat message has a privacy toggle
- **Public (Default)**:
  - Published as plaintext addressable event
  - Visible to anyone querying the book
  - Discoverable by other readers
- **Private**:
  - Content encrypted with user's private key (NIP-04 or NIP-44)
  - Still published to relays (same event structure)
  - Only decryptable by the user
  - Appears as encrypted blob to others
- **UI**: Simple lock icon toggle on each annotation

#### 3.5.2 View Other Readers' Annotations
- **Annotation Layer Switcher**: Dropdown to select whose annotations to view
  - "My Annotations" (default)
  - "All Public Annotations" (combined view)
  - "[Username]'s Annotations" (specific reader)
  - "No Annotations" (clean reading)
- **Discovery**:
  - Enter any Nostr public key (npub)
  - View their public annotations for the current book
  - Read-only view of their highlights, notes, and chats
- **Multi-Perspective Reading**:
  - See how different people interpreted the same passages
  - Compare annotations side-by-side
  - Learn from other readers' insights

#### 3.5.3 Shared Book Access
- **Same EPUB, Multiple Readers**:
  - Books stored on Blossom (content-addressed by hash)
  - Multiple users can reference the same Blossom file
  - Each user creates their own book metadata event (kind 30001)
  - Annotations reference the book by Blossom hash + CFI
- **Discovery Flow**:
  1. User imports EPUB → uploads to Blossom
  2. Creates book metadata event with Blossom hash
  3. Other users can:
     - Import same EPUB (deduped by hash)
     - Or reference existing Blossom file
  4. Query annotations by Blossom hash to find all readers

#### 3.5.4 Reader Discovery
- **Find Readers of a Book**:
  - Query: "Who else has read this book?"
  - Shows list of public keys with annotations for this book
  - Display username (from NIP-05 or profile metadata)
  - Show annotation count, last activity
- **Browse Someone's Library**:
  - Enter a public key
  - See all books they've read (public book metadata events)
  - View their annotations for any book
  - Read-only access to their entire reading workspace
- **No Social Graph Needed**:
  - No following/followers
  - No likes, comments, or replies
  - Pure discovery based on content and public keys

#### 3.5.5 Collaborative Use Cases
- **Study Groups**: Multiple students reading same textbook
- **Book Clubs**: Members share annotations and discussions
- **Research**: Scholars annotating primary sources
- **Teaching**: Instructor shares annotated version with students
- **Public Intellectuals**: Share reading notes with audience

### 3.6 Data Persistence

**All data is stored using Nostr events and Blossom file storage. See [NOSTR.md](./NOSTR.md) for complete details.**

#### 3.6.1 Reading Progress
- **Auto-save**: Save position every 5 seconds and on page turn
- **Storage**: NIP-33 event (kind 30002) per book
- **Data Stored**:
  - Current CFI (Canonical Fragment Identifier)
  - Chapter index
  - Scroll position
  - Timestamp
- **Sync**: Automatically syncs across devices via Nostr relays

#### 3.6.2 Annotations Storage
- **Highlights**: Addressable event (kind 30004) per highlight
  - CFI range
  - Color
  - Privacy flag (public/private)
  - If private: content encrypted with NIP-04/NIP-44
  - Blossom hash reference (for book deduplication)
  - Creation/update timestamp
  - Addressable by unique ID
  - Editable (color changes, privacy toggle, deletions)
- **Notes**: Addressable event (kind 30005) per note
  - CFI range
  - Note text (encrypted if private)
  - Privacy flag (public/private)
  - Blossom hash reference
  - Creation/modification timestamps
  - Addressable by unique ID
  - Editable
- **Chat Messages**: Addressable event (kind 30100) per message
  - Message content (encrypted if private)
  - Privacy flag (public/private)
  - Context references (highlight/note event IDs)
  - Blossom hash reference
  - Timestamp

#### 3.6.3 Library Data
- **Book Metadata**: NIP-33 event (kind 30001) per book
  - Title, author, publisher
  - Blossom hash references (EPUB, cover)
  - File size
  - Import date
  - Last read date
- **EPUB File**: 
  - Stored on Blossom server (content-addressed)
  - Cached locally in IndexedDB for offline access

---

## 4. User Interface Design

### 4.1 Design Principles
- **Minimalist**: Clean, distraction-free reading experience
- **Accessible**: WCAG 2.1 AA compliance
- **Responsive**: Works on desktop, tablet, and mobile
- **Intuitive**: Common ebook reader patterns

### 4.2 Key Screens

#### 4.2.1 Library Screen
```
┌─────────────────────────────────────────┐
│ VibeReader           [Search] [+Import] │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │ Book │  │ Book │  │ Book │         │
│  │Cover │  │Cover │  │Cover │         │
│  └──────┘  └──────┘  └──────┘         │
│  Title      Title     Title            │
│  Author     Author    Author           │
│  45%        12%       100%             │
│                                         │
└─────────────────────────────────────────┘
```

#### 4.2.2 Reading Screen
```
┌─────────────────────────────────────────────────────┐
│ [≡] Book Title  [View: My Annotations ▾] [Aa] [☀] [💬] [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│         Chapter Content Here                        │
│                                                     │
│    Lorem ipsum dolor sit amet,                      │
│    consectetur adipiscing elit.                     │
│    Highlighted text appears with                    │
│    background color.                                │
│                                                     │
│    [Note icon] Text with note                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░  45%                │
└─────────────────────────────────────────────────────┘
```

#### 4.2.3 Annotation Layer Switcher
```
┌─────────────────────────────┐
│ View Annotations:           │
├─────────────────────────────┤
│ ✓ My Annotations            │
│   All Public Annotations    │
│   No Annotations            │
├─────────────────────────────┤
│ Other Readers:              │
│   alice@nostr.com           │
│   bob (npub1...)            │
│   charlie@example.com       │
├─────────────────────────────┤
│ [Enter npub to discover...] │
└─────────────────────────────┘
```

#### 4.2.3 Chat Panel (Overlay)
```
┌─────────────────────────┐
│ AI Chat          [×]    │
├─────────────────────────┤
│ Context: "Selected..."  │
│ [Clear]                 │
├─────────────────────────┤
│                         │
│ User: What does this    │
│ passage mean?           │
│                         │
│ AI: This passage...     │
│                         │
│                         │
├─────────────────────────┤
│ [Type message...]  [→]  │
└─────────────────────────┘
```

### 4.3 Interaction Patterns

#### Text Selection Menu
```
┌─────────────────────────┐
│ 🎨 Highlight            │
│ 📝 Add Note             │
│ 💬 Use for Chat         │
│ 📋 Copy                 │
└─────────────────────────┘
```

#### Highlight Context Menu
```
┌─────────────────────────┐
│ 🎨 Change Color         │
│ 📝 Add Note             │
│ 🔒 Make Private         │  ← Toggle (shows 🔓 if private)
│ 🗑️  Delete              │
└─────────────────────────┘
```

#### Note Context Menu
```
┌─────────────────────────┐
│ ✏️  Edit Note            │
│ 🔒 Make Private         │  ← Toggle (shows 🔓 if private)
│ 🗑️  Delete              │
└─────────────────────────┘
```

#### Highlight/Note with Privacy Indicator
```
┌─────────────────────────────────────┐
│ "Highlighted text passage"          │
│                                     │
│ [Yellow] [🔒 Private]               │  ← Privacy badge
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ "Highlighted text passage"          │
│                                     │
│ [Green] [🌐 Public]                 │  ← Public badge
└─────────────────────────────────────┘
```

#### Discovery Panel
```
┌─────────────────────────────────────┐
│ Discover Readers               [×]  │
├─────────────────────────────────────┤
│                                     │
│ Enter Nostr Public Key:             │
│ ┌─────────────────────────────────┐ │
│ │ npub1... or user@domain.com     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Or browse readers of this book:     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ alice@nostr.com                 │ │
│ │ 47 annotations · 2 days ago     │ │
│ │ [View Annotations]              │ │
│ ├─────────────────────────────────┤ │
│ │ bob (npub1abc...)               │ │
│ │ 23 annotations · 1 week ago     │ │
│ │ [View Annotations]              │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 5. Data Models

### 5.1 Book
```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  coverImage?: string; // base64 or blob URL
  blossomHash: string; // SHA-256 hash of EPUB file
  blossomUrl: string; // URL to EPUB on Blossom server
  epubFile?: Blob; // Local cache (optional)
  fileSize: number;
  importDate: Date;
  lastReadDate?: Date;
  currentPosition?: {
    cfi: string;
    chapter: number;
    percentage: number;
  };
  metadata?: {
    isbn?: string;
    language?: string;
    description?: string;
  };
}
```

### 5.2 Highlight
```typescript
interface Highlight {
  id: string;
  bookId: string;
  blossomHash: string; // For cross-user book matching
  cfiRange: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  text: string; // The highlighted text (encrypted if private)
  isPrivate: boolean; // Privacy toggle
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3 Note
```typescript
interface Note {
  id: string;
  bookId: string;
  blossomHash: string; // For cross-user book matching
  cfiRange: string;
  text: string; // The selected text (encrypted if private)
  noteContent: string; // User's note (encrypted if private)
  isPrivate: boolean; // Privacy toggle
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.4 ChatMessage
```typescript
interface ChatMessage {
  id: string;
  bookId: string;
  blossomHash: string; // For cross-user book matching
  role: 'user' | 'assistant';
  content: string; // Encrypted if private
  isPrivate: boolean; // Privacy toggle
  context?: {
    selectedText?: string;
    cfiRange?: string;
    chapter?: string;
    highlightId?: string; // Reference to highlight event
    noteId?: string; // Reference to note event
  };
  timestamp: Date;
}
```

### 5.5 ReaderProfile
```typescript
interface ReaderProfile {
  pubkey: string; // Nostr public key
  npub: string; // Bech32 encoded pubkey
  username?: string; // From NIP-05 or profile metadata
  displayName?: string;
  avatar?: string;
  annotationCount: number; // For this book
  lastActivity: Date;
}
```

### 5.6 UserSettings
```typescript
interface UserSettings {
  reading: {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    theme: 'light' | 'dark' | 'sepia';
    pageMode: 'paginated' | 'scroll';
  };
  ai: {
    apiKey?: string;
    provider: 'openai' | 'anthropic';
    model: string;
    temperature: number;
  };
  ui: {
    libraryView: 'grid' | 'list';
    sidebarPosition: 'left' | 'right';
  };
}
```

---

## 6. API Specifications

### 6.1 OpenAI Integration

#### Chat Completion Request
```typescript
interface ChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}
```

#### System Prompt Template
```
You are a helpful AI assistant integrated into an ebook reader called VibeReader. 
You help readers understand and discuss the book they're reading.

Book: {bookTitle} by {bookAuthor}
Current Chapter: {chapterTitle}

{selectedTextContext}

Provide thoughtful, accurate responses based on the book content.
```

---

## 7. File Structure

```
VibeReaderTwo/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── agents/            # LangGraph agents
│   │   │   ├── chat_agent.py
│   │   │   ├── summarization_agent.py
│   │   │   ├── rag_agent.py
│   │   │   └── analysis_agent.py
│   │   ├── routers/           # API routes
│   │   │   ├── chat.py
│   │   │   ├── books.py
│   │   │   └── nostr.py
│   │   ├── services/
│   │   │   ├── nostr_service.py
│   │   │   ├── blossom_service.py
│   │   │   └── vector_store.py
│   │   └── models/            # Pydantic models
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/                   # React frontend
├── public/
│   └── sample-books/          # Sample EPUB files
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── Library/
│   │   │   ├── BookGrid.tsx
│   │   │   ├── BookCard.tsx
│   │   │   └── ImportButton.tsx
│   │   ├── Reader/
│   │   │   ├── BookViewer.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── SelectionMenu.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── Annotations/
│   │   │   ├── HighlightLayer.tsx
│   │   │   ├── NotePopover.tsx
│   │   │   └── AnnotationsList.tsx
│   │   └── Chat/
│   │       ├── ChatPanel.tsx
│   │       ├── MessageList.tsx
│   │       ├── MessageInput.tsx
│   │       └── ContextDisplay.tsx
│   ├── hooks/
│   │   ├── useEpubReader.ts
│   │   ├── useAnnotations.ts
│   │   ├── useChat.ts
│   │   └── useLocalStorage.ts
│   ├── services/
│   │   ├── epubService.ts     # EPUB parsing and rendering
│   │   ├── nostrService.ts    # Nostr event operations
│   │   ├── blossomService.ts  # Blossom file storage
│   │   ├── localCache.ts      # IndexedDB cache for offline
│   │   ├── apiService.ts      # FastAPI backend communication
│   │   └── annotationService.ts
│   ├── contexts/
│   │   ├── BookContext.tsx
│   │   ├── SettingsContext.tsx
│   │   └── ChatContext.tsx
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   ├── utils/
│   │   ├── cfi.ts             # CFI utilities
│   │   └── helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── SPECIFICATION.md           # This file
└── README.md
```

---

## 8. Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Backend setup (FastAPI, LangGraph, Python dependencies)
- [ ] Frontend setup (Vite, React, TypeScript, TailwindCSS)
- [ ] Nostr service (frontend + backend)
- [ ] Blossom service (file upload/download)
- [ ] Local cache (IndexedDB for EPUBs)
- [ ] Basic routing (Library ↔ Reader)
- [ ] EPUB import (upload to Blossom, create Nostr event)
- [ ] Basic EPUB rendering with epub.js
- [ ] Library view with book cards (from Nostr events)
- [ ] FastAPI endpoints for chat initialization

### Phase 2: Reading Experience (Week 3-4)
- [ ] Navigation (chapters, pages)
- [ ] Reading progress tracking (NIP-33 events, auto-sync)
- [ ] Reader settings (font, theme, layout) stored in Nostr
- [ ] Multi-device sync testing
- [ ] Responsive design
- [ ] Keyboard shortcuts

### Phase 3: Annotations (Week 5-6)
- [ ] Text selection detection
- [ ] Highlight creation and display (NIP-33 events)
- [ ] Highlight color editing (event replacement)
- [ ] Note creation and editing (NIP-33 events)
- [ ] Annotations sidebar
- [ ] Annotation sync across devices

### Phase 4: AI Integration (Week 7-8)
- [ ] LangGraph chat agent implementation
- [ ] LangGraph summarization agent
- [ ] LangGraph RAG agent (vector store integration)
- [ ] FastAPI WebSocket for streaming responses
- [ ] Chat UI panel (frontend)
- [ ] Context management (reference highlights/notes by event ID)
- [ ] Selected text → chat context → backend
- [ ] Chat history persistence (Nostr events)
- [ ] Settings for API configuration (stored in Nostr)

### Phase 5: Collaborative Reading & Privacy (Week 9-10)
- [ ] Privacy toggle UI (lock icon on highlights/notes/chats)
- [ ] NIP-04/NIP-44 encryption implementation
- [ ] Annotation layer switcher dropdown
- [ ] Query annotations by Blossom hash (cross-user matching)
- [ ] Discovery panel (enter npub, browse readers)
- [ ] View other readers' public annotations (read-only)
- [ ] Reader profile display (username, annotation count)
- [ ] "Who else has read this book?" feature

### Phase 6: Polish & Features (Week 11-12)
- [ ] Export annotations
- [ ] Search within book
- [ ] Dictionary/definition lookup
- [ ] Performance optimization
- [ ] Error handling and loading states
- [ ] User onboarding/tutorial

### Phase 7: Advanced Features (Future)
- [ ] Multiple AI providers
- [ ] Book recommendations (based on Nostr reading history)
- [ ] Reading statistics and analytics
- [ ] Collaborative annotations (shared relays)
- [ ] Book clubs (group reading with shared highlights)
- [ ] Mobile app (React Native)
- [ ] Privacy features (NIP-04/NIP-44 encryption)
- [ ] Follow users and see their reading activity
- [ ] Trending books and highlights

---

## 9. Technical Considerations

### 9.1 Performance
- **Lazy Loading**: Load chapters on demand
- **Virtual Scrolling**: For long annotation lists
- **Debouncing**: For auto-save operations
- **Memoization**: React.memo for expensive components
- **Code Splitting**: Route-based code splitting

### 9.2 Security
- **API Keys**: Never expose in client code; use environment variables
- **Content Security**: Sanitize EPUB content to prevent XSS
- **Data Privacy**: 
  - User owns their data (Nostr keys)
  - Optional encryption (NIP-04/NIP-44) for private data
  - Private relays for sensitive content
  - Local EPUB cache for offline reading
- **Key Management**: Secure storage of Nostr private keys

### 9.3 Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and semantic HTML
- **Focus Management**: Proper focus handling in modals
- **Color Contrast**: WCAG AA compliance
- **Text Scaling**: Support browser zoom

### 9.4 Browser Compatibility
- **Target**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Minimum**: ES2020 support
- **Fallbacks**: Graceful degradation for older browsers

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Utility functions (CFI parsing, text extraction)
- Service layer (storage, AI API)
- Custom hooks

### 10.2 Integration Tests
- EPUB import flow
- Annotation creation and retrieval
- Chat with context

### 10.3 E2E Tests
- Complete reading session
- Import → Read → Annotate → Chat workflow
- Settings persistence

### 10.4 Manual Testing
- Cross-browser testing
- Various EPUB files (different versions, complexities)
- Performance with large books
- Mobile responsiveness

---

## 11. Success Metrics

### 11.1 Functional
- ✅ Successfully import and render EPUB 2/3 files
- ✅ Create, edit, delete highlights and notes
- ✅ Chat with AI using book context
- ✅ Persist all data across sessions

### 11.2 Performance
- ⚡ Initial load < 2 seconds
- ⚡ Page turn < 100ms
- ⚡ AI response < 5 seconds
- ⚡ Smooth scrolling (60fps)

### 11.3 User Experience
- 😊 Intuitive first-time use (no tutorial needed for basic features)
- 😊 Accessible to screen reader users
- 😊 Works offline (except AI chat)

---

## 12. Future Enhancements

### 12.1 Content Features
- PDF support
- Audiobook integration
- Multi-language support
- OCR for scanned books

### 12.2 AI Features
- Voice chat
- AI-generated summaries
- Character/theme tracking
- Reading comprehension quizzes

### 12.3 Social Features
- Book clubs
- Shared annotations
- Reading challenges
- Social recommendations


---

## 13. Open Questions

1. **AI Provider**: Should we support multiple AI providers from the start?
2. **Monetization**: Free tier with API key, or subscription model?
3. **Privacy**: Default to public Nostr events or encrypted by default?
4. **Relay Selection**: Use public relays, paid relays, or let users choose?
5. **Collaboration**: Should multiple users be able to share annotations via shared relays?
6. **Content Sources**: Integration with book stores or libraries?
7. **Blossom Redundancy**: Upload to multiple Blossom servers for backup?

---

## Appendix A: Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.0.0",
  "vite": "^5.0.0"
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-*": "latest",
  "lucide-react": "^0.300.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0"
}
```

### EPUB Processing
```json
{
  "epubjs": "^0.3.93"
}
```

### Nostr & Storage
```json
{
  "nostr-tools": "^2.0.0",
  "websocket-polyfill": "^0.0.3",
  "blossom-client-sdk": "^1.0.0",
  "dexie": "^3.2.4",
  "dexie-react-hooks": "^1.1.7"
}
```

### Backend (Python)
```txt
fastapi==0.104.0
uvicorn[standard]==0.24.0
langgraph==0.0.40
langchain==0.1.0
python-nostr==0.0.2
httpx==0.25.0
pydantic==2.5.0
chromadb==0.4.18  # or other vector store
```

### Utilities
```json
{
  "uuid": "^9.0.0",
  "date-fns": "^2.30.0",
  "react-markdown": "^9.0.0",
  "react-syntax-highlighter": "^15.5.0"
}
```

---

## Appendix B: Resources

- **EPUB Spec**: https://www.w3.org/publishing/epub3/
- **epub.js Documentation**: http://epubjs.org/documentation/0.3/
- **OpenAI API**: https://platform.openai.com/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **Dexie.js**: https://dexie.org/
- **Nostr Protocol**: https://github.com/nostr-protocol/nostr
- **NIP-01 (Basics)**: https://github.com/nostr-protocol/nips/blob/master/01.md
- **NIP-33 (Parameterized Replaceable Events)**: https://github.com/nostr-protocol/nips/blob/master/33.md
- **Blossom (BUD-01)**: https://github.com/hzrd149/blossom
- **nostr-tools**: https://github.com/nbd-wtf/nostr-tools
