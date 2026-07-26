"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useChatStore } from '@/lib/store/useChatStore';
import { apiClient } from '@/lib/api-client';
import { wsClient } from '@/lib/ws-client';
import { ConversationList } from '@/components/conversation-list/ConversationList';
import { NewChatModal } from '@/components/group/NewChatModal';
import { NewGroupModal } from '@/components/group/NewGroupModal';
import { ShieldAlert } from 'lucide-react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, isAuthenticated, initAuth } = useAuthStore();
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    isNewChatModalOpen,
    openNewChatModal,
    isGroupModalOpen,
    openGroupModal,
    handleWSEvent,
    initTheme,
  } = useChatStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
    initTheme();
  }, [initAuth, initTheme]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/register');
      return;
    }

    if (token) {
      wsClient.connect(token);
      const unsubscribe = wsClient.subscribe((event) => {
        handleWSEvent(event);
      });

      apiClient
        .getConversations()
        .then((data) => {
          setConversations(data);
          if (pathname === '/' && data.length > 0) {
            setActiveConversationId(data[0].id);
          }
        })
        .catch(console.error);

      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated, token, router, setConversations, handleWSEvent, setActiveConversationId, pathname]);

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    router.push(`/chat/${id}`);
  };

  const handleSelectUserForChat = async (recipientId: number) => {
    try {
      const conv = await apiClient.createDirectConversation(recipientId);
      setConversations([conv, ...conversations.filter((c) => c.id !== conv.id)]);
      setActiveConversationId(conv.id);
      openNewChatModal(false);
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      console.error('Failed to create direct conversation:', err);
    }
  };

  const handleCreateGroup = async (name: string, memberIds: number[], avatarUrl?: string) => {
    try {
      const groupConv = await apiClient.createGroup(name, memberIds, avatarUrl);
      setConversations([groupConv, ...conversations]);
      setActiveConversationId(groupConv.id);
      openGroupModal(false);
      router.push(`/chat/${groupConv.id}`);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const showComingSoonToast = (featureName: string) => {
    setToastMessage(`${featureName} - Coming Soon!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-signal-dark flex items-center justify-center text-gray-400">
        Loading Signal Messenger...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-signal-dark overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-signal-card border border-signal-blue text-signal-text-primary px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs animate-bounce">
          <ShieldAlert className="w-4 h-4 text-signal-blue" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onOpenNewChat={() => openNewChatModal(true)}
        onOpenNewGroup={() => openGroupModal(true)}
      />

      {/* Main View */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>

      {/* Modals */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => openNewChatModal(false)}
        onSelectUser={handleSelectUserForChat}
      />

      <NewGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => openGroupModal(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}
