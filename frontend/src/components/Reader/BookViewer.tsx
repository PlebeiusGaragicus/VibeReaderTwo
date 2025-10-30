import { useEffect, useRef, useState } from 'react';
import type { Book as EpubBook } from 'epubjs';
import { epubService } from '../../services/epubService';
import { db } from '../../lib/db';
import { Button } from '../ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  Settings,
  BookOpen,
  Highlighter
} from 'lucide-react';
import { ReaderSettings } from './ReaderSettings';
import { TableOfContents } from './TableOfContents';
import { SelectionMenu } from './SelectionMenu';
import { NoteDialog } from './NoteDialog';
import { AnnotationsSidebar } from './AnnotationsSidebar';
import { HighlightContextMenu } from './HighlightContextMenu';
import { annotationService } from '../../services/annotationService';
import type { Highlight } from '../../lib/db';

interface BookViewerProps {
  bookId: number;
  onClose: () => void;
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectionMenu, setSelectionMenu] = useState<{
    show: boolean;
    position: { x: number; y: number };
    cfiRange: string;
    text: string;
  } | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    show: boolean;
    cfiRange: string;
    text: string;
  } | null>(null);
  const [highlightContextMenu, setHighlightContextMenu] = useState<{
    show: boolean;
    position: { x: number; y: number };
    highlight: Highlight;
  } | null>(null);
  const [annotationRefreshKey, setAnnotationRefreshKey] = useState(0);

  useEffect(() => {
    loadBook();
    return () => {
      epubService.destroy();
    };
  }, [bookId]);

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
      setIsLoading(true);
      const loadedBook = await epubService.loadBook(bookId);
      setBook(loadedBook);

      if (viewerRef.current) {
        const rendition = await epubService.renderBook(loadedBook, viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
        });

        // Load saved position
        const bookData = await db.books.get(bookId);
        if (bookData?.currentCFI) {
          await epubService.goToLocation(bookData.currentCFI);
        }

        // Track location changes
        rendition.on('relocated', (location: any) => {
          const cfi = epubService.getCurrentLocation();
          if (cfi) {
            saveProgress(cfi, location.start?.percentage || 0);
          }
        });

        // Handle text selection for annotations
        rendition.on('selected', handleTextSelection);

        // Handle clicks on highlights
        rendition.on('markClicked', (cfiRange: string) => {
          // Use the last tracked mouse position
          handleHighlightClick(cfiRange, { 
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
            } catch (e) {
              // Ignore cross-origin errors
              console.warn('Could not set up iframe mouse tracking:', e);
            }
          }
        }, 500);

        // Apply saved settings first (before displaying)
        const settings = await db.settings.toArray();
        if (settings.length > 0) {
          const { reading } = settings[0];
          epubService.applyTheme(reading.theme);
          epubService.applyFontSettings({
            fontSize: reading.fontSize,
            fontFamily: reading.fontFamily,
            lineHeight: reading.lineHeight,
          });
        }

        // Wait a moment for the book to fully render, then add highlights
        setTimeout(async () => {
          const highlights = await annotationService.getHighlights(bookId);
          
          highlights.forEach((highlight) => {
            rendition.annotations.add(
              'highlight',
              highlight.cfiRange,
              {},
              undefined,
              'hl',
              { fill: HIGHLIGHT_COLORS[highlight.color] }
            );
          });
        }, 300);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading book:', error);
      alert('Failed to load book');
      onClose();
    }
  };

  const saveProgress = async (cfi: string, percentage: number) => {
    try {
      await db.books.update(bookId, {
        currentCFI: cfi,
        percentage: percentage * 100,
        lastReadDate: new Date(),
      });
      setProgress(percentage * 100);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handlePrevPage = async () => {
    try {
      await epubService.prevPage();
    } catch (error) {
      console.error('Error navigating:', error);
    }
  };

  const handleNextPage = async () => {
    try {
      await epubService.nextPage();
    } catch (error) {
      console.error('Error navigating:', error);
    }
  };

  const handleTOCSelect = async (href: string) => {
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
  }, []);

  // Annotation handlers
  const handleTextSelection = (cfiRange: string, contents: any) => {
    const selection = contents.window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setSelectionMenu(null);
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
    
    setSelectionMenu({
      show: true,
      position: {
        x: offsetX + rect.left + rect.width / 2,
        y: offsetY + rect.top,
      },
      cfiRange,
      text,
    });
  };

  const handleHighlight = async (color: Highlight['color']) => {
    if (!selectionMenu) return;

    try {
      await annotationService.createHighlight(
        bookId,
        selectionMenu.cfiRange,
        selectionMenu.text,
        color
      );
      
      // Render the highlight immediately
      const rendition = (epubService as any).rendition;
      if (rendition) {
        rendition.annotations.add(
          'highlight',
          selectionMenu.cfiRange,
          {},
          undefined,
          'hl',
          { fill: HIGHLIGHT_COLORS[color] }
        );
      }
      
      setAnnotationRefreshKey(prev => prev + 1);
      setSelectionMenu(null);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error creating highlight:', error);
    }
  };

  const handleCreateNote = () => {
    if (!selectionMenu) return;

    setNoteDialog({
      show: true,
      cfiRange: selectionMenu.cfiRange,
      text: selectionMenu.text,
    });
    setSelectionMenu(null);
  };

  const handleSaveNote = async (noteContent: string) => {
    if (!noteDialog) return;

    try {
      await annotationService.createNote(
        bookId,
        noteDialog.cfiRange,
        noteDialog.text,
        noteContent
      );
      setAnnotationRefreshKey(prev => prev + 1);
      setNoteDialog(null);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleCopyText = () => {
    if (!selectionMenu) return;

    navigator.clipboard.writeText(selectionMenu.text);
    setSelectionMenu(null);
  };

  const handleNavigateToAnnotation = async (cfi: string) => {
    try {
      await epubService.goToLocation(cfi);
    } catch (error) {
      console.error('Error navigating to annotation:', error);
    }
  };

  // Highlight context menu handlers
  const handleHighlightClick = async (cfiRange: string, event: MouseEvent) => {
    // If a menu is already open, close it instead of opening a new one
    if (highlightContextMenu?.show) {
      setHighlightContextMenu(null);
      return;
    }
    
    // Find the highlight in database
    const highlights = await annotationService.getHighlights(bookId);
    const highlight = highlights.find(h => h.cfiRange === cfiRange);
    
    if (highlight) {
      setHighlightContextMenu({
        show: true,
        position: { x: event.clientX, y: event.clientY },
        highlight,
      });
    }
  };

  const handleChangeHighlightColor = async (color: Highlight['color']) => {
    if (!highlightContextMenu) return;

    try {
      await annotationService.updateHighlightColor(highlightContextMenu.highlight.id!, color);
      
      // Update the visual highlight
      const rendition = (epubService as any).rendition;
      if (rendition) {
        // Remove old highlight
        rendition.annotations.remove(highlightContextMenu.highlight.cfiRange, 'highlight');
        
        // Add new highlight with new color
        rendition.annotations.add(
          'highlight',
          highlightContextMenu.highlight.cfiRange,
          {},
          undefined,
          'hl',
          { fill: HIGHLIGHT_COLORS[color] }
        );
      }
      
      setAnnotationRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error changing highlight color:', error);
    }
  };

  const handleAddNoteToHighlight = () => {
    if (!highlightContextMenu) return;

    setNoteDialog({
      show: true,
      cfiRange: highlightContextMenu.highlight.cfiRange,
      text: highlightContextMenu.highlight.text,
    });
  };

  const handleChatAboutHighlight = () => {
    if (!highlightContextMenu) return;
    // TODO: Implement chat functionality in future phase
    console.log('Chat about:', highlightContextMenu.highlight.text);
    alert('Chat feature coming soon!');
  };

  const handleDeleteHighlight = async () => {
    if (!highlightContextMenu) return;

    try {
      await annotationService.deleteHighlight(highlightContextMenu.highlight.id!);
      
      // Remove visual highlight
      const rendition = (epubService as any).rendition;
      if (rendition) {
        rendition.annotations.remove(highlightContextMenu.highlight.cfiRange, 'highlight');
      }
      
      setAnnotationRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting highlight:', error);
    }
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
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowTOC(!showTOC)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 text-center">
          <p className="text-sm font-medium truncate max-w-md mx-auto">
            {book?.packaging?.metadata?.title || 'Book'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowAnnotations(!showAnnotations)}
          >
            <Highlighter className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
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
          className="absolute inset-0"
        />

        {/* Left Margin Navigation Zone - only in the margin area */}
        <button
          onClick={handlePrevPage}
          className="absolute left-0 top-0 bottom-0 w-20 pointer-events-auto cursor-w-resize hover:bg-black/5 transition-colors flex items-center justify-center group"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-8 h-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Right Margin Navigation Zone - only in the margin area */}
        <button
          onClick={handleNextPage}
          className="absolute right-0 top-0 bottom-0 w-20 pointer-events-auto cursor-e-resize hover:bg-black/5 transition-colors flex items-center justify-center group"
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

        {/* Settings Panel */}
        {showSettings && (
          <ReaderSettings
            onClose={() => setShowSettings(false)}
            onSettingsChange={() => {
              // Reload settings
              loadBook();
            }}
          />
        )}

        {/* Annotations Sidebar */}
        {showAnnotations && (
          <AnnotationsSidebar
            bookId={bookId}
            onClose={() => setShowAnnotations(false)}
            onNavigate={handleNavigateToAnnotation}
            onRefresh={() => setAnnotationRefreshKey(prev => prev + 1)}
          />
        )}
      </div>

      {/* Selection Menu */}
      {selectionMenu?.show && (
        <SelectionMenu
          position={selectionMenu.position}
          onHighlight={handleHighlight}
          onNote={handleCreateNote}
          onCopy={handleCopyText}
          onClose={() => setSelectionMenu(null)}
        />
      )}

      {/* Note Dialog */}
      {noteDialog?.show && (
        <NoteDialog
          selectedText={noteDialog.text}
          onSave={handleSaveNote}
          onClose={() => setNoteDialog(null)}
        />
      )}

      {/* Highlight Context Menu */}
      {highlightContextMenu?.show && (
        <HighlightContextMenu
          position={highlightContextMenu.position}
          highlight={highlightContextMenu.highlight}
          onChangeColor={handleChangeHighlightColor}
          onAddNote={handleAddNoteToHighlight}
          onChat={handleChatAboutHighlight}
          onDelete={handleDeleteHighlight}
          onClose={() => setHighlightContextMenu(null)}
        />
      )}

      {/* Progress Bar */}
      <div className="border-t px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-right">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
