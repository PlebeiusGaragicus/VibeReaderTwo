import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface TTSOverlayProps {
  onClose: () => void;
}

export function TTSOverlay({ onClose }: TTSOverlayProps) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-background/70 backdrop-blur-sm border-l shadow-lg z-10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Text-to-Speech</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="p-4 text-center text-muted-foreground">
        <p>Nothing here yet</p>
      </div>
    </div>
  );
}
