/**
 * Book API Service - Replaces IndexedDB with REST API calls
 */

import { apiClient } from './apiClient';

export interface Book {
  id: number;
  title: string;
  author: string;
  publisher?: string;
  cover_image?: string;
  file_size: number;
  file_hash: string;
  current_cfi?: string;
  current_chapter?: number;
  percentage?: number;
  last_read_date?: string;
  isbn?: string;
  language?: string;
  description?: string;
  import_date: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  current_cfi?: string;
  current_chapter?: number;
  percentage?: number; // 0-1 decimal (0.0 = 0%, 1.0 = 100%)
}

export class BookApiService {
  /**
   * Import an EPUB file
   */
  async importBook(file: File): Promise<Book> {
    return apiClient.uploadFile<Book>('/api/books/import', file);
  }

  /**
   * Get all books
   */
  async getBooks(): Promise<Book[]> {
    return apiClient.request<Book[]>('/api/books');
  }

  /**
   * Get a specific book
   */
  async getBook(bookId: number): Promise<Book> {
    return apiClient.request<Book>(`/api/books/${bookId}`);
  }

  /**
   * Get EPUB file URL for a book
   */
  getBookFileUrl(bookId: number): string {
    return `${apiClient.getBaseUrl()}/api/books/${bookId}/file`;
  }

  /**
   * Update reading progress
   */
  async updateProgress(bookId: number, progress: ProgressUpdate): Promise<Book> {
    return apiClient.request<Book>(`/api/books/${bookId}/progress`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(progress),
    });
  }

  /**
   * Delete a book
   */
  async deleteBook(bookId: number): Promise<void> {
    await apiClient.request(`/api/books/${bookId}`, {
      method: 'DELETE',
    });
  }
}

export const bookApiService = new BookApiService();
