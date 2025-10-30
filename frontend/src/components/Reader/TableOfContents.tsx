import { useEffect, useState } from 'react';
import type { Book as EpubBook, NavItem } from 'epubjs';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface TableOfContentsProps {
  book: EpubBook;
  onSelect: (href: string) => void;
  onClose: () => void;
}

export function TableOfContents({ book, onSelect, onClose }: TableOfContentsProps) {
  const [toc, setToc] = useState<NavItem[]>([]);

  useEffect(() => {
    loadTOC();
  }, [book]);

  const loadTOC = async () => {
    try {
      await book.loaded.navigation;
      setToc(book.navigation.toc);
    } catch (error) {
      console.error('Error loading TOC:', error);
    }
  };

  const renderTOCItem = (item: NavItem, level = 0) => (
    <div key={item.id || item.href}>
      <button
        onClick={() => onSelect(item.href)}
        className="w-full text-left px-4 py-2 hover:bg-accent rounded-md transition-colors"
        style={{ paddingLeft: `${level * 1 + 1}rem` }}
      >
        <span className="text-sm">{item.label}</span>
      </button>
      {item.subitems && item.subitems.map(subitem => renderTOCItem(subitem, level + 1))}
    </div>
  );

  return (
    <div className="absolute top-0 left-0 bottom-0 w-80 bg-background/70 backdrop-blur-sm border-r shadow-lg z-10">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Table of Contents</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="overflow-y-auto h-[calc(100%-4rem)] p-2">
        {toc.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No table of contents available
          </p>
        ) : (
          toc.map(item => renderTOCItem(item))
        )}
      </div>
    </div>
  );
}
