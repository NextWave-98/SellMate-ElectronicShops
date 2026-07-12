import { Calendar } from 'lucide-react';

interface PeriodSelectorProps {
  period: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
  onPeriodChange: (period: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom') => void;
  customDateRange: { start: string; end: string };
  onCustomDateChange: (range: { start: string; end: string }) => void;
}

export default function PeriodSelector({
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-600" />
        <select
          value={period}
          onChange={(e) => {
            const value = e.target.value as 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
            onPeriodChange(value);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customDateRange.start}
            onChange={(e) =>
              onCustomDateChange({ ...customDateRange, start: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={customDateRange.end}
            onChange={(e) =>
              onCustomDateChange({ ...customDateRange, end: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
      )}
    </div>
  );
}
