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
  private currentTheme: 'light' | 'dark' | 'sepia' | 'system' = 'system';
  private currentFontSettings: { fontSize?: number; fontFamily?: string; lineHeight?: number } = {};
  private currentDisplaySettings: {
    textAlign?: 'left' | 'justify';
    marginSize?: 'narrow' | 'normal' | 'wide';
    letterSpacing?: number;
    paragraphSpacing?: number;
    wordSpacing?: number;
    hyphenation?: 'auto' | 'none';
  } = {};

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
      
      // Generate locations for progress tracking (1024 chars per location is standard)
      logger.info('EPUB', 'Generating locations for progress tracking...');
      try {
        await this.book.locations.generate(1024);
        const total = (this.book.locations as any).total;
        logger.info('EPUB', `✓ Generated ${total} locations`);
      } catch (locError) {
        logger.warn('EPUB', `Could not generate locations: ${locError}`);
      }
      
      return this.book;
    } catch (error) {
      logger.error('EPUB', `Failed to load book: ${error}`);
      throw error;
    }
  }
  
  /**
   * Calculate percentage from CFI (0-1 range)
   */
  getPercentageFromCfi(cfi: string): number | null {
    if (!this.book || !this.book.locations) {
      return null;
    }
    
    try {
      const percentage = this.book.locations.percentageFromCfi(cfi);
      return percentage;
    } catch (error) {
      logger.warn('EPUB', `Could not calculate percentage from CFI: ${error}`);
      return null;
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
    
    // In scroll mode, ensure the target appears at the top of the viewport
    // @ts-ignore - accessing private properties
    const isScrollMode = this.rendition.settings.flow === 'scrolled';
    if (isScrollMode) {
      // Get the iframe and its document
      // @ts-ignore - accessing manager property
      const iframe = this.rendition.manager?.container?.querySelector('iframe');
      const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
      
      if (iframeDoc) {
        // Find the element at the CFI location
        try {
          // Use epub.js's range utility to get the element
          const range = this.rendition.getRange(cfi);
          if (range && range.startContainer) {
            // Get the element or its parent
            let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
              ? range.startContainer as Element
              : range.startContainer.parentElement;
            
            if (element) {
              // Scroll the element to the top of the iframe
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        } catch (error) {
          // If getRange fails, try scrolling the iframe to top as fallback
          console.warn('Could not scroll to exact position, scrolling to approximate location', error);
          if (iframeDoc.body) {
            // Scroll to the top of the current section
            iframeDoc.documentElement.scrollTop = 0;
          }
        }
      }
    }
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
   * If theme is 'system', resolves to light or dark based on system preference
   */
  applyTheme(theme: 'light' | 'dark' | 'sepia' | 'system') {
    this.currentTheme = theme;
    this.applyAllSettings();
  }

  /**
   * Apply font settings
   */
  applyFontSettings(settings: {
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
  }) {
    this.currentFontSettings = { ...this.currentFontSettings, ...settings };
    this.applyAllSettings();
  }

  /**
   * Apply display settings (margins, alignment, spacing)
   */
  applyDisplaySettings(settings: {
    textAlign?: 'left' | 'justify';
    marginSize?: 'narrow' | 'normal' | 'wide';
    letterSpacing?: number;
    paragraphSpacing?: number;
    wordSpacing?: number;
    hyphenation?: 'auto' | 'none';
  }) {
    this.currentDisplaySettings = { ...this.currentDisplaySettings, ...settings };
    this.applyAllSettings();
  }

  /**
   * Apply all settings at once (theme + fonts)
   * This ensures theme colors aren't overwritten by font settings
   */
  private applyAllSettings() {
    if (!this.rendition) {
      return;
    }

    // Resolve system theme
    let resolvedTheme: 'light' | 'dark' | 'sepia' = this.currentTheme as any;
    if (this.currentTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    const themeColors = {
      light: {
        background: '#ffffff',
        color: '#000000',
      },
      dark: {
        background: '#1a1a1a',
        color: '#e0e0e0',
      },
      sepia: {
        background: '#f4ecd8',
        color: '#5c4a3a',
      },
    };

    // Build font settings object that will be applied to all text elements
    const fontStyles: Record<string, any> = {};
    
    if (this.currentFontSettings.fontSize) {
      fontStyles['font-size'] = `${this.currentFontSettings.fontSize}px !important`;
    }
    if (this.currentFontSettings.fontFamily) {
      fontStyles['font-family'] = `${this.currentFontSettings.fontFamily} !important`;
    }
    if (this.currentFontSettings.lineHeight) {
      fontStyles['line-height'] = `${this.currentFontSettings.lineHeight} !important`;
    }

    // Build display settings object
    const displayStyles: Record<string, any> = {};
    
    if (this.currentDisplaySettings.textAlign) {
      displayStyles['text-align'] = `${this.currentDisplaySettings.textAlign} !important`;
    }
    if (this.currentDisplaySettings.letterSpacing !== undefined) {
      displayStyles['letter-spacing'] = `${this.currentDisplaySettings.letterSpacing}em !important`;
    }
    if (this.currentDisplaySettings.wordSpacing !== undefined) {
      displayStyles['word-spacing'] = `${this.currentDisplaySettings.wordSpacing}em !important`;
    }
    if (this.currentDisplaySettings.hyphenation) {
      displayStyles['hyphens'] = `${this.currentDisplaySettings.hyphenation} !important`;
      displayStyles['-webkit-hyphens'] = `${this.currentDisplaySettings.hyphenation} !important`;
      displayStyles['-moz-hyphens'] = `${this.currentDisplaySettings.hyphenation} !important`;
    }

    // Build combined styles object
    // Apply theme colors to body
    const styles: Record<string, any> = {
      body: {
        ...themeColors[resolvedTheme],
      },
    };

    // Apply font settings to all common text elements to ensure they override EPUB styles
    const textElements = [
      'body', 'p', 'div', 'span', 'a', 'li', 'td', 'th', 'dt', 'dd',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code', 'em', 'strong', 'i', 'b',
      'article', 'section', 'aside', 'nav', 'header', 'footer'
    ];

    textElements.forEach(element => {
      if (!styles[element]) {
        styles[element] = {};
      }
      Object.assign(styles[element], fontStyles, displayStyles);
    });

    // Apply paragraph-specific settings
    if (!styles.p) styles.p = {};
    if (this.currentDisplaySettings.paragraphSpacing !== undefined) {
      styles.p['margin-bottom'] = `${this.currentDisplaySettings.paragraphSpacing}em !important`;
    }

    // Apply margin settings to body
    if (this.currentDisplaySettings.marginSize) {
      const marginMap = {
        narrow: { left: '5%', right: '5%' },
        normal: { left: '10%', right: '10%' },
        wide: { left: '15%', right: '15%' },
      };
      const margins = marginMap[this.currentDisplaySettings.marginSize];
      styles.body['padding-left'] = `${margins.left} !important`;
      styles.body['padding-right'] = `${margins.right} !important`;
    }

    // Also add body theme colors
    Object.assign(styles.body, themeColors[resolvedTheme]);

    // Apply all styles at once
    this.rendition.themes.default(styles);
  }

  /**
   * Reapply current settings (useful after resize or page change)
   */
  reapplySettings() {
    this.applyAllSettings();
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
