import { useState } from 'react';
import { BookGrid } from './components/Library/BookGrid';
import { BookViewer } from './components/Reader/BookViewer';

function App() {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      {selectedBookId ? (
        <BookViewer
          bookId={selectedBookId}
          onClose={() => setSelectedBookId(null)}
        />
      ) : (
        <BookGrid onBookSelect={setSelectedBookId} />
      )}
    </div>
  );
}

export default App;
