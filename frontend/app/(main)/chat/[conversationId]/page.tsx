"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/lib/store/useChatStore';
import { ChatPane } from '@/components/chat-pane/ChatPane';
import { GroupDetailsModal } from '@/components/group/GroupDetailsModal';
import { apiClient } from '@/lib/api-client';

export default function ChatPage() {
  const params = useParams();
  const conversationId = Number(params.conversationId);
  const { conversations, setActiveConversationId, setConversations } = useChatStore();
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [comingSoonToast, setComingSoonToast] = useState<string | null>(null);

  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
  }, [conversationId, setActiveConversationId]);

  const activeConv = conversations.find((c) => c.id === conversationId);

  const handleUpdateGroup = (updatedGroup: any) => {
    setConversations(
      conversations.map((c) => (c.id === updatedGroup.id ? updatedGroup : c))
    );
  };

  const handleShowComingSoon = (feature: string) => {
    setComingSoonToast(`${feature} - Coming Soon!`);
    setTimeout(() => setComingSoonToast(null), 3000);
  };

  if (!activeConv) {
    return (
      <div className="flex-1 h-full bg-signal-dark flex items-center justify-center text-gray-400 text-sm border-l border-signal-border">
        Loading conversation...
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col relative">
      {comingSoonToast && (
        <div className="absolute top-4 right-4 z-50 bg-signal-card border border-signal-blue text-signal-text-primary px-4 py-2.5 rounded-xl shadow-xl text-xs animate-bounce">
          {comingSoonToast}
        </div>
      )}

      <ChatPane
        conversation={activeConv}
        onOpenGroupDetails={() => setIsGroupDetailsOpen(true)}
        onShowComingSoon={handleShowComingSoon}
      />

      {activeConv.type === 'group' && (
        <GroupDetailsModal
          isOpen={isGroupDetailsOpen}
          conversation={activeConv}
          onClose={() => setIsGroupDetailsOpen(false)}
          onUpdateGroup={handleUpdateGroup}
        />
      )}
    </div>
  );
}
