/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import activityMonitoringService from '../../services/activityMonitoringService';
import type { ActivityDailyRow } from '../../services/activityMonitoringService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import alert from '../../utils/alert';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const MyActivityPage: React.FC = () => {
  const [from, setFrom] = useState(daysAgo(13));
  const [to, setTo] = useState(daysAgo(0));
  const [rows, setRows] = useState<ActivityDailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await activityMonitoringService.myDaily(from, to);
      setRows(res.data || []);
    } catch (err: any) {
      alert.error(err?.message || 'Failed to load your activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-orange-600" />
          My Activity
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your active vs idle minutes while logged into SellMate.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-2 justify-between">
            <div>
              <CardTitle className="text-base">Daily breakdown</CardTitle>
              <CardDescription>Transparent view of your own tracked time</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
              <Button variant="outline" size="icon" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Idle</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Longest idle</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No activity in this range (monitoring may be off)
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.activityDate} className="border-t">
                    <td className="px-3 py-2">{row.activityDate}</td>
                    <td className="px-3 py-2">{row.activeMinutes}m</td>
                    <td className="px-3 py-2">{row.idleMinutes}m</td>
                    <td className="px-3 py-2">{row.sessionMinutes}m</td>
                    <td className="px-3 py-2">{row.longestIdleStreakMinutes}m</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyActivityPage;
