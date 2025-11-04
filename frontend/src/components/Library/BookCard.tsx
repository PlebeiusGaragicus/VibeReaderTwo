import type { Book } from '../../types';
import { Card, CardContent } from '../ui/card';
import { BookOpen } from 'lucide-react';
import { BookCardMenu } from './BookCardMenu';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onDelete: (bookId: number) => void;
}

export function BookCard({ book, onClick, onDelete }: BookCardProps) {
  // Progress is stored as 0-1 decimal, multiply by 100 for display
  const percentage = (book.percentage || 0) * 100;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow relative group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="aspect-[2/3] relative bg-muted flex items-center justify-center overflow-hidden">
          {book.cover_image ? (
            <img 
              src={book.cover_image} 
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-16 h-16 text-muted-foreground" />
          )}
          {percentage > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
          
          {/* Context Menu Button - appears on hover */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <BookCardMenu
              bookId={book.id}
              bookTitle={book.title}
              onDelete={onDelete}
            />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm line-clamp-2 mb-1">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {book.author}
          </p>
          {percentage > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(percentage)}% complete
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
