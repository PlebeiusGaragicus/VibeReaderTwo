/**
 * Diagnostic tools for debugging
 * Access via window.vibeDiagnostics in console
 */

import { logger } from './logger';
import { apiClient } from '../services/apiClient';

class Diagnostics {
  constructor() {
    // Expose globally
    if (typeof window !== 'undefined') {
      (window as any).vibeDiagnostics = this;
    }
  }

  /**
   * Run full system diagnostic
   */
  async runDiagnostics() {
    console.log('🔍 Running VibeReader Diagnostics...\n');
    
    const results = {
      environment: this.checkEnvironment(),
      api: await this.checkAPI(),
      storage: await this.checkStorage(),
      epub: this.checkEpubSupport(),
    };

    console.log('\n📊 Diagnostic Results:');
    console.table(results);
    
    return results;
  }

  /**
   * Check environment
   */
  checkEnvironment() {
    const isElectron = !!(window as any).electron?.isElectron;
    const isDev = import.meta.env.DEV;
    
    console.log('🌍 Environment:');
    console.log(`  Platform: ${isElectron ? 'Electron (Desktop)' : 'Web Browser'}`);
    console.log(`  Mode: ${isDev ? 'Development' : 'Production'}`);
    console.log(`  User Agent: ${navigator.userAgent}`);
    console.log(`  Window Size: ${window.innerWidth}x${window.innerHeight}`);
    
    return {
      platform: isElectron ? 'Electron' : 'Web',
      mode: isDev ? 'Development' : 'Production',
      userAgent: navigator.userAgent.substring(0, 50) + '...',
    };
  }

  /**
   * Check API connectivity
   */
  async checkAPI() {
    console.log('\n🌐 API Connectivity:');
    
    try {
      const baseUrl = apiClient.getBaseUrl();
      console.log(`  Base URL: ${baseUrl}`);
      
      // Test health endpoint
      const startTime = performance.now();
      const response = await fetch(`${baseUrl}/health`);
      const duration = (performance.now() - startTime).toFixed(0);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✓ Health check passed (${duration}ms)`);
        console.log(`  Status:`, data);
        return { status: 'OK', latency: `${duration}ms`, data };
      } else {
        console.log(`  ✗ Health check failed: ${response.status}`);
        return { status: 'FAILED', error: response.statusText };
      }
    } catch (error) {
      console.log(`  ✗ API unreachable:`, error);
      return { status: 'ERROR', error: String(error) };
    }
  }

  /**
   * Check storage
   */
  async checkStorage() {
    console.log('\n💾 Storage:');
    
    try {
      // Check localStorage
      const localStorageWorks = this.testLocalStorage();
      console.log(`  LocalStorage: ${localStorageWorks ? '✓' : '✗'}`);
      
      // Check IndexedDB (if still used)
      const indexedDBWorks = await this.testIndexedDB();
      console.log(`  IndexedDB: ${indexedDBWorks ? '✓' : '✗'}`);
      
      return {
        localStorage: localStorageWorks ? 'OK' : 'FAILED',
        indexedDB: indexedDBWorks ? 'OK' : 'FAILED',
      };
    } catch (error) {
      console.log(`  ✗ Storage check failed:`, error);
      return { status: 'ERROR', error: String(error) };
    }
  }

  /**
   * Check EPUB.js support
   */
  checkEpubSupport() {
    console.log('\n📖 EPUB Support:');
    
    const checks = {
      fetch: typeof fetch !== 'undefined',
      blob: typeof Blob !== 'undefined',
      arrayBuffer: typeof ArrayBuffer !== 'undefined',
      fileReader: typeof FileReader !== 'undefined',
    };
    
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✓' : '✗'}`);
    });
    
    return checks;
  }

  /**
   * Test localStorage
   */
  private testLocalStorage(): boolean {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Test IndexedDB
   */
  private async testIndexedDB(): Promise<boolean> {
    try {
      return 'indexedDB' in window;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get logs
   */
  getLogs() {
    return logger.getLogs();
  }

  /**
   * Get log summary
   */
  getLogSummary() {
    return logger.getSummary();
  }

  /**
   * Export logs
   */
  exportLogs() {
    const logs = logger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibereader-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📥 Logs exported');
  }

  /**
   * Clear logs
   */
  clearLogs() {
    logger.clear();
    console.log('🗑️ Logs cleared');
  }

  /**
   * Test book loading
   */
  async testBookLoading(bookId: number) {
    console.log(`\n📚 Testing book loading for ID: ${bookId}`);
    
    try {
      // Get book metadata
      const book = await apiClient.request(`/api/books/${bookId}`);
      console.log('✓ Book metadata:', book);
      
      // Get book file URL
      const fileUrl = `${apiClient.getBaseUrl()}/api/books/${bookId}/file`;
      console.log(`📁 File URL: ${fileUrl}`);
      
      // Test file accessibility
      const response = await fetch(fileUrl);
      console.log(`✓ File response: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      console.log(`  Content-Length: ${response.headers.get('content-length')} bytes`);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log(`✓ File downloaded: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
        return { status: 'OK', book, fileSize: blob.size };
      } else {
        console.log(`✗ File download failed`);
        return { status: 'FAILED', error: response.statusText };
      }
    } catch (error) {
      console.log(`✗ Test failed:`, error);
      return { status: 'ERROR', error: String(error) };
    }
  }

  /**
   * Show help
   */
  help() {
    console.log(`
🔧 VibeReader Diagnostics - Available Commands:

  vibeDiagnostics.runDiagnostics()
    Run full system diagnostic

  vibeDiagnostics.checkEnvironment()
    Check environment info

  vibeDiagnostics.checkAPI()
    Test API connectivity

  vibeDiagnostics.checkStorage()
    Check storage availability

  vibeDiagnostics.testBookLoading(bookId)
    Test loading a specific book

  vibeDiagnostics.getLogs()
    Get all logs

  vibeDiagnostics.getLogSummary()
    Get log summary with statistics

  vibeDiagnostics.exportLogs()
    Download logs as JSON file

  vibeDiagnostics.clearLogs()
    Clear all logs

  vibeLogger.getSummary()
    Get logger summary

  vibeLogger.getLogs()
    Get raw log entries
    `);
  }
}

// Create and export singleton
export const diagnostics = new Diagnostics();

// Auto-initialize
if (typeof window !== 'undefined') {
  console.log('🔧 VibeReader Diagnostics loaded. Type vibeDiagnostics.help() for commands.');
}
