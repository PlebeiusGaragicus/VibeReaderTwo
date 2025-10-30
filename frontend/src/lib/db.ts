import Dexie, { type Table } from 'dexie';

export interface Book {
  id?: number;
  title: string;
  author: string;
  publisher?: string;
  coverImage?: string;
  epubFile: Blob;
  fileSize: number;
  fileHash: string; // SHA256 hash for duplicate detection
  importDate: Date;
  lastReadDate?: Date;
  currentCFI?: string;
  currentChapter?: number;
  percentage?: number;
  metadata?: {
    isbn?: string;
    language?: string;
    description?: string;
  };
}

export interface Highlight {
  id?: number;
  bookId: number;
  cfiRange: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id?: number;
  bookId: number;
  cfiRange: string;
  text: string;
  noteContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContext {
  id?: number;
  bookId: number;
  cfiRange: string;
  text: string;
  userPrompt: string;
  aiResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settings {
  id?: number;
  reading: {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    theme: 'light' | 'dark' | 'sepia';
    pageMode: 'paginated' | 'scroll';
  };
  api?: {
    baseUrl: string;
    modelName: string;
    apiKey: string;
  };
}

export class VibeReaderDB extends Dexie {
  books!: Table<Book>;
  highlights!: Table<Highlight>;
  notes!: Table<Note>;
  chatContexts!: Table<ChatContext>;
  settings!: Table<Settings>;

  constructor() {
    super('VibeReaderDB');
    // Single schema version - clear browser storage if schema changes
    this.version(1).stores({
      books: '++id, title, author, importDate, lastReadDate, fileHash',
      highlights: '++id, bookId, createdAt, [bookId+cfiRange]',
      notes: '++id, bookId, createdAt, [bookId+cfiRange]',
      chatContexts: '++id, bookId, cfiRange, createdAt, [bookId+cfiRange]',
      settings: '++id',
    });
  }
}

export const db = new VibeReaderDB();
