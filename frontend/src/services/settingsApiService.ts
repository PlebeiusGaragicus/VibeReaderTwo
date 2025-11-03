/**
 * Settings API Service - Replaces IndexedDB with REST API calls
 */

import { apiClient } from './apiClient';

export type Theme = 'light' | 'dark' | 'sepia' | 'system';
export type PageMode = 'paginated' | 'scroll';

export interface Settings {
  id: number;
  font_size: number;
  font_family: string;
  line_height: number;
  theme: Theme;
  page_mode: PageMode;
  api_base_url?: string;
  api_model_name?: string;
  api_key?: string;
}

export interface ReadingSettingsUpdate {
  font_size?: number;
  font_family?: string;
  line_height?: number;
  theme?: Theme;
  page_mode?: PageMode;
}

export interface ApiSettingsUpdate {
  api_base_url?: string;
  api_model_name?: string;
  api_key?: string;
}

export class SettingsApiService {
  /**
   * Get current settings
   */
  async getSettings(): Promise<Settings> {
    return apiClient.request<Settings>('/api/settings');
  }

  /**
   * Update reading settings
   */
  async updateReadingSettings(settings: ReadingSettingsUpdate): Promise<Settings> {
    return apiClient.request<Settings>('/api/settings/reading', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  }

  /**
   * Update API settings
   */
  async updateApiSettings(settings: ApiSettingsUpdate): Promise<Settings> {
    return apiClient.request<Settings>('/api/settings/api', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  }
}

export const settingsApiService = new SettingsApiService();
