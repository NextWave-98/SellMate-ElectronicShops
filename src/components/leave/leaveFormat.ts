import type {
  LeaveBalance,
  LeaveCancellationPolicy,
  LeaveDayPart,
  LeaveEntitlementSource,
  LeaveLedgerEntryType,
  LeaveRequestStatus,
} from '@/types/leave.types';

export const STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  WITHDRAWN: 'Withdrawn',
};

export const STATUS_CLASS: Record<LeaveRequestStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-sky-100 text-sky-800 border-sky-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  WITHDRAWN: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const DAY_PART_LABEL: Record<LeaveDayPart, string> = {
  FULL_DAY: 'Full day',
  FIRST_HALF: 'Half day (morning)',
  SECOND_HALF: 'Half day (afternoon)',
};

export const LEDGER_LABEL: Record<LeaveLedgerEntryType, string> = {
  CARRY_FORWARD: 'Carried forward',
  ADJUSTMENT: 'Adjustment',
  DEDUCTION: 'Leave taken',
  RESTORATION: 'Restored',
};

export const SOURCE_LABEL: Record<LeaveEntitlementSource, string> = {
  EMPLOYEE: 'Employee override',
  ROLE: 'Role entitlement',
  ORGANIZATION: 'Organization default',
  SYSTEM_DEFAULT: 'System default',
  NONE: 'Not entitled',
};

export const CANCELLATION_POLICY_LABEL: Record<LeaveCancellationPolicy, string> = {
  NEVER: 'Employees cannot cancel; only administrators',
  BEFORE_APPROVAL: 'Until the request is approved',
  BEFORE_CONFIRMATION: 'Until the request is confirmed',
  BEFORE_START: 'Until the leave starts',
};

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} day${rounded === 1 ? '' : 's'}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return String(Math.round(value * 100) / 100);
}

function parseIso(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return parseIso(date.slice(0, 10)).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
}

export function addDaysIso(date: string, days: number): string {
  const d = parseIso(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOfIso(date: string): number {
  return parseIso(date).getUTCDay();
}

export function startOfMonthIso(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonthIso(date: string): string {
  const d = parseIso(startOfMonthIso(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export function addMonthsIso(date: string, months: number): string {
  const d = parseIso(startOfMonthIso(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function monthLabel(date: string): string {
  return `${MONTH_NAMES[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/** Local calendar day as YYYY-MM-DD  only a fallback until the server's "today" is known. */
export function localTodayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function balanceAvailableLabel(balance: LeaveBalance): string {
  if (balance.isUnlimited) return 'Unlimited';
  return formatNumber(balance.availableAfterPending ?? balance.available);
}

export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null>>): void {
  const escape = (value: string | number | null) => {
    const text = value === null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
