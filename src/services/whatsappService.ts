import { getAccessToken } from '../utils/tokenStorage';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';
const inboxBaseUrl = baseUrl;

async function apiRequest<T>(
  orgId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}/organizations/${orgId}/whatsapp-settings${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Request failed');
  }
  return json;
}

export interface EmbeddedSignupPayload {
  code: string;
  phoneNumberId: string;
  wabaId: string;
}

export interface EmbeddedSignupResponse {
  success: boolean;
  data: {
    phoneNumber: string;
    displayName: string;
    webhookUrl: string;
    settings: Record<string, unknown>;
  };
}

export const whatsappService = {
  getSettings: (orgId: string) => apiRequest(orgId, '', { method: 'GET' }),

  updateSettings: (orgId: string, data: Record<string, unknown>) =>
    apiRequest(orgId, '', { method: 'PUT', body: JSON.stringify(data) }),

  embeddedSignup: (orgId: string, payload: EmbeddedSignupPayload) =>
    apiRequest<EmbeddedSignupResponse>(orgId, '/embedded-signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  disconnect: (orgId: string) =>
    apiRequest(orgId, '/disconnect', { method: 'DELETE' }),

  getAiModels: (orgId: string) =>
    apiRequest(orgId, '/ai-models', { method: 'GET' }),

  saveAiConfig: (orgId: string, data: Record<string, unknown>) =>
    apiRequest(orgId, '/ai-config', { method: 'PUT', body: JSON.stringify(data) }),

  testAiReply: (orgId: string, testMessage: string) =>
    apiRequest(orgId, '/ai-test', {
      method: 'POST',
      body: JSON.stringify({ testMessage }),
    }),

  testConnection: (orgId: string) =>
    apiRequest(orgId, '/test', { method: 'POST' }),

  refreshToken: (orgId: string) =>
    apiRequest(orgId, '/refresh-token', { method: 'POST' }),
};

async function inboxRequest<T>(
  orgId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${inboxBaseUrl}/organizations/${orgId}/whatsapp${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Request failed');
  }
  return json;
}

export interface InboxConversation {
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  direction: 'incoming' | 'outgoing';
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string | null;
  body: string;
  direction: 'incoming' | 'outgoing';
  status: string;
  autoReplied: boolean;
  aiModel: string | null;
  createdAt: string;
}

export interface InboxMeta {
  mode: 'AI' | 'AUTO' | 'MANUAL';
  totalUnread: number;
  replyTemplates: Array<{ keyword: string; reply: string }>;
}

export const whatsappInboxService = {
  getMeta: async (orgId: string) => {
    const res = await inboxRequest<{ data: InboxMeta }>(orgId, '/meta');
    return res.data;
  },

  getConversations: async (orgId: string) => {
    const res = await inboxRequest<{ data: InboxConversation[] }>(orgId, '/conversations');
    return res.data;
  },

  getMessages: async (orgId: string, phone: string) => {
    const res = await inboxRequest<{ data: InboxMessage[] }>(
      orgId,
      `/messages/${encodeURIComponent(phone)}`,
    );
    return res.data;
  },

  sendManualReply: async (orgId: string, to: string, message: string) => {
    const res = await inboxRequest<{ data: InboxMessage }>(orgId, '/reply', {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    });
    return res.data;
  },

  markAsRead: (orgId: string, phone: string) =>
    inboxRequest(orgId, `/read/${encodeURIComponent(phone)}`, { method: 'PATCH' }),
};

// ─── WhatsApp auto-agent Orders ──────────────────────────────────────────────

async function ordersRequest<T>(
  orgId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}/organizations/${orgId}/whatsapp-orders${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Request failed');
  }
  return json;
}

export type WhatsAppOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface WhatsAppOrderItem {
  productId?: string;
  productName: string;
  variant?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  designNote?: string;
}

export interface WhatsAppOrder {
  id: string;
  orderNumber: string;
  source: string;
  status: WhatsAppOrderStatus;
  customerName: string;
  customerPhone: string;
  shippingAddress: string | null;
  items: WhatsAppOrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string | null;
  notes: string | null;
  whatsappPhone: string | null;
  courierTrackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppOrdersListResponse {
  data: WhatsAppOrder[];
  meta: { total: number; limit: number; offset: number };
}

export const whatsappOrdersService = {
  list: async (
    orgId: string,
    params: { status?: WhatsAppOrderStatus | 'ALL'; limit?: number; offset?: number } = {},
  ): Promise<WhatsAppOrdersListResponse> => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return ordersRequest<WhatsAppOrdersListResponse>(orgId, suffix);
  },

  get: async (orgId: string, id: string) => {
    const res = await ordersRequest<{ data: WhatsAppOrder }>(orgId, `/${id}`);
    return res.data;
  },

  confirm: async (
    orgId: string,
    id: string,
    opts: { notifyCustomer?: boolean; shipment?: ShipmentInput } = {},
  ) => {
    const res = await ordersRequest<{ data: WhatsAppOrder; courier?: { trackingNumber?: string; error?: string } }>(
      orgId,
      `/${id}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({
          notifyCustomer: opts.notifyCustomer ?? true,
          shipment: opts.shipment,
        }),
      },
    );
    return res;
  },

  bulkConfirm: async (orgId: string, orderIds: string[], notifyCustomer = true) => {
    const res = await ordersRequest<{ data: { confirmed: string[]; skipped: { id: string; reason: string }[] } }>(
      orgId,
      '/bulk-confirm',
      { method: 'POST', body: JSON.stringify({ orderIds, notifyCustomer }) },
    );
    return res.data;
  },

  cancel: async (orgId: string, id: string, reason?: string) => {
    const res = await ordersRequest<{ data: WhatsAppOrder }>(orgId, `/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  create: async (orgId: string, payload: OrderInput) => {
    const res = await ordersRequest<{ data: WhatsAppOrder }>(orgId, '', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  update: async (orgId: string, id: string, payload: Partial<OrderInput>) => {
    const res = await ordersRequest<{ data: WhatsAppOrder }>(orgId, `/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};

export interface OrderInputItem {
  productId?: string;
  productName: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  shippingAddress?: string;
  paymentMethod?: 'COD' | 'BANK_TRANSFER';
  deliveryFee?: number;
  notes?: string;
  items: OrderInputItem[];
}

export interface ShipmentInput {
  courierServiceId?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientPhone2?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientDistrict?: string;
  weight?: number;
  numberOfPieces?: number;
  shippingCharge?: number;
  codAmount?: number;
  paymentMethod?: 'cod' | 'bank' | 'cash' | 'online';
  notes?: string;
}

export default whatsappService;
