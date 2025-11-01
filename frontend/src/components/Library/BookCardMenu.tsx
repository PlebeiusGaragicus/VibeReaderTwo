import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

interface BookCardMenuProps {
  bookId: number;
  bookTitle: string;
  onDelete: (bookId: number) => void;
}

export function BookCardMenu({ bookId, bookTitle, onDelete }: BookCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setConfirmDelete(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
    } else {
      onDelete(bookId);
      setIsOpen(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          setConfirmDelete(false);
        }}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick();
            }}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
              confirmDelete
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'hover:bg-accent'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDelete ? 'Click again to confirm' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}
