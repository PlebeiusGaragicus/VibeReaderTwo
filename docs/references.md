# References and Further Reading

This page contains links to external resources, documentation, and specifications that VibeReader is built upon.

## Core Technologies

### **Nostr Protocol**
- **NIPs (Nostr Implementation Possibilities)**: https://github.com/nostr-protocol/nips
- Learn about the decentralized protocol used for publishing and sharing annotations
- Particularly relevant: NIP-84 for highlights and annotations

### **EPUB Reading**
- **epub.js**: https://github.com/futurepress/epub.js
- The JavaScript library powering VibeReader's EPUB rendering engine
- Provides CFI (Canonical Fragment Identifier) support for precise location tracking

### **Backend Framework**
- **FastAPI**: https://fastapi.tiangolo.com
- Modern Python web framework used for VibeReader's REST API
- Automatic API documentation and async support

## Additional Resources

### **Database**
- **SQLAlchemy 2.0**: https://docs.sqlalchemy.org/en/20/
- ORM used for database models and queries
- **aiosqlite**: Async SQLite driver for desktop mode

### **Frontend**
- **React 19**: https://react.dev/
- **Vite**: https://vitejs.dev/
- **TailwindCSS**: https://tailwindcss.com/
- **shadcn/ui**: https://ui.shadcn.com/

### **Desktop**
- **Electron**: https://www.electronjs.org/
- **electron-builder**: For packaging desktop applications

## Specifications

### **EPUB Standard**
- **EPUB 3.3**: https://www.w3.org/TR/epub-33/
- **EPUB CFI**: https://idpf.org/epub/linking/cfi/

### **Nostr Integration**
- **NIP-84 (Highlights)**: https://github.com/nostr-protocol/nips/blob/master/84.md
- Defines the structure for publishing book highlights to Nostr
