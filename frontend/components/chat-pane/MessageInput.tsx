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
      const fileType = res.content_type?.startsWith('image/') ? 'image' : 'file';
      setAttachment({
        url: res.file_url,
        type: fileType,
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
    <div className="border-t border-signal-border bg-signal-sidebar p-3 relative">
      {/* Quoted Reply Banner */}
      {replyingToMessage && (
        <div className="mb-2 bg-signal-card border-l-4 border-signal-blue p-2.5 rounded-r-xl flex items-center justify-between animate-in slide-in-from-bottom-1">
          <div className="text-xs space-y-0.5 overflow-hidden">
            <span className="font-bold text-signal-blue block">
              Replying to {replyingToMessage.sender?.display_name || 'User'}
            </span>
            <p className="text-signal-text-secondary truncate">
              {replyingToMessage.content || '[Attachment]'}
            </p>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="p-1 text-gray-400 hover:text-white rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Banner */}
      {attachment && (
        <div className="mb-2 bg-signal-card border border-signal-border p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            {attachment.type === 'image' ? (
              <ImageIcon className="w-5 h-5 text-signal-blue flex-shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            )}
            <span className="text-xs font-medium text-signal-text-primary truncate">
              {attachment.name}
            </span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="p-1 text-gray-400 hover:text-white rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {isEmojiOpen && (
        <div className="absolute bottom-16 left-4 z-50 bg-signal-sidebar border border-signal-border rounded-2xl p-2 shadow-2xl flex items-center space-x-1 animate-in fade-in-50 zoom-in-95">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setContent((prev) => prev + emoji);
                setIsEmojiOpen(false);
              }}
              className="p-1.5 hover:bg-signal-hover rounded-xl text-lg hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center space-x-2">
        {/* Hidden File Input */}
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
          className="p-2.5 text-signal-text-secondary hover:text-signal-blue hover:bg-signal-hover rounded-full transition-colors disabled:opacity-50"
          title="Attach file or image"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsEmojiOpen(!isEmojiOpen)}
          className="p-2.5 text-signal-text-secondary hover:text-amber-400 hover:bg-signal-hover rounded-full transition-colors"
          title="Insert Emoji"
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
            className="w-full bg-signal-card text-signal-text-primary placeholder-signal-text-secondary border border-signal-border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-signal-blue resize-none max-h-32 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!content.trim() && !attachment}
          className="p-2.5 bg-signal-blue hover:bg-blue-600 text-white rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:scale-105 active:scale-95"
          title="Send Message"
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </form>
    </div>
  );
};
