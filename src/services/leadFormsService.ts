import { getAccessToken } from '../utils/tokenStorage';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}/lead-forms${path}`, {
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

export interface LeadFormField {
  name: string;
  label: string;
  type: 'text' | 'phone' | 'email' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
}

export interface LeadForm {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  publicToken: string;
  sourcePage: string | null;
  fieldConfig: LeadFormField[];
  defaultTags: string[];
  autoAssignStaffId: string | null;
  isActive: boolean;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string };
  Location?: { id: string; name: string };
}

export interface CreateLeadFormPayload {
  branchId: string;
  name: string;
  sourcePage?: string | null;
  fieldConfig?: LeadFormField[];
  defaultTags?: string[];
  autoAssignStaffId?: string | null;
  isActive?: boolean;
}

export type LeadInteractionType =
  | 'CALL'
  | 'SMS'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'NOTE'
  | 'STATUS_CHANGE'
  | 'ASSIGNMENT';

export type CallOutcome = 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'VOICEMAIL' | 'WRONG_NUMBER';

export interface LeadInteraction {
  id: string;
  businessId: string;
  leadId: string;
  staffId: string | null;
  type: LeadInteractionType;
  direction: 'OUTBOUND' | 'INBOUND' | null;
  content: string | null;
  callOutcome: string | null;
  durationSeconds: number | null;
  createdAt: string;
  staff?: {
    id: string;
    user?: { id: string; name: string };
  };
}

export interface CallPayload {
  mode: 'TEL' | 'GATEWAY' | 'MANUAL';
  telUri?: string;
  phone?: string;
  message?: string;
  leadId?: string;
}

const leadFormsService = {
  listForms: () => apiRequest<{ data: LeadForm[] }>('/'),

  createForm: (payload: CreateLeadFormPayload) =>
    apiRequest<{ data: LeadForm }>('/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateForm: (id: string, payload: Partial<CreateLeadFormPayload>) =>
    apiRequest<{ data: LeadForm }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  rotateToken: (id: string) =>
    apiRequest<{ data: LeadForm }>(`/${id}/rotate-token`, { method: 'POST' }),

  deleteForm: (id: string) =>
    apiRequest<{ data: null }>(`/${id}`, { method: 'DELETE' }),

  listInteractions: (leadId: string) =>
    apiRequest<{ data: LeadInteraction[] }>(`/leads/${leadId}/interactions`),

  logInteraction: (
    leadId: string,
    payload: {
      type: 'CALL' | 'NOTE' | 'WHATSAPP' | 'EMAIL';
      direction?: 'OUTBOUND' | 'INBOUND';
      content?: string | null;
      callOutcome?: CallOutcome | null;
      durationSeconds?: number | null;
    },
  ) =>
    apiRequest<{ data: LeadInteraction }>(`/leads/${leadId}/interactions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendSms: (leadId: string, message: string) =>
    apiRequest<{ data: LeadInteraction }>(`/leads/${leadId}/sms`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getCallPayload: (leadId: string) =>
    apiRequest<{ data: CallPayload }>(`/leads/${leadId}/call`),
};

export function publicSubmitUrl(publicToken: string): string {
  return `${baseUrl}/public/lead-forms/${publicToken}/submit`;
}

export default leadFormsService;
