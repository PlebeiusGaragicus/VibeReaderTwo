import { annotationApiService } from './annotationApiService';
import { logger } from '../lib/logger';
import type { Highlight, Note, ChatContext, HighlightColor } from '../types';

export class AnnotationService {
  /**
   * Create a highlight
   */
  async createHighlight(
    bookId: number,
    cfiRange: string,
    text: string,
    color: HighlightColor = 'yellow'
  ): Promise<number> {
    logger.info('Annotations', `Creating highlight: ${color}`);
    const highlight = await annotationApiService.createHighlight(bookId, cfiRange, text, color);
    return highlight.id;
  }

  /**
   * Get all highlights for a book
   */
  async getHighlights(bookId: number): Promise<Highlight[]> {
    return await annotationApiService.getHighlights(bookId);
  }

  /**
   * Update highlight color
   */
  async updateHighlightColor(
    highlightId: number,
    color: HighlightColor
  ): Promise<Highlight> {
    return await annotationApiService.updateHighlightColor(highlightId, color);
  }

  /**
   * Delete highlight
   */
  async deleteHighlight(highlightId: number): Promise<void> {
    await annotationApiService.deleteHighlight(highlightId);
  }

  /**
   * Create a note
   */
  async createNote(
    bookId: number,
    cfiRange: string,
    text: string,
    noteContent: string
  ): Promise<number> {
    const note = await annotationApiService.createNote(bookId, cfiRange, text, noteContent);
    return note.id;
  }

  /**
   * Get all notes for a book
   */
  async getNotes(bookId: number): Promise<Note[]> {
    return await annotationApiService.getNotes(bookId);
  }

  /**
   * Update note content
   */
  async updateNote(noteId: number, noteContent: string): Promise<Note> {
    return await annotationApiService.updateNote(noteId, noteContent);
  }

  /**
   * Delete note
   */
  async deleteNote(noteId: number): Promise<void> {
    await annotationApiService.deleteNote(noteId);
  }

  /**
   * Get note by CFI range
   */
  async getNoteByRange(bookId: number, cfiRange: string): Promise<Note | null> {
    return await annotationApiService.getNoteByRange(bookId, cfiRange);
  }

  /**
   * Create a chat context
   */
  async createChatContext(
    bookId: number,
    cfiRange: string,
    text: string,
    userPrompt: string,
    aiResponse?: string
  ): Promise<number> {
    const chat = await annotationApiService.createChatContext(bookId, cfiRange, text, userPrompt, aiResponse);
    return chat.id;
  }

  /**
   * Get all chat contexts for a book
   */
  async getChatContexts(bookId: number): Promise<ChatContext[]> {
    return await annotationApiService.getChatContexts(bookId);
  }

  /**
   * Get chat contexts by CFI range
   */
  async getChatContextsByRange(bookId: number, cfiRange: string): Promise<ChatContext[]> {
    return await annotationApiService.getChatContextsByRange(bookId, cfiRange);
  }

  /**
   * Update chat context with AI response
   */
  async updateChatContext(chatId: number, aiResponse: string): Promise<void> {
    await annotationApiService.updateChatContext(chatId, aiResponse);
  }

  /**
   * Delete chat context
   */
  async deleteChatContext(chatId: number): Promise<void> {
    await annotationApiService.deleteChatContext(chatId);
  }

  /**
   * Get all annotations for a CFI range (highlights, notes, and chat contexts)
   */
  async getAnnotationsByRange(bookId: number, cfiRange: string): Promise<{
    highlight?: Highlight;
    note?: Note | null;
    chatContexts: ChatContext[];
  }> {
    const highlights = await this.getHighlights(bookId);
    const highlight = highlights.find(h => h.cfi_range === cfiRange);
    
    const note = await this.getNoteByRange(bookId, cfiRange);
    const chatContexts = await this.getChatContextsByRange(bookId, cfiRange);

    return { highlight, note, chatContexts };
  }
}

export const annotationService = new AnnotationService();
