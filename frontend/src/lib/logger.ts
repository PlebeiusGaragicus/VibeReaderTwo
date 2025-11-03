/**
 * Enhanced logging utility for debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = true;
  private debugMode = false;
  private fileLoggingEnabled = false;
  private logFilePath = '';

  constructor() {
    // Enable logging in development or if explicitly enabled
    const isDev = (import.meta as any).env?.DEV ?? false;
    this.enabled = isDev || localStorage.getItem('vibereader_debug') === 'true';
    
    // Check if running in Electron with debug mode
    this.initializeFileLogging();
    
    // Expose logger globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).vibeLogger = this;
    }
  }

  private async initializeFileLogging() {
    const electron = (window as any).electron;
    if (electron && electron.isElectron) {
      try {
        this.debugMode = await electron.isDebugMode();
        if (this.debugMode) {
          this.fileLoggingEnabled = true;
          this.logFilePath = await electron.getLogFilePath();
          console.log(`📝 Frontend file logging enabled: ${this.logFilePath}`);
        }
      } catch (error) {
        console.warn('Failed to initialize file logging:', error);
      }
    }
  }

  private async log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Store log
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with styling
    if (this.enabled) {
      const emoji = this.getEmoji(level, category);
      const style = this.getStyle(level);
      const time = new Date().toLocaleTimeString();
      
      console.log(
        `%c[${time}] ${emoji} ${category}%c ${message}`,
        style,
        'color: inherit',
        data || ''
      );
    }

    // File logging (Electron + debug mode)
    if (this.fileLoggingEnabled) {
      this.writeToFile(entry);
    }
  }

  private async writeToFile(entry: LogEntry) {
    try {
      const electron = (window as any).electron;
      if (!electron || !electron.writeLog) return;

      const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
      const logLine = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.category}: ${entry.message}${dataStr}`;
      
      await electron.writeLog(logLine);
    } catch (error) {
      // Fail silently to avoid recursive logging
      console.warn('Failed to write log to file:', error);
    }
  }

  private getEmoji(level: LogLevel, category: string): string {
    // Category-specific emojis
    if (category.includes('API')) return '🌐';
    if (category.includes('Book')) return '📚';
    if (category.includes('EPUB')) return '📖';
    if (category.includes('Reader')) return '👓';
    if (category.includes('Annotation')) return '✏️';
    if (category.includes('Storage')) return '💾';
    if (category.includes('Settings')) return '⚙️';
    
    // Level-specific emojis
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
    }
  }

  private getStyle(level: LogLevel): string {
    switch (level) {
      case 'debug': return 'color: #888; font-weight: normal';
      case 'info': return 'color: #0066cc; font-weight: bold';
      case 'warn': return 'color: #ff9900; font-weight: bold';
      case 'error': return 'color: #cc0000; font-weight: bold';
    }
  }

  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs by category
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category.includes(category));
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clear() {
    this.logs = [];
    console.clear();
  }

  // Enable/disable logging
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('vibereader_debug', enabled ? 'true' : 'false');
  }

  // Get summary
  getSummary() {
    const summary = {
      total: this.logs.length,
      byLevel: {
        debug: this.logs.filter(l => l.level === 'debug').length,
        info: this.logs.filter(l => l.level === 'info').length,
        warn: this.logs.filter(l => l.level === 'warn').length,
        error: this.logs.filter(l => l.level === 'error').length,
      },
      categories: [...new Set(this.logs.map(l => l.category))],
      recentErrors: this.logs.filter(l => l.level === 'error').slice(-5),
    };
    
    console.table(summary.byLevel);
    console.log('Categories:', summary.categories);
    console.log('Recent Errors:', summary.recentErrors);
    
    return summary;
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const logDebug = (category: string, message: string, data?: any) => 
  logger.debug(category, message, data);

export const logInfo = (category: string, message: string, data?: any) => 
  logger.info(category, message, data);

export const logWarn = (category: string, message: string, data?: any) => 
  logger.warn(category, message, data);

export const logError = (category: string, message: string, data?: any) => 
  logger.error(category, message, data);
