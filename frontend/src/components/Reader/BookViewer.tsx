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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const annotationsLoadedRef = useRef(false);
  // Use ref for annotations cache so event handlers see latest data (avoid closure issues)
  const annotationsCacheRef = useRef<{
    highlights: Map<string, Highlight>;
    notes: Map<string, Note>;
    chatContexts: Map<string, ChatContext[]>;
  }>({ highlights: new Map(), notes: new Map(), chatContexts: new Map() });
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
  
  // Annotation caching - single source of truth
  // Keep state for React re-renders AND ref for event handlers
  const [annotationsCache, setAnnotationsCache] = useState<{
    highlights: Map<string, Highlight>;
    notes: Map<string, Note>;
    chatContexts: Map<string, ChatContext[]>;
  }>({ highlights: new Map(), notes: new Map(), chatContexts: new Map() });
  
  // Sync state to ref whenever it changes
  useEffect(() => {
    annotationsCacheRef.current = annotationsCache;
  }, [annotationsCache]);

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
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
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
  
  // Load all annotations into cache (single API call set)
  const loadAnnotationsIntoCache = async (): Promise<void> => {
    logger.info('Reader', 'Loading annotations into cache');
    try {
      const [highlights, notes, chatContexts] = await Promise.all([
        annotationService.getHighlights(bookId),
        annotationService.getNotes(bookId),
        annotationService.getChatContexts(bookId),
      ]);
      
      // Build maps for O(1) lookup
      const highlightsMap = new Map(highlights.map(h => [h.cfi_range, h]));
      const notesMap = new Map(notes.map(n => [n.cfi_range, n]));
      const chatsMap = new Map<string, ChatContext[]>();
      
      // Group chat contexts by CFI range
      chatContexts.forEach(chat => {
        const existing = chatsMap.get(chat.cfi_range) || [];
        chatsMap.set(chat.cfi_range, [...existing, chat]);
      });
      
      const newCache = { highlights: highlightsMap, notes: notesMap, chatContexts: chatsMap };
      setAnnotationsCache(newCache);
      annotationsCacheRef.current = newCache; // Also update ref immediately
      logger.info('Reader', `✓ Cached ${highlights.length} highlights, ${notes.length} notes, ${chatContexts.length} chats`);
    } catch (error) {
      logger.error('Reader', `Failed to load annotations: ${error}`);
    }
  };
  
  // Get annotations from cache (no API calls)
  // Always use the latest cache via ref (important for event handlers)
  const getAnnotationsFromCache = (cfiRange: string): {
    highlight?: Highlight;
    note?: Note;
    chatContexts: ChatContext[];
  } => {
    const cache = annotationsCacheRef.current;
    return {
      highlight: cache.highlights.get(cfiRange),
      note: cache.notes.get(cfiRange),
      chatContexts: cache.chatContexts.get(cfiRange) || [],
    };
  };
  
  // Add single annotation to rendition (incremental)
  const addAnnotationToRendition = (type: 'highlight' | 'note' | 'chat', cfiRange: string, data?: Highlight) => {
    const rendition = epubService.rendition;
    if (!rendition) return;
    
    try {
      if (type === 'highlight' && data?.color) {
        rendition.annotations.add(
          'highlight',
          cfiRange,
          {},
          undefined,
          'hl',
          { fill: HIGHLIGHT_COLORS[data.color] }
        );
      } else if (type === 'note') {
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
      } else if (type === 'chat') {
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
    } catch (error) {
      logger.warn('Reader', `Failed to add ${type} annotation: ${error}`);
    }
  };
  
  // Remove single annotation from rendition (incremental)
  const removeAnnotationFromRendition = (cfiRange: string, type: 'highlight' | 'underline') => {
    const rendition = epubService.rendition;
    if (!rendition) return;
    
    try {
      rendition.annotations.remove(cfiRange, type);
    } catch (error) {
      // Annotation may not exist, ignore error
    }
  };
  
  // Update single annotation (incremental - much faster than re-rendering all)
  const updateSingleAnnotation = (cfiRange: string, newState?: {
    highlight?: Highlight;
    note?: Note;
    chatContexts?: ChatContext[];
  }) => {
    // Use provided state or get from cache
    const annotations = newState || getAnnotationsFromCache(cfiRange);
    
    // Remove all annotations at this CFI first
    removeAnnotationFromRendition(cfiRange, 'highlight');
    removeAnnotationFromRendition(cfiRange, 'underline');
    
    // Add back based on what exists
    if (annotations.highlight) {
      addAnnotationToRendition('highlight', cfiRange, annotations.highlight);
    } else if (annotations.note) {
      addAnnotationToRendition('note', cfiRange);
    } else if (annotations.chatContexts && annotations.chatContexts.length > 0) {
      addAnnotationToRendition('chat', cfiRange);
    }
  };

  const loadBook = async () => {
    try {
      logger.info('Reader', `Starting to load book ID: ${bookId}`);
      setIsLoading(true);
      
      // Reset initial load flag
      isInitialLoadRef.current = true;
      annotationsLoadedRef.current = false;
      
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
          // In paginated mode, use END CFI to ensure we restore to current page
          // (start.cfi can appear on previous page if text spans pages)
          // In scroll mode, start.cfi is fine since we scroll to exact position
          const cfi = (flow === 'paginated' ? location?.end?.cfi : location?.start?.cfi) 
                      || epubService.getCurrentLocation();
          
          if (!cfi) {
            logger.debug('Reader', 'No CFI available yet');
            return;
          }
          
          // Skip saving during initial load to prevent race condition with 0%
          if (isInitialLoadRef.current) {
            logger.debug('Reader', 'Skipping progress save during initial load');
            return;
          }
          
          // Update CFI immediately
          setCurrentCfi(cfi);
          
          // Try to calculate percentage from CFI
          const percentage = epubService.getPercentageFromCfi(cfi);
          
          if (percentage !== null && percentage !== undefined) {
            // Locations are ready - use calculated percentage
            setProgress(percentage);
            logger.debug('Reader', `Location changed: ${(percentage * 100).toFixed(2)}%`);
            
            // Clear any pending save
            if (progressTimeoutRef.current) {
              clearTimeout(progressTimeoutRef.current);
            }
            
            // Debounce saves to avoid excessive API calls (2s for better performance)
            progressTimeoutRef.current = setTimeout(() => {
              saveProgress(cfi, percentage);
            }, 2000);
          } else {
            // Locations not ready yet - save CFI only, keep using cached percentage
            logger.debug('Reader', 'Locations not ready - saving CFI with cached percentage');
            
            if (progressTimeoutRef.current) {
              clearTimeout(progressTimeoutRef.current);
            }
            
            // Save with current progress state (which is the cached value from DB)
            progressTimeoutRef.current = setTimeout(() => {
              saveProgress(cfi, progress);
            }, 2000);
          }
        };
        
        // Attach progress tracking for paginated mode (relocated event)
        rendition.on('relocated', async (location: any) => {
          handleLocationChange(location);
          
          // Re-render annotations on the new page (EPUB.js clears them on navigation)
          // Only do this after initial load is complete and annotations have been loaded
          if (!isInitialLoadRef.current && annotationsLoadedRef.current) {
            // Use ref to get latest cache (avoid closure issue)
            const currentCache = annotationsCacheRef.current;
            logger.debug('Reader', `Page changed - re-rendering annotations (cache has ${currentCache.highlights.size} highlights)`);
            try {
              await renderAllAnnotations();
              logger.debug('Reader', 'Annotations re-rendered after page change');
            } catch (error) {
              logger.warn('Reader', `Failed to re-render annotations on page change: ${error}`);
            }
          }
        });
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

        // Set up mouse tracking and scroll listener in the iframe with retry logic
        const setupIframeListeners = () => {
          const iframe = viewerRef.current?.querySelector('iframe');
          if (iframe?.contentWindow?.document) {
            const trackIframeMouse = (e: MouseEvent) => {
              const iframeRect = iframe.getBoundingClientRect();
              lastMousePosition.current = {
                x: iframeRect.left + e.clientX,
                y: iframeRect.top + e.clientY,
              };
            };
            
            try {
              iframe.contentWindow.document.addEventListener('mousemove', trackIframeMouse);
              
              // In scroll mode, add scroll listener with idle detection
              if (flow === 'scrolled') {
                const handleScroll = () => {
                  // Skip during initial load to prevent saving wrong position
                  if (isInitialLoadRef.current) {
                    logger.debug('Reader', 'Skipping scroll event during initial load');
                    return;
                  }
                  
                  // Clear previous scroll timeout
                  if (scrollTimeoutRef.current) {
                    clearTimeout(scrollTimeoutRef.current);
                  }
                  
                  // Only update progress after user stops scrolling for 1 second
                  scrollTimeoutRef.current = setTimeout(() => {
                    const location = rendition.currentLocation() as any;
                    if (location?.start) {
                      handleLocationChange(location);
                    }
                  }, 1000);
                };
                
                iframe.contentWindow.document.addEventListener('scroll', handleScroll);
                logger.info('Reader', 'Scroll progress tracking attached with idle detection');
              }
              
              return true; // Success
            } catch (e) {
              // Ignore cross-origin errors
              console.warn('Could not set up iframe listeners:', e);
              return false;
            }
          }
          return false; // Not ready yet
        };
        
        // Try immediately and retry if needed
        if (!setupIframeListeners()) {
          setTimeout(() => {
            if (!setupIframeListeners()) {
              setTimeout(setupIframeListeners, 200);
            }
          }, 100);
        }

        // Now display the book with settings applied
        const bookData = await bookApiService.getBook(bookId);
        logger.info('Reader', `Displaying book in ${flow} mode`);
        
        // Try to load cached locations (non-blocking - skip generation for now)
        logger.info('Reader', 'Attempting to load cached locations...');
        const cachedLocations = await epubService.loadOrGenerateLocations(bookData.locations_data, true);
        
        if (cachedLocations) {
          logger.info('Reader', 'Loaded cached locations successfully');
        } else {
          logger.info('Reader', 'No cached locations - will generate in background after display');
        }
        
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
            logger.info('Reader', `Restoring position to CFI: ${bookData.current_cfi.substring(0, 50)}...`);
            
            // Display at saved CFI - EPUB.js handles positioning automatically
            await rendition.display(bookData.current_cfi);
            logger.info('Reader', '✓ Position restored successfully');
            
            // In scroll mode, ensure we scroll to the exact position
            // Note: rendition.display() loads the section but doesn't auto-scroll in scrolled mode
            if (flow === 'scrolled') {
              // Small delay to ensure rendition has loaded
              await new Promise(resolve => setTimeout(resolve, 100));
              
              try {
                const range = rendition.getRange(bookData.current_cfi);
                if (range?.startContainer) {
                  const element = range.startContainer.nodeType === Node.ELEMENT_NODE 
                    ? range.startContainer as Element
                    : range.startContainer.parentElement;
                  
                  if (element) {
                    element.scrollIntoView({ behavior: 'auto', block: 'start' });
                    logger.info('Reader', '✓ Scrolled to saved position');
                  }
                }
              } catch (error) {
                logger.warn('Reader', `Could not scroll to exact position: ${error}`);
              }
            }
          } else {
            logger.info('Reader', 'No saved position - displaying from beginning');
            await rendition.display();
          }
          logger.info('Reader', 'Book display completed successfully');
          
          // Mark initial load as complete - use dynamic timing based on rendered event
          // Wait for rendering to settle before enabling progress tracking
          const enableProgressTracking = () => {
            isInitialLoadRef.current = false;
            logger.info('Reader', 'Initial load complete - progress tracking enabled');
          };
          
          // Use multiple signals to detect when rendering is truly complete
          let renderingComplete = false;
          let annotationsLoaded = false;
          
          rendition.on('rendered', async () => {
            if (!renderingComplete) {
              renderingComplete = true;
              // Wait for next animation frame to ensure all rendering is done
              requestAnimationFrame(() => {
                setTimeout(enableProgressTracking, 200);
              });
              
              // Load and render annotations immediately after first render
              if (!annotationsLoaded) {
                annotationsLoaded = true;
                try {
                  logger.info('Reader', 'Loading annotations after render...');
                  await loadAnnotationsIntoCache();
                  await renderAllAnnotations();
                  annotationsLoadedRef.current = true;
                  logger.info('Reader', '✓ Annotations loaded and rendered');
                } catch (error) {
                  logger.error('Reader', `Error loading annotations: ${error}`);
                }
              }
            }
          });
          
          // Fallback timer in case 'rendered' event doesn't fire
          setTimeout(async () => {
            if (!renderingComplete) {
              logger.warn('Reader', 'Rendered event timeout - enabling progress tracking anyway');
              enableProgressTracking();
            }
            
            // Also load annotations in fallback if not loaded yet
            if (!annotationsLoaded) {
              annotationsLoaded = true;
              try {
                logger.info('Reader', 'Loading annotations (fallback timer)...');
                await loadAnnotationsIntoCache();
                await renderAllAnnotations();
                annotationsLoadedRef.current = true;
                logger.info('Reader', '✓ Annotations loaded via fallback');
              } catch (error) {
                logger.error('Reader', `Error loading annotations: ${error}`);
              }
            }
          }, 1500);
        } catch (displayError) {
          logger.error('Reader', `Error displaying book with CFI: ${displayError}`);
          
          // Try fallback to location_index if available
          if (bookData?.location_index !== undefined && bookData.location_index !== null) {
            logger.warn('Reader', `Attempting fallback to location_index: ${bookData.location_index}`);
            try {
              const fallbackCfi = epubService.getCfiFromLocationIndex(bookData.location_index);
              if (fallbackCfi) {
                await rendition.display(fallbackCfi);
                logger.info('Reader', '✓ Successfully restored position using location_index fallback');
                
                // Load annotations
                try {
                  await loadAnnotationsIntoCache();
                  await renderAllAnnotations();
                  annotationsLoadedRef.current = true;
                  logger.info('Reader', '✓ Annotations loaded (location_index path)');
                } catch (annotError) {
                  logger.error('Reader', `Error loading annotations: ${annotError}`);
                }
                
                // Enable progress tracking
                setTimeout(() => {
                  isInitialLoadRef.current = false;
                  logger.info('Reader', 'Progress tracking enabled after location_index fallback');
                }, 1000);
                return; // Success - skip the final fallback
              }
            } catch (locationError) {
              logger.warn('Reader', `Location index fallback also failed: ${locationError}`);
            }
          }
          
          // Final fallback: display from beginning
          logger.warn('Reader', 'Displaying from beginning as final fallback');
          try {
            await rendition.display();
            
            // Load annotations
            try {
              await loadAnnotationsIntoCache();
              await renderAllAnnotations();
              annotationsLoadedRef.current = true;
              logger.info('Reader', '✓ Annotations loaded (final fallback path)');
            } catch (annotError) {
              logger.error('Reader', `Error loading annotations: ${annotError}`);
            }
            
            // Still enable progress tracking even after fallback
            setTimeout(() => {
              isInitialLoadRef.current = false;
              logger.info('Reader', 'Progress tracking enabled after fallback display');
            }, 1000);
          } catch (fallbackError) {
            logger.error('Reader', `Fallback display also failed: ${fallbackError}`);
          }
        }

        // Generate locations in background if not cached (non-blocking)
        if (!cachedLocations) {
          const scheduleBackgroundTask = (callback: () => void, delay: number = 1000) => {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => callback(), { timeout: delay + 1000 });
            } else {
              setTimeout(callback, delay);
            }
          };
          
          scheduleBackgroundTask(async () => {
            try {
              logger.info('Reader', 'Starting background location generation...');
              const locationsJson = await epubService.generateLocationsInBackground();
              
              if (locationsJson) {
                // Save to database
                await bookApiService.updateProgress(bookId, { locations_data: locationsJson });
                logger.info('Reader', '✓ Background locations generated and saved');
              }
            } catch (error) {
              logger.warn('Reader', `Background location generation failed: ${error}`);
            }
          });
        }
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

  // Render all annotations from cache (no API calls - much faster!)
  const renderAllAnnotations = async (): Promise<void> => {
    const rendition = epubService.rendition;
    if (!rendition) {
      logger.warn('Reader', 'Cannot render annotations: rendition not ready');
      return;
    }

    // Ensure rendition has finished rendering before adding annotations
    // @ts-ignore - manager exists but not in types
    if (!rendition.manager || !rendition.manager.container) {
      logger.warn('Reader', 'Rendition not fully initialized, skipping annotations');
      return;
    }

    // Use ref to get latest cache (critical for event handlers!)
    const cache = annotationsCacheRef.current;
    
    logger.info('Reader', `Rendering annotations from cache (${cache.highlights.size} highlights, ${cache.notes.size} notes, ${cache.chatContexts.size} chat ranges)`);
    
    // Get all unique CFI ranges from cache
    const allCfiRanges = new Set<string>();
    cache.highlights.forEach((_, cfi) => allCfiRanges.add(cfi));
    cache.notes.forEach((_, cfi) => allCfiRanges.add(cfi));
    cache.chatContexts.forEach((_, cfi) => allCfiRanges.add(cfi));
    
    // Clear existing annotations first to prevent duplicates
    // (EPUB.js might not always clear them on navigation)
    allCfiRanges.forEach(cfiRange => {
      try {
        rendition.annotations.remove(cfiRange, 'highlight');
        rendition.annotations.remove(cfiRange, 'underline');
      } catch (e) {
        // Ignore errors for non-existent annotations
      }
    });
    
    // Render each unique CFI range
    let renderedCount = 0;
    allCfiRanges.forEach(cfiRange => {
      const highlight = cache.highlights.get(cfiRange);
      const note = cache.notes.get(cfiRange);
      const chats = cache.chatContexts.get(cfiRange);
      
      // Priority: Highlight > Note > Chat
      if (highlight) {
        addAnnotationToRendition('highlight', cfiRange, highlight);
        renderedCount++;
        logger.debug('Reader', `Rendered highlight at ${cfiRange.substring(0, 30)}...`);
      } else if (note) {
        addAnnotationToRendition('note', cfiRange);
        renderedCount++;
        logger.debug('Reader', `Rendered note at ${cfiRange.substring(0, 30)}...`);
      } else if (chats && chats.length > 0) {
        addAnnotationToRendition('chat', cfiRange);
        renderedCount++;
        logger.debug('Reader', `Rendered chat at ${cfiRange.substring(0, 30)}...`);
      }
    });
    
    logger.info('Reader', `✓ Rendered ${renderedCount} annotations from cache (${cache.highlights.size} highlights, ${cache.notes.size} notes, ${cache.chatContexts.size} chat ranges)`);
    
    // Verify annotations were added to EPUB.js
    // @ts-ignore
    const epubjsAnnotations = rendition.annotations._annotations;
    const epubjsCount = epubjsAnnotations ? Object.keys(epubjsAnnotations).length : 0;
    logger.debug('Reader', `EPUB.js has ${epubjsCount} annotation objects registered`);
  };

  /**
   * Save reading progress with validation and fallbacks
   * 
   * Architecture:
   * 1. CFI (Canonical Fragment Identifier) = Primary source of truth for exact location
   *    - Paginated mode: Uses location.end.cfi (ensures we open to current page, not previous)
   *    - Scroll mode: Uses location.start.cfi (scrolls to exact position anyway)
   * 2. Location Index = Backup numeric location (from epub.js locations array)
   * 3. Percentage = Derived from CFI via book.locations.percentageFromCfi()
   * 4. All stored as redundant backups for maximum reliability
   * 5. Percentage cached in DB for fast library display (no need to load book)
   * 6. On book open: Navigate to CFI (or fall back to location_index if CFI fails)
   * 
   * Why end.cfi for paginated? 
   * start.cfi points to beginning of page and can appear on previous page if text spans both.
   * end.cfi ensures we're definitely on the current page when restored.
   */
  const saveProgress = async (cfi: string, percentage: number) => {
    try {
      // Validate CFI before saving
      if (!epubService.validateCfi(cfi)) {
        logger.warn('Reader', 'CFI validation failed, but saving anyway (may be valid but not yet rendered)');
      }
      
      // Get location index as backup
      const locationIndex = epubService.getLocationIndexFromCfi(cfi);
      
      logger.info('Reader', `Saving progress: ${(percentage * 100).toFixed(2)}% at CFI: ${cfi.substring(0, 30)}... (location: ${locationIndex || 'N/A'})`);
      
      const response = await bookApiService.updateProgress(bookId, {
        current_cfi: cfi,              // Primary: exact location
        location_index: locationIndex || undefined,  // Backup: numeric location
        percentage: percentage,         // Cached for performance (library view)
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
    
    // Get existing annotations from cache (no API calls!)
    const annotations = getAnnotationsFromCache(cfiRange);
    
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
      note: annotations.note,
      chatContexts: annotations.chatContexts,
    });
  };

  const handleHighlight = async (color: Highlight['color']) => {
    if (!contextMenu) return;

    try {
      let updatedHighlight: Highlight;
      
      if (contextMenu.highlight) {
        // Update existing highlight
        updatedHighlight = await annotationService.updateHighlightColor(contextMenu.highlight.id!, color);
      } else {
        // Create new highlight
        const id = await annotationService.createHighlight(
          bookId,
          contextMenu.cfiRange,
          contextMenu.text,
          color
        );
        updatedHighlight = {
          id,
          book_id: bookId,
          cfi_range: contextMenu.cfiRange,
          text: contextMenu.text,
          color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      
      // Update cache
      setAnnotationsCache(prev => ({
        ...prev,
        highlights: new Map(prev.highlights).set(contextMenu.cfiRange, updatedHighlight)
      }));
      
      // Incremental update with new state (avoid race condition)
      const existingCache = getAnnotationsFromCache(contextMenu.cfiRange);
      updateSingleAnnotation(contextMenu.cfiRange, {
        highlight: updatedHighlight,
        note: existingCache.note,
        chatContexts: existingCache.chatContexts
      });
      
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
      
      // Delete from database
      await annotationService.deleteHighlight(contextMenu.highlight.id!);
      
      // Get existing state before deletion
      const existingCache = getAnnotationsFromCache(cfiRange);
      
      // Update cache
      setAnnotationsCache(prev => {
        const newHighlights = new Map(prev.highlights);
        newHighlights.delete(cfiRange);
        return { ...prev, highlights: newHighlights };
      });
      
      // Incremental update with new state - will show note or chat if they exist
      updateSingleAnnotation(cfiRange, {
        highlight: undefined,
        note: existingCache.note,
        chatContexts: existingCache.chatContexts
      });
      
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
      let updatedNote: Note;
      
      if (noteDialog.existingNote) {
        // Update existing note
        updatedNote = await annotationService.updateNote(noteDialog.existingNote.id!, noteContent);
      } else {
        // Create new note
        const id = await annotationService.createNote(
          bookId,
          noteDialog.cfiRange,
          noteDialog.text,
          noteContent
        );
        updatedNote = {
          id,
          book_id: bookId,
          cfi_range: noteDialog.cfiRange,
          text: noteDialog.text,
          note_content: noteContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      
      // Update cache
      setAnnotationsCache(prev => ({
        ...prev,
        notes: new Map(prev.notes).set(noteDialog.cfiRange, updatedNote)
      }));
      
      // Incremental update with new state
      const existingCache = getAnnotationsFromCache(noteDialog.cfiRange);
      updateSingleAnnotation(noteDialog.cfiRange, {
        highlight: existingCache.highlight,
        note: updatedNote,
        chatContexts: existingCache.chatContexts
      });
      
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
      
      // Delete from database
      await annotationService.deleteNote(contextMenu.note.id!);
      
      // Get existing state before deletion
      const existingCache = getAnnotationsFromCache(cfiRange);
      
      // Update cache
      setAnnotationsCache(prev => {
        const newNotes = new Map(prev.notes);
        newNotes.delete(cfiRange);
        return { ...prev, notes: newNotes };
      });
      
      // Incremental update with new state - will show chat if it exists
      updateSingleAnnotation(cfiRange, {
        highlight: existingCache.highlight,
        note: undefined,
        chatContexts: existingCache.chatContexts
      });
      
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
      const id = await annotationService.createChatContext(
        bookId,
        chatDialog.cfiRange,
        chatDialog.text,
        prompt,
        response
      );
      
      const newChat: ChatContext = {
        id,
        book_id: bookId,
        cfi_range: chatDialog.cfiRange,
        text: chatDialog.text,
        user_prompt: prompt,
        ai_response: response,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Get existing state
      const existingCache = getAnnotationsFromCache(chatDialog.cfiRange);
      const updatedChats = [...existingCache.chatContexts, newChat];
      
      // Update cache
      setAnnotationsCache(prev => {
        return {
          ...prev,
          chatContexts: new Map(prev.chatContexts).set(chatDialog.cfiRange, updatedChats)
        };
      });
      
      // Incremental update with new state
      updateSingleAnnotation(chatDialog.cfiRange, {
        highlight: existingCache.highlight,
        note: existingCache.note,
        chatContexts: updatedChats
      });
      
      setAnnotationRefreshKey(prev => prev + 1);
      setChatDialog(null);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error with chat:', error);
      throw error;
    }
  };

  const handleViewChat = async (chatId: number) => {
    // Find chat in cache
    let foundChat: ChatContext | undefined;
    annotationsCache.chatContexts.forEach(chats => {
      const match = chats.find(c => c.id === chatId);
      if (match) foundChat = match;
    });
    
    if (foundChat) {
      setChatViewDialog(foundChat);
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
      logger.info('Reader', `Navigation complete`);
      
      // Annotations should already be visible (EPUB.js manages them across pages)
      // Just apply flash effect to highlight them
      
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
    
    // Get all annotations from cache (no API calls!)
    const annotations = getAnnotationsFromCache(cfiRange);
    
    // Get the text from the highlight or note
    const text = annotations.highlight?.text || annotations.note?.text || '';
    
    setContextMenu({
      show: true,
      position: { x: event.clientX, y: event.clientY },
      cfiRange,
      text,
      highlight: annotations.highlight,
      note: annotations.note,
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
                  
                  // Delete from database
                  await annotationService.deleteNote(noteDialog.existingNote!.id!);
                  
                  // Get existing state before deletion
                  const existingCache = getAnnotationsFromCache(cfiRange);
                  
                  // Update cache
                  setAnnotationsCache(prev => {
                    const newNotes = new Map(prev.notes);
                    newNotes.delete(cfiRange);
                    return { ...prev, notes: newNotes };
                  });
                  
                  // Incremental update with new state
                  updateSingleAnnotation(cfiRange, {
                    highlight: existingCache.highlight,
                    note: undefined,
                    chatContexts: existingCache.chatContexts
                  });
                  
                  setAnnotationRefreshKey(prev => prev + 1);
                  setContextMenu(null);
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
