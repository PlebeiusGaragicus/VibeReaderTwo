import { useState, useEffect } from 'react';
import { BookGrid } from './components/Library/BookGrid';
import { BookViewer } from './components/Reader/BookViewer';
import { logger } from './lib/logger';
import './lib/diagnostics'; // Initialize diagnostics

function App() {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  useEffect(() => {
    logger.info('App', 'VibeReader initialized');
    logger.info('App', `Platform: ${(window as any).electron ? 'Electron' : 'Web'}`);
  }, []);

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
