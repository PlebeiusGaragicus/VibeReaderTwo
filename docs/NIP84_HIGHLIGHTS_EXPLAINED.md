# NIP-84: Highlights - Deep Dive

## What is NIP-84?

**NIP-84** defines a standard for **highlight events** in Nostr using **kind 9802**. It's designed to signal content a user finds valuable, similar to highlighting text in a book or article.

**Status**: `draft` `optional`

**Source**: https://github.com/nostr-protocol/nips/blob/master/84.md

---

## Event Structure

### Basic Format

```typescript
{
  kind: 9802,
  pubkey: "user-pubkey...",
  content: "The highlighted text goes here",
  tags: [
    ["r", "https://example.com/article"],  // Source URL
    // or
    ["e", "event-id", "relay-url"],        // Nostr event source
    // or
    ["a", "kind:pubkey:d-tag"],            // Addressable event source
  ],
  created_at: 1730234567,
}
```

### Key Fields

- **`.content`**: The highlighted portion of text
  - Can be empty for non-text media (audio/video)
- **`kind`**: Always `9802`
- **`tags`**: References to the source material

---

## Tagging the Source

### For Web URLs (r tag)

```typescript
{
  kind: 9802,
  content: "This is the highlighted passage",
  tags: [
    ["r", "https://example.com/article", "source"],
  ],
}
```

**Best practices:**
- Clean URLs of trackers and query parameters
- Use the `source` attribute to distinguish from mentions

### For Nostr Events (e tag)

```typescript
{
  kind: 9802,
  content: "Highlighted text from a Nostr note",
  tags: [
    ["e", "event-id-hex", "wss://relay.example.com"],
  ],
}
```

### For Addressable Events (a tag)

```typescript
{
  kind: 9802,
  content: "Highlighted text from an article",
  tags: [
    ["a", "30023:author-pubkey:article-d-tag", "wss://relay.example.com"],
  ],
}
```

---

## Attribution (p tags)

Tag the original authors of the material being highlighted:

```typescript
{
  kind: 9802,
  content: "Highlighted passage",
  tags: [
    ["r", "https://example.com/article", "source"],
    ["p", "author-pubkey-1", "wss://relay.example.com", "author"],
    ["p", "author-pubkey-2", "wss://relay.example.com", "author"],
    ["p", "editor-pubkey", "wss://relay.example.com", "editor"],
  ],
}
```

**Roles:**
- `author`: Original author
- `editor`: Editor of the content
- `mention`: For quote highlights (see below)

---

## Context Tag

Provide surrounding context for better understanding:

```typescript
{
  kind: 9802,
  content: "the most important sentence",  // The highlight
  tags: [
    ["r", "https://example.com/article", "source"],
    ["context", "This is the paragraph before. And this is the most important sentence in the whole article. This is the paragraph after."],
  ],
}
```

**Use case:** When the highlight is a subset of a paragraph, the `context` tag shows the surrounding text.

---

## Quote Highlights (with Comments)

Add a `comment` tag to create a quote highlight with your thoughts:

```typescript
{
  kind: 9802,
  content: "The highlighted passage from the book",
  tags: [
    ["r", "https://example.com/book", "source"],
    ["p", "author-pubkey", "wss://relay.example.com", "author"],
    ["comment", "This is my commentary on the highlighted text. I think it's profound because..."],
  ],
}
```

**Rendering:**
- Should be displayed like a quote repost
- The highlight is the quoted content
- The comment is your response

**Why?**
- Prevents creating two separate notes (highlight + kind 1 comment)
- Looks better in micro-blogging clients
- Keeps highlight and commentary together

### Quote Highlight with Mentions

```typescript
{
  kind: 9802,
  content: "Highlighted text",
  tags: [
    ["r", "https://example.com/article", "source"],
    ["p", "original-author", "", "author"],
    ["p", "friend-pubkey", "", "mention"],  // Mentioned in comment
    ["r", "https://related-article.com", "mention"],  // URL mentioned in comment
    ["comment", "Hey nostr:npub... check this out! Also see https://related-article.com"],
  ],
}
```

**Attributes:**
- `source`: The original highlighted source
- `mention`: References within the comment (not the source)

---

## NIP-84 vs Addressable Events (Kind 30000+)

### NIP-84 (Kind 9802) - Append-Only

```typescript
// Create highlight
{ kind: 9802, content: "text", tags: [["r", "url"]], id: "abc" }

// Create another highlight from same source
{ kind: 9802, content: "different text", tags: [["r", "url"]], id: "def" }

// Both events are stored permanently
// Cannot edit or update
// Each highlight is a separate, immutable event
```

**Characteristics:**
- ✅ **Immutable**: Once created, cannot be changed
- ✅ **Multiple highlights**: Can highlight many passages from same source
- ✅ **Append-only**: All highlights are preserved
- ❌ **No updates**: Cannot change highlight text or add notes later
- ❌ **No colors**: No built-in color support

### Addressable Events (Kind 30000+) - Replaceable

```typescript
// Create highlight
{
  kind: 30004,
  tags: [["d", "hl-001"], ["color", "yellow"]],
  content: "text",
}

// Update the same highlight (change color)
{
  kind: 30004,
  tags: [["d", "hl-001"], ["color", "green"]],  // Same d-tag
  content: "text",
}

// Only the latest version is stored
// Can edit, update, delete
```

**Characteristics:**
- ✅ **Mutable**: Can update color, notes, etc.
- ✅ **Efficient**: Only latest version stored
- ✅ **Custom fields**: Can add color, notes, etc.
- ❌ **One per address**: Cannot have multiple highlights with same ID
- ❌ **Not standard**: Custom implementation

---

## Which Should VibeReader Use?

### Option 1: NIP-84 (Kind 9802) - Standard Highlights

**Pros:**
- ✅ Standard Nostr protocol
- ✅ Interoperable with other clients
- ✅ Multiple highlights per source
- ✅ Immutable (good for sharing)

**Cons:**
- ❌ Cannot change color after creation
- ❌ Cannot edit notes
- ❌ No built-in color support
- ❌ Must create new event to "update"

**Best for:**
- Sharing highlights publicly
- Immutable annotations
- Cross-client compatibility

### Option 2: Addressable Events (Kind 30004) - Custom

**Pros:**
- ✅ Editable (change color, add notes)
- ✅ Efficient (no duplicates)
- ✅ Custom fields (color, CFI, etc.)
- ✅ Perfect for personal annotations

**Cons:**
- ❌ Not a standard (yet)
- ❌ May not work with other clients
- ❌ Custom implementation needed

**Best for:**
- Personal reading annotations
- Editable highlights
- Multi-device sync of current state

### Option 3: Hybrid Approach (Recommended)

Use **both** depending on the use case:

#### For Personal Annotations (Addressable Events)
```typescript
// Kind 30004 - Editable, personal highlights
{
  kind: 30004,
  tags: [
    ["d", "hl-uuid"],
    ["book", "book-id"],
    ["color", "yellow"],
    ["cfi", "epubcfi(...)"],
  ],
  content: JSON.stringify({
    text: "highlighted text",
    note: "my private notes",
  }),
}
```

**Use when:**
- User is reading and annotating
- Needs to change colors
- Needs to add/edit notes
- Personal, private annotations

#### For Sharing Highlights (NIP-84)
```typescript
// Kind 9802 - Shareable, immutable highlights
{
  kind: 9802,
  content: "The highlighted passage",
  tags: [
    ["a", "30001:my-pubkey:book-id"],  // Reference to book metadata
    ["p", "author-pubkey", "", "author"],
    ["comment", "This passage really resonated with me because..."],
  ],
}
```

**Use when:**
- User wants to share a highlight publicly
- Creating a quote with commentary
- Publishing book recommendations
- Social features

---

## Implementation for VibeReader

### Data Model

```typescript
// Personal annotation (addressable)
interface PersonalHighlight {
  kind: 30004;
  tags: [
    ["d", string],           // Unique ID
    ["book", string],        // Book ID
    ["color", string],       // yellow, green, etc.
    ["cfi", string],         // EPUB CFI
  ];
  content: {
    text: string;            // Highlighted text
    note?: string;           // Private notes
    cfiRange: string;
  };
}

// Shared highlight (NIP-84)
interface SharedHighlight {
  kind: 9802;
  content: string;           // Highlighted text
  tags: [
    ["a", string],           // Reference to book (kind 30001)
    ["p", string, string, "author"],  // Book author
    ["context", string],     // Surrounding text
    ["comment", string],     // User's commentary
  ];
}
```

### Workflow

1. **User highlights text while reading**
   - Create kind 30004 (addressable, editable)
   - Store locally and sync to Nostr

2. **User changes highlight color**
   - Update kind 30004 event (same d-tag)
   - Relay replaces old version

3. **User adds note to highlight**
   - Update kind 30004 event
   - Add note to content

4. **User wants to share highlight**
   - Create kind 9802 event (NIP-84)
   - Reference the book
   - Add commentary
   - Publish to relays

5. **User views shared highlights from others**
   - Query kind 9802 events
   - Filter by book reference
   - Display in social feed

---

## Example: Complete Highlight Flow

### 1. Create Personal Highlight

```typescript
async function createHighlight(bookId: string, text: string, cfiRange: string) {
  const highlightId = generateUUID();
  
  // Personal, editable highlight
  const event = {
    kind: 30004,
    tags: [
      ["d", `hl-${highlightId}`],
      ["book", bookId],
      ["color", "yellow"],
      ["cfi", cfiRange],
    ],
    content: JSON.stringify({
      text,
      cfiRange,
      createdAt: Date.now(),
    }),
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(event);
  return highlightId;
}
```

### 2. Change Color

```typescript
async function changeColor(highlightId: string, newColor: string) {
  const current = await nostrService.getEvent({
    kinds: [30004],
    "#d": [`hl-${highlightId}`],
  });
  
  // Update with same d-tag
  const updated = {
    ...current,
    tags: current.tags.map(tag => 
      tag[0] === "color" ? ["color", newColor] : tag
    ),
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(updated);
}
```

### 3. Share Highlight Publicly

```typescript
async function shareHighlight(highlightId: string, commentary: string) {
  // Get the personal highlight
  const highlight = await nostrService.getEvent({
    kinds: [30004],
    "#d": [`hl-${highlightId}`],
  });
  
  const data = JSON.parse(highlight.content);
  const bookId = getTag(highlight, "book");
  
  // Get book metadata
  const book = await nostrService.getEvent({
    kinds: [30001],
    "#d": [`book-${bookId}`],
  });
  
  const bookData = JSON.parse(book.content);
  
  // Create NIP-84 shareable highlight
  const shareEvent = {
    kind: 9802,
    content: data.text,  // The highlighted text
    tags: [
      ["a", `30001:${book.pubkey}:book-${bookId}`],  // Book reference
      ["p", bookData.authorPubkey, "", "author"],    // Book author
      ["comment", commentary],                        // User's thoughts
    ],
    created_at: Math.floor(Date.now() / 1000),
  };
  
  await nostrService.publish(shareEvent);
}
```

### 4. Query Shared Highlights for a Book

```typescript
async function getSharedHighlights(bookId: string) {
  const filter = {
    kinds: [9802],
    "#a": [`30001:*:book-${bookId}`],  // All highlights for this book
  };
  
  const highlights = await nostrService.query(filter);
  return highlights;
}
```

---

## Summary

### NIP-84 (Kind 9802)
- **Purpose**: Share valuable content highlights
- **Behavior**: Immutable, append-only
- **Best for**: Public sharing, social features
- **Standard**: Yes (draft)

### Addressable Events (Kind 30004)
- **Purpose**: Personal, editable annotations
- **Behavior**: Mutable, replaceable
- **Best for**: Private reading, color changes, notes
- **Standard**: No (custom)

### Recommendation for VibeReader
Use **both**:
- **Kind 30004** for personal reading annotations (editable)
- **Kind 9802** for sharing highlights publicly (immutable)

This gives users the best of both worlds:
- Private, editable highlights for personal use
- Public, shareable highlights for social features
