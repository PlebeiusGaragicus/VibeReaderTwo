import { useState, useEffect } from 'react';
import { bookApiService } from '../../services/bookApiService';
import { logger } from '../../lib/logger';
import type { Book } from '../../types';
import { BookCard } from './BookCard';
import { ImportButton } from './ImportButton';
import { BookOpen } from 'lucide-react';

interface BookGridProps {
  onBookSelect: (bookId: number) => void;
}

export function BookGrid({ onBookSelect }: BookGridProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBooks = async () => {
    try {
      logger.info('Library', 'Loading books from API');
      const fetchedBooks = await bookApiService.getBooks();
      setBooks(fetchedBooks);
      logger.info('Library', `Loaded ${fetchedBooks.length} books`);
    } catch (error) {
      logger.error('Library', `Failed to load books: ${error}`);
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleImport = () => {
    // Refresh book list after import
    logger.info('Library', 'Refreshing book list after import');
    loadBooks();
  };

  const handleDelete = async (bookId: number) => {
    try {
      logger.info('Library', `Deleting book ID: ${bookId}`);
      await bookApiService.deleteBook(bookId);
      logger.info('Library', 'Book deleted successfully');
      
      // Refresh book list
      await loadBooks();
    } catch (error) {
      logger.error('Library', `Failed to delete book: ${error}`);
      console.error('Error deleting book:', error);
      alert('Failed to delete book. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading library...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b drag-region">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* macOS traffic light spacer */}
            <div className="macos-traffic-light-spacer" />
            <div className="flex items-center gap-2 no-drag">
              <BookOpen className="w-6 h-6" />
              <h1 className="text-2xl font-bold">VibeReader</h1>
            </div>
          </div>
          <div className="no-drag">
            <ImportButton onImport={handleImport} />
          </div>
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
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
