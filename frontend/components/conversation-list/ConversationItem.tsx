"use client";

import React from 'react';
import { format, isToday, isThisWeek, differenceInMinutes, differenceInHours } from 'date-fns';
import { Conversation } from '@/lib/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useChatStore } from '@/lib/store/useChatStore';
import { Avatar } from '../ui/Avatar';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function formatSignalCompactTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMins = differenceInMinutes(now, d);
  const diffHours = differenceInHours(now, d);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24 && isToday(d)) return format(d, 'h:mm a');
  if (isThisWeek(d)) return format(d, 'EEE');
  return format(d, 'MMM d');
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const { user: currentUser } = useAuthStore();
  const { presenceMap } = useChatStore();

  const lastMsg = conversation.last_message;
  const formattedTime = conversation.updated_at ? formatSignalCompactTime(conversation.updated_at) : '';

  const otherMember = conversation.type === 'direct'
    ? conversation.members.find((m) => m.user_id !== currentUser?.id)
    : null;

  const displayName = conversation.type === 'direct' && otherMember?.user
    ? (otherMember.user.display_name || otherMember.user.username || otherMember.user.phone_number)
    : conversation.name || 'Chat';

  const avatarUrl = conversation.type === 'direct' && otherMember?.user
    ? otherMember.user.avatar_url
    : conversation.avatar_url;

  const isOnline = otherMember
    ? presenceMap[otherMember.user_id]?.is_online ?? otherMember.user?.is_online ?? false
    : undefined;

  let previewText = 'No messages yet';
  if (lastMsg) {
    if (lastMsg.message_type === 'system') {
      previewText = `🔒 ${lastMsg.content}`;
    } else {
      const senderPrefix = lastMsg.sender_id === currentUser?.id
        ? 'You: '
        : conversation.type === 'group' && lastMsg.sender
        ? `${lastMsg.sender.display_name || lastMsg.sender.username}: `
        : '';
      previewText = `${senderPrefix}${lastMsg.content}`;
    }
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3 px-3 py-2.5 mx-2 my-0.5 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
        isActive
          ? 'bg-signal-hover border border-signal-border shadow-sm'
          : 'hover:bg-signal-hover/50 border border-transparent'
      }`}
    >
      <Avatar
        name={displayName}
        src={avatarUrl}
        size="md"
        isOnline={isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-signal-text-primary truncate">
            {displayName}
          </h4>
          {formattedTime && (
            <span className="text-[11px] text-gray-400 font-normal flex-shrink-0 ml-2">
              {formattedTime}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-400 truncate pr-2">
            {previewText}
          </p>

          {conversation.unread_count > 0 && (
            <span className="w-5 h-5 text-[11px] font-bold bg-signal-blue text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
