import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, Trash2, Pencil, MessageSquare } from 'lucide-react';
import { annotationService } from '../../services/annotationService';
import type { Highlight, Note, ChatContext } from '../../lib/db';

interface UnifiedAnnotationOverlayProps {
  bookId: number;
  onClose: () => void;
  onNavigate: (cfi: string) => void;
  onEditNote: (note: Note) => void;
  onOpenChat: (chat: ChatContext) => void;
  onRefresh?: () => void;
}

interface GroupedAnnotation {
  cfiRange: string;
  text: string;
  highlight?: Highlight;
  note?: Note;
  chats: ChatContext[];
  mostRecentDate: Date;
}

const HIGHLIGHT_COLORS: Record<Highlight['color'], string> = {
  yellow: 'bg-yellow-300',
  green: 'bg-green-300',
  blue: 'bg-blue-300',
  pink: 'bg-pink-300',
  purple: 'bg-purple-300',
};

export function UnifiedAnnotationOverlay({
  bookId,
  onClose,
  onNavigate,
  onEditNote,
  onOpenChat,
  onRefresh,
}: UnifiedAnnotationOverlayProps) {
  const [groupedAnnotations, setGroupedAnnotations] = useState<GroupedAnnotation[]>([]);

  useEffect(() => {
    loadAnnotations();
  }, [bookId]);

  const loadAnnotations = async () => {
    const [highlights, notes, chats] = await Promise.all([
      annotationService.getHighlights(bookId),
      annotationService.getNotes(bookId),
      annotationService.getChatContexts(bookId),
    ]);

    // Group by cfiRange
    const grouped = new Map<string, GroupedAnnotation>();

    // Add highlights
    highlights.forEach((highlight) => {
      if (!grouped.has(highlight.cfiRange)) {
        grouped.set(highlight.cfiRange, {
          cfiRange: highlight.cfiRange,
          text: highlight.text,
          highlight,
          chats: [],
          mostRecentDate: highlight.createdAt,
        });
      } else {
        const existing = grouped.get(highlight.cfiRange)!;
        existing.highlight = highlight;
        if (highlight.createdAt > existing.mostRecentDate) {
          existing.mostRecentDate = highlight.createdAt;
        }
      }
    });

    // Add notes
    notes.forEach((note) => {
      if (!grouped.has(note.cfiRange)) {
        grouped.set(note.cfiRange, {
          cfiRange: note.cfiRange,
          text: note.text,
          note,
          chats: [],
          mostRecentDate: note.createdAt,
        });
      } else {
        const existing = grouped.get(note.cfiRange)!;
        existing.note = note;
        if (note.createdAt > existing.mostRecentDate) {
          existing.mostRecentDate = note.createdAt;
        }
      }
    });

    // Add chats
    chats.forEach((chat) => {
      if (!grouped.has(chat.cfiRange)) {
        grouped.set(chat.cfiRange, {
          cfiRange: chat.cfiRange,
          text: chat.text,
          chats: [chat],
          mostRecentDate: chat.createdAt,
        });
      } else {
        const existing = grouped.get(chat.cfiRange)!;
        existing.chats.push(chat);
        if (chat.createdAt > existing.mostRecentDate) {
          existing.mostRecentDate = chat.createdAt;
        }
      }
    });

    // Convert to array and sort by location in book (CFI order)
    const sortedAnnotations = Array.from(grouped.values()).sort(
      (a, b) => a.cfiRange.localeCompare(b.cfiRange)
    );

    setGroupedAnnotations(sortedAnnotations);
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

  const handleDeleteChat = async (id: number) => {
    if (confirm('Delete this chat?')) {
      await annotationService.deleteChatContext(id);
      await loadAnnotations();
      onRefresh?.();
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-background/70 backdrop-blur-sm border-l shadow-lg z-10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Annotations ({groupedAnnotations.length})</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-5rem)] p-4 space-y-4">
        {groupedAnnotations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No annotations yet
          </p>
        ) : (
          groupedAnnotations.map((annotation) => (
            <div
              key={annotation.cfiRange}
              className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors"
            >
              {/* Selected Text - clickable to navigate */}
              <div
                onClick={() => onNavigate(annotation.cfiRange)}
                className="cursor-pointer"
              >
                {annotation.highlight ? (
                  // Show with highlight color
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm px-2 py-1 rounded flex-1 ${
                        HIGHLIGHT_COLORS[annotation.highlight.color]
                      }`}
                    >
                      {truncateText(annotation.text, 80)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        annotation.highlight?.id &&
                          handleDeleteHighlight(annotation.highlight.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  // Show without highlight
                  <p className="text-sm text-muted-foreground italic">
                    "{truncateText(annotation.text, 80)}"
                  </p>
                )}
              </div>

              {/* Note - clickable to edit */}
              {annotation.note && (
                <div
                  onClick={() => onEditNote(annotation.note!)}
                  className="flex items-start gap-2 pl-2 border-l-2 border-muted cursor-pointer hover:border-primary transition-colors"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">
                      {truncateText(annotation.note.noteContent, 100)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      annotation.note?.id && handleDeleteNote(annotation.note.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Chat Prompts - clickable to open chat */}
              {annotation.chats.length > 0 && (
                <div className="pl-2 space-y-1">
                  {annotation.chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => onOpenChat(chat)}
                      className="flex items-start gap-2 cursor-pointer hover:bg-accent/50 rounded p-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3 text-blue-500 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">
                          {truncateText(chat.userPrompt || '', 80)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          chat.id && handleDeleteChat(chat.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
