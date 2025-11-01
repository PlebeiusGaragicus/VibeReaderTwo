/**
 * Annotation API Service - Replaces IndexedDB with REST API calls
 */

import { apiClient } from './apiClient';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface Highlight {
  id: number;
  book_id: number;
  cfi_range: string;
  text: string;
  color: HighlightColor;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  book_id: number;
  cfi_range: string;
  text: string;
  note_content: string;
  created_at: string;
  updated_at: string;
}

export interface ChatContext {
  id: number;
  book_id: number;
  cfi_range: string;
  text: string;
  user_prompt: string;
  ai_response?: string;
  created_at: string;
  updated_at: string;
}

export class AnnotationApiService {
  // Highlights
  async createHighlight(
    bookId: number,
    cfiRange: string,
    text: string,
    color: HighlightColor = 'yellow'
  ): Promise<Highlight> {
    return apiClient.request<Highlight>('/api/annotations/highlights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: bookId, cfi_range: cfiRange, text, color }),
    });
  }

  async getHighlights(bookId: number): Promise<Highlight[]> {
    return apiClient.request<Highlight[]>(`/api/annotations/highlights/book/${bookId}`);
  }

  async updateHighlightColor(highlightId: number, color: HighlightColor): Promise<Highlight> {
    return apiClient.request<Highlight>(`/api/annotations/highlights/${highlightId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    });
  }

  async deleteHighlight(highlightId: number): Promise<void> {
    await apiClient.request(`/api/annotations/highlights/${highlightId}`, {
      method: 'DELETE',
    });
  }

  // Notes
  async createNote(
    bookId: number,
    cfiRange: string,
    text: string,
    noteContent: string
  ): Promise<Note> {
    return apiClient.request<Note>('/api/annotations/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: bookId, cfi_range: cfiRange, text, note_content: noteContent }),
    });
  }

  async getNotes(bookId: number): Promise<Note[]> {
    return apiClient.request<Note[]>(`/api/annotations/notes/book/${bookId}`);
  }

  async getNoteByRange(bookId: number, cfiRange: string): Promise<Note | null> {
    try {
      return await apiClient.request<Note>(`/api/annotations/notes/range/${bookId}?cfi_range=${encodeURIComponent(cfiRange)}`);
    } catch (error) {
      return null;
    }
  }

  async updateNote(noteId: number, noteContent: string): Promise<Note> {
    return apiClient.request<Note>(`/api/annotations/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_content: noteContent }),
    });
  }

  async deleteNote(noteId: number): Promise<void> {
    await apiClient.request(`/api/annotations/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // Chat Contexts
  async createChatContext(
    bookId: number,
    cfiRange: string,
    text: string,
    userPrompt: string,
    aiResponse?: string
  ): Promise<ChatContext> {
    return apiClient.request<ChatContext>('/api/annotations/chat-contexts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        cfi_range: cfiRange,
        text,
        user_prompt: userPrompt,
        ai_response: aiResponse,
      }),
    });
  }

  async getChatContexts(bookId: number): Promise<ChatContext[]> {
    return apiClient.request<ChatContext[]>(`/api/annotations/chat-contexts/book/${bookId}`);
  }

  async getChatContextsByRange(bookId: number, cfiRange: string): Promise<ChatContext[]> {
    return apiClient.request<ChatContext[]>(`/api/annotations/chat-contexts/range/${bookId}?cfi_range=${encodeURIComponent(cfiRange)}`);
  }

  async updateChatContext(chatId: number, aiResponse: string): Promise<ChatContext> {
    return apiClient.request<ChatContext>(`/api/annotations/chat-contexts/${chatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_response: aiResponse }),
    });
  }

  async deleteChatContext(chatId: number): Promise<void> {
    await apiClient.request(`/api/annotations/chat-contexts/${chatId}`, {
      method: 'DELETE',
    });
  }
}

export const annotationApiService = new AnnotationApiService();
