/**
 * API Client - Platform-aware service for communicating with backend
 * Works in both Electron (desktop) and web modes
 */

import { logger } from '../lib/logger';

// Type declarations for window.electron
declare global {
  interface Window {
    electron?: {
      isElectron: boolean;
      getApiUrl: () => Promise<string>;
      selectEpubFile: () => Promise<string | null>;
      platform: string;
    };
  }
}

class ApiClient {
  private baseUrl: string = '';
  private initialized: boolean = false;

  /**
   * Initialize the API client
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (window.electron?.isElectron) {
      // Desktop mode: Get API URL from Electron
      this.baseUrl = await window.electron.getApiUrl();
      logger.info('API Client', `Desktop mode - API URL: ${this.baseUrl}`);
    } else {
      // Web mode: Use environment variable or default
      this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      logger.info('API Client', `Web mode - API URL: ${this.baseUrl}`);
    }

    this.initialized = true;
  }

  /**
   * Get the base API URL
   */
  getBaseUrl(): string {
    if (!this.initialized) {
      throw new Error('ApiClient not initialized. Call initialize() first.');
    }
    return this.baseUrl;
  }

  /**
   * Check if running in Electron
   */
  isDesktop(): boolean {
    return window.electron?.isElectron ?? false;
  }

  /**
   * Make an API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    
    logger.debug('API Request', `${method} ${endpoint}`);
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
        },
      });

      const duration = (performance.now() - startTime).toFixed(0);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        logger.error('API Request', `${method} ${endpoint} → ${response.status} (${duration}ms)`, error);
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      logger.info('API Request', `${method} ${endpoint} → ${response.status} (${duration}ms)`);

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      }
      
      return response as any;
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(0);
      logger.error('API Request', `${method} ${endpoint} → FAILED (${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * Upload a file
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Open native file picker (desktop only)
   */
  async selectEpubFile(): Promise<string | null> {
    if (!this.isDesktop()) {
      throw new Error('File picker only available in desktop mode');
    }
    return window.electron!.selectEpubFile();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Auto-initialize
apiClient.initialize().catch(console.error);
