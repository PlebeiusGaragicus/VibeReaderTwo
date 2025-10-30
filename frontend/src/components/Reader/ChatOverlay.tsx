import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, Send, MessageSquare, Trash2, Loader2, ChevronLeft } from 'lucide-react';
import { db } from '../../lib/db';
import { chatService } from '../../services/chatService';

interface ChatOverlayProps {
  bookId: number;
  onClose: () => void;
  onRefresh?: () => void;
}

interface GeneralChat {
  id?: number;
  bookId: number;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatSession {
  chat: GeneralChat;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export function ChatOverlay({
  bookId,
  onClose,
  onNavigate,
  onRefresh,
}: ChatOverlayProps) {
  const [chatHistory, setChatHistory] = useState<ChatContext[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    loadChatHistory();
  }, [bookId]);

  const loadChatHistory = async () => {
    const chats = await annotationService.getChatContexts(bookId);
    // Sort by most recent first
    chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setChatHistory(chats);
  };

  const handleSelectChat = (context: ChatContext) => {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: context.userPrompt || '' },
      { role: 'assistant', content: context.aiResponse || '' },
    ];
    setSelectedChat({ context, messages });
    setView('chat');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || isLoading) return;

    setIsLoading(true);
    try {
      // Add user message to UI immediately
      const userMessage = { role: 'user' as const, content: newMessage };
      setSelectedChat({
        ...selectedChat,
        messages: [...selectedChat.messages, userMessage],
      });
      setNewMessage('');

      // Get AI response
      const response = await chatService.continueConversation(
        selectedChat.context.text,
        [...selectedChat.messages, userMessage]
      );

      // Add AI response to UI
      const aiMessage = { role: 'assistant' as const, content: response };
      setSelectedChat({
        ...selectedChat,
        messages: [...selectedChat.messages, userMessage, aiMessage],
      });

      // Update the chat context in database with latest AI response
      if (selectedChat.context.id) {
        await annotationService.updateChatContext(selectedChat.context.id, response);
      }

      await loadChatHistory();
      onRefresh?.();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please check your API settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (chatId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Delete this chat?')) {
      await annotationService.deleteChatContext(chatId);
      await loadChatHistory();
      onRefresh?.();
      if (selectedChat?.context.id === chatId) {
        setSelectedChat(null);
        setView('list');
      }
    }
  };

  const handleNavigateToContext = () => {
    if (selectedChat) {
      onNavigate(selectedChat.context.cfiRange);
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-background/70 backdrop-blur-sm border-l shadow-lg z-10 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {view === 'chat' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedChat(null);
                setView('list');
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          )}
          <h2 className="font-semibold">
            {view === 'list' ? `Chat History (${chatHistory.length})` : 'Chat'}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {view === 'list' ? (
        // Chat History List
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatHistory.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No chat history yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Select text and start a chat to begin
              </p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleSelectChat(chat)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => chat.id && handleDeleteChat(chat.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground italic">
                    "{truncateText(chat.text, 50)}"
                  </p>
                  <p className="text-sm font-medium">
                    {truncateText(chat.userPrompt, 60)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Active Chat View
        <div className="flex-1 flex flex-col">
          {/* Context Info */}
          {selectedChat && (
            <div className="p-3 border-b bg-muted/50">
              <button
                onClick={handleNavigateToContext}
                className="text-xs text-muted-foreground italic hover:text-foreground transition-colors text-left w-full"
              >
                "{truncateText(selectedChat.context.text, 80)}"
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedChat?.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
