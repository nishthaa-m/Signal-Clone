"""Shared TypeScript interfaces mirroring backend Pydantic models."""

export type ConversationType = 'direct' | 'group';
export type MemberRole = 'member' | 'admin';
export type MessageType = 'text' | 'system';
export type MessageStatusEnum = 'sent' | 'delivered' | 'read';

export interface User {
  id: number;
  phone_number: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface Contact {
  id: number;
  user_id: number;
  contact_user_id: number;
  nickname?: string | null;
  created_at: string;
  contact_user: User;
}

export interface MessageStatus {
  id: number;
  message_id: number;
  user_id: number;
  status: MessageStatusEnum;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: MessageType;
  created_at: string;
  sender: User;
  statuses: MessageStatus[];
}

export interface ConversationMember {
  id: number;
  conversation_id: number;
  user_id: number;
  role: MemberRole;
  joined_at: string;
  user: User;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: Message | null;
  unread_count: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface WSEvent {
  type: 'message:new' | 'message:status' | 'typing' | 'presence' | 'conversation:new' | 'conversation:update';
  [key: string]: unknown;
}
