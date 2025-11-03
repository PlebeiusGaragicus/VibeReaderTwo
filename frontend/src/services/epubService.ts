import ePub from 'epubjs';
import type { Book as EpubBook, Rendition } from 'epubjs';
import { logger } from '../lib/logger';
import { bookApiService } from './bookApiService';

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
   * Import EPUB file via API
   * NOTE: This method is deprecated - use bookApiService.importBook() instead
   */
  async importEpub(file: File): Promise<number> {
    logger.info('EPUB', `Importing book: ${file.name}`);
    
    try {
      const book = await bookApiService.importBook(file);
      logger.info('EPUB', `Book imported successfully with ID: ${book.id}`);
      return book.id;
    } catch (error) {
      logger.error('EPUB', `Failed to import book: ${error}`);
      throw error;
    }
  }

  /**
   * Load EPUB book for reading
   */
  async loadBook(bookId: number): Promise<EpubBook> {
    logger.info('EPUB', `Loading book ID: ${bookId}`);
    
    try {
      // Get EPUB file URL from API
      const epubUrl = bookApiService.getBookFileUrl(bookId);
      logger.debug('EPUB', `Fetching EPUB from: ${epubUrl}`);
      
      // Fetch the EPUB file as a blob
      const response = await fetch(epubUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch EPUB: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      logger.info('EPUB', `Downloaded EPUB: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
      
      // Load EPUB from array buffer
      this.book = ePub(arrayBuffer);
      await this.book.ready;
      
      logger.info('EPUB', `Book loaded and parsed successfully`);
      return this.book;
    } catch (error) {
      logger.error('EPUB', `Failed to load book: ${error}`);
      throw error;
    }
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
   * Extract all scripts from EPUB content (debug feature)
   * Scans ALL files in the EPUB, not just spine items
   */
  async extractScripts(): Promise<{ file: string; scripts: { content: string; src?: string; type?: string }[] }[]> {
    if (!this.book) {
      throw new Error('Book not loaded');
    }

    const scriptsPerFile: { file: string; scripts: { content: string; src?: string; type?: string }[] }[] = [];

    try {
      // Get the manifest (all resources in the EPUB)
      await this.book.loaded.manifest;
      const manifest = (this.book.packaging as any).manifest;
      
      console.log(`[Script Extraction] Scanning entire EPUB manifest`);
      console.log(`[Script Extraction] Manifest keys:`, Object.keys(manifest).length);

      // Process all HTML/XHTML files in the manifest
      const htmlFiles: Promise<void>[] = [];
      
      for (const [, item] of Object.entries(manifest as Record<string, any>)) {
        // Check if it's an HTML/XHTML file
        const isHtml = item.href && 
          (item.href.endsWith('.html') || 
           item.href.endsWith('.xhtml') || 
           item.href.endsWith('.htm') ||
           item['media-type'] === 'application/xhtml+xml');
        
        if (isHtml) {
          htmlFiles.push(
            (async () => {
              try {
                // Fetch the file content
                const url = this.book!.resolve(item.href);
                console.log(`[Script Extraction] Fetching: ${item.href}`);
                
                const response = await fetch(url);
                const text = await response.text();
                
                // Parse as HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                
                // Find all script tags
                const scriptTags = doc.querySelectorAll('script');
                console.log(`[Script Extraction] Found ${scriptTags.length} script tags in ${item.href}`);
                
                if (scriptTags.length > 0) {
                  const scripts: { content: string; src?: string; type?: string }[] = [];
                  
                  scriptTags.forEach((script: HTMLScriptElement) => {
                    const scriptData: { content: string; src?: string; type?: string } = {
                      content: script.textContent || '',
                    };
                    
                    if (script.src) {
                      scriptData.src = script.src;
                    }
                    
                    if (script.type) {
                      scriptData.type = script.type;
                    }
                    
                    console.log(`[Script Extraction] Script found - type: ${scriptData.type}, src: ${scriptData.src}, content length: ${scriptData.content.length}`);
                    scripts.push(scriptData);
                  });
                  
                  scriptsPerFile.push({
                    file: item.href,
                    scripts,
                  });
                }
              } catch (error) {
                console.error(`[Script Extraction] Error loading ${item.href}:`, error);
              }
            })()
          );
        }
      }
      
      await Promise.all(htmlFiles);
      console.log(`[Script Extraction] Complete. Found scripts in ${scriptsPerFile.length} files`);
    } catch (error) {
      console.error('Error extracting scripts:', error);
      throw error;
    }

    return scriptsPerFile;
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
