import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { 
  StickyNote, 
  MessageSquare, 
  Copy, 
  Trash2,
  ChevronRight
} from 'lucide-react';
import type { Highlight, Note, ChatContext } from '../../lib/db';

interface UnifiedContextMenuProps {
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
  existingHighlight?: Highlight;
  existingNote?: Note;
  existingChats?: ChatContext[];
  onHighlight: (color: Highlight['color']) => void;
  onRemoveHighlight: () => void;
  onNote: () => void;
  onViewNote: () => void;
  onRemoveNote: () => void;
  onChat: () => void;
  onViewChat: (chatId: number) => void;
  onCopy: () => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS: Array<{ color: Highlight['color']; bg: string; label: string }> = [
  { color: 'yellow', bg: 'bg-yellow-300', label: 'Yellow' },
  { color: 'green', bg: 'bg-green-300', label: 'Green' },
  { color: 'blue', bg: 'bg-blue-300', label: 'Blue' },
  { color: 'pink', bg: 'bg-pink-300', label: 'Pink' },
  { color: 'purple', bg: 'bg-purple-300', label: 'Purple' },
];

type MenuView = 'main' | 'highlight-colors' | 'chats';

export function UnifiedContextMenu({
  position,
  existingHighlight,
  existingNote,
  existingChats = [],
  onHighlight,
  onRemoveHighlight,
  onNote,
  onViewNote,
  onRemoveNote,
  onChat,
  onViewChat,
  onCopy,
  onClose,
}: UnifiedContextMenuProps) {
  const [currentView, setCurrentView] = useState<MenuView>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleIframeClick = () => {
      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.document.addEventListener('mousedown', handleIframeClick);
        } catch (e) {
          // Ignore cross-origin errors
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.document.removeEventListener('mousedown', handleIframeClick);
        } catch (e) {
          // Ignore cross-origin errors
        }
      });
    };
  }, [onClose]);

  // Calculate position with viewport boundary detection
  const getMenuStyle = () => {
    const menuWidth = 280;
    const menuHeight = currentView === 'chats' ? 300 : 250;
    const padding = 20;
    const gap = 10; // Gap between menu and selection
    
    const selectionHeight = position.selectionHeight || 20;
    const selectionBottom = position.selectionBottom || position.y;
    const selectionLeft = position.selectionLeft || position.x - 50;
    const selectionRight = position.selectionRight || position.x + 50;
    
    let left = position.x;
    let top = position.y;
    let transform = 'translate(-50%, -100%)';
    
    // Calculate available space
    const spaceAbove = position.y - padding;
    const spaceBelow = window.innerHeight - selectionBottom - padding;
    const spaceLeft = selectionLeft - padding;
    const spaceRight = window.innerWidth - selectionRight - padding;
    
    // Decide vertical position
    if (spaceAbove >= menuHeight + gap) {
      // Enough space above - position above
      top = position.y - gap;
      transform = 'translate(-50%, -100%)';
    } else if (spaceBelow >= menuHeight + gap) {
      // Not enough above, but enough below - position below
      top = selectionBottom + gap;
      transform = 'translate(-50%, 0)';
    } else if (selectionHeight > 100 && (spaceLeft >= menuWidth + gap || spaceRight >= menuWidth + gap)) {
      // Large selection and space on sides - position to the side
      if (spaceRight >= menuWidth + gap) {
        // Position to the right
        left = selectionRight + gap;
        top = position.y + selectionHeight / 2;
        transform = 'translate(0, -50%)';
      } else {
        // Position to the left
        left = selectionLeft - gap;
        top = position.y + selectionHeight / 2;
        transform = 'translate(-100%, -50%)';
      }
    } else {
      // Not enough space anywhere - position below and accept overlap
      top = selectionBottom + gap;
      transform = 'translate(-50%, 0)';
    }
    
    // CRITICAL: Ensure menu stays within viewport bounds
    // This handles multi-column selections and edge cases
    
    // Calculate actual menu position after transform
    let actualLeft = left;
    let actualTop = top;
    
    if (transform.includes('translate(-50%')) {
      actualLeft = left - menuWidth / 2;
    } else if (transform.includes('translate(-100%')) {
      actualLeft = left - menuWidth;
    }
    
    if (transform.includes('-100%)')) {
      actualTop = top - menuHeight;
    } else if (transform.includes('-50%)')) {
      actualTop = top - menuHeight / 2;
    }
    
    // Clamp to viewport bounds
    if (actualLeft < padding) {
      left = padding;
      transform = transform.replace('translate(-50%', 'translate(0').replace('translate(-100%', 'translate(0');
    } else if (actualLeft + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
      transform = transform.replace('translate(-50%', 'translate(0').replace('translate(-100%', 'translate(0');
    }
    
    if (actualTop < padding) {
      top = padding;
      transform = transform.replace('-100%)', '0)').replace('-50%)', '0)');
    } else if (actualTop + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding * 3; // 3x padding ensures that it's entirely on screen.
      transform = transform.replace('-100%)', '0)').replace('-50%)', '0)');
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform,
    };
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-background border rounded-lg shadow-lg overflow-hidden min-w-[280px]"
      style={getMenuStyle()}
    >
      {currentView === 'highlight-colors' ? (
        <div className="p-3">
          <div className="text-sm font-medium mb-2">Choose Highlight Color</div>
          <div className="flex gap-2 mb-3">
            {HIGHLIGHT_COLORS.map(({ color, bg, label }) => (
              <button
                key={color}
                onClick={() => {
                  onHighlight(color);
                  onClose();
                }}
                className={`w-10 h-10 rounded ${bg} hover:opacity-80 transition-opacity ${
                  existingHighlight?.color === color ? 'ring-2 ring-primary' : ''
                }`}
                title={label}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('main')}
            className="w-full"
          >
            Back
          </Button>
        </div>
      ) : currentView === 'chats' ? (
        <div className="py-2 max-h-[300px] overflow-y-auto">
          <div className="px-4 py-2 text-sm font-medium border-b">
            Chat History ({existingChats.length})
          </div>
          {existingChats.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No chats yet
            </div>
          ) : (
            existingChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  onViewChat(chat.id!);
                  onClose();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors border-b last:border-b-0"
              >
                <div className="font-medium mb-1">
                  {truncateText(chat.userPrompt, 30)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
          <div className="px-2 py-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('main')}
              className="w-full"
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-1">
          {/* Highlight Section */}
          <div className="px-2 py-1">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
              HIGHLIGHT
            </div>
            <div className="px-2 py-2">
              <div className="flex items-center gap-2">
                {HIGHLIGHT_COLORS.map(({ color, bg, label }) => (
                  <button
                    key={color}
                    onClick={() => {
                      onHighlight(color);
                      onClose();
                    }}
                    className={`w-8 h-8 rounded ${bg} hover:opacity-80 transition-opacity ${
                      existingHighlight?.color === color ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    title={label}
                  />
                ))}
                {existingHighlight && (
                  <button
                    onClick={() => {
                      onRemoveHighlight();
                      onClose();
                    }}
                    className="w-8 h-8 rounded flex items-center justify-center hover:bg-destructive/10 transition-colors ml-1"
                    title="Remove Highlight"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t my-1" />

          {/* Note Section */}
          <div className="px-2 py-1">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
              NOTE
            </div>
            {existingNote ? (
              <div className="px-4 py-2">
                <div className="flex items-start gap-2 hover:bg-accent/50 transition-colors rounded p-2 -m-2">
                  <button
                    onClick={() => {
                      onViewNote();
                      onClose();
                    }}
                    className="flex items-start gap-2 flex-1 min-w-0 text-left"
                  >
                    <StickyNote className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {truncateText(existingNote.noteContent, 30)}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveNote();
                      onClose();
                    }}
                    className="flex-shrink-0 p-1 hover:bg-destructive/10 rounded transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  onNote();
                  onClose();
                }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors rounded"
              >
                <StickyNote className="w-4 h-4" />
                Add Note
              </button>
            )}
          </div>

          <div className="border-t my-1" />

          {/* Chat Section */}
          <div className="px-2 py-1">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
              CHAT
            </div>
            <button
              onClick={() => {
                onChat();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors rounded"
            >
              <MessageSquare className="w-4 h-4" />
              New Chat
            </button>
            {existingChats && existingChats.length > 0 && (
              <button
                onClick={() => setCurrentView('chats')}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors rounded"
              >
                <MessageSquare className="w-4 h-4" />
                View Chats ({existingChats.length})
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            )}
          </div>

          <div className="border-t my-1" />

          {/* Other Actions */}
          <div className="px-2 py-1">
            <button
              onClick={() => {
                onCopy();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors rounded"
            >
              <Copy className="w-4 h-4" />
              Copy Text
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
