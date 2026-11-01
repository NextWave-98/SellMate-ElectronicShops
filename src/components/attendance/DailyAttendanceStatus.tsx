import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarOff, CheckCircle, Clock, Plane, RefreshCw, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterSelect, StatCard } from '@/components/leave/admin/widgets';
import { ALL, fromSelect, type LeaveBranch } from '@/components/leave/admin/shared';
import { formatDate, formatDays, localTodayIso } from '@/components/leave/leaveFormat';
import { useLeave } from '@/hooks/useLeave';
import type { AttendanceDayStatus, DailyAttendanceStatus as DailyStatusData } from '@/types/leave.types';

const STATUS_LABEL: Record<AttendanceDayStatus, string> = {
  PRESENT: 'Present',
  CHECKED_IN: 'Checked in',
  ON_LEAVE: 'On leave',
  HALF_DAY_LEAVE: 'Half-day leave',
  HOLIDAY: 'Holiday',
  NON_WORKING_DAY: 'Non-working day',
  NOT_CHECKED_IN: 'Not checked in',
  ABSENT: 'Absent',
  UPCOMING: 'Upcoming',
};

const STATUS_CLASS: Record<AttendanceDayStatus, string> = {
  PRESENT: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  ON_LEAVE: 'bg-emerald-100 text-emerald-800',
  HALF_DAY_LEAVE: 'bg-teal-100 text-teal-800',
  HOLIDAY: 'bg-purple-100 text-purple-800',
  NON_WORKING_DAY: 'bg-gray-100 text-gray-700',
  NOT_CHECKED_IN: 'bg-amber-100 text-amber-800',
  ABSENT: 'bg-red-100 text-red-800',
  UPCOMING: 'bg-slate-100 text-slate-700',
};

const STATUS_FILTER: AttendanceDayStatus[] = [
  'PRESENT', 'CHECKED_IN', 'ON_LEAVE', 'HALF_DAY_LEAVE', 'NOT_CHECKED_IN', 'ABSENT', 'HOLIDAY', 'NON_WORKING_DAY', 'UPCOMING',
];

function formatTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Read-only daily roster: attendance logs combined with confirmed leave and holidays. */
export function DailyAttendanceStatus() {
  const api = useLeave();
  const [date, setDate] = useState(localTodayIso());
  const [branch, setBranch] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<DailyStatusData | null>(null);
  const [branches, setBranches] = useState<LeaveBranch[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await api.getDailyAttendanceStatus({ date, locationId: fromSelect(branch) });
    setData(result);
    if (result && branch === ALL) {
      const map = new Map<string, string>();
      for (const r of result.rows) if (r.locationId && r.locationName) map.set(r.locationId, r.locationName);
      setBranches([...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setLoading(false);
  }, [api, date, branch]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) =>
      (status === ALL || r.status === status)
      && (!q || r.name.toLowerCase().includes(q) || (r.roleName ?? '').toLowerCase().includes(q)));
  }, [data, search, status]);

  const summary = data?.summary;
  const present = summary ? summary.PRESENT + summary.CHECKED_IN : 0;
  const onLeave = summary ? summary.ON_LEAVE + summary.HALF_DAY_LEAVE : 0;
  const missing = summary ? summary.NOT_CHECKED_IN + summary.ABSENT : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Date</Label>
              <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
            <FilterSelect label="Branch" value={branch} onChange={setBranch} options={branches.map((b) => ({ value: b.id, label: b.name }))} allLabel="All branches" />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} allLabel="All statuses" />
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Search</Label>
              <div className="flex gap-2">
                <Input placeholder="Name or role" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (!data.isWorkingDay || data.holidayName) && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="py-3 flex items-center gap-2 text-sm text-purple-800">
            <CalendarOff className="h-4 w-4" />
            {formatDate(data.date)} is {data.holidayName ? `a holiday (${data.holidayName})` : 'not a working day'}.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Present" value={present} icon={<CheckCircle className="h-7 w-7" />} tone="text-green-600" />
        <StatCard label="On leave" value={onLeave} icon={<Plane className="h-7 w-7" />} tone="text-emerald-600" />
        <StatCard label="Not checked in / absent" value={missing} icon={<UserX className="h-7 w-7" />} tone="text-red-500" />
        <StatCard label="Staff" value={data?.rows.length ?? 0} icon={<Clock className="h-7 w-7" />} tone="text-blue-500" />
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Leave</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No staff match these filters.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell>
                    <p className="font-medium">{r.name}</p>
                    {r.roleName && <p className="text-xs text-gray-500">{r.roleName}</p>}
                  </TableCell>
                  <TableCell>{r.locationName ?? '—'}</TableCell>
                  <TableCell><Badge className={STATUS_CLASS[r.status]}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                  <TableCell>{formatTime(r.dayInTime)}</TableCell>
                  <TableCell>{formatTime(r.dayOffTime)}</TableCell>
                  <TableCell>
                    {r.leaveTypeName ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.leaveColor ?? '#10b981' }} />
                        {r.leaveTypeName} · {formatDays(r.leaveValue)}
                      </span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
