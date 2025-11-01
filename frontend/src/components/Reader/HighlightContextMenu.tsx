import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Trash2, Palette, MessageSquare, StickyNote } from 'lucide-react';
import type { Highlight } from '../../lib/db';

interface HighlightContextMenuProps {
  position: { x: number; y: number };
  highlight: Highlight;
  onChangeColor: (color: Highlight['color']) => void;
  onAddNote: () => void;
  onChat: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS: Array<{ color: Highlight['color']; bg: string; label: string }> = [
  { color: 'yellow', bg: 'bg-yellow-300', label: 'Yellow' },
  { color: 'green', bg: 'bg-green-300', label: 'Green' },
  { color: 'blue', bg: 'bg-blue-300', label: 'Blue' },
  { color: 'pink', bg: 'bg-pink-300', label: 'Pink' },
  { color: 'purple', bg: 'bg-purple-300', label: 'Purple' },
];

export function HighlightContextMenu({
  position,
  highlight,
  onChangeColor,
  onAddNote,
  onChat,
  onDelete,
  onClose,
}: HighlightContextMenuProps) {
  const [showColors, setShowColors] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Also listen for clicks in iframes
    const handleIframeClick = () => {
      onClose();
    };

    // Add a small delay to prevent immediate closing from the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Add listeners to all iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.document.addEventListener('mousedown', handleIframeClick);
        } catch (e) {
          // Ignore cross-origin iframe errors
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      
      // Remove iframe listeners
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.document.removeEventListener('mousedown', handleIframeClick);
        } catch (e) {
          // Ignore cross-origin iframe errors
        }
      });
    };
  }, [onClose]);

  // Calculate position with viewport boundary detection
  const getMenuStyle = () => {
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 220; // Approximate menu height (increased to account for actual height)
    const padding = 40; // Padding from viewport edges - NOTE: This needs to be big enough to else it will still get squished
    
    let left = position.x;
    let top = position.y + 8; // 8px below click point
    let transformX = '-50%';
    let transformY = '0';

    // Check right boundary
    if (left + menuWidth / 2 > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
      transformX = '0';
    }
    // Check left boundary
    else if (left - menuWidth / 2 < padding) {
      left = padding;
      transformX = '0';
    }

    // Check bottom boundary - position above if not enough space below
    if (top + menuHeight > window.innerHeight - padding) {
      top = position.y - 8; // Position above click point
      transformY = '-100%';
    }
    
    // Check top boundary - if positioning above would go off screen, position below anyway
    if (transformY === '-100%' && top - menuHeight < padding) {
      top = position.y + 8;
      transformY = '0';
      // If still not enough space, position at bottom with some padding
      if (top + menuHeight > window.innerHeight - padding) {
        top = window.innerHeight - menuHeight - padding;
        transformY = '0';
      }
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: `translate(${transformX}, ${transformY})`,
    };
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-background border rounded-lg shadow-lg overflow-hidden"
      style={getMenuStyle()}
    >
      {showColors ? (
        <div className="p-2">
          <div className="flex gap-1 mb-2">
            {HIGHLIGHT_COLORS.map(({ color, bg, label }) => (
              <button
                key={color}
                onClick={() => {
                  onChangeColor(color);
                  onClose();
                }}
                className={`w-8 h-8 rounded ${bg} hover:opacity-80 transition-opacity ${
                  highlight.color === color ? 'ring-2 ring-primary' : ''
                }`}
                title={label}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColors(false)}
            className="w-full"
          >
            Back
          </Button>
        </div>
      ) : (
        <div className="py-1">
          <button
            onClick={() => setShowColors(true)}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors"
          >
            <Palette className="w-4 h-4" />
            Change Color
          </button>
          <button
            onClick={() => {
              onAddNote();
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors"
          >
            <StickyNote className="w-4 h-4" />
            Add Note
          </button>
          <button
            onClick={() => {
              onChat();
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Chat About This
          </button>
          <div className="border-t my-1" />
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Highlight
          </button>
        </div>
      )}
    </div>
  );
}
