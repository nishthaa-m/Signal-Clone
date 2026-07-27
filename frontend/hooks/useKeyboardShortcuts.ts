"use client";

import { useEffect } from 'react';
import { useChatStore } from '@/lib/store/useChatStore';

export function useKeyboardShortcuts() {
  const {
    openNewChatModal,
    openGroupModal,
    setReplyingToMessage,
    isNewChatModalOpen,
    isGroupModalOpen,
  } = useChatStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // 1. Ctrl+K or Cmd+K -> Focus Search Bar
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // 2. Ctrl+Shift+N or Cmd+Shift+N -> New Chat Modal
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNewChatModal(true);
      }

      // 3. Ctrl+Shift+G or Cmd+Shift+G -> New Group Modal
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        openGroupModal(true);
      }

      // 4. Escape -> Close Modals & Cancel Reply
      if (e.key === 'Escape') {
        if (isNewChatModalOpen) openNewChatModal(false);
        if (isGroupModalOpen) openGroupModal(false);
        setReplyingToMessage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openNewChatModal,
    openGroupModal,
    setReplyingToMessage,
    isNewChatModalOpen,
    isGroupModalOpen,
  ]);
}
