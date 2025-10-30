import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, Send, MessageSquare, Trash2, Loader2, ChevronLeft } from 'lucide-react';
import { db } from '../../lib/db';
import { chatService } from '../../services/chatService';
import type { ChatMessage } from '../../services/chatService';

interface ChatOverlayProps {
  bookId: number;
  onClose: () => void;
  onRefresh?: () => void;
}

interface GeneralChat {
  id?: number;
  bookId: number;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export function ChatOverlay({
  bookId,
  onClose,
  onRefresh,
}: ChatOverlayProps) {
  const [chatHistory, setChatHistory] = useState<GeneralChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GeneralChat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newChatPrompt, setNewChatPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    loadChatHistory();
  }, [bookId]);

  const loadChatHistory = async () => {
    // Load general chats from a new table (we'll create this)
    const chats = await db.table('generalChats')
      .where('bookId')
      .equals(bookId)
      .reverse()
      .sortBy('updatedAt');
    setChatHistory(chats);
  };

  const handleSelectChat = (chat: GeneralChat) => {
    setSelectedChat(chat);
    setView('chat');
  };

  const handleStartNewChat = async () => {
    if (!newChatPrompt.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const userMessage: ChatMessage = { role: 'user', content: newChatPrompt };
      const response = await chatService.sendMessage([userMessage]);
      const aiMessage: ChatMessage = { role: 'assistant', content: response };

      const newChat: GeneralChat = {
        bookId,
        title: newChatPrompt.substring(0, 50),
        messages: [userMessage, aiMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const id = await db.table('generalChats').add(newChat);
      newChat.id = id as number;
      
      setNewChatPrompt('');
      await loadChatHistory();
      setSelectedChat(newChat);
      setView('chat');
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please check your API settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || isLoading) return;

    setIsLoading(true);
    try {
      const userMessage: ChatMessage = { role: 'user', content: newMessage };
      const updatedMessages = [...selectedChat.messages, userMessage];
      
      setSelectedChat({
        ...selectedChat,
        messages: updatedMessages,
      });
      setNewMessage('');

      const response = await chatService.sendMessage(updatedMessages);
      const aiMessage: ChatMessage = { role: 'assistant', content: response };
      
      const finalMessages = [...updatedMessages, aiMessage];
      const updatedChat = {
        ...selectedChat,
        messages: finalMessages,
        updatedAt: new Date(),
      };
      
      setSelectedChat(updatedChat);

      if (selectedChat.id) {
        await db.table('generalChats').update(selectedChat.id, {
          messages: finalMessages,
          updatedAt: new Date(),
        });
      }

      await loadChatHistory();
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
      await db.table('generalChats').delete(chatId);
      await loadChatHistory();
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setView('list');
      }
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
              size="sm"
              onClick={() => {
                setSelectedChat(null);
                setView('list');
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Show Chats
            </Button>
          )}
          {view === 'list' && (
            <h2 className="font-semibold">Chats ({chatHistory.length})</h2>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {view === 'list' ? (
        // Chat History List with New Chat Input
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No chats yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start a new chat below
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
                  <p className="text-sm font-medium">
                    {truncateText(chat.title, 60)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {chat.messages.length} messages • {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
          
          {/* New Chat Input */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={newChatPrompt}
                onChange={(e) => setNewChatPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStartNewChat();
                  }
                }}
                placeholder="Start a new chat..."
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={handleStartNewChat}
                disabled={!newChatPrompt.trim() || isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </>
      ) : (
        // Active Chat View
        <>
          {/* Messages - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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

          {/* Input - Fixed at Bottom */}
          <div className="flex-shrink-0 p-4 border-t bg-background/95">
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
        </>
      )}
    </div>
  );
}
