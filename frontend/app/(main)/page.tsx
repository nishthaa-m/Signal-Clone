"use client";

import React from 'react';
import { MessageSquare, Lock, Shield } from 'lucide-react';
import { useChatStore } from '@/lib/store/useChatStore';
import { ChatPane } from '@/components/chat-pane/ChatPane';

export default function MainPage() {
  const { conversations, activeConversationId } = useChatStore();

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  if (activeConv) {
    return <ChatPane conversation={activeConv} />;
  }

  return (
    <div className="flex-1 h-full bg-signal-dark flex flex-col items-center justify-center p-8 text-center select-none border-l border-signal-border">
      <div className="w-20 h-20 rounded-3xl bg-signal-sidebar border border-signal-border flex items-center justify-center text-signal-blue shadow-2xl mb-6">
        <MessageSquare className="w-10 h-10 fill-current" />
      </div>

      <h2 className="text-xl font-bold text-signal-text-primary">Signal for Web</h2>
      <p className="text-xs text-gray-400 max-w-sm mt-2 leading-relaxed">
        Send and receive end-to-end encrypted messages with zero ads, zero trackers, and zero compromises on privacy.
      </p>

      <div className="mt-8 flex items-center space-x-2 bg-signal-sidebar border border-signal-border px-4 py-2 rounded-full text-xs text-gray-300 shadow-sm">
        <Lock className="w-3.5 h-3.5 text-signal-blue" />
        <span>End-to-End Encrypted Session</span>
      </div>

      <div className="mt-12 flex items-center space-x-1.5 text-[11px] text-gray-500">
        <Shield className="w-3.5 h-3.5" />
        <span>Select a conversation from the sidebar or click + to start messaging</span>
      </div>
    </div>
  );
}
