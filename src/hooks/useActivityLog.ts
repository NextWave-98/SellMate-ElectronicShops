import { useCallback } from 'react';
import useFetch from './useFetch';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string;
  userId?: string;
  userName?: string;       // email / display name stored at log time
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  module: string;
  recordId?: string;
  details?: {
    method?: string;
    path?: string;
    statusCode?: number;
    body?: Record<string, unknown>;
  };
  ipAddress?: string;
  createdAt: string;
}

export interface ModuleCount {
  module: string;
  count: number;
}

export interface ActionCount {
  action: string;
  count: number;
}

export interface DailyTimelineEntry {
  date: string;      // "YYYY-MM-DD"
  count: number;
}

export interface OrgDashboardActivity {
  recentLogs: ActivityLogEntry[];
  todayCount: number;
  moduleBreakdown: ModuleCount[];
  actionBreakdown: ActionCount[];
  dailyTimeline: DailyTimelineEntry[];
}

export interface ActivityLogPage {
  activityLogs: ActivityLogEntry[];
  availableModules?: string[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────

const useActivityLog = () => {
  const dashboardFetch = useFetch<OrgDashboardActivity>('/activity-logs/dashboard');
  const listFetch = useFetch<ActivityLogPage>('/activity-logs');
  const statsFetch = useFetch<{
    total: number;
    byAction: Record<string, number>;
    byModule: Record<string, number>;
    topUsers: { user: { id: string; name: string; email: string } | null; count: number }[];
  }>('/activity-logs/stats');

  /** Fetch the org-admin dashboard summary (recent logs + stats). */
  const getOrgDashboardActivity = useCallback(
    async (limit = 20): Promise<OrgDashboardActivity | null> => {
      const res = await dashboardFetch.fetchData({
        method: 'GET',
        endpoint: `/activity-logs/dashboard?limit=${limit}`,
        silent: true,
        showToastOnError: false,
      });
      return res?.success && res.data ? res.data : null;
    },
    [dashboardFetch]
  );

  /** Fetch a paginated list of activity logs (full log page). */
  const getActivityLogs = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      module?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
    }): Promise<ActivityLogPage | null> => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.userId) qs.set('userId', params.userId);
      if (params?.action) qs.set('action', params.action);
      if (params?.module) qs.set('module', params.module);
      if (params?.search) qs.set('search', params.search);
      if (params?.fromDate) qs.set('fromDate', params.fromDate);
      if (params?.toDate) qs.set('toDate', params.toDate);

      const res = await listFetch.fetchData({
        method: 'GET',
        endpoint: `/activity-logs?${qs.toString()}`,
        silent: true,
      });
      return res?.success && res.data ? res.data : null;
    },
    [listFetch]
  );

  /** Fetch aggregate stats (action / module breakdown, top users). */
  const getActivityStats = useCallback(
    async (fromDate?: string, toDate?: string) => {
      const qs = new URLSearchParams();
      if (fromDate) qs.set('fromDate', fromDate);
      if (toDate) qs.set('toDate', toDate);

      const res = await statsFetch.fetchData({
        method: 'GET',
        endpoint: `/activity-logs/stats?${qs.toString()}`,
        silent: true,
      });
      return res?.success && res.data ? res.data : null;
    },
    [statsFetch]
  );

  return {
    getOrgDashboardActivity,
    getActivityLogs,
    getActivityStats,
    loading: dashboardFetch.loading || listFetch.loading,
  };
};

export default useActivityLog;
