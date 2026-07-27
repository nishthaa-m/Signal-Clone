"use client";

import React, { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Reply, Smile, Download, MoreHorizontal, Trash2, Forward, CheckSquare, Square } from 'lucide-react';
import { Message } from '@/lib/types';
import { StatusCheck } from '../ui/StatusCheck';
import { Avatar } from '../ui/Avatar';
import { useChatStore } from '@/lib/store/useChatStore';

interface MessageBubbleProps {
  message: Message;
  currentUserId: number;
  isGroup?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: number) => void;
  onEnterSelectMode?: () => void;
  onForwardMessage?: (message: Message) => void;
  onOpenDirectChat?: (senderId: number) => void;
}

const NAME_COLORS = [
  'text-indigo-600 dark:text-indigo-400',
  'text-rose-600 dark:text-rose-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
  'text-purple-600 dark:text-purple-400',
  'text-cyan-600 dark:text-cyan-400',
];

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

function getNameColor(userId: number): string {
  return NAME_COLORS[userId % NAME_COLORS.length];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isGroup = false,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onEnterSelectMode,
  onForwardMessage,
  onOpenDirectChat,
}) => {
  const { setReplyingToMessage, deleteMessageLocally, updateMessageReactions } = useChatStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSentByMe = message.sender_id === currentUserId;
  const isSystemMsg = message.message_type === 'system';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isSystemMsg) {
    return (
      <div className="flex justify-center my-3">
        <span className="bg-signal-card text-signal-text-secondary text-[11px] font-medium px-3.5 py-1 rounded-full border border-signal-border shadow-sm text-center">
          🔒 {message.content}
        </span>
      </div>
    );
  }

  const senderName = message.sender
    ? message.sender.display_name || message.sender.username || message.sender.phone_number
    : `User ${message.sender_id}`;

  const formattedTime = format(new Date(message.created_at), 'h:mm a');

  const handleSenderClick = () => {
    if (!isSentByMe && onOpenDirectChat) {
      onOpenDirectChat(message.sender_id);
    }
  };

  const handleToggleReaction = async (emoji: string) => {
    setShowEmojiPicker(false);
    setShowActionMenu(false);
    const existing = (message.reactions || []).filter(r => r.user_id !== currentUserId || r.emoji !== emoji);
    if ((message.reactions || []).some(r => r.user_id === currentUserId && r.emoji === emoji)) {
      updateMessageReactions(message.conversation_id, message.id, existing);
    } else {
      updateMessageReactions(message.conversation_id, message.id, [
        ...existing,
        { id: Date.now(), message_id: message.id, user_id: currentUserId, emoji, created_at: new Date().toISOString() },
      ]);
    }
  };

  const handleDeleteForMe = () => {
    setShowActionMenu(false);
    deleteMessageLocally(message.conversation_id, message.id);
  };

  const reactionGroups = (message.reactions || []).reduce<Record<string, { count: number; hasReacted: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, hasReacted: false };
      }
      acc[r.emoji].count += 1;
      if (r.user_id === currentUserId) {
        acc[r.emoji].hasReacted = true;
      }
      return acc;
    },
    {}
  );

  return (
    <div className={`flex my-1 space-x-2 group relative items-end ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
      {/* Checkbox for Select Mode */}
      {isSelectMode && (
        <button
          onClick={() => onToggleSelect?.(message.id)}
          className="p-1 text-signal-blue self-center flex-shrink-0"
        >
          {isSelected ? <CheckSquare className="w-5 h-5 fill-current" /> : <Square className="w-5 h-5 text-gray-400" />}
        </button>
      )}

      {/* Show Avatar next to received group messages */}
      {!isSentByMe && isGroup && (
        <div
          onClick={handleSenderClick}
          className="cursor-pointer hover:opacity-80 transition-opacity mb-1 flex-shrink-0"
          title={`Click to chat with ${senderName}`}
        >
          <Avatar
            name={senderName}
            src={message.sender?.avatar_url}
            size="sm"
            isOnline={message.sender?.is_online}
          />
        </div>
      )}

      {/* Visible Action Buttons & Context Menu */}
      {!isSelectMode && (
        <div className={`flex items-center space-x-0.5 self-center relative ${isSentByMe ? 'order-first mr-1' : 'order-last ml-1'}`} ref={menuRef}>
          <button
            onClick={() => setReplyingToMessage(message)}
            className="p-1 hover:bg-signal-hover rounded-full text-gray-400 hover:text-signal-blue transition-colors opacity-75 hover:opacity-100"
            title="Reply to message"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 hover:bg-signal-hover rounded-full text-gray-400 hover:text-amber-400 transition-colors opacity-75 hover:opacity-100"
            title="React with Emoji"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowActionMenu(!showActionMenu)}
            className="p-1 hover:bg-signal-hover rounded-full text-gray-400 hover:text-signal-text-primary transition-colors opacity-75 hover:opacity-100"
            title="More message actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Quick Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute top-full mt-1 z-50 bg-signal-sidebar border border-signal-border rounded-xl shadow-2xl p-1 flex items-center space-x-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  className="hover:scale-125 transition-transform p-1 text-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Context Menu Dropdown - Dynamic top-full positioning so it never clips at the top! */}
          {showActionMenu && (
            <div className="absolute top-full mt-1.5 z-50 w-44 bg-signal-sidebar border border-signal-border rounded-2xl shadow-2xl py-1 text-xs text-signal-text-primary">
              <button
                onClick={() => {
                  setReplyingToMessage(message);
                  setShowActionMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-signal-hover flex items-center space-x-2"
              >
                <Reply className="w-3.5 h-3.5 text-signal-blue" />
                <span>Reply</span>
              </button>

              <button
                onClick={() => {
                  setShowActionMenu(false);
                  onForwardMessage?.(message);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-signal-hover flex items-center space-x-2"
              >
                <Forward className="w-3.5 h-3.5 text-emerald-500" />
                <span>Forward</span>
              </button>

              <button
                onClick={() => {
                  setShowActionMenu(false);
                  onEnterSelectMode?.();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-signal-hover flex items-center space-x-2"
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Select</span>
              </button>

              <button
                onClick={handleDeleteForMe}
                className="w-full text-left px-3.5 py-2 hover:bg-signal-hover flex items-center space-x-2 text-rose-500 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete for me</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className={`max-w-[80%] md:max-w-[65%] rounded-[18px] px-3.5 py-2 shadow-xs text-sm relative ${
          isSentByMe
            ? 'bg-signal-blue text-white rounded-br-xs'
            : 'bg-[#e5e5ea] dark:bg-[#28292e] text-[#0f0f12] dark:text-[#f3f4f6] rounded-bl-xs border border-transparent dark:border-signal-border/40'
        }`}
      >
        {/* Group Sender Name */}
        {!isSentByMe && isGroup && (
          <div
            onClick={handleSenderClick}
            className={`text-xs font-bold mb-0.5 cursor-pointer hover:underline ${getNameColor(
              message.sender_id
            )}`}
            title={`Click to open 1:1 chat with ${senderName}`}
          >
            {senderName}
          </div>
        )}

        {/* Quoted Reply Box */}
        {message.reply_to && (
          <div
            className={`mb-1.5 p-2 rounded-lg border-l-3 text-xs overflow-hidden ${
              isSentByMe
                ? 'bg-blue-700/40 border-white/80 text-blue-50'
                : 'bg-black/5 dark:bg-white/5 border-signal-blue text-signal-text-primary'
            }`}
          >
            <span className="font-bold block truncate opacity-90">
              {message.reply_to.sender?.display_name || message.reply_to.sender?.username || 'User'}
            </span>
            <span className="truncate block opacity-80">
              {message.reply_to.content || '[Attachment]'}
            </span>
          </div>
        )}

        {/* Attachment Renderer */}
        {message.attachment_url && (
          <div className="mb-2">
            {message.attachment_type === 'image' ? (
              <img
                src={message.attachment_url}
                alt="Attachment"
                className="max-h-60 rounded-xl object-cover border border-black/10 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => window.open(message.attachment_url, '_blank')}
              />
            ) : (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-colors ${
                  isSentByMe
                    ? 'bg-blue-700/30 border-blue-400/40 text-white hover:bg-blue-700/50'
                    : 'bg-black/5 dark:bg-white/5 border-signal-border text-signal-text-primary hover:bg-signal-hover'
                }`}
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs truncate flex-1 font-medium">Download Attachment</span>
                <Download className="w-4 h-4 flex-shrink-0 opacity-75" />
              </a>
            )}
          </div>
        )}

        {/* Text Content & Timestamp Flex Layout */}
        <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-0.5">
          {message.content && (
            <span className="whitespace-pre-wrap break-words leading-snug flex-1 min-w-[20px]">
              {message.content}
            </span>
          )}

          <div
            className={`inline-flex items-center space-x-1 text-[10px] select-none flex-shrink-0 self-end ml-auto pl-1 ${
              isSentByMe ? 'text-blue-100/90' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span>{formattedTime}</span>
            {isSentByMe && <StatusCheck statuses={message.statuses} />}
          </div>
        </div>

        {/* Emoji Reactions Badge Pills */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 -mb-1">
            {Object.entries(reactionGroups).map(([emoji, group]) => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-transform active:scale-95 shadow-xs border ${
                  group.hasReacted
                    ? 'bg-signal-blue/20 border-signal-blue text-signal-blue font-bold'
                    : 'bg-signal-card/80 border-signal-border text-signal-text-primary hover:bg-signal-hover'
                }`}
              >
                <span>{emoji}</span>
                {group.count > 1 && <span className="text-[10px]">{group.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
