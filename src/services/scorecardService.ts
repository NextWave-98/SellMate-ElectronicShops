import { getAccessToken } from '../utils/tokenStorage';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}/scorecard${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error?.details || 'Request failed');
  return json;
}

export interface EmployeeScorecard {
  id: string;
  businessId: string;
  staffId: string;
  period: string;
  leadsAssigned: number;
  ordersConfirmed: number;
  confirmationRate: number | null;
  confirmationPoints: number;
  parcelsDispatched: number;
  parcelsDelivered: number;
  deliveryRate: number | null;
  deliveryPoints: number;
  billingAmount: number;
  billingTarget: number | null;
  billingPoints: number;
  disciplinePoints: number;
  penaltyPoints: number;
  totalScore: number;
  tier: string | null;
  rank: number | null;
  allowanceAmount: number;
  isEmployeeOfMonth: boolean;
  promotionStreak: number;
  promotionFlag: string | null;
  finalized: boolean;
  staff?: { id: string; user?: { name?: string } };
}

export interface ScorecardSettings {
  id: string;
  businessId: string;
  enabled: boolean;
  kpiConfig: any;
  tierConfig: any;
  allowanceConfig: any;
  promotionConfig: any;
}

export interface PenaltyType {
  id: string;
  name: string;
  defaultPoints: number;
  isActive: boolean;
}

function periodQ(period?: string) {
  return period ? `?period=${encodeURIComponent(period)}` : '';
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const scorecardService = {
  getSettings: () => apiRequest<{ data: ScorecardSettings }>('/settings'),
  updateSettings: (payload: Partial<ScorecardSettings>) =>
    apiRequest<{ data: ScorecardSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  myCard: (period?: string) =>
    apiRequest<{ data: EmployeeScorecard | null }>(`/me${periodQ(period)}`),
  leaderboard: (period?: string) =>
    apiRequest<{ data: EmployeeScorecard[] }>(`/leaderboard${periodQ(period)}`),
  staffCard: (staffId: string, period?: string) =>
    apiRequest<{ data: EmployeeScorecard | null }>(`/staff/${staffId}${periodQ(period)}`),
  districts: (period?: string) =>
    apiRequest<{ data: unknown }>(`/districts${periodQ(period)}`),
  listPenaltyTypes: () => apiRequest<{ data: PenaltyType[] }>('/penalty-types'),
  createPenaltyType: (payload: { name: string; defaultPoints?: number }) =>
    apiRequest<{ data: PenaltyType }>('/penalty-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  issuePenalty: (payload: {
    staffId: string;
    period: string;
    points?: number;
    penaltyTypeId?: string;
    reason?: string;
  }) =>
    apiRequest<{ data: unknown }>('/penalties', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  upsertDiscipline: (payload: {
    staffId: string;
    period: string;
    attendanceScore?: number;
    loginHoursScore?: number;
    notesScore?: number;
    sopScore?: number;
    comments?: string;
  }) =>
    apiRequest<{ data: unknown }>('/discipline', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  recompute: (period: string) =>
    apiRequest<{ data: unknown }>('/recompute', {
      method: 'POST',
      body: JSON.stringify({ period }),
    }),
  finalize: (period: string) =>
    apiRequest<{ data: unknown }>('/finalize', {
      method: 'POST',
      body: JSON.stringify({ period }),
    }),
};

export default scorecardService;
