"use client";

import React, { useState } from 'react';
import { Search, Users, LogOut, Menu, MessageSquare, Phone, Layers, Edit } from 'lucide-react';
import { Conversation } from '@/lib/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useChatStore } from '@/lib/store/useChatStore';
import { Avatar } from '../ui/Avatar';
import { ConversationItem } from './ConversationItem';
import Link from 'next/link';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenNewGroup,
}) => {
  const { user: currentUser, logout } = useAuthStore();
  const { searchQuery, setSearchQuery } = useChatStore();
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'stories'>('chats');

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(query);
    const memberMatch = c.members.some(
      (m) =>
        m.user?.display_name?.toLowerCase().includes(query) ||
        m.user?.username?.toLowerCase().includes(query) ||
        m.user?.phone_number.includes(query)
    );
    return nameMatch || memberMatch;
  });

  return (
    <div className="flex h-full flex-shrink-0 border-r border-signal-border">
      {/* Far-left Signal Desktop Navigation Rail matching Image 2 */}
      <div className="w-16 h-full bg-[#f2f2f4] dark:bg-[#18181c] border-r border-signal-border flex flex-col items-center justify-between py-4 flex-shrink-0 select-none">
        <div className="flex flex-col items-center space-y-6 w-full">
          {/* Hamburger Menu */}
          <button className="p-2 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors" title="Signal Menu">
            <Menu className="w-5 h-5" />
          </button>

          {/* Navigation Items */}
          <div className="flex flex-col items-center space-y-4 w-full px-2">
            <button
              onClick={() => setActiveTab('chats')}
              className={`relative p-3 rounded-2xl transition-colors ${
                activeTab === 'chats'
                  ? 'bg-[#e3e3e8] dark:bg-signal-hover text-black dark:text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
              title="Chats"
            >
              <MessageSquare className="w-5 h-5 fill-current" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center px-1">
                  {totalUnread}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calls')}
              className={`relative p-3 rounded-2xl transition-colors ${
                activeTab === 'calls'
                  ? 'bg-[#e3e3e8] dark:bg-signal-hover text-black dark:text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
              title="Calls (Placeholder)"
            >
              <Phone className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('stories')}
              className={`relative p-3 rounded-2xl transition-colors ${
                activeTab === 'stories'
                  ? 'bg-[#e3e3e8] dark:bg-signal-hover text-black dark:text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
              title="Stories (Placeholder)"
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Avatar & Settings */}
        <div className="flex flex-col items-center space-y-3">
          <Link href="/settings" title="Settings">
            <Avatar
              name={currentUser?.display_name || currentUser?.username}
              src={currentUser?.avatar_url}
              size="sm"
              isOnline={true}
            />
          </Link>
          <button onClick={logout} className="p-2 text-rose-500 hover:text-rose-600 dark:text-rose-400 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Conversation Column */}
      <div className="w-72 md:w-80 h-full bg-signal-sidebar flex flex-col">
        {/* Top Header */}
        <div className="h-16 px-4 border-b border-signal-border flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-signal-text-primary">Chats</h2>

          <div className="flex items-center space-x-1">
            <button
              onClick={onOpenNewChat}
              className="p-2 hover:bg-signal-hover rounded-full transition-colors text-signal-blue"
              title="New 1:1 Chat"
            >
              <Edit className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenNewGroup}
              className="p-2 hover:bg-signal-hover rounded-full transition-colors text-signal-blue"
              title="New Group"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-signal-border/50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#e8e8ed] dark:bg-signal-card text-signal-text-primary placeholder-gray-500 text-xs rounded-2xl pl-10 pr-3 py-2 outline-none border border-transparent focus:border-signal-blue transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto py-2">
          {activeTab !== 'chats' ? (
            <div className="text-center text-gray-500 text-xs mt-10 px-4">
              <span className="font-semibold text-signal-text-primary uppercase block mb-1">{activeTab} - Coming Soon</span>
              Mocked Signal Desktop feature section
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-gray-500 text-xs mt-10 px-4">
              {searchQuery ? 'No matching chats found' : 'No active chats. Start one by clicking ✏️'}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversationId === conv.id}
                onClick={() => onSelectConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
