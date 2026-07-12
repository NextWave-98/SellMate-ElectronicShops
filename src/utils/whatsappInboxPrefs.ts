export type WhatsAppNotificationTone = 'default' | 'soft' | 'chime';

export interface WhatsAppInboxPrefs {
  soundEnabled: boolean;
  browserNotifications: boolean;
  tone: WhatsAppNotificationTone;
}

const STORAGE_KEY = 'whatsapp_inbox_prefs';

export const DEFAULT_WHATSAPP_INBOX_PREFS: WhatsAppInboxPrefs = {
  soundEnabled: true,
  browserNotifications: true,
  tone: 'default',
};

export function loadWhatsAppInboxPrefs(): WhatsAppInboxPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WHATSAPP_INBOX_PREFS };
    const parsed = JSON.parse(raw) as Partial<WhatsAppInboxPrefs>;
    return {
      ...DEFAULT_WHATSAPP_INBOX_PREFS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_WHATSAPP_INBOX_PREFS };
  }
}

export function saveWhatsAppInboxPrefs(prefs: WhatsAppInboxPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
