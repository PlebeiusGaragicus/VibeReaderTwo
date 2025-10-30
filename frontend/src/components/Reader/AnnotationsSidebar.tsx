import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, Trash2 } from 'lucide-react';
import { annotationService } from '../../services/annotationService';
import type { Highlight, Note } from '../../lib/db';

interface AnnotationsSidebarProps {
  bookId: number;
  onClose: () => void;
  onNavigate: (cfi: string) => void;
  onRefresh?: () => void;
}

const HIGHLIGHT_COLORS: Record<Highlight['color'], string> = {
  yellow: 'bg-yellow-300',
  green: 'bg-green-300',
  blue: 'bg-blue-300',
  pink: 'bg-pink-300',
  purple: 'bg-purple-300',
};

type AnnotationItem = 
  | { type: 'highlight'; data: Highlight }
  | { type: 'note'; data: Note };

export function AnnotationsSidebar({
  bookId,
  onClose,
  onNavigate,
  onRefresh,
}: AnnotationsSidebarProps) {
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);

  useEffect(() => {
    loadAnnotations();
  }, [bookId]);

  const loadAnnotations = async () => {
    const [loadedHighlights, loadedNotes] = await Promise.all([
      annotationService.getHighlights(bookId),
      annotationService.getNotes(bookId),
    ]);
    
    // Combine highlights and notes into a single list, sorted by creation date
    const combined: AnnotationItem[] = [
      ...loadedHighlights.map(h => ({ type: 'highlight' as const, data: h })),
      ...loadedNotes.map(n => ({ type: 'note' as const, data: n })),
    ].sort((a, b) => {
      const dateA = new Date(a.data.createdAt).getTime();
      const dateB = new Date(b.data.createdAt).getTime();
      return dateB - dateA; // Most recent first
    });
    
    setAnnotations(combined);
  };

  const handleDelete = async (item: AnnotationItem) => {
    const message = item.type === 'highlight' ? 'Delete this highlight?' : 'Delete this note?';
    if (confirm(message)) {
      if (item.type === 'highlight') {
        await annotationService.deleteHighlight(item.data.id!);
      } else {
        await annotationService.deleteNote(item.data.id!);
      }
      await loadAnnotations();
      onRefresh?.();
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-background/70 backdrop-blur-sm border-l shadow-lg z-10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Annotations ({annotations.length})</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-5rem)] p-4 space-y-3">
        {annotations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No annotations yet
          </p>
        ) : (
          annotations.map((item) => (
            <div
              key={`${item.type}-${item.data.id}`}
              className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => onNavigate(item.data.cfiRange)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {item.type === 'highlight' ? (
                    // Highlight: Show text with highlight color background
                    <p className={`text-sm px-2 py-1 rounded ${HIGHLIGHT_COLORS[item.data.color]}`}>
                      {truncateText(item.data.text)}
                    </p>
                  ) : (
                    // Note: Show selected text (truncated) and note content (truncated)
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground italic">
                        "{truncateText(item.data.text, 40)}"
                      </p>
                      <p className="text-sm">
                        {truncateText(item.data.noteContent, 80)}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
