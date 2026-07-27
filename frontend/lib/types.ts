export type ConversationType = 'direct' | 'group';
export type MemberRole = 'member' | 'admin';
export type MessageType = 'text' | 'system';
export type MessageStatusEnum = 'sent' | 'delivered' | 'read';

export interface User {
  id: number;
  phone_number: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  user_id: number;
  contact_user_id: number;
  nickname?: string;
  created_at: string;
  contact_user: User;
}

export interface ConversationMember {
  id: number;
  conversation_id: number;
  user_id: number;
  role: MemberRole;
  joined_at: string;
  user?: User;
}

export interface MessageStatus {
  id: number;
  message_id: number;
  user_id: number;
  status: MessageStatusEnum;
  updated_at: string;
}

export interface Reaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at: string;
}

export interface QuotedMessageSummary {
  id: number;
  sender_id: number;
  content: string;
  sender?: User;
  attachment_url?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: MessageType;
  attachment_url?: string;
  attachment_type?: string;
  reply_to_id?: number;
  reply_to?: QuotedMessageSummary;
  expires_at?: string;
  created_at: string;
  sender?: User;
  statuses?: MessageStatus[];
  reactions?: Reaction[];
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name?: string;
  avatar_url?: string;
  disappearing_timer?: number;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: Message;
  unread_count: number;
}

export interface WSEvent {
  type: 'presence' | 'message:new' | 'message:status' | 'typing' | 'conversation:new' | 'conversation:update' | 'conversation:delete' | 'message:reaction';
  [key: string]: unknown;
}
