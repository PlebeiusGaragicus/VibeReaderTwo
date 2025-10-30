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
import { annotationService } from '../../services/annotationService';
import type { Highlight } from '../../lib/db';

interface BookViewerProps {
  bookId: number;
  onClose: () => void;
}

export function BookViewer({ bookId, onClose }: BookViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
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
  const [annotationRefreshKey, setAnnotationRefreshKey] = useState(0);

  useEffect(() => {
    loadBook();
    return () => {
      epubService.destroy();
    };
  }, [bookId]);

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

        // Load and render existing highlights
        const highlights = await annotationService.getHighlights(bookId);
        highlights.forEach((highlight) => {
          const colorMap = {
            yellow: 'rgba(255, 255, 0, 0.3)',
            green: 'rgba(0, 255, 0, 0.3)',
            blue: 'rgba(0, 0, 255, 0.3)',
            pink: 'rgba(255, 192, 203, 0.3)',
            purple: 'rgba(128, 0, 128, 0.3)',
          };
          rendition.annotations.add(
            'highlight',
            highlight.cfiRange,
            {},
            undefined,
            'hl',
            { fill: colorMap[highlight.color] }
          );
        });

        // Apply saved settings
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
    
    setSelectionMenu({
      show: true,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
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
      const colorMap = {
        yellow: 'rgba(255, 255, 0, 0.3)',
        green: 'rgba(0, 255, 0, 0.3)',
        blue: 'rgba(0, 0, 255, 0.3)',
        pink: 'rgba(255, 192, 203, 0.3)',
        purple: 'rgba(128, 0, 128, 0.3)',
      };
      
      // Access rendition through epubService
      const rendition = (epubService as any).rendition;
      if (rendition) {
        rendition.annotations.add(
          'highlight',
          selectionMenu.cfiRange,
          {},
          undefined,
          'hl',
          { fill: colorMap[color] }
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
        {/* Reader */}
        <div 
          ref={viewerRef} 
          className="absolute inset-0"
          style={{ padding: '20px' }}
        />

        {/* Navigation Zones */}
        <div className="absolute inset-0 flex pointer-events-none">
          <button
            onClick={handlePrevPage}
            className="flex-1 pointer-events-auto cursor-pointer hover:bg-black/5 transition-colors"
            aria-label="Previous page"
          />
          <button
            onClick={handleNextPage}
            className="flex-1 pointer-events-auto cursor-pointer hover:bg-black/5 transition-colors"
            aria-label="Next page"
          />
        </div>

        {/* Navigation Buttons */}
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevPage}
            className="pointer-events-auto bg-background/80 backdrop-blur"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </div>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextPage}
            className="pointer-events-auto bg-background/80 backdrop-blur"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

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
