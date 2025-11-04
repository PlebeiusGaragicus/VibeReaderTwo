/**
 * Shared types for VibeReader
 * These match the API response types
 */

// Book types
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

// Annotation types
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

// Settings types
export type Theme = 'light' | 'dark' | 'sepia' | 'system';
export type PageMode = 'paginated' | 'scroll';
export type TextAlign = 'left' | 'justify';
export type MarginSize = 'narrow' | 'normal' | 'wide';
export type Hyphenation = 'auto' | 'none';

export interface Settings {
  id: number;
  font_size: number;
  font_family: string;
  line_height: number;
  theme: Theme;
  page_mode: PageMode;
  text_align: TextAlign;
  margin_size: MarginSize;
  letter_spacing: number;
  paragraph_spacing: number;
  word_spacing: number;
  hyphenation: Hyphenation;
  api_base_url?: string;
  api_model_name?: string;
  api_key?: string;
}

// Legacy compatibility types (for gradual migration)
export interface LegacyBook {
  id?: number;
  title: string;
  author: string;
  publisher?: string;
  coverImage?: string;
  epubFile: Blob;
  fileSize: number;
  fileHash: string;
  importDate: Date;
  lastReadDate?: Date;
  currentCFI?: string;
  currentChapter?: number;
  percentage?: number;
  metadata?: {
    isbn?: string;
    language?: string;
    description?: string;
  };
}
