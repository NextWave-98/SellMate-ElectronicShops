/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, AlertTriangle, CalendarClock } from 'lucide-react';

/**
 * The follow-up inbox, on the dashboard.
 *
 * The numbers already existed on /crm/tasks/stats; nothing on the dashboard
 * asked for them, so the one place a shop owner looks every morning said
 * nothing about what they had promised customers.
 *
 * Renders nothing at all when the endpoint refuses   an organization without
 * the CRM module, or a user without the permission, should see no empty
 * widget wondering why it is blank.
 */
export default function CrmTasksWidget({
  getStats,
  to = '/superadmin/crm-tasks',
}: {
  getStats: (filters?: Record<string, any>) => Promise<any>;
  to?: string;
}) {
  const [stats, setStats] = useState<{ open: number; overdue: number; dueToday: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getStats();
        if (!cancelled && res?.data) setStats(res.data);
      } catch {
        /* no module, or no permission   stay invisible */
      }
    })();
    return () => { cancelled = true; };
  }, [getStats]);

  if (!stats) return null;

  const cards = [
    { key: 'open', label: 'Open tasks', value: stats.open ?? 0, icon: ListChecks, tone: 'text-gray-900' },
    { key: 'today', label: 'Due today', value: stats.dueToday ?? 0, icon: CalendarClock, tone: 'text-amber-700' },
    { key: 'overdue', label: 'Overdue', value: stats.overdue ?? 0, icon: AlertTriangle, tone: stats.overdue > 0 ? 'text-red-600' : 'text-gray-900' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-gray-800 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-orange-500" /> Follow-ups
        </p>
        <Link to={to} className="text-xs font-medium text-orange-600 hover:underline">
          Open inbox
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.key}>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <c.icon className="w-3 h-3" /> {c.label}
            </p>
            <p className={`text-2xl font-bold ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>
      {stats.overdue > 0 && (
        <p className="text-xs text-red-600 mt-2">
          {stats.overdue} customer{stats.overdue === 1 ? '' : 's'} {stats.overdue === 1 ? 'is' : 'are'} waiting past the date you promised.
        </p>
      )}
    </div>
  );
}
