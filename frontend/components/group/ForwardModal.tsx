"use client";

import React, { useState } from 'react';
import { Search, Send, X, Check } from 'lucide-react';
import { Conversation } from '@/lib/types';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface ForwardModalProps {
  isOpen: boolean;
  conversations: Conversation[];
  onClose: () => void;
  onForwardToConversation: (targetConversationId: number) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  conversations,
  onClose,
  onForwardToConversation,
}) => {
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);

  if (!isOpen) return null;

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.members.some((m) => m.user?.display_name?.toLowerCase().includes(q));
  });

  const handleSend = () => {
    if (selectedConvId !== null) {
      onForwardToConversation(selectedConvId);
      setSelectedConvId(null);
      setSearch('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-signal-text-primary">Forward Message to...</h3>
          <button onClick={onClose} className="p-1 hover:bg-signal-hover rounded-full text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts or groups..."
            className="w-full bg-signal-card text-signal-text-primary text-xs rounded-2xl pl-10 pr-4 py-2 border border-signal-border focus:outline-none focus:border-signal-blue"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1 py-1">
          {filtered.map((conv) => {
            const otherMember = conv.type === 'direct'
              ? conv.members.find((m) => m.user_id !== currentUser?.id)
              : null;

            const name = conv.type === 'direct' && otherMember?.user
              ? (otherMember.user.display_name || otherMember.user.username)
              : conv.name || 'Chat';

            const isSelected = selectedConvId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors ${
                  isSelected ? 'bg-signal-blue/20 border border-signal-blue' : 'hover:bg-signal-hover'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Avatar name={name} src={conv.avatar_url} size="sm" />
                  <span className="text-xs font-semibold text-signal-text-primary truncate">{name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-signal-blue" />}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSend}
          disabled={selectedConvId === null}
          className="w-full bg-signal-blue text-white py-2.5 rounded-2xl text-xs font-semibold hover:bg-blue-600 disabled:opacity-40 transition-all flex items-center justify-center space-x-2"
        >
          <Send className="w-4 h-4 fill-current" />
          <span>Forward Message</span>
        </button>
      </div>
    </div>
  );
};
