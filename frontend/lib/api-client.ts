import { Contact, Conversation, Message, MessageStatus, Reaction, User } from './types';

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('signal_token') || localStorage.getItem('signal_token'))
    : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch {
      // JSON parse failed
    }
    throw new ApiError(response.status, errorDetail);
  }

  return response.json();
}

export const apiClient = {
  // Auth
  register: (phoneNumber: string) =>
    request<{ message: string; otp: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    }),

  login: (phoneNumber: string) =>
    request<{ message: string; otp: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    }),

  verifyOtp: (identifier: string, otp: string) =>
    request<{ access_token: string; token_type: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp }),
    }),

  setupProfile: (displayName: string, avatarUrl?: string) =>
    request<User>('/auth/profile-setup', {
      method: 'POST',
      body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl }),
    }),

  // Users & Contacts
  getContacts: () => request<User[]>('/users/contacts'),
  searchUsers: (query: string) => request<User[]>(`/users/search?q=${encodeURIComponent(query)}`),

  // Conversations
  getConversations: (query?: string) =>
    request<Conversation[]>(`/conversations${query ? `?q=${encodeURIComponent(query)}` : ''}`),

  getOrCreateDirectConversation: (recipientId: number) =>
    request<Conversation>('/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId }),
    }),

  createDirectConversation: (recipientId: number) =>
    request<Conversation>('/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId }),
    }),

  getConversationDetail: (conversationId: number) =>
    request<Conversation>(`/conversations/${conversationId}`),

  clearChatHistory: (conversationId: number) =>
    request<{ message: string }>(`/conversations/${conversationId}/messages`, {
      method: 'DELETE',
    }),

  deleteConversation: (conversationId: number) =>
    request<{ message: string }>(`/conversations/${conversationId}`, {
      method: 'DELETE',
    }),

  updateDisappearingTimer: (conversationId: number, timerSeconds: number) =>
    request<Conversation>(`/conversations/${conversationId}/disappearing-timer`, {
      method: 'PATCH',
      body: JSON.stringify({ timer_seconds: timerSeconds }),
    }),

  setDisappearingTimer: (conversationId: number, timerSeconds: number) =>
    request<Conversation>(`/conversations/${conversationId}/disappearing-timer`, {
      method: 'PATCH',
      body: JSON.stringify({ timer_seconds: timerSeconds }),
    }),

  // Messages
  getMessages: (conversationId: number, limit: number = 50) =>
    request<Message[]>(`/conversations/${conversationId}/messages?limit=${limit}`),

  sendMessage: (
    conversationId: number,
    content: string,
    messageType: 'text' | 'system' = 'text',
    attachmentUrl?: string,
    attachmentType?: string,
    replyToId?: number
  ) =>
    request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        message_type: messageType,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        reply_to_id: replyToId,
      }),
    }),

  deleteSingleMessage: (messageId: number) =>
    request<{ message: string }>(`/messages/${messageId}`, {
      method: 'DELETE',
    }),

  toggleReaction: (messageId: number, emoji: string) =>
    request<Reaction[]>(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  markMessageDelivered: (messageId: number) =>
    request<MessageStatus>(`/messages/${messageId}/delivered`, {
      method: 'PATCH',
    }),

  markMessageRead: (messageId: number) =>
    request<MessageStatus>(`/messages/${messageId}/read`, {
      method: 'PATCH',
    }),

  markConversationRead: (conversationId: number) =>
    request<MessageStatus[]>(`/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }),

  // Groups
  createGroup: (name: string, memberIds: number[], avatarUrl?: string) =>
    request<Conversation>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, member_ids: memberIds, avatar_url: avatarUrl }),
    }),

  addGroupMembers: (groupId: number, memberIds: number[]) =>
    request<Conversation>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: memberIds, member_ids: memberIds }),
    }),

  removeGroupMember: (groupId: number, userId: number) =>
    request<Conversation>(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    }),

  deleteGroup: (groupId: number) =>
    request<{ message: string }>(`/groups/${groupId}`, {
      method: 'DELETE',
    }),

  // File Upload
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('signal_token') || localStorage.getItem('signal_token'))
    : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorDetail = 'Upload failed';
      try {
        const errData = await response.json();
        errorDetail = errData.detail || errorDetail;
      } catch {}
      throw new ApiError(response.status, errorDetail);
    }

    return response.json() as Promise<{ filename: string; file_url: string; content_type: string }>;
  },
};
