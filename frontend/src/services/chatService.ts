import { db } from '../lib/db';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ChatService {
  private baseUrl: string = '';
  private modelName: string = '';
  private apiKey: string = '';

  constructor() {
    // Load from environment variables as defaults
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    this.modelName = import.meta.env.VITE_API_MODEL_NAME || '';
    this.apiKey = import.meta.env.VITE_API_KEY || '';
  }

  /**
   * Initialize API settings from database or environment
   */
  async initialize(): Promise<void> {
    const settings = await db.settings.toArray();
    if (settings.length > 0 && settings[0].api) {
      const { baseUrl, modelName, apiKey } = settings[0].api;
      this.baseUrl = baseUrl || this.baseUrl;
      this.modelName = modelName || this.modelName;
      this.apiKey = apiKey || this.apiKey;
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!(this.baseUrl && this.modelName && this.apiKey);
  }

  /**
   * Send a chat request to the API
   */
  async sendMessage(messages: ChatMessage[]): Promise<string> {
    await this.initialize();

    if (!this.isConfigured()) {
      throw new Error('API not configured. Please set up your API credentials in settings.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response from API';
    } catch (error) {
      console.error('Chat API error:', error);
      throw error;
    }
  }

  /**
   * Chat about a text selection
   */
  async chatAboutText(text: string, userPrompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant analyzing text from a book. Provide insightful, concise responses.',
      },
      {
        role: 'user',
        content: `Here is a passage from a book:\n\n"${text}"\n\n${userPrompt}`,
      },
    ];

    return await this.sendMessage(messages);
  }

  /**
   * Update API settings
   */
  async updateSettings(baseUrl: string, modelName: string, apiKey: string): Promise<void> {
    const settings = await db.settings.toArray();
    
    if (settings.length > 0) {
      await db.settings.update(settings[0].id!, {
        api: { baseUrl, modelName, apiKey },
      });
    } else {
      await db.settings.add({
        reading: {
          fontSize: 16,
          fontFamily: 'serif',
          lineHeight: 1.6,
          theme: 'light',
          pageMode: 'paginated',
        },
        api: { baseUrl, modelName, apiKey },
      });
    }

    // Reload settings
    await this.initialize();
  }
}

export const chatService = new ChatService();
