import { getAccessToken } from '../utils/tokenStorage';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';

async function apiRequest<T>(
  orgId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}/organizations/${orgId}/facebook-leads${path}`, {
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

export interface FacebookPage {
  id: string;
  name: string;
}

export interface FacebookLeadForm {
  id: string;
  name: string;
  status: string;
}

export interface FacebookLeadFormQuestion {
  type: string;
  key?: string;
  label?: string;
}

export interface FacebookLeadFormDetail extends FacebookLeadForm {
  locale: string | null;
  questions: FacebookLeadFormQuestion[];
  privacyPolicyUrl: string | null;
  followUpActionUrl: string | null;
  leadsCount: number | null;
}

export interface CreateFormPayload {
  branchId: string;
  name: string;
  locale?: string;
  questions: FacebookLeadFormQuestion[];
  privacyPolicy: { url: string; linkText?: string };
  followUpActionUrl?: string;
  thankYouTitle?: string;
  thankYouBody?: string;
}

export interface FacebookLeadStats {
  total: number;
  converted: number;
  byStatus: Record<FacebookLeadStatus, number>;
  byForm: Array<{ formId: string | null; formName: string | null; count: number }>;
}

export interface StaffOption {
  id: string;
  staffId: string;
  name: string;
}

export interface ConnectedForm {
  formId: string;
  formName: string;
}

export interface FacebookLeadSettings {
  id: string;
  branchId: string;
  fbUserId: string | null;
  pageId: string | null;
  pageName: string | null;
  connectedForms: ConnectedForm[];
  isActive: boolean;
  connected: boolean;
  lastSyncAt: string | null;
}

export type FacebookLeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';

export interface FacebookLead {
  id: string;
  branchId: string;
  pageId: string;
  formId: string | null;
  formName: string | null;
  leadgenId: string;
  createdTime: string | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  fieldData: Array<{ name: string; values: string[] }>;
  status: FacebookLeadStatus;
  assignedStaffId: string | null;
  customerId: string | null;
  notes: string | null;
  createdAt: string;
  Branch?: { id: string; name: string };
  Staff?: { id: string; staffId: string; user?: { id: string; name: string } };
}

export interface LeadListResponse {
  success: boolean;
  data: FacebookLead[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface LeadFilter {
  branchId?: string;
  status?: FacebookLeadStatus;
  formId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const facebookLeadsService = {
  getSettings: (orgId: string, branchId: string) =>
    apiRequest<{ data: FacebookLeadSettings | null }>(
      orgId,
      `/settings${buildQuery({ branchId })}`,
    ),

  connect: (orgId: string, branchId: string, token: string) =>
    apiRequest<{ data: { pages: FacebookPage[] } }>(orgId, '/connect', {
      method: 'POST',
      body: JSON.stringify({ branchId, token }),
    }),

  getPages: (orgId: string, branchId: string) =>
    apiRequest<{ data: { pages: FacebookPage[] } }>(
      orgId,
      `/pages${buildQuery({ branchId })}`,
    ),

  selectPage: (orgId: string, branchId: string, pageId: string) =>
    apiRequest<{ data: { forms: FacebookLeadForm[] } }>(orgId, '/select-page', {
      method: 'POST',
      body: JSON.stringify({ branchId, pageId }),
    }),

  getForms: (orgId: string, branchId: string) =>
    apiRequest<{ data: { forms: FacebookLeadForm[] } }>(
      orgId,
      `/forms${buildQuery({ branchId })}`,
    ),

  connectForms: (orgId: string, branchId: string, forms: ConnectedForm[]) =>
    apiRequest<{ data: FacebookLeadSettings }>(orgId, '/connect-forms', {
      method: 'POST',
      body: JSON.stringify({ branchId, forms }),
    }),

  disconnect: (orgId: string, branchId: string) =>
    apiRequest(orgId, '/disconnect', {
      method: 'POST',
      body: JSON.stringify({ branchId }),
    }),

  listLeads: (orgId: string, filter: LeadFilter = {}) =>
    apiRequest<LeadListResponse>(orgId, `/leads${buildQuery(filter)}`),

  updateLeadStatus: (orgId: string, leadId: string, status: FacebookLeadStatus) =>
    apiRequest<{ data: FacebookLead }>(orgId, `/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  assignLead: (orgId: string, leadId: string, assignedStaffId: string | null) =>
    apiRequest<{ data: FacebookLead }>(orgId, `/leads/${leadId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedStaffId }),
    }),

  convertLead: (orgId: string, leadId: string) =>
    apiRequest(orgId, `/leads/${leadId}/convert`, { method: 'POST' }),

  updateNotes: (orgId: string, leadId: string, notes: string | null) =>
    apiRequest<{ data: FacebookLead }>(orgId, `/leads/${leadId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  deleteLead: (orgId: string, leadId: string) =>
    apiRequest(orgId, `/leads/${leadId}`, { method: 'DELETE' }),

  syncLeads: (orgId: string, branchId: string, formId?: string) =>
    apiRequest<{ data: { synced: number; skipped: number; total: number; forms: number } }>(
      orgId,
      '/sync',
      { method: 'POST', body: JSON.stringify({ branchId, formId }) },
    ),

  getStats: (orgId: string, branchId?: string) =>
    apiRequest<{ data: FacebookLeadStats }>(orgId, `/stats${buildQuery({ branchId })}`),

  getFormDetail: (orgId: string, branchId: string, formId: string) =>
    apiRequest<{ data: FacebookLeadFormDetail }>(
      orgId,
      `/forms/${formId}${buildQuery({ branchId })}`,
    ),

  createForm: (orgId: string, payload: CreateFormPayload) =>
    apiRequest<{ data: { id: string; name: string } }>(orgId, '/forms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  setFormStatus: (
    orgId: string,
    branchId: string,
    formId: string,
    status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT',
  ) =>
    apiRequest(orgId, `/forms/${formId}/status`, {
      method: 'POST',
      body: JSON.stringify({ branchId, status }),
    }),

  /** Download the filtered leads as a CSV file (triggers a browser download). */
  exportLeads: async (orgId: string, filter: LeadFilter = {}) => {
    const token = getAccessToken();
    const res = await fetch(
      `${baseUrl}/organizations/${orgId}/facebook-leads/leads/export${buildQuery(filter)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error('Failed to export leads');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facebook-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /** Org staff list for the assignment dropdown (reuses the shared /staff endpoint). */
  getStaff: async (): Promise<StaffOption[]> => {
    const token = getAccessToken();
    const res = await fetch(`${baseUrl}/staff`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const json = await res.json();
    const responseData = json?.data ?? json;
    const arr = responseData?.staff ?? (Array.isArray(responseData) ? responseData : []);
    return arr.map((s: any) => ({
      id: s.staff?.id ?? s.id,
      staffId: s.staff?.staffId ?? s.staffId ?? '',
      name: s.name ?? s.user?.name ?? s.staff?.user?.name ?? 'Unnamed',
    }));
  },
};

export default facebookLeadsService;
