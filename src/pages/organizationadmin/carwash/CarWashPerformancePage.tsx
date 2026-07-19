/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCarWash } from '../../../hooks/useCarWash';

/** Staff wash performance & commission calculator. */
export default function CarWashPerformancePage() {
  const { getStaffPerformance } = useCarWash();
  const [performance, setPerformance] = useState<any>(null);
  const [perfCommission, setPerfCommission] = useState('10');

  const loadPerformance = useCallback(async (commissionPercent?: string) => {
    const res = await getStaffPerformance({ commissionPercent: commissionPercent ?? perfCommission });
    setPerformance(res?.data ?? null);
  }, [getStaffPerformance, perfCommission]);

  useEffect(() => {
    loadPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <Label>Commission %</Label>
          <Input type="number" className="w-28" value={perfCommission} onChange={(e) => setPerfCommission(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => loadPerformance(perfCommission)}>
          <RefreshCw className="w-4 h-4 mr-1" /> Recalculate
        </Button>
        {performance && (
          <span className="text-sm text-muted-foreground pb-2">
            {performance.from} → {performance.to} | {performance.totalJobs} completed washes
          </span>
        )}
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Staff</th><th className="p-3">Washes</th>
              <th className="p-3">Revenue</th><th className="p-3">Commission ({performance?.commissionPercent ?? perfCommission}%)</th>
            </tr>
          </thead>
          <tbody>
            {(performance?.staff ?? []).map((s: any) => (
              <tr key={s.staff?.id} className="border-t">
                <td className="p-3 font-medium">{s.staff?.staffId || s.staff?.id}</td>
                <td className="p-3">{s.jobCount}</td>
                <td className="p-3">Rs {Number(s.revenue).toLocaleString()}</td>
                <td className="p-3 font-semibold">Rs {Number(s.commission).toLocaleString()}</td>
              </tr>
            ))}
            {(!performance || performance.staff?.length === 0) && (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No completed washes with assigned staff in this period</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
