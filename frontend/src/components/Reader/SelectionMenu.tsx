import { useState } from 'react';
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

  return (
    <div
      className="fixed z-50 bg-background border rounded-lg shadow-lg p-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
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
