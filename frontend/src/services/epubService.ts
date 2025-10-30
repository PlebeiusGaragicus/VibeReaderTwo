import ePub from 'epubjs';
import type { Book as EpubBook, Rendition } from 'epubjs';
import { db, type Book } from '../lib/db';
import { calculateFileHash } from '../lib/crypto';

export interface EpubMetadata {
  title: string;
  author: string;
  publisher?: string;
  description?: string;
  language?: string;
  isbn?: string;
}

export class EpubService {
  private book: EpubBook | null = null;
  private rendition: Rendition | null = null;

  /**
   * Parse EPUB file and extract metadata
   */
  async parseEpub(file: File): Promise<EpubMetadata> {
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    
    await book.ready;
    
    const metadata = await book.loaded.metadata;
    
    return {
      title: metadata.title || 'Unknown Title',
      author: metadata.creator || 'Unknown Author',
      publisher: metadata.publisher,
      description: metadata.description,
      language: metadata.language,
      isbn: metadata.identifier,
    };
  }

  /**
   * Extract cover image from EPUB
   */
  async extractCover(file: File): Promise<string | undefined> {
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    
    await book.ready;
    
    try {
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        // Convert to base64 for storage
        const response = await fetch(coverUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('Error extracting cover:', error);
    }
    
    return undefined;
  }

  /**
   * Import EPUB file into database
   */
  async importEpub(file: File): Promise<number> {
    try {
      console.log('Starting EPUB import for:', file.name);
      
      // Calculate file hash for duplicate detection
      console.log('Calculating file hash...');
      const fileHash = await calculateFileHash(file);
      console.log('File hash:', fileHash);
      
      // Check for duplicates
      const existingBook = await db.books.where('fileHash').equals(fileHash).first();
      if (existingBook) {
        console.log('Duplicate book found:', existingBook.title);
        throw new Error(`This book is already in your library: "${existingBook.title}" by ${existingBook.author}`);
      }
      
      console.log('Parsing metadata...');
      const metadata = await this.parseEpub(file);
      console.log('Metadata:', metadata);
      
      console.log('Extracting cover...');
      const coverImage = await this.extractCover(file);
      console.log('Cover extracted:', coverImage ? 'Yes' : 'No');
      
      const book: Book = {
        title: metadata.title,
        author: metadata.author,
        publisher: metadata.publisher,
        coverImage,
        epubFile: file,
        fileSize: file.size,
        fileHash,
        importDate: new Date(),
        metadata: {
          isbn: metadata.isbn,
          language: metadata.language,
          description: metadata.description,
        },
      };
      
      console.log('Saving to database...');
      const bookId = await db.books.add(book);
      console.log('Book saved with ID:', bookId);
      
      return bookId;
    } catch (error) {
      console.error('Error in importEpub:', error);
      throw error;
    }
  }

  /**
   * Load EPUB book for reading
   */
  async loadBook(bookId: number): Promise<EpubBook> {
    const book = await db.books.get(bookId);
    if (!book) {
      throw new Error('Book not found');
    }
    
    const arrayBuffer = await book.epubFile.arrayBuffer();
    this.book = ePub(arrayBuffer);
    await this.book.ready;
    
    return this.book;
  }

  /**
   * Render book in container
   */
  async renderBook(
    book: EpubBook,
    container: HTMLElement,
    settings?: {
      width?: number | string;
      height?: number | string;
      flow?: 'paginated' | 'scrolled';
    }
  ): Promise<Rendition> {
    this.rendition = book.renderTo(container, {
      width: settings?.width || '100%',
      height: settings?.height || '100%',
      flow: settings?.flow || 'paginated',
      manager: 'default',
      snap: true,
    });
    
    await this.rendition.display();
    
    return this.rendition;
  }

  /**
   * Navigate to specific location
   */
  async goToLocation(cfi: string) {
    if (!this.rendition) {
      throw new Error('Book not rendered');
    }
    await this.rendition.display(cfi);
  }

  /**
   * Get current location
   */
  getCurrentLocation(): string | null {
    if (!this.rendition) {
      return null;
    }
    const location = this.rendition.currentLocation();
    // @ts-ignore - epubjs types are incomplete
    return location?.start?.cfi || null;
  }

  /**
   * Navigate to next page
   */
  async nextPage() {
    if (!this.rendition) {
      throw new Error('Book not rendered');
    }
    await this.rendition.next();
  }

  /**
   * Navigate to previous page
   */
  async prevPage() {
    if (!this.rendition) {
      throw new Error('Book not rendered');
    }
    await this.rendition.prev();
  }

  /**
   * Get table of contents
   */
  async getTableOfContents() {
    if (!this.book) {
      throw new Error('Book not loaded');
    }
    await this.book.loaded.navigation;
    return this.book.navigation.toc;
  }

  /**
   * Apply theme to rendition
   */
  applyTheme(theme: 'light' | 'dark' | 'sepia') {
    if (!this.rendition) {
      return;
    }

    const themes = {
      light: {
        body: {
          background: '#ffffff',
          color: '#000000',
        },
      },
      dark: {
        body: {
          background: '#1a1a1a',
          color: '#e0e0e0',
        },
      },
      sepia: {
        body: {
          background: '#f4ecd8',
          color: '#5c4a3a',
        },
      },
    };

    this.rendition.themes.default(themes[theme]);
  }

  /**
   * Apply font settings
   */
  applyFontSettings(settings: {
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
  }) {
    if (!this.rendition) {
      return;
    }

    const styles: Record<string, string> = {};
    
    if (settings.fontSize) {
      styles['font-size'] = `${settings.fontSize}px`;
    }
    if (settings.fontFamily) {
      styles['font-family'] = settings.fontFamily;
    }
    if (settings.lineHeight) {
      styles['line-height'] = settings.lineHeight.toString();
    }

    this.rendition.themes.fontSize(`${settings.fontSize || 16}px`);
    if (Object.keys(styles).length > 0) {
      this.rendition.themes.default(styles);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.rendition) {
      this.rendition.destroy();
      this.rendition = null;
    }
    if (this.book) {
      this.book.destroy();
      this.book = null;
    }
  }
}

export const epubService = new EpubService();
