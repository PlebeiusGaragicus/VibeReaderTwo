import { useEffect, useRef, useState } from 'react';
import type { Book as EpubBook } from 'epubjs';
import { epubService } from '../../services/epubService';
import { bookApiService } from '../../services/bookApiService';
import { settingsApiService } from '../../services/settingsApiService';
import { logger } from '../../lib/logger';
import { Button } from '../ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  Settings,
  BookOpen,
  Highlighter,
  MessageSquare,
  Volume2,
  Code2
} from 'lucide-react';
import { ReaderSettings } from './ReaderSettings';
import { TableOfContents } from './TableOfContents';
import { ScriptViewer } from './ScriptViewer';
import { UnifiedAnnotationOverlay } from './UnifiedAnnotationOverlay';
import { TTSOverlay } from './TTSOverlay';
import { UnifiedContextMenu } from './UnifiedContextMenu';
import { NoteDialog } from './NoteDialog';
import { ChatDialog } from './ChatDialog';
import { ChatViewDialog } from './ChatViewDialog';
import { ChatOverlay } from './ChatOverlay';
import { annotationService } from '../../services/annotationService';
import { chatService } from '../../services/chatService';
import type { Highlight, Note, ChatContext } from '../../types';

interface BookViewerProps {
  bookId: number;
  onClose: () => void;
}

// Check if debug mode is enabled
const DEBUG_MODE = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

// Highlight color map - used for all highlight rendering
const HIGHLIGHT_COLORS = {
  yellow: 'rgba(255, 255, 0, 1)',        // Bright yellow
  green: 'rgba(0, 255, 100, 1)',         // Bright green
  blue: 'rgba(5, 164, 250, 1)',          // Bright blue
  pink: 'rgba(241, 25, 166, 1)',         // Hot pink
  purple: 'rgba(144, 29, 206, 1)',       // Bright purple
} as const;

export function BookViewer({ bookId, onClose }: BookViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const [book, setBook] = useState<EpubBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTOC, setShowTOC] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const [showTTS, setShowTTS] = useState(false);
  const [showScripts, setShowScripts] = useState(false);

  // Ensure only one overlay is visible at a time, or close if clicking active overlay
  const toggleOverlay = (overlay: 'toc' | 'formatting' | 'settings' | 'annotations' | 'chats' | 'tts' | 'scripts') => {
    const isCurrentlyOpen = 
      (overlay === 'toc' && showTOC) ||
      (overlay === 'formatting' && showFormatting) ||
      (overlay === 'settings' && showSettings) ||
      (overlay === 'annotations' && showAnnotations) ||
      (overlay === 'chats' && showChats) ||
      (overlay === 'tts' && showTTS) ||
      (overlay === 'scripts' && showScripts);
    
    if (isCurrentlyOpen) {
      // Close the currently open overlay
      setShowTOC(false);
      setShowFormatting(false);
      setShowSettings(false);
      setShowAnnotations(false);
      setShowChats(false);
      setShowTTS(false);
      setShowScripts(false);
    } else {
      // Open the requested overlay and close others
      setShowTOC(overlay === 'toc');
      setShowFormatting(overlay === 'formatting');
      setShowSettings(overlay === 'settings');
      setShowAnnotations(overlay === 'annotations');
      setShowChats(overlay === 'chats');
      setShowTTS(overlay === 'tts');
      setShowScripts(overlay === 'scripts');
    }
  };
  // Progress stored as 0-1 decimal for precision (multiply by 100 for display)
  const [progress, setProgress] = useState(0);
  const [currentCfi, setCurrentCfi] = useState<string>('');
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    position: { 
      x: number; 
      y: number;
      selectionHeight?: number;
      selectionBottom?: number;
      selectionLeft?: number;
      selectionRight?: number;
    };
    cfiRange: string;
    text: string;
    highlight?: Highlight;
    note?: Note;
    chatContexts?: ChatContext[];
  } | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    show: boolean;
    cfiRange: string;
    text: string;
    existingNote?: Note;
  } | null>(null);
  const [chatDialog, setChatDialog] = useState<{
    show: boolean;
    cfiRange: string;
    text: string;
  } | null>(null);
  const [chatViewDialog, setChatViewDialog] = useState<ChatContext | null>(null);
  const [annotationRefreshKey, setAnnotationRefreshKey] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    loadBook();
    
    // Add resize listener to reapply settings after window resize
    const handleResize = () => {
      // Reapply settings after a short delay to ensure rendition has resized
      setTimeout(() => {
        epubService.reapplySettings();
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clear any pending progress saves
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
      epubService.destroy();
    };
  }, [bookId, reloadTrigger]);

  // Track mouse position globally for iframe clicks
  useEffect(() => {
    const trackMouse = (e: MouseEvent) => {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };
    
    window.addEventListener('mousemove', trackMouse);
    return () => window.removeEventListener('mousemove', trackMouse);
  }, []);

  const loadBook = async () => {
    try {
      logger.info('Reader', `Starting to load book ID: ${bookId}`);
      setIsLoading(true);
      
      // Reset initial load flag
      isInitialLoadRef.current = true;
      
      // Explicitly destroy any existing rendition first
      logger.info('Reader', 'Destroying existing rendition');
      epubService.destroy();
      
      // Clear the viewer container to remove old iframe
      if (viewerRef.current) {
        logger.info('Reader', 'Clearing viewer container');
        viewerRef.current.innerHTML = '';
        // Wait for DOM to fully update and old iframe to be destroyed
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      logger.info('Reader', 'Loading book from API');
      const loadedBook = await epubService.loadBook(bookId);
      setBook(loadedBook);
      logger.info('Reader', 'Book loaded successfully, preparing to render');

      if (viewerRef.current) {
        // Load settings to get page mode preference
        const userSettings = await settingsApiService.getSettings();
        const flow = userSettings.page_mode === 'scroll' ? 'scrolled' : 'paginated';
        
        // Create rendition (but don't display yet)
        logger.info('Reader', `Creating rendition with flow: ${flow}`);
        const rendition = loadedBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: flow as 'paginated' | 'scrolled',
          manager: 'default',
          snap: true,
        });
        
        logger.info('Reader', `Rendition created successfully`);
        
        // Store rendition in service
        (epubService as any).rendition = rendition;
        (epubService as any).book = loadedBook;
        
        // Apply saved settings BEFORE displaying
        epubService.applyTheme(userSettings.theme);
        epubService.applyFontSettings({
          fontSize: userSettings.font_size,
          fontFamily: userSettings.font_family,
          lineHeight: userSettings.line_height,
        });
        epubService.applyDisplaySettings({
          textAlign: userSettings.text_align,
          marginSize: userSettings.margin_size,
          letterSpacing: userSettings.letter_spacing,
          paragraphSpacing: userSettings.paragraph_spacing,
          wordSpacing: userSettings.word_spacing,
          hyphenation: userSettings.hyphenation,
        });

        // Unified progress tracking handler for both paginated and scroll modes
        // Calculate percentage ourselves from CFI using locations
        const handleLocationChange = (location: any) => {
          const cfi = location?.start?.cfi || epubService.getCurrentLocation();
          
          if (!cfi) {
            logger.debug('Reader', 'No CFI available yet');
            return;
          }
          
          // Skip saving during initial load to prevent race condition with 0%
          if (isInitialLoadRef.current) {
            logger.debug('Reader', 'Skipping progress save during initial load');
            return;
          }
          
          // Calculate percentage from CFI ourselves
          const percentage = epubService.getPercentageFromCfi(cfi);
          
          if (percentage !== null && percentage !== undefined) {
            // Update UI immediately
            setProgress(percentage);
            setCurrentCfi(cfi);
            
            logger.debug('Reader', `Location changed: ${(percentage * 100).toFixed(2)}%`);
            
            // Clear any pending save
            if (progressTimeoutRef.current) {
              clearTimeout(progressTimeoutRef.current);
            }
            
            // Debounce saves to avoid excessive API calls
            progressTimeoutRef.current = setTimeout(() => {
              saveProgress(cfi, percentage);
            }, 500);
          } else {
            logger.warn('Reader', 'Could not calculate percentage from CFI - locations may not be generated yet');
          }
        };
        
        // Attach progress tracking for paginated mode (relocated event)
        rendition.on('relocated', handleLocationChange);
        logger.info('Reader', 'Progress tracking attached (relocated event)');

        // Inject CSS for extreme flash animation into iframe
        rendition.on('rendered', () => {
          const iframe = viewerRef.current?.querySelector('iframe');
          const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
          
          if (iframeDoc && !iframeDoc.getElementById('annotation-flash-styles')) {
            const style = iframeDoc.createElement('style');
            style.id = 'annotation-flash-styles';
            style.textContent = `
              @keyframes extreme-flash {
                0%, 100% {
                  background-color: rgba(255, 255, 0, 0);
                  transform: scale(1);
                  box-shadow: 0 0 0 0 rgba(255, 255, 0, 0);
                }
                25% {
                  background-color: rgba(255, 255, 0, 0.95);
                  transform: scale(1.15);
                  box-shadow: 0 0 30px 10px rgba(255, 255, 0, 0.8);
                }
                50% {
                  background-color: rgba(255, 215, 0, 0.95);
                  transform: scale(1.2);
                  box-shadow: 0 0 50px 20px rgba(255, 215, 0, 0.9);
                }
                75% {
                  background-color: rgba(255, 255, 0, 0.95);
                  transform: scale(1.15);
                  box-shadow: 0 0 30px 10px rgba(255, 255, 0, 0.8);
                }
              }
              
              .annotation-flash-extreme {
                animation: extreme-flash 0.6s ease-in-out 3 !important;
                animation-fill-mode: forwards !important;
                display: inline-block !important;
                padding: 2px 4px !important;
                border-radius: 3px !important;
                transition: all 0.2s ease-out !important;
              }
            `;
            iframeDoc.head.appendChild(style);
          }
        });

        // Handle text selection for annotations
        rendition.on('selected', handleTextSelection);

        // Handle clicks on annotations (highlights, notes, chat contexts)
        rendition.on('markClicked', (cfiRange: string) => {
          // Use the last tracked mouse position
          handleAnnotationClick(cfiRange, { 
            clientX: lastMousePosition.current.x, 
            clientY: lastMousePosition.current.y 
          } as MouseEvent);
        });

        // Set up mouse tracking in the iframe after a short delay
        setTimeout(() => {
          const iframe = viewerRef.current?.querySelector('iframe');
          if (iframe?.contentWindow) {
            const trackIframeMouse = (e: MouseEvent) => {
              const iframeRect = iframe.getBoundingClientRect();
              lastMousePosition.current = {
                x: iframeRect.left + e.clientX,
                y: iframeRect.top + e.clientY,
              };
            };
            
            try {
              iframe.contentWindow.document.addEventListener('mousemove', trackIframeMouse);
              
              // In scroll mode, add scroll listener to update progress
              if (flow === 'scrolled') {
                const handleScroll = () => {
                  const location = rendition.currentLocation() as any;
                  if (location?.start) {
                    handleLocationChange(location);
                  }
                };
                
                iframe.contentWindow.document.addEventListener('scroll', handleScroll);
                logger.info('Reader', 'Scroll progress tracking attached');
              }
            } catch (e) {
              // Ignore cross-origin errors
              console.warn('Could not set up iframe mouse tracking:', e);
            }
          }
        }, 500);

        // Now display the book with settings applied
        const bookData = await bookApiService.getBook(bookId);
        logger.info('Reader', `Displaying book in ${flow} mode`);
        
        // Initialize progress from saved data (stored as 0-1 decimal)
        if (bookData?.percentage !== undefined && bookData.percentage !== null) {
          setProgress(bookData.percentage);
          logger.info('Reader', `✓ Initialized progress to ${(bookData.percentage * 100).toFixed(1)}% from saved data`);
        } else {
          setProgress(0);
          logger.info('Reader', 'Starting at 0%');
        }
        
        // Initialize CFI display
        if (bookData?.current_cfi) {
          setCurrentCfi(bookData.current_cfi);
          logger.info('Reader', `CFI loaded: ${bookData.current_cfi.substring(0, 40)}...`);
        }
        
        try {
          if (bookData?.current_cfi) {
            logger.info('Reader', `Attempting to restore position to CFI: ${bookData.current_cfi.substring(0, 50)}...`);
            await rendition.display(bookData.current_cfi);
            
            // Verify we're at the right location
            const actualLocation = rendition.currentLocation() as any;
            if (actualLocation?.start?.cfi) {
              logger.info('Reader', `\u2713 Navigated successfully. Current CFI: ${actualLocation.start.cfi.substring(0, 50)}...`);
              
              // Calculate percentage to verify
              const actualPercentage = epubService.getPercentageFromCfi(actualLocation.start.cfi);
              if (actualPercentage !== null) {
                logger.info('Reader', `Current position: ${(actualPercentage * 100).toFixed(2)}%`);
              }
            }
          } else {
            logger.info('Reader', 'No saved position - displaying from beginning');
            await rendition.display();
          }
          logger.info('Reader', 'Book display completed successfully');
          
          // Mark initial load as complete - allow progress tracking to save now
          setTimeout(() => {
            isInitialLoadRef.current = false;
            logger.info('Reader', 'Initial load complete - progress tracking enabled');
          }, 1000);
        } catch (displayError) {
          logger.error('Reader', `Error displaying book: ${displayError}`);
          logger.warn('Reader', 'Attempting to display from beginning instead');
          try {
            await rendition.display();
          } catch (fallbackError) {
            logger.error('Reader', `Fallback display also failed: ${fallbackError}`);
          }
        }

        // Wait for the book to fully render, then add highlights, notes, and chat contexts
        setTimeout(async () => {
          try {
            await renderAllAnnotations();
            logger.info('Reader', 'Annotations rendered successfully');
          } catch (error) {
            logger.error('Reader', `Error rendering annotations: ${error}`);
          }
        }, 400);
      }

      setIsLoading(false);
      logger.info('Reader', 'Book rendering complete');
    } catch (error) {
      logger.error('Reader', `Failed to load book: ${error}`);
      console.error('Error loading book:', error);
      alert(`Failed to load book: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck console for details.`);
      onClose();
    }
  };

  // Render all annotations (highlights, notes, chat contexts)
  const renderAllAnnotations = async (): Promise<void> => {
    const rendition = (epubService as any).rendition;
    if (!rendition) {
      logger.warn('Reader', 'Cannot render annotations: rendition not ready');
      return;
    }

    // Ensure rendition has finished rendering before adding annotations
    if (!rendition.manager || !rendition.manager.container) {
      logger.warn('Reader', 'Rendition not fully initialized, skipping annotations');
      return;
    }

    logger.info('Reader', 'Starting to render annotations');
    const highlights = await annotationService.getHighlights(bookId);
    const notes = await annotationService.getNotes(bookId);
    const chatContexts = await annotationService.getChatContexts(bookId);
    
    // Clear all existing annotations completely
    try {
      // Get all annotation CFI ranges
      const allCfiRanges = new Set<string>();
      
      // Collect all CFI ranges from current annotations
      if (rendition.annotations._annotations) {
        Object.keys(rendition.annotations._annotations).forEach(cfi => allCfiRanges.add(cfi));
      }
      
      // Also collect from our database to ensure we catch everything
      highlights.forEach(h => allCfiRanges.add(h.cfi_range));
      notes.forEach(n => allCfiRanges.add(n.cfi_range));
      chatContexts.forEach(c => allCfiRanges.add(c.cfi_range));
      
      // Remove all annotations
      allCfiRanges.forEach(cfiRange => {
        try {
          rendition.annotations.remove(cfiRange, 'highlight');
          rendition.annotations.remove(cfiRange, 'underline');
        } catch (e) {
          // Ignore errors for non-existent annotations
        }
      });
    } catch (error) {
      console.error('Error clearing annotations:', error);
    }
    
    // Add highlights
    highlights.forEach((highlight) => {
      rendition.annotations.add(
        'highlight',
        highlight.cfi_range,
        {},
        undefined,
        'hl',
        { fill: HIGHLIGHT_COLORS[highlight.color] }
      );
    });

    // Add RED underlines for notes (only if no highlight exists)
    notes.forEach((note) => {
      const hasHighlight = highlights.some(h => h.cfi_range === note.cfi_range);
      if (!hasHighlight) {
        rendition.annotations.add(
          'underline',
          note.cfi_range,
          {},
          undefined,
          'note-underline',
          { 
            'stroke': 'rgb(220, 38, 38)', // red-600
            'stroke-width': '2px',
            'stroke-opacity': '0.8'
          }
        );
      }
    });

    // Add BLUE circles for chat contexts (only if no highlight exists)
    chatContexts.forEach((chat) => {
      const hasHighlight = highlights.some(h => h.cfi_range === chat.cfi_range);
      if (!hasHighlight) {
        // Use a custom class to add blue circle/outline
        rendition.annotations.add(
          'underline',
          chat.cfi_range,
          {},
          undefined,
          'chat-context',
          { 
            'stroke': 'rgb(37, 99, 235)', // blue-600
            'stroke-width': '2px',
            'stroke-opacity': '0.8',
            'stroke-dasharray': '3,3' // dotted line for distinction
          }
        );
      }
    });
    
    logger.info('Reader', `Successfully rendered ${highlights.length} highlights, ${notes.length} notes, ${chatContexts.length} chat contexts`);
  };

  /**
   * Save reading progress
   * 
   * Architecture:
   * 1. CFI (Canonical Fragment Identifier) = Source of truth for exact location
   * 2. Percentage = Derived from CFI via book.locations.percentageFromCfi()
   * 3. Both stored as 0-1 decimal (0.0 = 0%, 1.0 = 100%)
   * 4. Percentage cached in DB for fast library display (no need to load book)
   * 5. On book open: Navigate to CFI, percentage recalculates automatically
   */
  const saveProgress = async (cfi: string, percentage: number) => {
    try {
      logger.info('Reader', `Saving progress: ${(percentage * 100).toFixed(2)}% at CFI: ${cfi.substring(0, 30)}...`);
      
      const response = await bookApiService.updateProgress(bookId, {
        current_cfi: cfi,        // Source of truth - exact location
        percentage: percentage,   // Cached for performance (library view)
      });
      
      setProgress(percentage);
      logger.info('Reader', `✓ Progress saved successfully. Server response percentage: ${(response.percentage || 0) * 100}%`);
    } catch (error) {
      logger.error('Reader', `Error saving progress: ${error}`);
    }
  };

  const handlePrevPage = async () => {
    if (isLoading) return; // Don't navigate while loading
    try {
      await epubService.prevPage();
    } catch (error) {
      console.error('Error navigating:', error);
    }
  };

  const handleNextPage = async () => {
    if (isLoading) return; // Don't navigate while loading
    try {
      await epubService.nextPage();
    } catch (error) {
      console.error('Error navigating:', error);
    }
  };

  const handleTOCSelect = async (href: string) => {
    if (isLoading) return; // Don't navigate while loading
    try {
      await epubService.goToLocation(href);
      setShowTOC(false);
    } catch (error) {
      console.error('Error navigating to chapter:', error);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevPage();
    } else if (e.key === 'ArrowRight') {
      handleNextPage();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isLoading]); // Re-attach listener when loading state changes

  // Annotation handlers
  const handleTextSelection = async (cfiRange: string, contents: any) => {
    const selection = contents.window.getSelection();
    if (!selection || selection.isCollapsed) {
      setContextMenu(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setContextMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Get iframe offset to convert iframe coordinates to viewport coordinates
    const iframe = viewerRef.current?.querySelector('iframe');
    let offsetX = 0;
    let offsetY = 0;
    
    if (iframe) {
      const iframeRect = iframe.getBoundingClientRect();
      offsetX = iframeRect.left;
      offsetY = iframeRect.top;
    }
    
    // Get existing annotations for this range
    const annotations = await annotationService.getAnnotationsByRange(bookId, cfiRange);
    
    setContextMenu({
      show: true,
      position: {
        x: offsetX + rect.left + rect.width / 2,
        y: offsetY + rect.top,
        selectionHeight: rect.height,
        selectionBottom: offsetY + rect.bottom,
        selectionLeft: offsetX + rect.left,
        selectionRight: offsetX + rect.right,
      },
      cfiRange,
      text,
      highlight: annotations.highlight,
      note: annotations.note ?? undefined,
      chatContexts: annotations.chatContexts,
    });
  };

  const handleHighlight = async (color: Highlight['color']) => {
    if (!contextMenu) return;

    try {
      if (contextMenu.highlight) {
        // Update existing highlight
        await annotationService.updateHighlightColor(contextMenu.highlight.id!, color);
      } else {
        // Create new highlight
        await annotationService.createHighlight(
          bookId,
          contextMenu.cfiRange,
          contextMenu.text,
          color
        );
      }
      
      await renderAllAnnotations();
      setAnnotationRefreshKey(prev => prev + 1);
      setContextMenu(null);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error with highlight:', error);
    }
  };

  const handleRemoveHighlight = async () => {
    if (!contextMenu?.highlight) return;

    try {
      const cfiRange = contextMenu.highlight.cfi_range;
      const rendition = (epubService as any).rendition;
      
      // Delete from database
      await annotationService.deleteHighlight(contextMenu.highlight.id!);
      
      // Remove the highlight annotation from epub.js
      if (rendition) {
        rendition.annotations.remove(cfiRange, 'highlight');
        
        // Check if there's a note or chat context at this location
        const note = await annotationService.getNoteByRange(bookId, cfiRange);
        const chats = await annotationService.getChatContextsByRange(bookId, cfiRange);
        
        // Add underline for note if it exists
        if (note) {
          rendition.annotations.add(
            'underline',
            cfiRange,
            {},
            undefined,
            'note-underline',
            { 
              'stroke': 'rgb(220, 38, 38)',
              'stroke-width': '2px',
              'stroke-opacity': '0.8'
            }
          );
        }
        // Add underline for chat if it exists (and no note)
        else if (chats.length > 0) {
          rendition.annotations.add(
            'underline',
            cfiRange,
            {},
            undefined,
            'chat-context',
            { 
              'stroke': 'rgb(37, 99, 235)',
              'stroke-width': '2px',
              'stroke-opacity': '0.8',
              'stroke-dasharray': '3,3'
            }
          );
        }
      }
      
      setAnnotationRefreshKey(prev => prev + 1);
      setContextMenu(null);
    } catch (error) {
      console.error('Error removing highlight:', error);
    }
  };

  const handleCreateNote = () => {
    if (!contextMenu) return;

    setNoteDialog({
      show: true,
      cfiRange: contextMenu.cfiRange,
      text: contextMenu.text,
      existingNote: contextMenu.note,
    });
    setContextMenu(null);
  };

  const handleViewNote = () => {
    if (!contextMenu?.note) return;

    setNoteDialog({
      show: true,
      cfiRange: contextMenu.cfiRange,
      text: contextMenu.text,
      existingNote: contextMenu.note,
    });
    setContextMenu(null);
  };

  const handleSaveNote = async (noteContent: string) => {
    if (!noteDialog) return;

    try {
      if (noteDialog.existingNote) {
        // Update existing note
        await annotationService.updateNote(noteDialog.existingNote.id!, noteContent);
      } else {
        // Create new note
        await annotationService.createNote(
          bookId,
          noteDialog.cfiRange,
          noteDialog.text,
          noteContent
        );
      }
      
      await renderAllAnnotations();
      setAnnotationRefreshKey(prev => prev + 1);
      setNoteDialog(null);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleRemoveNote = async () => {
    if (!contextMenu?.note) return;

    try {
      const cfiRange = contextMenu.note.cfi_range;
      const rendition = (epubService as any).rendition;
      
      // Delete from database
      await annotationService.deleteNote(contextMenu.note.id!);
      
      // Remove the note underline from epub.js
      if (rendition) {
        rendition.annotations.remove(cfiRange, 'underline');
        
        // Check if there's a chat context at this location (and no highlight)
        const highlight = (await annotationService.getHighlights(bookId)).find(h => h.cfi_range === cfiRange);
        const chats = await annotationService.getChatContextsByRange(bookId, cfiRange);
        
        // Only add chat underline if there's no highlight
        if (!highlight && chats.length > 0) {
          rendition.annotations.add(
            'underline',
            cfiRange,
            {},
            undefined,
            'chat-context',
            { 
              'stroke': 'rgb(37, 99, 235)',
              'stroke-width': '2px',
              'stroke-opacity': '0.8',
              'stroke-dasharray': '3,3'
            }
          );
        }
      }
      
      setAnnotationRefreshKey(prev => prev + 1);
      setContextMenu(null);
    } catch (error) {
      console.error('Error removing note:', error);
    }
  };

  const handleCreateChat = () => {
    if (!contextMenu) return;

    setChatDialog({
      show: true,
      cfiRange: contextMenu.cfiRange,
      text: contextMenu.text,
    });
    setContextMenu(null);
  };

  const handleSendChat = async (prompt: string) => {
    if (!chatDialog) return;

    try {
      // Send chat request
      const response = await chatService.chatAboutText(chatDialog.text, prompt);
      
      // Save chat context
      await annotationService.createChatContext(
        bookId,
        chatDialog.cfiRange,
        chatDialog.text,
        prompt,
        response
      );
      
      await renderAllAnnotations();
      setAnnotationRefreshKey(prev => prev + 1);
      setChatDialog(null);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error with chat:', error);
      throw error;
    }
  };

  const handleViewChat = async (chatId: number) => {
    const chatContexts = await annotationService.getChatContexts(bookId);
    const chat = chatContexts.find(c => c.id === chatId);
    if (chat) {
      setChatViewDialog(chat);
    }
  };

  const handleCopyText = () => {
    if (!contextMenu) return;

    navigator.clipboard.writeText(contextMenu.text);
    setContextMenu(null);
  };

  const handleEditNoteFromOverlay = (note: Note) => {
    setNoteDialog({
      show: true,
      cfiRange: note.cfi_range,
      text: note.text,
      existingNote: note,
    });
  };

  const handleOpenChatFromOverlay = (chat: ChatContext) => {
    setChatViewDialog(chat);
  };

  const handleNavigateToAnnotation = async (cfi: string) => {
    try {
      logger.info('Reader', `Navigating to annotation: ${cfi}`);
      
      // Navigate to the CFI location
      await epubService.goToLocation(cfi);
      logger.info('Reader', `Navigation complete, re-rendering annotations`);
      
      // Re-render annotations after navigation to ensure they appear
      await renderAllAnnotations();
      logger.info('Reader', `Annotations re-rendered successfully`);
      
      // Add EXTREME flash effect using CSS animation
      // Try multiple times to catch annotations as they render
      let attempts = 0;
      const maxAttempts = 5;
      
      const tryFlash = () => {
        attempts++;
        
        try {
          const iframe = viewerRef.current?.querySelector('iframe');
          const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
          
          if (iframeDoc) {
            // Try multiple selectors that EPUB.js might use
            const selectors = [
              '[data-epubjs-type="highlight"]',
              '[data-epubjs-type="underline"]',
              '.epubjs-hl',
              'mark[data-epubjs-type]',
              'mark',
              '[class*="highlight"]',
              '[class*="underline"]'
            ];
            
            let marks: NodeListOf<Element> | null = null;
            
            for (const selector of selectors) {
              const found = iframeDoc.querySelectorAll(selector);
              if (found.length > 0) {
                marks = found;
                logger.info('Reader', `Found ${found.length} marks with selector: ${selector}`);
                break;
              }
            }
            
            if (marks && marks.length > 0) {
              // Found annotations! Apply extreme flash
              marks.forEach((mark: Element) => {
                if (mark instanceof HTMLElement) {
                  // Add the extreme flash class
                  mark.classList.add('annotation-flash-extreme');
                  
                  // Remove the class after animation completes (3 cycles × 0.6s = 1.8s)
                  setTimeout(() => {
                    mark.classList.remove('annotation-flash-extreme');
                  }, 2000);
                }
              });
              
              logger.info('Reader', `✨ Applied extreme flash to ${marks.length} annotations`);
            } else if (attempts < maxAttempts) {
              // No annotations found yet, try again
              logger.info('Reader', `No annotations found yet (attempt ${attempts}/${maxAttempts}), retrying...`);
              setTimeout(tryFlash, 200);
            } else {
              // Debug: log what's actually in the iframe
              const allElements = iframeDoc.body?.querySelectorAll('*') || [];
              logger.warn('Reader', `No annotations found after ${maxAttempts} attempts. Total elements in iframe: ${allElements.length}`);
              
              // Log first few elements with data attributes or classes
              const elementsWithAttrs = Array.from(allElements).slice(0, 10).map(el => ({
                tag: el.tagName,
                class: el.className,
                dataAttrs: Array.from(el.attributes).filter(a => a.name.startsWith('data-')).map(a => `${a.name}=${a.value}`)
              }));
              console.log('Sample iframe elements:', elementsWithAttrs);
            }
          }
        } catch (effectError) {
          logger.error('Reader', `Flash effect error: ${effectError}`);
        }
      };
      
      // Start trying after initial delay
      setTimeout(tryFlash, 300);
      
    } catch (error) {
      logger.error('Reader', `Error navigating to annotation: ${error}`);
      console.error('Error navigating to annotation:', error);
    }
  };

  // Annotation click handler - shows unified context menu
  const handleAnnotationClick = async (cfiRange: string, event: MouseEvent) => {
    // If a menu is already open, close it
    if (contextMenu?.show) {
      setContextMenu(null);
      return;
    }
    
    // Get all annotations for this range
    const annotations = await annotationService.getAnnotationsByRange(bookId, cfiRange);
    
    // Get the text from the highlight or note
    const text = annotations.highlight?.text || annotations.note?.text || '';
    
    setContextMenu({
      show: true,
      position: { x: event.clientX, y: event.clientY },
      cfiRange,
      text,
      highlight: annotations.highlight,
      note: annotations.note ?? undefined,
      chatContexts: annotations.chatContexts,
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading book...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between drag-region">
        <div className="flex items-center gap-2">
          {/* macOS traffic light spacer */}
          <div className="macos-traffic-light-spacer" />
          <div className="flex items-center gap-2 no-drag">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <Button 
            variant={showTOC ? "default" : "ghost"}
            size="icon" 
            onClick={() => toggleOverlay('toc')}
          >
            <Menu className="w-5 h-5" />
          </Button>
          {DEBUG_MODE && (
            <Button 
              variant={showScripts ? "default" : "ghost"}
              size="icon" 
              onClick={() => toggleOverlay('scripts')}
              title="Scripts (Debug)"
            >
              <Code2 className="w-5 h-5" />
            </Button>
          )}
          </div>
        </div>
        <div className="flex-1 text-center no-drag">
          <p className="text-sm font-medium truncate max-w-md mx-auto">
            {book?.packaging?.metadata?.title || 'Book'}
          </p>
        </div>
        <div className="flex items-center gap-2 no-drag">
          <Button 
            variant={showFormatting ? "default" : "ghost"}
            size="icon"
            onClick={() => toggleOverlay('formatting')}
            title="Text Formatting"
          >
            <span className="text-base font-serif">Aa</span>
          </Button>
          <Button 
            variant={showAnnotations ? "default" : "ghost"}
            size="icon"
            onClick={() => toggleOverlay('annotations')}
            title="Annotations"
          >
            <Highlighter className="w-5 h-5" />
          </Button>
          <Button 
            variant={showChats ? "default" : "ghost"}
            size="icon"
            onClick={() => toggleOverlay('chats')}
            title="Chat History"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button 
            variant={showTTS ? "default" : "ghost"}
            size="icon"
            onClick={() => toggleOverlay('tts')}
            title="Text-to-Speech"
          >
            <Volume2 className="w-5 h-5" />
          </Button>
          <Button 
            variant={showSettings ? "default" : "ghost"}
            size="icon"
            onClick={() => toggleOverlay('settings')}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Reader - epub.js will handle its own padding */}
        <div 
          ref={viewerRef} 
          className="absolute inset-0 epub-container"
        />

        {/* Left Margin Navigation Zone - only in the margin area */}
        <button
          onClick={handlePrevPage}
          disabled={isLoading}
          className="absolute left-0 top-0 bottom-0 w-20 pointer-events-auto cursor-w-resize hover:bg-black/5 transition-colors flex items-center justify-center group disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-8 h-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Right Margin Navigation Zone - only in the margin area */}
        <button
          onClick={handleNextPage}
          disabled={isLoading}
          className="absolute right-0 top-0 bottom-0 w-20 pointer-events-auto cursor-e-resize hover:bg-black/5 transition-colors flex items-center justify-center group disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next page"
        >
          <ChevronRight className="w-8 h-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Table of Contents Sidebar */}
        {showTOC && book && (
          <TableOfContents
            book={book}
            onSelect={handleTOCSelect}
            onClose={() => setShowTOC(false)}
          />
        )}

        {/* Script Viewer (Debug Mode) */}
        {showScripts && DEBUG_MODE && (
          <ScriptViewer
            onClose={() => setShowScripts(false)}
          />
        )}

        {/* Formatting Panel */}
        {showFormatting && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-background/70 backdrop-blur-sm border-l shadow-lg z-10">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Text Formatting</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFormatting(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <ReaderSettings
                onSettingsChange={() => {
                  // Settings are already applied immediately by ReaderSettings
                  // No need to reload the book
                }}
                onPageModeChange={() => {
                  // Trigger book reload for page mode changes
                  setReloadTrigger(prev => prev + 1);
                }}
              />
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-background/70 backdrop-blur-sm border-l shadow-lg z-10">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Settings</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 text-center text-muted-foreground">
              <p>Nothing here yet</p>
            </div>
          </div>
        )}

        {/* Unified Annotations Overlay */}
        {showAnnotations && (
          <UnifiedAnnotationOverlay
            key={annotationRefreshKey}
            bookId={bookId}
            onClose={() => setShowAnnotations(false)}
            onNavigate={handleNavigateToAnnotation}
            onEditNote={handleEditNoteFromOverlay}
            onOpenChat={handleOpenChatFromOverlay}
            onRefresh={() => setAnnotationRefreshKey(prev => prev + 1)}
          />
        )}

        {/* Chat Overlay */}
        {showChats && (
          <ChatOverlay
            key={annotationRefreshKey}
            bookId={bookId}
            onClose={() => setShowChats(false)}
            onRefresh={() => setAnnotationRefreshKey(prev => prev + 1)}
          />
        )}

        {/* TTS Overlay */}
        {showTTS && (
          <TTSOverlay
            onClose={() => setShowTTS(false)}
          />
        )}
      </div>

      {/* Unified Context Menu */}
      {contextMenu?.show && (
        <UnifiedContextMenu
          position={contextMenu.position}
          cfiRange={contextMenu.cfiRange}
          text={contextMenu.text}
          existingHighlight={contextMenu.highlight}
          existingNote={contextMenu.note}
          existingChats={contextMenu.chatContexts}
          onHighlight={handleHighlight}
          onRemoveHighlight={handleRemoveHighlight}
          onNote={handleCreateNote}
          onViewNote={handleViewNote}
          onRemoveNote={handleRemoveNote}
          onChat={handleCreateChat}
          onViewChat={handleViewChat}
          onCopy={handleCopyText}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Note Dialog */}
      {noteDialog?.show && (
        <NoteDialog
          selectedText={noteDialog.text}
          initialNote={noteDialog.existingNote?.note_content}
          onSave={handleSaveNote}
          onDelete={
            noteDialog.existingNote?.id
              ? async () => {
                  const cfiRange = noteDialog.cfiRange;
                  const rendition = (epubService as any).rendition;
                  
                  // Delete from database
                  await annotationService.deleteNote(noteDialog.existingNote!.id!);
                  
                  // Immediately remove the visual underline
                  if (rendition) {
                    rendition.annotations.remove(cfiRange, 'underline');
                  }
                  
                  // Re-render all annotations to ensure consistency
                  await renderAllAnnotations();
                  setAnnotationRefreshKey(prev => prev + 1);
                  setContextMenu(null); // Clear context menu to prevent stale data
                  setNoteDialog(null);
                }
              : undefined
          }
          onClose={() => setNoteDialog(null)}
        />
      )}

      {/* Chat Dialog */}
      {chatDialog?.show && (
        <ChatDialog
          selectedText={chatDialog.text}
          onSend={handleSendChat}
          onClose={() => setChatDialog(null)}
        />
      )}

      {/* Chat View Dialog */}
      {chatViewDialog && (
        <ChatViewDialog
          chat={chatViewDialog}
          onClose={() => setChatViewDialog(null)}
        />
      )}

      {/* Progress Bar */}
      <div className="border-t px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {currentCfi && (
              <div className="text-xs text-muted-foreground font-mono truncate">
                CFI: {currentCfi.substring(0, 50)}...
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-right">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
