import { useEffect, useState } from 'react';
import type { Theme } from '../types';

export type ResolvedTheme = 'light' | 'dark' | 'sepia';

/**
 * Resolves the actual theme to apply based on user preference
 * If theme is 'system', detects the system preference
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return theme as ResolvedTheme;
}

/**
 * Custom hook to manage theme with system preference detection
 */
export function useTheme(theme: Theme) {
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    // Update resolved theme when preference changes
    const newResolvedTheme = resolveTheme(theme);
    setResolvedTheme(newResolvedTheme);

    // Apply theme to document root
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'sepia');
    root.classList.add(newResolvedTheme);

    // Only listen to system changes if theme is set to 'system'
    if (theme !== 'system') {
      return;
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      
      // Update document class
      root.classList.remove('light', 'dark', 'sepia');
      root.classList.add(newTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  return resolvedTheme;
}
