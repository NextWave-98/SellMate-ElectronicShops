import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Hourglass, Plane, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveCalendarEntry, LeaveDashboard } from '@/types/leave.types';
import { LeaveStatusBadge } from '../LeaveStatusBadge';
import { formatDays, formatNumber, formatRange, MONTH_NAMES } from '../leaveFormat';
import type { LeaveAdminShared } from './shared';
import { StatCard } from './widgets';

export function LeaveOverviewTab({ shared, leaveYear }: { shared: LeaveAdminShared; leaveYear: number }) {
  const { api, openRequest } = shared;
  const [data, setData] = useState<LeaveDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.getDashboard(leaveYear).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [api, leaveYear]);

  if (!data) return <p className="py-10 text-center text-sm text-gray-400">Loading…</p>;

  const months = data.byMonth.map((m) => ({ name: MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]?.slice(0, 3) ?? m.month, days: m.days }));

  const list = (title: string, rows: LeaveCalendarEntry[], empty: string) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : rows.map((r) => (
          <button key={r.id} type="button" onClick={() => openRequest(r.id)} className="flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left hover:bg-gray-50">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.employeeName}</p>
              <p className="text-xs text-gray-500">
                <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: r.color }} />
                {r.leaveTypeName} · {formatRange(r.startDate, r.endDate)} · {formatDays(r.totalDays)}
              </p>
            </div>
            <LeaveStatusBadge status={r.status} />
          </button>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="On leave today" value={data.cards.onLeaveToday} icon={<Plane className="h-7 w-7" />} tone="text-green-600" />
        <StatCard label="Pending approval" value={data.cards.pendingApprovals} icon={<Hourglass className="h-7 w-7" />} tone="text-amber-500" />
        <StatCard label="Awaiting confirmation" value={data.cards.awaitingConfirmation} icon={<Clock className="h-7 w-7" />} tone="text-sky-500" />
        <StatCard label="Starting this week" value={data.cards.upcomingWeek} icon={<CalendarClock className="h-7 w-7" />} tone="text-violet-500" />
        <StatCard label={`Days taken (${data.leaveYearLabel})`} value={formatNumber(data.cards.daysTakenThisYear)} icon={<CheckCircle2 className="h-7 w-7" />} tone="text-emerald-600" />
        <StatCard label="Employees" value={data.cards.employees} icon={<Users className="h-7 w-7" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Confirmed leave days by month</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals fontSize={12} width={32} />
                <Tooltip />
                <Bar dataKey="days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By leave type</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data.byType.length === 0 ? (
              <p className="text-sm text-gray-500">No confirmed leave yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byType} dataKey="days" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {data.byType.map((t) => <Cell key={t.leaveTypeId} fill={t.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list('On leave today', data.todayList, 'Nobody is on leave today.')}
        {list('Coming up', data.upcomingList, 'No upcoming leave.')}
      </div>
    </div>
  );
}

export default LeaveOverviewTab;
