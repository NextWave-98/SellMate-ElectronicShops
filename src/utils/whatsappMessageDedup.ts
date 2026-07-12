import type { WhatsAppInboxMessage, WhatsAppSocketMessage } from '../types/whatsapp-inbox';

const DEDUP_WINDOW_MS = 8000;

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isSameMessage(a: WhatsAppInboxMessage, b: WhatsAppInboxMessage): boolean {
  if (a.id && b.id && a.id === b.id) return true;

  if (
    a.direction === b.direction &&
    a.body === b.body &&
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < DEDUP_WINDOW_MS
  ) {
    return true;
  }

  return false;
}

export function appendMessageIfNew(
  prev: WhatsAppInboxMessage[],
  msg: WhatsAppSocketMessage | WhatsAppInboxMessage,
): WhatsAppInboxMessage[] {
  if (prev.some((m) => isSameMessage(m, msg))) return prev;
  return [...prev, msg];
}
