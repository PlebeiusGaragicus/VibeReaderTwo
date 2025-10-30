import { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { epubService } from '../../services/epubService';

interface ImportButtonProps {
  onImport: () => void;
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.epub')) {
      alert('Please select an EPUB file');
      return;
    }

    setIsImporting(true);
    try {
      await epubService.importEpub(file);
      onImport();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing EPUB:', error);
      alert('Failed to import EPUB file. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button 
        onClick={handleClick}
        disabled={isImporting}
      >
        {isImporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import EPUB
          </>
        )}
      </Button>
    </>
  );
}
