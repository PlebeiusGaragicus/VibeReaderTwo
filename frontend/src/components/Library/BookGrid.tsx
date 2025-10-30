import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { BookCard } from './BookCard';
import { ImportButton } from './ImportButton';
import { BookOpen } from 'lucide-react';

interface BookGridProps {
  onBookSelect: (bookId: number) => void;
}

export function BookGrid({ onBookSelect }: BookGridProps) {
  // useLiveQuery automatically updates when database changes
  const books = useLiveQuery(
    () => db.books.orderBy('importDate').reverse().toArray()
  );

  const handleImport = () => {
    // No need to manually refresh - useLiveQuery handles it
    console.log('Import completed, useLiveQuery will auto-refresh');
  };

  if (!books) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            <h1 className="text-2xl font-bold">VibeReader</h1>
          </div>
          <ImportButton onImport={handleImport} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-20 h-20 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No books yet</h2>
            <p className="text-muted-foreground mb-6">
              Import your first EPUB to get started
            </p>
            <ImportButton onImport={handleImport} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => book.id && onBookSelect(book.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
