import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Trash2 } from 'lucide-react';

interface NoteDialogProps {
  selectedText: string;
  initialNote?: string;
  onSave: (noteContent: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function NoteDialog({
  selectedText,
  initialNote = '',
  onSave,
  onDelete,
  onClose,
}: NoteDialogProps) {
  const [noteContent, setNoteContent] = useState(initialNote);

  useEffect(() => {
    setNoteContent(initialNote);
  }, [initialNote]);

  const handleSave = () => {
    if (noteContent.trim()) {
      onSave(noteContent);
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this note?')) {
      onDelete?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add Note</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Selected Text</label>
            <div className="p-3 bg-muted rounded-md text-sm italic">
              "{selectedText}"
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Your Note</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full h-32 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-between p-4 border-t">
          {onDelete && initialNote && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Note
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!noteContent.trim()}>
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
