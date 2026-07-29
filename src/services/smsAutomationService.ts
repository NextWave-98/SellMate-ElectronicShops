import { getAccessToken } from '../utils/tokenStorage';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}/sms-automation${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error?.details || 'Request failed');
  }
  return json;
}

export type SmsOutboxStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'SKIPPED_NO_GATEWAY'
  | 'SKIPPED_DISABLED'
  | 'CANCELLED';

export type SmsOutboxType = 'ORDER_CREATED' | 'ORDER_DISPATCHED' | 'QUICK_SEND' | 'LEAD_SMS';

export interface SmsAutomationSettings {
  id: string;
  businessId: string;
  orderCreatedEnabled: boolean;
  orderDispatchedEnabled: boolean;
  orderCreatedTemplate: string | null;
  orderDispatchedTemplate: string | null;
  quickSendEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  defaultTemplates?: {
    orderCreated: string;
    orderDispatched: string;
  };
}

export interface SmsOutboxItem {
  id: string;
  businessId: string;
  recipient: string;
  message: string;
  type: SmsOutboxType;
  referenceType: string | null;
  referenceId: string | null;
  status: SmsOutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxListResult {
  items: SmsOutboxItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateSmsAutomationSettingsPayload {
  orderCreatedEnabled?: boolean;
  orderDispatchedEnabled?: boolean;
  orderCreatedTemplate?: string | null;
  orderDispatchedTemplate?: string | null;
  quickSendEnabled?: boolean;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

const smsAutomationService = {
  getSettings: () =>
    apiRequest<{ data: SmsAutomationSettings }>('/settings'),

  updateSettings: (payload: UpdateSmsAutomationSettingsPayload) =>
    apiRequest<{ data: SmsAutomationSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  quickSend: (payload: { to: string; message: string; customerId?: string }) =>
    apiRequest<{ data: SmsOutboxItem }>('/quick-send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listOutbox: (params: {
    page?: number;
    limit?: number;
    status?: SmsOutboxStatus;
    type?: SmsOutboxType;
  } = {}) =>
    apiRequest<{ data: OutboxListResult }>(`/outbox${buildQuery(params)}`),

  retryOutbox: (id: string) =>
    apiRequest<{ data: SmsOutboxItem }>(`/outbox/${id}/retry`, { method: 'POST' }),

  retryAllOutbox: () =>
    apiRequest<{ data: { requeued: number } }>('/outbox/retry-all', { method: 'POST' }),

  testSend: (payload: { to: string; event: 'ORDER_CREATED' | 'ORDER_DISPATCHED' }) =>
    apiRequest<{ data: SmsOutboxItem }>('/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export default smsAutomationService;
