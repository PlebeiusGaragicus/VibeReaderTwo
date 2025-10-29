# VibeReader - Nostr + Blossom Architecture

## Overview

VibeReader uses a decentralized storage architecture combining **Nostr** for metadata and state management with **Blossom** for file storage. This eliminates the need for traditional backend infrastructure while providing automatic multi-device sync and data portability.

---

## Architecture Components

### **Nostr - Metadata & State**
- Reading progress (replaceable)
- User settings (replaceable)
- Highlights (individually addressable & editable)
- Notes (individually addressable & editable)
- Book metadata (replaceable)
- Chat messages (append-only or replaceable)

### **Blossom (BUD-01) - File Storage**
- EPUB files
- Cover images
- Exported annotations (PDF/Markdown)

### **Local Cache (IndexedDB)**
- Downloaded EPUB files (for offline reading)
- Temporary data cache

---

## Why This Architecture?

### **Benefits**

#### **No Backend Server Required**
- ❌ No database (PostgreSQL, MongoDB, etc.)
- ❌ No user authentication system
- ❌ No REST API endpoints
- ❌ No session management
- ❌ No backup/restore logic
- ❌ No sync conflict resolution

#### **What We Get Instead**
- ✅ Automatic multi-device sync
- ✅ Data portability (user owns their data)
- ✅ Censorship resistance
- ✅ Built-in identity (Nostr keys)
- ✅ Decentralized infrastructure
- ✅ No hosting costs

#### **For Highlights & Notes**
- ✅ **Editable**: Change color, content, any property
- ✅ **Addressable**: Direct reference by ID
- ✅ **Queryable**: Filter by book, color, date
- ✅ **Synced**: Automatic multi-device sync
- ✅ **No conflicts**: Latest event wins (by `created_at`)
- ✅ **Efficient**: Only one event per annotation (not append-only)

#### **For Files (Blossom)**
- ✅ **Decentralized**: No single point of failure
- ✅ **Content-addressed**: SHA-256 hash verification
- ✅ **Cacheable**: Store locally, fetch on demand
- ✅ **Portable**: Move between Blossom servers
- ✅ **Efficient**: No event size limits

---

## Nostr Event Kinds

We use **Addressable Events (formerly NIP-33)** for mutable state and **NIP-84** for shareable highlights.

### **Event Kind Registry**

| Kind | Type | Purpose | Replaceable | Standard |
|------|------|---------|-------------|----------|
| 30001 | Book Metadata | Store book info and Blossom references | Yes (per book) | Custom |
| 30002 | Reading Progress | Current reading position | Yes (per book) | Custom |
| 30003 | User Settings | Global app preferences | Yes (single) | Custom |
| 30004 | Personal Highlight | Editable highlight with color/notes | Yes (per highlight) | Custom |
| 30005 | Note | Individual note with content | Yes (per note) | Custom |
| 9802 | Shared Highlight | Immutable, shareable highlight | No (append-only) | NIP-84 |
| 30100 | Chat Message | AI chat messages | Optional | Custom |

### **Highlight Strategy: Dual Approach**

**Personal Annotations (Kind 30004):**
- Editable, private highlights
- Can change color, add notes
- Syncs across user's devices
- Only latest version stored

**Shared Highlights (Kind 9802 - NIP-84):**
- Immutable, public highlights
- For sharing with commentary
- Interoperable with other Nostr clients
- Social features

**See [NIP84_HIGHLIGHTS_EXPLAINED.md](./NIP84_HIGHLIGHTS_EXPLAINED.md) for detailed comparison.**

---

## Data Models

### **1. Book Metadata (Kind 30001)**

Stores book information and references to files on Blossom.

```typescript
{
  kind: 30001,
  tags: [
    ["d", "book-{bookId}"],           // Unique identifier
    ["title", "The Great Book"],       // For filtering/search
    ["author", "Jane Author"],         // For filtering/search
    ["isbn", "978-1234567890"],        // Optional
    ["t", "book"],                     // Type tag
  ],
  content: JSON.stringify({
    blossomHash: "sha256-abc123...",   // EPUB file hash
    blossomUrl: "https://cdn.blossom.com/abc123",
    coverBlossomHash: "sha256-def456...", // Cover image hash
    fileSize: 2458624,
    importDate: 1730234000,
    lastReadDate: 1730234567,
    metadata: {
      publisher: "Great Publisher",
      language: "en",
      description: "A wonderful book about...",
    }
  }),
  created_at: 1730234567,
  pubkey: "user-npub...",
}
```

**Key Features:**
- `d` tag makes it replaceable (updates replace old metadata)
- Blossom hash provides content-addressed file reference
- Searchable via title/author tags
- Last read date updates automatically

---

### **2. Reading Progress (Kind 30002)**

Tracks current reading position in each book. Updates replace previous position.

```typescript
{
  kind: 30002,
  tags: [
    ["d", "progress-{bookId}"],        // Unique per book
    ["book", "{bookId}"],               // Reference to book
  ],
  content: JSON.stringify({
    cfi: "epubcfi(/6/4[chap01ref]!/4/2/2[id001]/1:0)", // EPUB CFI
    chapter: 3,
    chapterTitle: "Chapter Three",
    percentage: 45.2,
    scrollPosition: 1234,
    timestamp: 1730234567,
  }),
  created_at: 1730234567,
  pubkey: "user-npub...",
}
```

**Key Features:**
- Automatically syncs across devices
- Latest position always wins
- CFI (Canonical Fragment Identifier) for precise positioning
- Percentage for progress bars

---

### **3. User Settings (Kind 30003)**

Global application settings. Single replaceable event.

```typescript
{
  kind: 30003,
  tags: [
    ["d", "vibereader-settings"],      // Fixed identifier
    ["app", "vibereader"],              // App namespace
  ],
  content: JSON.stringify({
    reading: {
      fontSize: 18,
      fontFamily: "serif",
      lineHeight: 1.6,
      theme: "dark",
      pageMode: "paginated",
    },
    ai: {
      provider: "openai",
      model: "qwen3-coder-30b",
      temperature: 0.7,
      apiEndpoint: "https://webui.plebchat.me/api",
    },
    ui: {
      libraryView: "grid",
      sidebarPosition: "right",
    },
    relays: [
      "wss://relay.damus.io",
      "wss://relay.primal.net",
    ],
    blossomServers: [
      "https://blossom.primal.net",
    ],
  }),
  created_at: 1730234567,
  pubkey: "user-npub...",
}
```

**Key Features:**
- Settings follow user across devices
- Single source of truth
- Includes relay and Blossom server preferences

---

### **4. Highlight (Kind 30004)**

Individual highlight with color. Each highlight is independently addressable and editable.

```typescript
{
  kind: 30004,
  tags: [
    ["d", "hl-{uuid}"],                // Unique, stable ID
    ["book", "{bookId}"],               // Filter by book
    ["book-title", "The Great Book"],   // Human-readable
    ["cfi", "epubcfi(...)"],           // For positioning
    ["color", "yellow"],                // Current color
    ["t", "highlight"],                 // Type tag
  ],
  content: JSON.stringify({
    text: "The highlighted passage text",
    cfiRange: "epubcfi(/6/4[chap01]!/4/2/2,/1:0,/1:142)",
    createdAt: 1730234000,
    updatedAt: 1730234567,             // Track edits
  }),
  created_at: 1730234567,              // Latest update time
  pubkey: "user-npub...",
}
```

**Key Features:**
- Change color by publishing new event with same `d` tag
- Query all highlights for a book
- Filter by color
- No duplicate events (replaceable)

**Editing Example:**
```typescript
// Change highlight color from yellow to green
async function changeHighlightColor(highlightId: string, newColor: string) {
  const currentEvent = await nostrService.getHighlight(highlightId);
  
  const updatedEvent = {
    ...currentEvent,
    tags: currentEvent.tags.map(tag => 
      tag[0] === "color" ? ["color", newColor] : tag
    ),
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(updatedEvent); // Replaces old event
}
```

---

### **5. Note (Kind 30005)**

Individual note attached to text selection. Editable and addressable.

```typescript
{
  kind: 30005,
  tags: [
    ["d", "note-{uuid}"],              // Unique, stable ID
    ["book", "{bookId}"],               // Filter by book
    ["book-title", "The Great Book"],   // Human-readable
    ["cfi", "epubcfi(...)"],           // For positioning
    ["t", "note"],                      // Type tag
    ["has-highlight", "true"],          // If attached to highlight
  ],
  content: JSON.stringify({
    selectedText: "The passage this note refers to",
    noteContent: "My thoughts about this passage...",
    cfiRange: "epubcfi(...)",
    createdAt: 1730234000,
    updatedAt: 1730234890,
  }),
  created_at: 1730234890,
  pubkey: "user-npub...",
}
```

**Key Features:**
- Edit note content anytime
- Attach to highlights
- Query all notes for a book
- Full text search via content

**Editing Example:**
```typescript
async function editNote(noteId: string, newContent: string) {
  const currentEvent = await nostrService.getNote(noteId);
  const data = JSON.parse(currentEvent.content);
  
  const updatedEvent = {
    kind: 30005,
    tags: currentEvent.tags,
    content: JSON.stringify({
      ...data,
      noteContent: newContent,
      updatedAt: Date.now(),
    }),
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(updatedEvent);
}
```

---

### **6. Chat Messages (Kind 30100 or Kind 1)**

AI chat messages. Can be replaceable (kind 30100) or append-only (kind 1).

**Option A: Replaceable Chat Sessions (Kind 30100)**
```typescript
{
  kind: 30100,
  tags: [
    ["d", "chat-{bookId}-{sessionId}"],
    ["book", "{bookId}"],
    ["role", "user"],                  // or "assistant"
    ["context", "{highlightEventId}"], // Reference to highlight/note
  ],
  content: JSON.stringify({
    message: "What does this passage mean?",
    contextText: "The highlighted passage...",
    timestamp: 1730234567,
  }),
  created_at: 1730234567,
  pubkey: "user-npub...",
}
```

**Option B: Append-Only Chat (Kind 1)**
```typescript
{
  kind: 1,
  tags: [
    ["t", "vibereader-chat"],
    ["book", "{bookId}"],
    ["context-event", "{highlightEventId}"],
    ["reply", "{previousMessageId}"],  // Thread messages
  ],
  content: "What does this passage mean?",
  created_at: 1730234567,
  pubkey: "user-npub...",
}
```

---

## Blossom Integration

### **What is Blossom?**

Blossom is a decentralized file storage protocol (BUD-01) that uses content-addressing (SHA-256) and Nostr authentication. Files are stored on Blossom servers and referenced by their hash.

### **Upload Flow**

```typescript
async function importBook(file: File) {
  // 1. Upload EPUB to Blossom
  const blossomHash = await blossomService.upload(file);
  
  // 2. Extract metadata
  const metadata = await epubService.parseMetadata(file);
  
  // 3. Upload cover image to Blossom
  const coverHash = await blossomService.upload(metadata.coverBlob);
  
  // 4. Create book metadata event
  const bookId = generateUUID();
  const event = {
    kind: 30001,
    tags: [
      ["d", `book-${bookId}`],
      ["title", metadata.title],
      ["author", metadata.author],
    ],
    content: JSON.stringify({
      blossomHash,
      blossomUrl: `https://cdn.blossom.com/${blossomHash}`,
      coverBlossomHash: coverHash,
      fileSize: file.size,
      importDate: Date.now(),
    }),
  };
  
  // 5. Publish to Nostr
  await nostrService.publish(event);
  
  // 6. Cache locally
  await localCache.store(bookId, file);
  
  return bookId;
}
```

### **Download Flow**

```typescript
async function openBook(bookId: string) {
  // 1. Check local cache first
  let epubBlob = await localCache.get(bookId);
  
  if (!epubBlob) {
    // 2. Fetch book metadata from Nostr
    const bookEvent = await nostrService.getBook(bookId);
    const metadata = JSON.parse(bookEvent.content);
    
    // 3. Download EPUB from Blossom
    epubBlob = await blossomService.download(metadata.blossomHash);
    
    // 4. Cache locally for offline access
    await localCache.store(bookId, epubBlob);
  }
  
  // 5. Load reading progress from Nostr
  const progress = await nostrService.getProgress(bookId);
  
  // 6. Load annotations
  const highlights = await nostrService.getHighlights(bookId);
  const notes = await nostrService.getNotes(bookId);
  
  return { epub: epubBlob, progress, highlights, notes };
}
```

### **Blossom Server Configuration**

Users can configure multiple Blossom servers for redundancy:

```typescript
const blossomServers = [
  "https://blossom.primal.net",
  "https://cdn.satellite.earth",
  // Add more servers
];
```

Files are uploaded to the primary server, with optional mirroring to backup servers.

---

## Common Workflows

### **1. Change Highlight Color**

```typescript
async function changeHighlightColor(highlightId: string, newColor: string) {
  // Fetch current event
  const currentEvent = await nostrService.getHighlight(highlightId);
  
  // Update color tag
  const updatedEvent = {
    kind: 30004,
    tags: currentEvent.tags.map(tag => 
      tag[0] === "color" ? ["color", newColor] : tag
    ),
    content: currentEvent.content,
    created_at: Math.floor(Date.now() / 1000),
  };
  
  // Publish - automatically replaces old event
  await nostrService.publish(updatedEvent);
}
```

### **2. Add Note to Highlight**

```typescript
async function addNoteToHighlight(highlightId: string, noteText: string) {
  const highlight = await nostrService.getHighlight(highlightId);
  const highlightData = JSON.parse(highlight.content);
  
  const noteId = generateUUID();
  const noteEvent = {
    kind: 30005,
    tags: [
      ["d", `note-${noteId}`],
      ["book", getTag(highlight, "book")],
      ["cfi", getTag(highlight, "cfi")],
      ["highlight", highlightId],
      ["t", "note"],
    ],
    content: JSON.stringify({
      selectedText: highlightData.text,
      noteContent: noteText,
      cfiRange: highlightData.cfiRange,
      createdAt: Date.now(),
    }),
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(noteEvent);
}
```

### **3. Delete Annotation**

```typescript
async function deleteHighlight(highlightId: string) {
  // Publish event with deletion marker
  const deleteEvent = {
    kind: 30004,
    tags: [
      ["d", highlightId],
      ["deleted", "true"],
    ],
    content: "",  // Empty content
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(deleteEvent);
}
```

### **4. Use Highlight in Chat**

```typescript
async function addHighlightToChatContext(highlightId: string) {
  const highlight = await nostrService.getHighlight(highlightId);
  const highlightData = JSON.parse(highlight.content);
  
  // Reference the highlight event in chat message
  const chatMessage = {
    kind: 1,
    tags: [
      ["t", "vibereader-chat"],
      ["book", getTag(highlight, "book")],
      ["context-event", highlightId],  // Reference to highlight
    ],
    content: `Regarding: "${highlightData.text}"\n\nWhat does this mean?`,
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(chatMessage);
}
```

### **5. Update Reading Progress**

```typescript
async function updateProgress(bookId: string, cfi: string, percentage: number) {
  const progressEvent = {
    kind: 30002,
    tags: [
      ["d", `progress-${bookId}`],
      ["book", bookId],
    ],
    content: JSON.stringify({
      cfi,
      percentage,
      timestamp: Date.now(),
    }),
    created_at: Math.floor(Date.now() / 1000),
  };
  
  // Auto-replaces previous progress
  await nostrService.publish(progressEvent);
}
```

---

## Query Patterns

### **Get All Books**

```typescript
const filter = {
  kinds: [30001],
  authors: [userPubkey],
  "#t": ["book"],
};
const books = await nostrService.query(filter);
```

### **Get All Highlights for a Book**

```typescript
const filter = {
  kinds: [30004],
  authors: [userPubkey],
  "#book": [bookId],
};
const highlights = await nostrService.query(filter);
```

### **Get Yellow Highlights Only**

```typescript
const filter = {
  kinds: [30004],
  authors: [userPubkey],
  "#book": [bookId],
  "#color": ["yellow"],
};
const yellowHighlights = await nostrService.query(filter);
```

### **Get Reading Progress**

```typescript
const filter = {
  kinds: [30002],
  authors: [userPubkey],
  "#d": [`progress-${bookId}`],
};
const progress = await nostrService.query(filter);
```

---

## Privacy Considerations

### **Public Data (Anyone Can Read)**
- Book titles you're reading
- Reading progress
- Highlights and notes
- Chat messages

### **Privacy Solutions**

#### **1. NIP-04 Encryption**
Encrypt event content for private data:

```typescript
const encryptedContent = await nip04.encrypt(
  recipientPubkey,
  JSON.stringify(sensitiveData)
);
```

#### **2. Private Relays**
Use personal or paid relays that require authentication:

```typescript
const privateRelays = [
  "wss://relay.yourdomain.com",
  "wss://paid-relay.example.com",
];
```

#### **3. Pseudonymous Keys**
Create a separate Nostr identity for reading:

```typescript
const readingKeys = generatePrivateKey();
// Use different keys for reading vs. social identity
```

---

## Relay Strategy

### **Recommended Relays**

```typescript
const defaultRelays = [
  "wss://relay.damus.io",      // General purpose
  "wss://relay.primal.net",    // Fast, reliable
  "wss://nos.lol",             // Popular
  "wss://relay.nostr.band",    // Good for queries
];
```

### **Relay Selection Criteria**
- ✅ Supports NIP-33 (parameterized replaceable events)
- ✅ Good uptime and reliability
- ✅ Fast query response
- ✅ Accepts your event kinds
- ✅ Optional: Paid/private for privacy

### **Fallback Strategy**
- Try multiple relays in parallel
- Cache events locally
- Retry failed publishes
- Allow user to configure relay list

---

## Implementation Checklist

### **Phase 1: Core Infrastructure**
- [ ] Nostr service (event signing, publishing, querying)
- [ ] Blossom service (upload, download, verification)
- [ ] Local cache (IndexedDB for EPUBs)
- [ ] Key management (Nostr identity)

### **Phase 2: Basic Features**
- [ ] Book import (upload to Blossom, create metadata event)
- [ ] Book library (query and display books)
- [ ] Reading progress (save and restore position)
- [ ] Settings sync (global preferences)

### **Phase 3: Annotations**
- [ ] Highlights (create, edit color, delete)
- [ ] Notes (create, edit, delete)
- [ ] Annotation display in reader
- [ ] Annotation list/sidebar

### **Phase 4: Advanced Features**
- [ ] Chat integration (reference highlights/notes)
- [ ] Multi-device sync testing
- [ ] Offline mode
- [ ] Export annotations

---

## Technical Dependencies

### **Nostr Libraries**
```json
{
  "nostr-tools": "^2.0.0",
  "websocket-polyfill": "^0.0.3"
}
```

### **Blossom Libraries**
```json
{
  "blossom-client-sdk": "^1.0.0"
}
```

### **Local Storage**
```json
{
  "dexie": "^3.2.4",
  "dexie-react-hooks": "^1.1.7"
}
```

---

## Resources

- **Nostr Protocol**: https://github.com/nostr-protocol/nostr
- **NIP-01 (Basics)**: https://github.com/nostr-protocol/nips/blob/master/01.md
- **NIP-33 (Parameterized Replaceable Events)**: https://github.com/nostr-protocol/nips/blob/master/33.md
- **Blossom (BUD-01)**: https://github.com/hzrd149/blossom
- **nostr-tools**: https://github.com/nbd-wtf/nostr-tools
- **Relay List**: https://nostr.watch/

---

## Future Enhancements

### **Collaborative Features**
- Share highlights with friends (publish to shared relay)
- Book clubs (group annotations)
- Public book reviews

### **Advanced Privacy**
- NIP-44 encryption (better than NIP-04)
- Tor relay support
- Zero-knowledge proofs for private reading stats

### **Performance Optimizations**
- Event batching
- Subscription management
- Intelligent relay selection
- CDN for Blossom files

### **Additional Features**
- Export to Obsidian/Notion (via Nostr events)
- Reading streaks and statistics
- Book recommendations based on reading history
- Integration with Nostr social features
