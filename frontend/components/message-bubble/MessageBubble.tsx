"use client";

import React from 'react';
import { format } from 'date-fns';
import { Message } from '@/lib/types';
import { StatusCheck } from '../ui/StatusCheck';
import { Avatar } from '../ui/Avatar';

interface MessageBubbleProps {
  message: Message;
  currentUserId: number;
  isGroup?: boolean;
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

function getNameColor(userId: number): string {
  return NAME_COLORS[userId % NAME_COLORS.length];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isGroup = false,
  onOpenDirectChat,
}) => {
  const isSentByMe = message.sender_id === currentUserId;
  const isSystemMsg = message.message_type === 'system';

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

  return (
    <div className={`flex my-1 space-x-2 ${isSentByMe ? 'justify-end' : 'justify-start items-end'}`}>
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

        {/* Content & Timestamp Flex Layout */}
        <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-0.5">
          <span className="whitespace-pre-wrap break-words leading-snug flex-1 min-w-[20px]">
            {message.content}
          </span>

          <div
            className={`inline-flex items-center space-x-1 text-[10px] select-none flex-shrink-0 self-end ml-auto pl-1 ${
              isSentByMe ? 'text-blue-100/90' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span>{formattedTime}</span>
            {isSentByMe && <StatusCheck statuses={message.statuses} />}
          </div>
        </div>
      </div>
    </div>
  );
};
