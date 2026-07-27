import { create } from 'zustand';
import { Conversation, Message, Reaction, WSEvent } from '../types';
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
  replyingToMessage: Message | null;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: number | null) => void;
  setMessages: (conversationId: number, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  deleteMessageLocally: (conversationId: number, messageId: number) => void;
  clearMessages: (conversationId: number) => void;
  removeConversation: (conversationId: number) => void;
  updateConversation: (conversation: Conversation) => void;
  updateMessageStatus: (conversationId: number, messageId: number, userId: number, status: 'sent' | 'delivered' | 'read') => void;
  updateMessageReactions: (conversationId: number, messageId: number, reactions: Reaction[]) => void;
  setSearchQuery: (query: string) => void;
  setTyping: (conversationId: number, userId: number, isTyping: boolean) => void;
  setPresence: (userId: number, isOnline: boolean, lastSeen?: string) => void;
  setReplyingToMessage: (msg: Message | null) => void;
  openNewChatModal: (open: boolean) => void;
  openGroupModal: (open: boolean) => void;
  initTheme: () => void;
  toggleTheme: () => void;
  purgeExpiredMessages: () => void;
  handleWSEvent: (event: WSEvent) => void;
}

function deduplicateConversations(convs: Conversation[], currentUserId?: number): Conversation[] {
  const seenIds = new Set<number>();
  const seenDirectUids = new Set<number>();
  const result: Conversation[] = [];

  for (const c of convs) {
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);

    if (c.type === 'direct' && currentUserId) {
      const otherMem = c.members.find((m) => m.user_id !== currentUserId);
      if (otherMem && otherMem.user_id) {
        if (seenDirectUids.has(otherMem.user_id)) continue;
        seenDirectUids.add(otherMem.user_id);
      }
    }
    result.push(c);
  }
  return result;
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
  replyingToMessage: null,

  setConversations: (conversations) => {
    const uid = useAuthStore.getState().user?.id;
    const deduped = deduplicateConversations(conversations, uid);
    set({ conversations: deduped });
  },

  setActiveConversationId: (id) => {
    set({ activeConversationId: id, replyingToMessage: null });
    if (id !== null) {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, unread_count: 0 } : c
        ),
      }));
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

  deleteMessageLocally: (conversationId, messageId) =>
    set((state) => {
      const msgs = state.messagesMap[conversationId];
      if (!msgs) return state;
      const filtered = msgs.filter((m) => m.id !== messageId);
      const newLastMsg = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;

      return {
        messagesMap: { ...state.messagesMap, [conversationId]: filtered },
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, last_message: newLastMsg } : c
        ),
      };
    }),

  clearMessages: (conversationId) =>
    set((state) => ({
      messagesMap: { ...state.messagesMap, [conversationId]: [] },
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, last_message: undefined } : c
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
      const uid = useAuthStore.getState().user?.id;
      const deduped = deduplicateConversations([updatedConv, ...state.conversations], uid);
      return {
        conversations: deduped,
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

  updateMessageReactions: (conversationId, messageId, reactions) =>
    set((state) => {
      const msgs = state.messagesMap[conversationId];
      if (!msgs) return state;

      const updatedMsgs = msgs.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      );

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

  setReplyingToMessage: (replyingToMessage) => set({ replyingToMessage }),
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

  purgeExpiredMessages: () =>
    set((state) => {
      const now = new Date().getTime();
      let changed = false;
      const newMap: Record<number, Message[]> = {};
      const convLastMsgUpdates: Record<number, Message | undefined> = {};

      for (const [convIdStr, msgs] of Object.entries(state.messagesMap)) {
        const convId = Number(convIdStr);
        const filtered = msgs.filter((m) => {
          if (!m.expires_at) return true;
          const expTime = new Date(m.expires_at).getTime();
          return expTime > now;
        });

        if (filtered.length !== msgs.length) {
          changed = true;
          newMap[convId] = filtered;
          convLastMsgUpdates[convId] = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
        } else {
          newMap[convId] = msgs;
        }
      }

      if (!changed) return state;

      const updatedConvs = state.conversations.map((c) => {
        if (c.id in convLastMsgUpdates) {
          return { ...c, last_message: convLastMsgUpdates[c.id] };
        }
        return c;
      });

      return { messagesMap: newMap, conversations: updatedConvs };
    }),

  handleWSEvent: (event: WSEvent) => {
    const { type } = event;
    const {
      addMessage,
      deleteMessageLocally,
      clearMessages,
      updateMessageStatus,
      updateMessageReactions,
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

      if (currentUser && msg.sender_id !== currentUser.id) {
        apiClient.markMessageDelivered(msg.id).catch(console.error);

        if (activeConversationId === msg.conversation_id) {
          apiClient.markMessageRead(msg.id).catch(console.error);
        }
      }
    } else if (type === 'message:delete') {
      const { conversation_id, message_id } = event as unknown as {
        conversation_id: number;
        message_id: number;
      };
      deleteMessageLocally(conversation_id, message_id);
    } else if (type === 'conversation:clear') {
      const { conversation_id } = event as unknown as { conversation_id: number };
      clearMessages(conversation_id);
    } else if (type === 'message:status') {
      const { conversation_id, message_id, user_id, status } = event as unknown as {
        conversation_id: number;
        message_id: number;
        user_id: number;
        status: 'sent' | 'delivered' | 'read';
      };
      updateMessageStatus(conversation_id, message_id, user_id, status);
    } else if (type === 'message:reaction') {
      const { conversation_id, message_id, reactions } = event as unknown as {
        conversation_id: number;
        message_id: number;
        reactions: Reaction[];
      };
      updateMessageReactions(conversation_id, message_id, reactions);
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
        if (conversation.last_message) {
          addMessage(conversation.last_message);
        }
      }
    }
  },
}));
