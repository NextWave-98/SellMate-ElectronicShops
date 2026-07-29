import { getAccessToken } from '../utils/tokenStorage';

const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${baseUrl}/activity${path}`, {
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

export interface ActivitySettings {
  id: string;
  businessId: string;
  enabled: boolean;
  idleThresholdMinutes: number;
  rawRetentionDays: number;
  dailyRetentionDays: number;
  /** IANA timezone defining the workday boundary for daily reports. */
  timezone: string;
  employeesNotifiedAt: string | null;
  notifiedBy: string | null;
}

export interface ActivityDailyRow {
  id?: string;
  staffId: string;
  activityDate: string;
  activeMinutes: number;
  idleMinutes: number;
  sessionMinutes: number;
  longestIdleStreakMinutes: number;
  firstActivityAt?: string | null;
  lastActivityAt?: string | null;
  staff?: { id: string; user?: { name?: string } };
}

export interface LiveActivityRow {
  staffId: string;
  name: string | null;
  status: 'ACTIVE' | 'IDLE' | 'OFFLINE';
  idleMinutes: number;
  lastActivityAt: string | null;
  lastSeenAt: string;
}

function q(params: Record<string, string | undefined>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) s.set(k, v);
  });
  const str = s.toString();
  return str ? `?${str}` : '';
}

const activityMonitoringService = {
  getSettings: () => apiRequest<{ data: ActivitySettings }>('/settings'),
  updateSettings: (payload: {
    enabled?: boolean;
    idleThresholdMinutes?: number;
    rawRetentionDays?: number;
    dailyRetentionDays?: number;
    timezone?: string;
    markEmployeesNotified?: boolean;
  }) =>
    apiRequest<{ data: ActivitySettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  heartbeat: (payload: {
    minutes: Array<{ ts: string; active: boolean; events?: number }>;
    source?: 'WEB' | 'DESKTOP';
  }) =>
    apiRequest<{ data: unknown }>('/heartbeat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  myDaily: (from?: string, to?: string) =>
    apiRequest<{ data: ActivityDailyRow[] }>(`/me/daily${q({ from, to })}`),
  teamDaily: (params: { date?: string; from?: string; to?: string; staffId?: string } = {}) =>
    apiRequest<{ data: ActivityDailyRow[] }>(`/report/daily${q(params)}`),
  liveStatus: () => apiRequest<{ data: LiveActivityRow[] }>('/report/live'),
};

export default activityMonitoringService;
