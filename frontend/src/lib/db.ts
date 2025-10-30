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

export interface Settings {
  id?: number;
  reading: {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    theme: 'light' | 'dark' | 'sepia';
    pageMode: 'paginated' | 'scroll';
  };
}

export class VibeReaderDB extends Dexie {
  books!: Table<Book>;
  highlights!: Table<Highlight>;
  notes!: Table<Note>;
  settings!: Table<Settings>;

  constructor() {
    super('VibeReaderDB');
    this.version(1).stores({
      books: '++id, title, author, importDate, lastReadDate',
      highlights: '++id, bookId, createdAt',
      notes: '++id, bookId, createdAt',
      settings: '++id',
    });
    
    // Version 2: Add fileHash index for duplicate detection
    this.version(2).stores({
      books: '++id, title, author, importDate, lastReadDate, fileHash',
      highlights: '++id, bookId, createdAt',
      notes: '++id, bookId, createdAt',
      settings: '++id',
    });
  }
}

export const db = new VibeReaderDB();
