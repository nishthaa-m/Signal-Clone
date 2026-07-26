import { create } from 'zustand';
import { Conversation, Message, WSEvent } from '../types';
import { apiClient } from '../api-client';
import { useAuthStore } from './useAuthStore';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: number | null;
  messagesMap: Record<number, Message[]>;
  typingMap: Record<number, number[]>; // conversation_id -> user_ids typing
  presenceMap: Record<number, { is_online: boolean; last_seen?: string }>;
  searchQuery: string;
  isNewChatModalOpen: boolean;
  isGroupModalOpen: boolean;
  theme: 'dark' | 'light';

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: number | null) => void;
  setMessages: (conversationId: number, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearMessages: (conversationId: number) => void;
  removeConversation: (conversationId: number) => void;
  updateConversation: (conversation: Conversation) => void;
  updateMessageStatus: (conversationId: number, messageId: number, userId: number, status: 'sent' | 'delivered' | 'read') => void;
  setSearchQuery: (query: string) => void;
  setTyping: (conversationId: number, userId: number, isTyping: boolean) => void;
  setPresence: (userId: number, isOnline: boolean, lastSeen?: string) => void;
  openNewChatModal: (open: boolean) => void;
  openGroupModal: (open: boolean) => void;
  initTheme: () => void;
  toggleTheme: () => void;
  handleWSEvent: (event: WSEvent) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messagesMap: {},
  typingMap: {},
  presenceMap: {},
  searchQuery: '',
  isNewChatModalOpen: false,
  isGroupModalOpen: false,
  theme: 'dark',

  setConversations: (conversations) => set({ conversations }),

  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
    if (id !== null) {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, unread_count: 0 } : c
        ),
      }));
      // Mark all messages as read on backend when selecting conversation
      apiClient.markConversationRead(id).catch(console.error);
    }
  },

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesMap: { ...state.messagesMap, [conversationId]: messages },
    })),

  addMessage: (message) =>
    set((state) => {
      const convId = message.conversation_id;
      const existingMsgs = state.messagesMap[convId] || [];

      if (existingMsgs.some((m) => m.id === message.id)) {
        return state;
      }

      const updatedMsgs = [...existingMsgs, message];
      const isCurrentActive = state.activeConversationId === convId;

      const updatedConvs = state.conversations.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            last_message: message,
            updated_at: message.created_at,
            unread_count: isCurrentActive ? 0 : c.unread_count + 1,
          };
        }
        return c;
      });

      updatedConvs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      return {
        messagesMap: { ...state.messagesMap, [convId]: updatedMsgs },
        conversations: updatedConvs,
      };
    }),

  clearMessages: (conversationId) =>
    set((state) => ({
      messagesMap: { ...state.messagesMap, [conversationId]: [] },
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, last_message: null } : c
      ),
    })),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      activeConversationId:
        state.activeConversationId === conversationId ? null : state.activeConversationId,
    })),

  updateConversation: (updatedConv) =>
    set((state) => {
      const exists = state.conversations.some((c) => c.id === updatedConv.id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) => (c.id === updatedConv.id ? updatedConv : c)),
        };
      }
      return {
        conversations: [updatedConv, ...state.conversations],
      };
    }),

  updateMessageStatus: (conversationId, messageId, userId, status) =>
    set((state) => {
      const msgs = state.messagesMap[conversationId];
      if (!msgs) return state;

      const updatedMsgs = msgs.map((m) => {
        if (m.id === messageId) {
          const statuses = [...(m.statuses || [])];
          const stIdx = statuses.findIndex((s) => s.user_id === userId);
          if (stIdx >= 0) {
            statuses[stIdx] = { ...statuses[stIdx], status };
          } else {
            statuses.push({
              id: Date.now(),
              message_id: messageId,
              user_id: userId,
              status,
              updated_at: new Date().toISOString(),
            });
          }
          return { ...m, statuses };
        }
        return m;
      });

      return {
        messagesMap: { ...state.messagesMap, [conversationId]: updatedMsgs },
      };
    }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const currentList = state.typingMap[conversationId] || [];
      let newList: number[];
      if (isTyping) {
        newList = Array.from(new Set([...currentList, userId]));
      } else {
        newList = currentList.filter((id) => id !== userId);
      }
      return {
        typingMap: { ...state.typingMap, [conversationId]: newList },
      };
    }),

  setPresence: (userId, isOnline, lastSeen) =>
    set((state) => ({
      presenceMap: {
        ...state.presenceMap,
        [userId]: { is_online: isOnline, last_seen: lastSeen || state.presenceMap[userId]?.last_seen },
      },
    })),

  openNewChatModal: (isNewChatModalOpen) => set({ isNewChatModalOpen }),
  openGroupModal: (isGroupModalOpen) => set({ isGroupModalOpen }),

  initTheme: () => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('signal_theme') as 'dark' | 'light') || 'dark';
      set({ theme: savedTheme });
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('signal_theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { theme: nextTheme };
    }),

  handleWSEvent: (event: WSEvent) => {
    const { type } = event;
    const {
      addMessage,
      updateMessageStatus,
      setTyping,
      setPresence,
      removeConversation,
      updateConversation,
      activeConversationId,
    } = get();
    const currentUser = useAuthStore.getState().user;

    if (type === 'message:new' && event.message) {
      const msg = event.message as Message;
      addMessage(msg);

      // Real-time receipts trigger: If incoming message is from someone else
      if (currentUser && msg.sender_id !== currentUser.id) {
        // 1. Mark delivered
        apiClient.markMessageDelivered(msg.id).catch(console.error);

        // 2. Mark read if active conversation is currently open
        if (activeConversationId === msg.conversation_id) {
          apiClient.markMessageRead(msg.id).catch(console.error);
        }
      }
    } else if (type === 'message:status') {
      const { conversation_id, message_id, user_id, status } = event as unknown as {
        conversation_id: number;
        message_id: number;
        user_id: number;
        status: 'sent' | 'delivered' | 'read';
      };
      updateMessageStatus(conversation_id, message_id, user_id, status);
    } else if (type === 'typing') {
      const { conversation_id, user_id, is_typing } = event as unknown as {
        conversation_id: number;
        user_id: number;
        is_typing: boolean;
      };
      setTyping(conversation_id, user_id, is_typing);
    } else if (type === 'presence') {
      const { user_id, is_online, last_seen } = event as unknown as {
        user_id: number;
        is_online: boolean;
        last_seen?: string;
      };
      setPresence(user_id, is_online, last_seen);
    } else if (type === 'conversation:delete') {
      const { conversation_id } = event as unknown as { conversation_id: number };
      removeConversation(conversation_id);
    } else if (type === 'conversation:new' || type === 'conversation:update') {
      const { conversation } = event as unknown as { conversation: Conversation };
      if (conversation) {
        updateConversation(conversation);
      }
    }
  },
}));
