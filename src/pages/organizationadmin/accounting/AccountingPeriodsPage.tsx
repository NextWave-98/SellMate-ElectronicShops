/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccounting } from '../../../hooks/useAccounting';
import { todayISO, monthStart } from './shared';

/** Open / close accounting periods; optional year-end P&L close into retained earnings. */
export default function AccountingPeriodsPage() {
  const { listPeriods, createPeriod, closePeriod, reopenPeriod } = useAccounting();
  const [periods, setPeriods] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(todayISO());
  const [closeBooks, setCloseBooks] = useState(false);

  const load = useCallback(async () => {
    const res = await listPeriods();
    setPeriods((res?.data as any) ?? []);
  }, [listPeriods]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const res = await createPeriod({ startDate, endDate });
    if (res?.success || res?.status) load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Start</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input id="closeBooksHint" type="checkbox" checked={closeBooks} onChange={(e) => setCloseBooks(e.target.checked)} />
            <Label htmlFor="closeBooksHint" className="text-xs font-normal text-muted-foreground">
              When closing, also post P&amp;L → Retained Earnings
            </Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={create}><Plus className="w-4 h-4 mr-1" /> Create period</Button>
            <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Status</th>
                <th className="p-3">Closed</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.startDate}</td>
                  <td className="p-3">{p.endDate}</td>
                  <td className="p-3">
                    <Badge variant={p.status === 'CLOSED' ? 'outline' : 'default'} className="text-[10px]">
                      {p.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {p.closedAt ? new Date(p.closedAt).toLocaleString() : '—'}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {p.status === 'OPEN' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!window.confirm(`Close period ${p.startDate} → ${p.endDate}? Journals in this range will be blocked.`)) return;
                          await closePeriod(p.id, closeBooks);
                          load();
                        }}
                      >
                        <Lock className="w-3.5 h-3.5 mr-1" /> Close
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await reopenPeriod(p.id);
                          load();
                        }}
                      >
                        <Unlock className="w-3.5 h-3.5 mr-1" /> Reopen
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No periods yet. Create a monthly range to start.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
