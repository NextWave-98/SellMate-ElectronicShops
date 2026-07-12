export interface Conversation {
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  direction: 'incoming' | 'outgoing';
}

export interface WhatsAppInboxMessage {
  id: string;
  from: string;
  to: string | null;
  body: string;
  direction: 'incoming' | 'outgoing';
  status: 'received' | 'sent' | 'failed' | 'read';
  autoReplied: boolean;
  aiModel: string | null;
  createdAt: string;
}

export type WhatsAppOrgMode = 'AI' | 'AUTO' | 'MANUAL';

export interface WhatsAppSocketMessage extends WhatsAppInboxMessage {
  contactPhone: string;
}

export interface ReplyTemplate {
  keyword: string;
  reply: string;
}
