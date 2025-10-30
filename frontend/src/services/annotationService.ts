import { db, type Highlight, type Note } from '../lib/db';

export class AnnotationService {
  /**
   * Create a highlight
   */
  async createHighlight(
    bookId: number,
    cfiRange: string,
    text: string,
    color: Highlight['color'] = 'yellow'
  ): Promise<number> {
    const highlight: Highlight = {
      bookId,
      cfiRange,
      text,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return await db.highlights.add(highlight);
  }

  /**
   * Get all highlights for a book
   */
  async getHighlights(bookId: number): Promise<Highlight[]> {
    return await db.highlights
      .where('bookId')
      .equals(bookId)
      .toArray();
  }

  /**
   * Update highlight color
   */
  async updateHighlightColor(
    highlightId: number,
    color: Highlight['color']
  ): Promise<void> {
    await db.highlights.update(highlightId, {
      color,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete highlight
   */
  async deleteHighlight(highlightId: number): Promise<void> {
    await db.highlights.delete(highlightId);
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
    const note: Note = {
      bookId,
      cfiRange,
      text,
      noteContent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return await db.notes.add(note);
  }

  /**
   * Get all notes for a book
   */
  async getNotes(bookId: number): Promise<Note[]> {
    return await db.notes
      .where('bookId')
      .equals(bookId)
      .toArray();
  }

  /**
   * Update note content
   */
  async updateNote(noteId: number, noteContent: string): Promise<void> {
    await db.notes.update(noteId, {
      noteContent,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete note
   */
  async deleteNote(noteId: number): Promise<void> {
    await db.notes.delete(noteId);
  }

  /**
   * Get note by CFI range
   */
  async getNoteByRange(bookId: number, cfiRange: string): Promise<Note | undefined> {
    return await db.notes
      .where('[bookId+cfiRange]')
      .equals([bookId, cfiRange])
      .first();
  }
}

export const annotationService = new AnnotationService();
