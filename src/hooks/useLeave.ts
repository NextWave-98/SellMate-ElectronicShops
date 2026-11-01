import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';
import type {
  BalanceListRow,
  CarryForwardResult,
  CreateAdjustmentInput,
  CreateEmployeeEntitlementInput,
  CreateLeaveRequestInput,
  CreateLeaveTypeInput,
  CreateRoleEntitlementInput,
  DailyAttendanceStatus,
  EmployeeEntitlement,
  LeaveAttachment,
  LeaveBalance,
  LeaveCalendarData,
  LeaveCalendarQuery,
  LeaveDashboard,
  LeaveEmployee,
  LeaveHoliday,
  LeaveLedgerEntry,
  LeaveMeta,
  LeavePreview,
  LeavePreviewInput,
  LeaveReport,
  LeaveReportQuery,
  LeaveRequest,
  LeaveRequestDetail,
  LeaveRequestRow,
  LeaveRole,
  LeaveSettings,
  LeaveSettingsInput,
  LeaveType,
  LeaveTypeInput,
  MyLeaveOverview,
  Paginated,
  RoleEntitlement,
  UpdateEmployeeEntitlementInput,
  UpdateLeaveRequestInput,
  UpdateRoleEntitlementInput,
} from '../types/leave.types';

type Query = Record<string, string | number | boolean | undefined | null>;

interface Envelope {
  success?: boolean;
  status?: boolean;
  data?: unknown;
  pagination?: { page?: number; total?: number; totalPages?: number };
  [key: string]: unknown;
}

function clean(query: Query | undefined): Record<string, string | number | boolean> | undefined {
  if (!query) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

function ok(res: Envelope | null): res is Envelope {
  return !!res && (res.success === true || res.status === true);
}

function paginated<T>(res: Envelope | null): Paginated<T> | null {
  if (!ok(res)) return null;
  return {
    rows: (res.data as T[]) ?? [],
    total: res.pagination?.total ?? 0,
    page: res.pagination?.page ?? 1,
    totalPages: res.pagination?.totalPages ?? 1,
  };
}

/**
 * Typed client for /api/leave. Reads are silent (screens show their own empty
 * state); writes toast the server's success or error message.
 */
export const useLeave = () => {
  const { fetchData } = useFetch();

  const get = useCallback(
    async <T,>(endpoint: string, query?: Query): Promise<T | null> => {
      const res = (await fetchData({ endpoint, method: 'GET', data: clean(query), silent: true })) as Envelope | null;
      return ok(res) ? (res.data as T) : null;
    },
    [fetchData],
  );

  const list = useCallback(
    async <T,>(endpoint: string, query?: Query): Promise<Paginated<T> | null> =>
      paginated<T>((await fetchData({ endpoint, method: 'GET', data: clean(query), silent: true })) as Envelope | null),
    [fetchData],
  );

  const send = useCallback(
    async <T,>(
      endpoint: string,
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      data?: unknown,
      options: { silent?: boolean; successMessage?: string } = {},
    ): Promise<T | null> => {
      const res = (await fetchData({ endpoint, method, data, ...options })) as Envelope | null;
      return ok(res) ? (res.data as T) : null;
    },
    [fetchData],
  );

  // Self-service
  const getMeta = useCallback(() => get<LeaveMeta>('/leave/meta'), [get]);
  const getMyOverview = useCallback((leaveYear?: number) => get<MyLeaveOverview>('/leave/me/overview', { leaveYear }), [get]);
  const getMyRequests = useCallback(
    (query: { status?: string; leaveYear?: number; page?: number; limit?: number }) =>
      list<LeaveRequest>('/leave/me/requests', query),
    [list],
  );
  const getMyLedger = useCallback(
    (query: { leaveYear?: number; page?: number; limit?: number }) => list<LeaveLedgerEntry>('/leave/me/ledger', query),
    [list],
  );

  // Requests
  const preview = useCallback(
    (input: LeavePreviewInput) => send<LeavePreview>('/leave/preview', 'POST', input, { silent: true }),
    [send],
  );
  const uploadAttachment = useCallback(
    async (file: File): Promise<LeaveAttachment | null> => {
      const res = (await fetchData({ endpoint: '/leave/attachments', method: 'POST', file, silent: true })) as Envelope | null;
      return ok(res) ? (res.data as LeaveAttachment) : null;
    },
    [fetchData],
  );
  const createRequest = useCallback(
    (input: CreateLeaveRequestInput) => send<LeaveRequestDetail>('/leave/requests', 'POST', input),
    [send],
  );
  const updateRequest = useCallback(
    (id: string, input: UpdateLeaveRequestInput) => send<LeaveRequestDetail>(`/leave/requests/${id}`, 'PATCH', input),
    [send],
  );
  const submitRequest = useCallback((id: string) => send<LeaveRequestDetail>(`/leave/requests/${id}/submit`, 'POST', {}), [send]);
  const approveRequest = useCallback(
    (id: string, comment?: string) => send<LeaveRequestDetail>(`/leave/requests/${id}/approve`, 'POST', { comment: comment || null }),
    [send],
  );
  const rejectRequest = useCallback(
    (id: string, reason: string) => send<LeaveRequestDetail>(`/leave/requests/${id}/reject`, 'POST', { reason }),
    [send],
  );
  const confirmRequest = useCallback(
    (id: string, comment?: string) => send<LeaveRequestDetail>(`/leave/requests/${id}/confirm`, 'POST', { comment: comment || null }),
    [send],
  );
  const cancelRequest = useCallback(
    (id: string, reason?: string) => send<LeaveRequestDetail>(`/leave/requests/${id}/cancel`, 'POST', { reason: reason || null }),
    [send],
  );
  const getRequest = useCallback((id: string) => get<LeaveRequestDetail>(`/leave/requests/${id}`), [get]);
  const listRequests = useCallback(
    (query: Query) => list<LeaveRequestRow>('/leave/requests', query),
    [list],
  );
  const getCalendar = useCallback(
    (query: LeaveCalendarQuery) =>
      get<LeaveCalendarData>('/leave/calendar', {
        ...query,
        includePending: query.includePending === undefined ? undefined : String(query.includePending),
      }),
    [get],
  );

  // Configuration
  const getSettings = useCallback(() => get<LeaveSettings>('/leave/settings'), [get]);
  const updateSettings = useCallback((input: LeaveSettingsInput) => send<LeaveSettings>('/leave/settings', 'PUT', input), [send]);
  const listTypes = useCallback(
    (includeInactive = false) => get<LeaveType[]>('/leave/types', { includeInactive: includeInactive ? 'true' : undefined }),
    [get],
  );
  const createType = useCallback((input: CreateLeaveTypeInput) => send<LeaveType>('/leave/types', 'POST', input), [send]);
  const updateType = useCallback(
    (id: string, input: Partial<LeaveTypeInput>) => send<LeaveType>(`/leave/types/${id}`, 'PATCH', input),
    [send],
  );
  const listHolidays = useCallback(
    (query: { from?: string; to?: string; includeInactive?: boolean } = {}) =>
      get<LeaveHoliday[]>('/leave/holidays', { ...query, includeInactive: query.includeInactive ? 'true' : undefined }),
    [get],
  );
  const createHoliday = useCallback(
    (input: { holidayDate: string; name: string; locationId?: string | null }) =>
      send<LeaveHoliday>('/leave/holidays', 'POST', input),
    [send],
  );
  const removeHoliday = useCallback((id: string) => send<{ id: string }>(`/leave/holidays/${id}`, 'DELETE'), [send]);
  const listRoles = useCallback(() => get<LeaveRole[]>('/leave/roles'), [get]);
  const lookupEmployees = useCallback(
    (query: { search?: string; locationId?: string; includeInactive?: boolean; limit?: number } = {}) =>
      get<LeaveEmployee[]>('/leave/employees', { ...query, includeInactive: query.includeInactive ? 'true' : undefined }),
    [get],
  );

  // Entitlements
  const listRoleEntitlements = useCallback(
    (query: { leaveTypeId?: string; roleId?: string; includeInactive?: boolean } = {}) =>
      get<RoleEntitlement[]>('/leave/entitlements/roles', { ...query, includeInactive: query.includeInactive ? 'true' : undefined }),
    [get],
  );
  const createRoleEntitlement = useCallback(
    (input: CreateRoleEntitlementInput) => send<RoleEntitlement>('/leave/entitlements/roles', 'POST', input),
    [send],
  );
  const updateRoleEntitlement = useCallback(
    (id: string, input: UpdateRoleEntitlementInput) => send<RoleEntitlement>(`/leave/entitlements/roles/${id}`, 'PATCH', input),
    [send],
  );
  const listEmployeeEntitlements = useCallback(
    (query: { leaveTypeId?: string; userId?: string; includeInactive?: boolean } = {}) =>
      get<EmployeeEntitlement[]>('/leave/entitlements/employees', {
        ...query,
        includeInactive: query.includeInactive ? 'true' : undefined,
      }),
    [get],
  );
  const createEmployeeEntitlement = useCallback(
    (input: CreateEmployeeEntitlementInput) => send<EmployeeEntitlement>('/leave/entitlements/employees', 'POST', input),
    [send],
  );
  const updateEmployeeEntitlement = useCallback(
    (id: string, input: UpdateEmployeeEntitlementInput) =>
      send<EmployeeEntitlement>(`/leave/entitlements/employees/${id}`, 'PATCH', input),
    [send],
  );

  // Balances
  const listBalances = useCallback(
    async (query: Query): Promise<(Paginated<BalanceListRow> & { leaveYear: number; types: LeaveType[] }) | null> => {
      const res = (await fetchData({ endpoint: '/leave/balances', method: 'GET', data: clean(query), silent: true })) as Envelope | null;
      const page = paginated<BalanceListRow>(res);
      if (!page || !res) return null;
      return { ...page, leaveYear: Number(res.leaveYear), types: (res.types as LeaveType[]) ?? [] };
    },
    [fetchData],
  );
  const getEmployeeBalance = useCallback(
    (userId: string, leaveYear?: number) =>
      get<{ employee: LeaveEmployee; balances: LeaveBalance[]; leaveYear: number }>(`/leave/balances/${userId}`, { leaveYear }),
    [get],
  );
  const listLedger = useCallback((query: Query) => list<LeaveLedgerEntry>('/leave/ledger', query), [list]);
  const createAdjustment = useCallback(
    (input: CreateAdjustmentInput) => send<LeaveBalance>('/leave/adjustments', 'POST', input),
    [send],
  );
  const carryForward = useCallback(
    (fromLeaveYear: number, dryRun: boolean) =>
      send<CarryForwardResult>('/leave/carry-forward', 'POST', { fromLeaveYear, dryRun }, { silent: dryRun }),
    [send],
  );

  // Dashboard, reports, attendance
  const getDashboard = useCallback((leaveYear?: number) => get<LeaveDashboard>('/leave/dashboard', { leaveYear }), [get]);
  const getReport = useCallback((query: LeaveReportQuery) => get<LeaveReport>('/leave/reports', { ...query }), [get]);
  const getDailyAttendanceStatus = useCallback(
    (query: { date?: string; locationId?: string }) => get<DailyAttendanceStatus>('/attendance/daily-status', query),
    [get],
  );

  return useMemo(
    () => ({
      getMeta,
      getMyOverview,
      getMyRequests,
      getMyLedger,
      preview,
      uploadAttachment,
      createRequest,
      updateRequest,
      submitRequest,
      approveRequest,
      rejectRequest,
      confirmRequest,
      cancelRequest,
      getRequest,
      listRequests,
      getCalendar,
      getSettings,
      updateSettings,
      listTypes,
      createType,
      updateType,
      listHolidays,
      createHoliday,
      removeHoliday,
      listRoles,
      lookupEmployees,
      listRoleEntitlements,
      createRoleEntitlement,
      updateRoleEntitlement,
      listEmployeeEntitlements,
      createEmployeeEntitlement,
      updateEmployeeEntitlement,
      listBalances,
      getEmployeeBalance,
      listLedger,
      createAdjustment,
      carryForward,
      getDashboard,
      getReport,
      getDailyAttendanceStatus,
    }),
    [
      getMeta,
      getMyOverview,
      getMyRequests,
      getMyLedger,
      preview,
      uploadAttachment,
      createRequest,
      updateRequest,
      submitRequest,
      approveRequest,
      rejectRequest,
      confirmRequest,
      cancelRequest,
      getRequest,
      listRequests,
      getCalendar,
      getSettings,
      updateSettings,
      listTypes,
      createType,
      updateType,
      listHolidays,
      createHoliday,
      removeHoliday,
      listRoles,
      lookupEmployees,
      listRoleEntitlements,
      createRoleEntitlement,
      updateRoleEntitlement,
      listEmployeeEntitlements,
      createEmployeeEntitlement,
      updateEmployeeEntitlement,
      listBalances,
      getEmployeeBalance,
      listLedger,
      createAdjustment,
      carryForward,
      getDashboard,
      getReport,
      getDailyAttendanceStatus,
    ],
  );
};

export type LeaveApi = ReturnType<typeof useLeave>;

export default useLeave;
