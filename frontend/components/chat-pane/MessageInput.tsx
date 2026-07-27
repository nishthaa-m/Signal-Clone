"use client";

import React, { useRef, useState } from 'react';
import { Paperclip, Send, Smile, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '@/lib/store/useChatStore';
import { apiClient } from '@/lib/api-client';
import { wsClient } from '@/lib/ws-client';

interface MessageInputProps {
  conversationId: number;
  onSendMessage: (
    content: string,
    attachmentUrl?: string,
    attachmentType?: string,
    replyToId?: number
  ) => void;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🙏', '💯', '👏'];

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onSendMessage,
}) => {
  const [content, setContent] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; type: string; name: string } | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { replyingToMessage, setReplyingToMessage } = useChatStore();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Typing indicator trigger
    if (conversationId) {
      wsClient.sendTyping(conversationId, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        wsClient.sendTyping(conversationId, false);
      }, 2000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await apiClient.uploadFile(file);
      setAttachment({
        url: res.url,
        type: res.attachment_type,
        name: res.filename,
      });
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !attachment) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    wsClient.sendTyping(conversationId, false);

    onSendMessage(
      content.trim(),
      attachment?.url,
      attachment?.type,
      replyingToMessage?.id
    );

    setContent('');
    setAttachment(null);
    setReplyingToMessage(null);
    setIsEmojiOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="bg-signal-sidebar border-t border-signal-border p-3 relative flex-shrink-0">
      {/* 1. Quoted Reply Preview Bar */}
      {replyingToMessage && (
        <div className="mb-2 p-2.5 bg-signal-card border-l-4 border-signal-blue rounded-r-xl flex items-center justify-between text-xs shadow-xs">
          <div className="min-w-0 pr-2">
            <span className="font-bold text-signal-blue block">
              Replying to {replyingToMessage.sender?.display_name || replyingToMessage.sender?.username || 'User'}
            </span>
            <span className="text-signal-text-secondary truncate block">
              {replyingToMessage.content || '[Attachment]'}
            </span>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="p-1 hover:bg-signal-hover rounded-full text-gray-400 hover:text-signal-text-primary"
            title="Cancel Reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Attachment Preview Bar */}
      {attachment && (
        <div className="mb-2 p-2 bg-signal-card border border-signal-border rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            {attachment.type === 'image' ? (
              <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            )}
            <span className="text-signal-text-primary truncate font-medium">{attachment.name}</span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="p-1 hover:bg-signal-hover rounded-full text-gray-400 hover:text-signal-text-primary"
            title="Remove Attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Emoji Quick Picker */}
      {isEmojiOpen && (
        <div className="absolute bottom-16 left-4 bg-signal-sidebar border border-signal-border rounded-2xl shadow-2xl p-2 z-50 flex items-center space-x-1.5 animate-in fade-in zoom-in-95">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setContent((prev) => prev + emoji);
                setIsEmojiOpen(false);
              }}
              className="p-1.5 hover:bg-signal-hover rounded-xl text-lg transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 4. Main Input Form */}
      <form onSubmit={handleSend} className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2.5 hover:bg-signal-hover text-gray-400 hover:text-signal-text-primary rounded-full transition-colors relative"
          title="Attach Image or File"
        >
          <Paperclip className={`w-5 h-5 ${isUploading ? 'animate-spin text-signal-blue' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => setIsEmojiOpen(!isEmojiOpen)}
          className="p-2.5 hover:bg-signal-hover text-gray-400 hover:text-signal-text-primary rounded-full transition-colors"
          title="Add Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Signal message..."
            rows={1}
            className="w-full bg-signal-card text-signal-text-primary border border-signal-border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-signal-blue resize-none transition-all placeholder:text-gray-500"
          />
        </div>

        <button
          type="submit"
          disabled={!content.trim() && !attachment}
          className="p-2.5 bg-signal-blue text-white rounded-full hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-signal-blue transition-all shadow-md flex-shrink-0"
          title="Send Message"
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </form>
    </div>
  );
};
