"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Lock } from 'lucide-react';
import { wsClient } from '@/lib/ws-client';

interface MessageInputProps {
  conversationId: number;
  onSendMessage: (content: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onSendMessage,
}) => {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Send typing notification over WebSocket
    wsClient.sendTyping(conversationId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      wsClient.sendTyping(conversationId, false);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    wsClient.sendTyping(conversationId, false);

    onSendMessage(trimmed);
    setContent('');
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-3 bg-signal-sidebar border-t border-signal-border flex flex-col space-y-1.5 flex-shrink-0">
      {/* Encrypted indicator pill */}
      <div className="flex items-center justify-center space-x-1 text-[11px] text-gray-400 font-medium select-none">
        <Lock className="w-3 h-3 text-signal-blue" />
        <span>Signal End-to-End Encrypted</span>
      </div>

      <form onSubmit={handleSend} className="flex items-center space-x-2">
        <div className="flex-1 bg-[#e8e8ed] dark:bg-signal-card rounded-2xl flex items-center px-3 py-1.5 border border-transparent focus-within:border-signal-blue transition-colors">
          <button
            type="button"
            className="p-1.5 text-gray-500 hover:text-signal-blue transition-colors"
            title="Emoji placeholder"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={content}
            onChange={handleInputChange}
            placeholder="Signal message..."
            className="flex-1 bg-transparent text-signal-text-primary placeholder-gray-500 text-sm px-2 py-1 outline-none"
          />

          <button
            type="button"
            className="p-1.5 text-gray-500 hover:text-signal-blue transition-colors"
            title="Attachment placeholder"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        <button
          type="submit"
          disabled={!content.trim()}
          className={`p-2.5 rounded-full transition-all duration-150 flex items-center justify-center shadow-sm ${
            content.trim()
              ? 'bg-signal-blue hover:bg-signal-blue-hover text-white cursor-pointer scale-105'
              : 'bg-signal-blue/40 text-white/50 cursor-not-allowed'
          }`}
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
