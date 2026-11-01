import type { LeaveApi } from '@/hooks/useLeave';
import type { LeaveEmployee, LeaveMeta, LeaveRole, LeaveType } from '@/types/leave.types';

export interface LeaveBranch {
  id: string;
  name: string;
}

export interface LeaveAdminShared {
  api: LeaveApi;
  meta: LeaveMeta;
  /** Active leave types. */
  types: LeaveType[];
  /** Including deactivated types (for history and configuration). */
  allTypes: LeaveType[];
  roles: LeaveRole[];
  employees: LeaveEmployee[];
  branches: LeaveBranch[];
  reloadTypes: () => void;
  openRequest: (id: string) => void;
}

export const ALL = 'all';

export function fromSelect(value: string): string | undefined {
  return value === ALL ? undefined : value;
}

export function nullableNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
