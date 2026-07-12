import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { whatsappInboxService } from '../services/whatsappService';
import alert from '../utils/alert';
import { appendMessageIfNew, normalizePhone } from '../utils/whatsappMessageDedup';
import {
  loadWhatsAppInboxPrefs,
  type WhatsAppInboxPrefs,
} from '../utils/whatsappInboxPrefs';
import {
  playWhatsAppNotificationTone,
  showWhatsAppBrowserNotification,
} from '../utils/whatsappNotificationSound';
import type {
  Conversation,
  WhatsAppInboxMessage,
  WhatsAppOrgMode,
  WhatsAppSocketMessage,
  ReplyTemplate,
} from '../types/whatsapp-inbox';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

function upsertConversation(
  prev: Conversation[],
  msg: WhatsAppSocketMessage,
): Conversation[] {
  const phone = msg.contactPhone;
  const existing = prev.find((c) => normalizePhone(c.phone) === normalizePhone(phone));
  const isIncoming = msg.direction === 'incoming';

  const updated: Conversation = {
    phone: existing?.phone ?? phone,
    lastMessage: msg.body,
    lastMessageTime: msg.createdAt,
    direction: msg.direction,
    unreadCount: existing?.unreadCount ?? 0,
  };

  if (isIncoming && msg.status === 'received') {
    updated.unreadCount = (existing?.unreadCount ?? 0) + 1;
  }

  const rest = prev.filter((c) => normalizePhone(c.phone) !== normalizePhone(phone));
  return [updated, ...rest];
}

function notifyIncomingMessage(
  msg: WhatsAppSocketMessage,
  prefs: WhatsAppInboxPrefs,
  isActiveChat: boolean,
): void {
  if (msg.direction !== 'incoming' || msg.status !== 'received') return;

  if (prefs.soundEnabled) {
    playWhatsAppNotificationTone(prefs.tone);
  }

  if (prefs.browserNotifications && (!isActiveChat || document.visibilityState !== 'visible')) {
    showWhatsAppBrowserNotification(msg.contactPhone, msg.body);
  }
}

export default function useWhatsAppInbox(businessId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppInboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [sending, setSending] = useState(false);
  const [orgMode, setOrgMode] = useState<WhatsAppOrgMode>('MANUAL');
  const [totalUnread, setTotalUnread] = useState(0);
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplate[]>([]);
  const [inboxPrefs, setInboxPrefs] = useState<WhatsAppInboxPrefs>(() => loadWhatsAppInboxPrefs());

  const selectedPhoneRef = useRef<string | null>(null);
  const businessIdRef = useRef(businessId);
  const prefsRef = useRef(inboxPrefs);
  selectedPhoneRef.current = selectedPhone;
  businessIdRef.current = businessId;
  prefsRef.current = inboxPrefs;

  const refreshConversations = useCallback(async () => {
    const orgId = businessIdRef.current;
    if (!orgId) return;
    setLoadingConversations(true);
    try {
      const list = await whatsappInboxService.getConversations(orgId);
      setConversations(list);
    } catch {
      // silent — inbox shows empty state
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const selectConversation = useCallback(async (phone: string) => {
    const orgId = businessIdRef.current;
    if (!orgId) return;

    setSelectedPhone(phone);
    setLoadingMessages(true);
    try {
      const msgs = await whatsappInboxService.getMessages(orgId, phone);
      setMessages(msgs as WhatsAppInboxMessage[]);

      await whatsappInboxService.markAsRead(orgId, phone);

      setConversations((prev) => {
        const conv = prev.find((c) => normalizePhone(c.phone) === normalizePhone(phone));
        if (conv?.unreadCount) {
          setTotalUnread((n) => Math.max(0, n - conv.unreadCount));
        }
        return prev.map((c) =>
          normalizePhone(c.phone) === normalizePhone(phone) ? { ...c, unreadCount: 0 } : c,
        );
      });
    } catch {
      alert.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPhone(null);
    setMessages([]);
  }, []);

  const sendReply = useCallback(async (message: string) => {
    const orgId = businessIdRef.current;
    const phone = selectedPhoneRef.current;
    if (!orgId || !phone) return;

    setSending(true);
    try {
      const sent = await whatsappInboxService.sendManualReply(orgId, phone, message);
      const typed = sent as WhatsAppInboxMessage;
      setMessages((prev) => appendMessageIfNew(prev, typed));
      setConversations((prev) =>
        upsertConversation(prev, { ...typed, contactPhone: phone }),
      );
    } catch {
      alert.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }, []);

  // Initial load — runs once per businessId change only
  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;

    (async () => {
      setLoadingConversations(true);
      try {
        const [meta, list] = await Promise.all([
          whatsappInboxService.getMeta(businessId),
          whatsappInboxService.getConversations(businessId),
        ]);
        if (cancelled) return;
        setOrgMode(meta.mode);
        setTotalUnread(meta.totalUnread);
        setReplyTemplates(meta.replyTemplates ?? []);
        setConversations(list);
      } catch {
        if (!cancelled) alert.error('Failed to load WhatsApp inbox');
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // Socket — runs once per businessId change only
  useEffect(() => {
    if (!businessId) return;

    const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });

    const onNewMessage = (msg: WhatsAppSocketMessage) => {
      const active = selectedPhoneRef.current;
      const isActiveChat = Boolean(
        active && normalizePhone(msg.contactPhone) === normalizePhone(active),
      );

      if (isActiveChat) {
        setMessages((prev) => appendMessageIfNew(prev, msg));
      }

      setConversations((prev) => {
        if (isActiveChat && msg.direction === 'incoming') {
          return upsertConversation(prev, msg).map((c) =>
            normalizePhone(c.phone) === normalizePhone(active!) ? { ...c, unreadCount: 0 } : c,
          );
        }
        return upsertConversation(prev, msg);
      });

      if (msg.direction === 'incoming' && msg.status === 'received') {
        notifyIncomingMessage(msg, prefsRef.current, isActiveChat);

        if (isActiveChat && active) {
          whatsappInboxService.markAsRead(businessId, active).catch(() => {});
        } else {
          setTotalUnread((n) => n + 1);
        }
      }
    };

    socket.on('connect', () => {
      socket.emit('join_org', businessId);
    });

    socket.on('new_whatsapp_message', onNewMessage);

    return () => {
      socket.off('new_whatsapp_message', onNewMessage);
      socket.disconnect();
    };
  }, [businessId]);

  return {
    conversations,
    selectedPhone,
    messages,
    loadingMessages,
    loadingConversations,
    sending,
    orgMode,
    totalUnread,
    replyTemplates,
    inboxPrefs,
    setInboxPrefs,
    selectConversation,
    clearSelection,
    sendReply,
    refresh: refreshConversations,
  };
}
