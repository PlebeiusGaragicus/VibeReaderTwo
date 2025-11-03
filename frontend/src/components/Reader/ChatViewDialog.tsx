import { Button } from '../ui/button';
import { X } from 'lucide-react';
import type { ChatContext } from '../../types';

interface ChatViewDialogProps {
  chat: ChatContext;
  onClose: () => void;
}

export function ChatViewDialog({ chat, onClose }: ChatViewDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Chat Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected Text */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Selected Text:</label>
            <div className="mt-1 p-3 bg-muted rounded-md text-sm">
              {chat.text}
            </div>
          </div>

          {/* User Prompt */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Your Question:</label>
            <div className="mt-1 p-3 bg-muted rounded-md text-sm">
              {chat.user_prompt}
            </div>
          </div>

          {/* AI Response */}
          {chat.ai_response && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">AI Response:</label>
              <div className="mt-1 p-3 bg-primary/5 rounded-md text-sm whitespace-pre-wrap">
                {chat.ai_response}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            Created: {new Date(chat.created_at).toLocaleString()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
