import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Highlighter, StickyNote, Copy, X } from 'lucide-react';
import type { Highlight } from '../../lib/db';

interface SelectionMenuProps {
  position: { x: number; y: number };
  onHighlight: (color: Highlight['color']) => void;
  onNote: () => void;
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

export function SelectionMenu({
  position,
  onHighlight,
  onNote,
  onCopy,
  onClose,
}: SelectionMenuProps) {
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
    const menuWidth = showColors ? 250 : 300; // Approximate menu width
    const menuHeight = 60; // Approximate menu height
    
    let left = position.x;
    let top = position.y - 8; // 8px above selection
    let transform = 'translate(-50%, -100%)';

    // Check right boundary
    if (left + menuWidth / 2 > window.innerWidth) {
      left = window.innerWidth - menuWidth - 10;
      transform = 'translate(0, -100%)';
    }
    // Check left boundary
    else if (left - menuWidth / 2 < 0) {
      left = 10;
      transform = 'translate(0, -100%)';
    }

    // Check top boundary - if menu would go off top, show below selection instead
    if (top - menuHeight < 0) {
      top = position.y + 8; // Position below selection
      transform = transform.replace('-100%)', '0)');
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform,
    };
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-background border rounded-lg shadow-lg p-2"
      style={getMenuStyle()}
    >
      {showColors ? (
        <div className="flex gap-1">
          {HIGHLIGHT_COLORS.map(({ color, bg, label }) => (
            <button
              key={color}
              onClick={() => {
                onHighlight(color);
                onClose();
              }}
              className={`w-8 h-8 rounded ${bg} hover:opacity-80 transition-opacity`}
              title={label}
            />
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowColors(false)}
            className="ml-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColors(true)}
            className="flex items-center gap-2"
          >
            <Highlighter className="w-4 h-4" />
            Highlight
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onNote();
              onClose();
            }}
            className="flex items-center gap-2"
          >
            <StickyNote className="w-4 h-4" />
            Note
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onCopy();
              onClose();
            }}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy
          </Button>
        </div>
      )}
    </div>
  );
}
