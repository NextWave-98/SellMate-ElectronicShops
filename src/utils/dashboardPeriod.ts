export const DASHBOARD_PERIODS = [
  { label: 'This Month', value: 'month' },
  { label: 'Today', value: 'today' },
  { label: 'Custom', value: 'custom' },
] as const;

export type DashboardPeriodValue = (typeof DASHBOARD_PERIODS)[number]['value'];

export function getDashboardPeriodLabel(period: string): string {
  return DASHBOARD_PERIODS.find((p) => p.value === period)?.label ?? 'Period';
}

export function getSalesPeriodLabel(period: string): string {
  switch (period) {
    case 'today':
      return "Today's";
    case 'month':
      return "This Month's";
    case 'custom':
      return 'Period';
    default:
      return 'Period';
  }
}

export interface DashboardPeriodFilters {
  period?: string;
  startDate?: string;
  endDate?: string;
}

export function buildPeriodFilters(
  period: string,
  customStartDate: string,
  customEndDate: string,
): DashboardPeriodFilters {
  if (period === 'custom') {
    return {
      period: 'custom',
      startDate: customStartDate || undefined,
      endDate: customEndDate || undefined,
    };
  }
  return { period };
}
