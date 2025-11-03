import { useState, useEffect } from 'react';
import { BookGrid } from './components/Library/BookGrid';
import { BookViewer } from './components/Reader/BookViewer';
import { logger } from './lib/logger';
import { settingsApiService } from './services/settingsApiService';
import { useTheme } from './hooks/useTheme';
import type { Theme } from './types';
import './lib/diagnostics'; // Initialize diagnostics

function App() {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>('system');
  
  // Apply theme to document root
  useTheme(theme);

  useEffect(() => {
    logger.info('App', 'VibeReader initialized');
    logger.info('App', `Platform: ${(window as any).electron ? 'Electron' : 'Web'}`);
    
    // Load theme setting from backend
    const loadTheme = async () => {
      try {
        const settings = await settingsApiService.getSettings();
        setTheme(settings.theme);
        logger.info('App', `Theme loaded: ${settings.theme}`);
      } catch (error) {
        logger.error('App', 'Failed to load theme setting', error);
      }
    };
    
    loadTheme();
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
