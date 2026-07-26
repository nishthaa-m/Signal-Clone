"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Phone, Video, MoreVertical, Lock, Users, Trash2, Sun, Moon, Eraser } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Conversation } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useChatStore } from '@/lib/store/useChatStore';
import { Avatar } from '../ui/Avatar';
import { MessageBubble } from '../message-bubble/MessageBubble';
import { MessageInput } from './MessageInput';
import { useRouter } from 'next/navigation';

interface ChatPaneProps {
  conversation: Conversation;
  onOpenGroupDetails?: () => void;
  onShowComingSoon?: (feature: string) => void;
}

function formatSignalLastSeen(lastSeenStr?: string): string {
  if (!lastSeenStr) return 'Offline';
  try {
    const d = new Date(lastSeenStr);
    if (isNaN(d.getTime())) return 'Offline';
    if (isToday(d)) {
      return `Last seen Today at ${format(d, 'h:mm a')}`;
    }
    if (isYesterday(d)) {
      return `Last seen Yesterday at ${format(d, 'h:mm a')}`;
    }
    return `Last seen ${format(d, 'MMM d, h:mm a')}`;
  } catch {
    return 'Offline';
  }
}

function formatTypingText(typingUserIds: number[], members: any[]): string {
  if (typingUserIds.length === 0) return '';
  const names = typingUserIds.map((uid) => {
    const mem = members.find((m) => m.user_id === uid);
    if (mem && mem.user) {
      return mem.user.display_name || mem.user.username || mem.user.phone_number;
    }
    return `Contact`;
  });

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }
  return `${names[0]} and ${names.length - 1} others are typing...`;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  conversation,
  onOpenGroupDetails,
  onShowComingSoon,
}) => {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const {
    messagesMap,
    setMessages,
    addMessage,
    clearMessages,
    removeConversation,
    conversations,
    setConversations,
    setActiveConversationId,
    typingMap,
    presenceMap,
    theme,
    toggleTheme,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const messages = messagesMap[conversation.id] || [];
  const typingUserIds = typingMap[conversation.id] || [];

  const currentMember = conversation.members.find((m) => m.user_id === currentUser?.id);
  const isGroupAdmin = conversation.type === 'group' && currentMember?.role === 'admin';

  const otherMember = conversation.type === 'direct'
    ? conversation.members.find((m) => m.user_id !== currentUser?.id)
    : null;

  const displayName = conversation.type === 'direct' && otherMember?.user
    ? (otherMember.user.display_name || otherMember.user.username || otherMember.user.phone_number)
    : conversation.name || 'Chat';

  const avatarUrl = conversation.type === 'direct' && otherMember?.user
    ? otherMember.user.avatar_url
    : conversation.avatar_url;

  const otherUserPresence = otherMember
    ? presenceMap[otherMember.user_id] || {
        is_online: otherMember.user?.is_online ?? false,
        last_seen: otherMember.user?.last_seen,
      }
    : null;

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const history = await apiClient.getMessages(conversation.id);
        setMessages(conversation.id, history);
        await apiClient.markConversationRead(conversation.id);
      } catch (err) {
        console.error('Failed to load message history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversation.id, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUserIds]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (content: string) => {
    try {
      const newMsg = await apiClient.sendMessage(conversation.id, content);
      addMessage(newMsg);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleClearHistory = async () => {
    setIsMenuOpen(false);
    try {
      await apiClient.clearChatHistory(conversation.id);
      clearMessages(conversation.id);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const handleDeleteChat = async () => {
    setIsMenuOpen(false);
    try {
      if (conversation.type === 'group' && isGroupAdmin) {
        await apiClient.deleteGroup(conversation.id);
      } else {
        await apiClient.deleteConversation(conversation.id);
      }
      removeConversation(conversation.id);
      router.push('/');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleOpenDirectChat = async (recipientId: number) => {
    if (currentUser && recipientId === currentUser.id) return;
    try {
      const conv = await apiClient.createDirectConversation(recipientId);
      const exists = conversations.some((c) => c.id === conv.id);
      if (!exists) {
        setConversations([conv, ...conversations]);
      }
      setActiveConversationId(conv.id);
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      console.error('Failed to open 1:1 chat from group:', err);
    }
  };

  if (!currentUser) return null;

  const typingText = formatTypingText(typingUserIds, conversation.members);

  return (
    <div className="flex-1 flex flex-col h-full bg-signal-dark overflow-hidden border-l border-signal-border">
      {/* Header */}
      <div className="h-16 px-4 bg-signal-sidebar border-b border-signal-border flex items-center justify-between flex-shrink-0">
        <div
          className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={conversation.type === 'group' ? onOpenGroupDetails : undefined}
        >
          <Avatar
            name={displayName}
            src={avatarUrl}
            size="md"
            isOnline={conversation.type === 'direct' ? otherUserPresence?.is_online : undefined}
          />
          <div>
            <div className="flex items-center space-x-1.5 font-semibold text-sm text-signal-text-primary">
              <span>{displayName}</span>
              <Lock className="w-3.5 h-3.5 text-signal-blue" title="Encrypted" />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {conversation.type === 'group' ? (
                <span>{conversation.members.length} members</span>
              ) : otherUserPresence?.is_online ? (
                <span className="text-emerald-500 dark:text-emerald-400 font-medium flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1 inline-block" />
                  <span>Online</span>
                </span>
              ) : (
                <span>{formatSignalLastSeen(otherUserPresence?.last_seen)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons & theme toggle */}
        <div className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 relative" ref={menuRef}>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-signal-hover rounded-full transition-colors text-amber-500 dark:text-amber-400"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          </button>
          <button
            onClick={() => onShowComingSoon?.('Voice Call')}
            className="p-2 hover:bg-signal-hover rounded-full transition-colors"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => onShowComingSoon?.('Video Call')}
            className="p-2 hover:bg-signal-hover rounded-full transition-colors"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          {conversation.type === 'group' && (
            <button
              onClick={onOpenGroupDetails}
              className="p-2 hover:bg-signal-hover rounded-full transition-colors text-signal-blue"
              title="Group Details"
            >
              <Users className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-signal-hover rounded-full transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Context Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-signal-sidebar border border-signal-border rounded-2xl shadow-2xl z-50 py-1.5 text-xs text-signal-text-primary">
              <button
                onClick={handleClearHistory}
                className="w-full flex items-center space-x-2 px-4 py-2.5 hover:bg-signal-hover transition-colors"
              >
                <Eraser className="w-4 h-4 text-amber-500" />
                <span>Clear Chat History</span>
              </button>

              {conversation.type === 'group' && isGroupAdmin ? (
                <button
                  onClick={handleDeleteChat}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 hover:bg-signal-hover text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Group (Admin)</span>
                </button>
              ) : (
                <button
                  onClick={handleDeleteChat}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 hover:bg-signal-hover text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Conversation</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading Signal messages...
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                currentUserId={currentUser.id}
                isGroup={conversation.type === 'group'}
                onOpenDirectChat={handleOpenDirectChat}
              />
            ))}

            {typingUserIds.length > 0 && (
              <div className="flex items-center space-x-2 my-2 text-xs text-gray-500 italic">
                <span className="inline-flex items-center space-x-1.5 bg-signal-card border border-signal-border px-3.5 py-1.5 rounded-full shadow-xs">
                  <span className="w-1.5 h-1.5 bg-signal-blue rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-signal-blue rounded-full animate-pulse delay-75" />
                  <span className="w-1.5 h-1.5 bg-signal-blue rounded-full animate-pulse delay-150" />
                  <span className="ml-1 text-signal-text-primary not-italic font-medium">{typingText}</span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversation.id}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};
