import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, Highlighter, StickyNote, Trash2 } from 'lucide-react';
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

export function AnnotationsSidebar({
  bookId,
  onClose,
  onNavigate,
  onRefresh,
}: AnnotationsSidebarProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState<'highlights' | 'notes'>('highlights');

  useEffect(() => {
    loadAnnotations();
  }, [bookId]);

  const loadAnnotations = async () => {
    const [loadedHighlights, loadedNotes] = await Promise.all([
      annotationService.getHighlights(bookId),
      annotationService.getNotes(bookId),
    ]);
    setHighlights(loadedHighlights);
    setNotes(loadedNotes);
  };

  const handleDeleteHighlight = async (id: number) => {
    if (confirm('Delete this highlight?')) {
      await annotationService.deleteHighlight(id);
      await loadAnnotations();
      onRefresh?.();
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (confirm('Delete this note?')) {
      await annotationService.deleteNote(id);
      await loadAnnotations();
      onRefresh?.();
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-background border-l shadow-lg z-10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Annotations</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('highlights')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'highlights'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Highlighter className="w-4 h-4 inline mr-2" />
          Highlights ({highlights.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'notes'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <StickyNote className="w-4 h-4 inline mr-2" />
          Notes ({notes.length})
        </button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-8rem)] p-4 space-y-3">
        {activeTab === 'highlights' ? (
          highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No highlights yet
            </p>
          ) : (
            highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onNavigate(highlight.cfiRange)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={`w-4 h-4 rounded ${HIGHLIGHT_COLORS[highlight.color]} flex-shrink-0 mt-0.5`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      highlight.id && handleDeleteHighlight(highlight.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm">{highlight.text}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(highlight.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )
        ) : (
          notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notes yet
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onNavigate(note.cfiRange)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <StickyNote className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      note.id && handleDeleteNote(note.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm italic text-muted-foreground mb-2">
                  "{note.text}"
                </p>
                <p className="text-sm">{note.noteContent}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
