import { Calendar } from 'lucide-react';
import { DASHBOARD_PERIODS } from '../../utils/dashboardPeriod';

interface DashboardPeriodSelectorProps {
  period: string;
  onPeriodChange: (period: string) => void;
  customStartDate: string;
  onCustomStartDateChange: (date: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (date: string) => void;
  className?: string;
}

export default function DashboardPeriodSelector({
  period,
  onPeriodChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  className = '',
}: DashboardPeriodSelectorProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mr-1">
        <Calendar className="w-4 h-4" />
        <span className="hidden sm:inline">Period</span>
      </div>
      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white"
      >
        {DASHBOARD_PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      {period === 'custom' && (
        <>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => onCustomStartDateChange(e.target.value)}
            className="h-9 px-2 rounded-lg border border-gray-300 text-sm"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => onCustomEndDateChange(e.target.value)}
            className="h-9 px-2 rounded-lg border border-gray-300 text-sm"
          />
        </>
      )}
    </div>
  );
}
