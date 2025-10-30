import { useState } from 'react';
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

  return (
    <div
      className="fixed z-50 bg-background border rounded-lg shadow-lg overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, 8px)',
      }}
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
