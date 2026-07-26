import { Contact, Conversation, Message, MessageStatus, User } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

  verifyOtp: (phoneNumber: string, otp: string) =>
    request<{ access_token: string; token_type: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, otp }),
    }),

  profileSetup: (displayName: string, avatarUrl?: string) =>
    request<User>('/auth/profile-setup', {
      method: 'POST',
      body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl }),
    }),

  // Users & Contacts
  getMe: () => request<User>('/users/me'),

  updateMe: (data: { display_name?: string; username?: string; avatar_url?: string }) =>
    request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  searchUsers: (query: string) =>
    request<User[]>(`/users/search?q=${encodeURIComponent(query)}`),

  getContacts: () => request<Contact[]>('/contacts'),

  addContact: (phoneOrUsername: string, nickname?: string) =>
    request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify({ phone_or_username: phoneOrUsername, nickname }),
    }),

  // Conversations
  getConversations: (query?: string) =>
    request<Conversation[]>(`/conversations${query ? `?q=${encodeURIComponent(query)}` : ''}`),

  getConversation: (id: number) => request<Conversation>(`/conversations/${id}`),

  createDirectConversation: (recipientId: number) =>
    request<Conversation>('/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId }),
    }),

  clearChatHistory: (id: number) =>
    request<{ message: string }>(`/conversations/${id}/messages`, {
      method: 'DELETE',
    }),

  deleteConversation: (id: number) =>
    request<{ message: string }>(`/conversations/${id}`, {
      method: 'DELETE',
    }),

  markConversationRead: (id: number) =>
    request<MessageStatus[]>(`/conversations/${id}/read`, {
      method: 'PATCH',
    }),

  // Messages
  getMessages: (conversationId: number) =>
    request<Message[]>(`/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: number, content: string) =>
    request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  markMessageDelivered: (messageId: number) =>
    request<MessageStatus>(`/messages/${messageId}/delivered`, {
      method: 'PATCH',
    }),

  markMessageRead: (messageId: number) =>
    request<MessageStatus>(`/messages/${messageId}/read`, {
      method: 'PATCH',
    }),

  // Groups
  createGroup: (name: string, memberIds: number[], avatarUrl?: string) =>
    request<Conversation>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, member_ids: memberIds, avatar_url: avatarUrl }),
    }),

  addGroupMembers: (groupId: number, userIds: number[]) =>
    request<Conversation>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    }),

  removeGroupMember: (groupId: number, userId: number) =>
    request<Conversation>(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    }),

  deleteGroup: (groupId: number) =>
    request<{ message: string }>(`/groups/${groupId}`, {
      method: 'DELETE',
    }),
};
