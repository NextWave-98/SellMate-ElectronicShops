import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { LeaveApi } from '@/hooks/useLeave';
import type { LeaveCalendarData, LeaveCalendarEntry } from '@/types/leave.types';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import {
  addDaysIso,
  addMonthsIso,
  DAY_PART_LABEL,
  endOfMonthIso,
  formatDate,
  formatDays,
  formatRange,
  monthLabel,
  startOfMonthIso,
  WEEKDAY_SHORT,
  weekdayOfIso,
} from './leaveFormat';

type View = 'month' | 'week' | 'list';

interface LeaveCalendarProps {
  api: LeaveApi;
  today: string;
  filters?: { locationId?: string; userId?: string; leaveTypeId?: string; roleId?: string };
  showEmployee?: boolean;
  onSelect?: (requestId: string) => void;
}

/** Monday on or before the date. */
function weekStart(date: string): string {
  const dow = weekdayOfIso(date);
  return addDaysIso(date, dow === 0 ? -6 : 1 - dow);
}

function rangeFor(view: View, anchor: string): { from: string; to: string } {
  if (view === 'week') {
    const from = weekStart(anchor);
    return { from, to: addDaysIso(from, 6) };
  }
  if (view === 'list') return { from: startOfMonthIso(anchor), to: endOfMonthIso(anchor) };
  const from = weekStart(startOfMonthIso(anchor));
  const lastWeekStart = weekStart(endOfMonthIso(anchor));
  return { from, to: addDaysIso(lastWeekStart, 6) };
}

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

export function LeaveCalendar({ api, today, filters, showEmployee, onSelect }: LeaveCalendarProps) {
  // The 7-column month grid needs ~640px; phones start on the list view instead.
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches ? 'list' : 'month',
  );
  const [anchor, setAnchor] = useState(today);
  const [includePending, setIncludePending] = useState(true);
  const [data, setData] = useState<LeaveCalendarData | null>(null);
  const [loading, setLoading] = useState(false);

  const { from, to } = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const filterKey = JSON.stringify(filters ?? {});

  const load = useCallback(async () => {
    setLoading(true);
    const parsed = JSON.parse(filterKey) as LeaveCalendarProps['filters'];
    setData(await api.getCalendar({ from, to, includePending, ...parsed }));
    setLoading(false);
  }, [api, from, to, includePending, filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, LeaveCalendarEntry[]>();
    for (const entry of data?.entries ?? []) {
      const start = entry.startDate < from ? from : entry.startDate;
      const end = entry.endDate > to ? to : entry.endDate;
      for (const day of daysBetween(start, end)) {
        const list = map.get(day) ?? [];
        list.push(entry);
        map.set(day, list);
      }
    }
    return map;
  }, [data, from, to]);

  const holidays = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of data?.holidays ?? []) map.set(h.date, h.name);
    return map;
  }, [data]);

  const workingDays = new Set(data?.workingDays ?? [1, 2, 3, 4, 5, 6]);
  const move = (dir: number) => setAnchor((a) => (view === 'week' ? addDaysIso(a, dir * 7) : addMonthsIso(a, dir)));
  const title = view === 'week' ? `${formatDate(from)} – ${formatDate(to)}` : monthLabel(anchor);
  const weekdayHeaders = [1, 2, 3, 4, 5, 6, 0].map((d) => WEEKDAY_SHORT[d]);

  const pill = (entry: LeaveCalendarEntry, compact: boolean) => (
    <button
      key={entry.id}
      type="button"
      onClick={() => onSelect?.(entry.id)}
      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] text-white ${entry.status === 'PENDING' ? 'opacity-60 border border-dashed border-white' : ''}`}
      style={{ backgroundColor: entry.color }}
      title={`${entry.employeeName} · ${entry.leaveTypeName} · ${formatRange(entry.startDate, entry.endDate)}${entry.status === 'PENDING' ? ' (pending)' : ''}`}
    >
      {showEmployee ? entry.employeeName : entry.leaveTypeName}
      {!compact && showEmployee ? ` · ${entry.leaveTypeName}` : ''}
      {entry.dayPart !== 'FULL_DAY' ? ' (½)' : ''}
    </button>
  );

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => move(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>Today</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => move(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold ml-1">{title}</h3>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="leave-cal-pending" checked={includePending} onCheckedChange={setIncludePending} />
              <Label htmlFor="leave-cal-pending" className="text-sm">Show pending</Label>
            </div>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} variant="outline" size="sm">
              <ToggleGroupItem value="month">Month</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
              <ToggleGroupItem value="list">List</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {data?.truncated && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
            Showing the first {data.entries.length.toLocaleString()} of {(data.totalEntries ?? data.entries.length).toLocaleString()} leave
            entries in this period. Filter by branch, leave type or employee, or switch to the week view, to see the rest.
          </p>
        )}

        {view === 'list' ? (
          <div className="divide-y rounded-md border">
            {(data?.entries ?? []).length === 0 && <p className="p-6 text-center text-sm text-gray-500">No leave in this period.</p>}
            {(data?.entries ?? []).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect?.(entry.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{showEmployee ? entry.employeeName : entry.leaveTypeName}</p>
                    <p className="text-xs text-gray-500">
                      {showEmployee ? `${entry.leaveTypeName} · ` : ''}
                      {formatRange(entry.startDate, entry.endDate)} · {formatDays(entry.totalDays)}
                      {entry.dayPart !== 'FULL_DAY' ? ` · ${DAY_PART_LABEL[entry.dayPart]}` : ''}
                      {showEmployee && entry.locationName ? ` · ${entry.locationName}` : ''}
                    </p>
                  </div>
                </div>
                <LeaveStatusBadge status={entry.status} />
              </button>
            ))}
            {(data?.holidays ?? []).map((h) => (
              <div key={`${h.date}-${h.name}`} className="flex items-center justify-between p-3 text-sm text-gray-600 bg-gray-50">
                <span>Holiday: {h.name}</span>
                <span>{formatDate(h.date)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[640px] border-l border-t text-xs">
              {weekdayHeaders.map((d) => (
                <div key={d} className="border-r border-b bg-gray-50 px-2 py-1 font-medium text-gray-600">{d}</div>
              ))}
              {daysBetween(from, to).map((day) => {
                const entries = entriesByDay.get(day) ?? [];
                const holiday = holidays.get(day);
                const outside = view === 'month' && day.slice(0, 7) !== anchor.slice(0, 7);
                const nonWorking = !workingDays.has(weekdayOfIso(day));
                const limit = view === 'week' ? entries.length : 3;
                return (
                  <div
                    key={day}
                    className={`border-r border-b p-1 space-y-0.5 ${view === 'week' ? 'min-h-[180px]' : 'min-h-[92px]'} ${outside ? 'bg-gray-50/60 text-gray-400' : ''} ${nonWorking || holiday ? 'bg-slate-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] ${day === today ? 'rounded-full bg-primary px-1.5 text-primary-foreground' : ''}`}>
                        {Number(day.slice(8, 10))}
                      </span>
                      {holiday && <span className="truncate text-[10px] text-rose-600" title={holiday}>{holiday}</span>}
                    </div>
                    {entries.slice(0, limit).map((e) => pill(e, view === 'month'))}
                    {entries.length > limit && (
                      <button type="button" className="text-[10px] text-gray-500 underline" onClick={() => { setAnchor(day); setView('week'); }}>
                        +{entries.length - limit} more
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LeaveCalendar;
