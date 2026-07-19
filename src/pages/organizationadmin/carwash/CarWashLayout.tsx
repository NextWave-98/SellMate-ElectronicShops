/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Droplets, ListChecks, CreditCard, RefreshCw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCarWash } from '../../../hooks/useCarWash';
import type { CarWashOutletContext } from './shared';

const navItems = [
  { to: '.', end: true, label: 'Queue', icon: ListChecks },
  { to: 'services', end: false, label: 'Services', icon: Droplets },
  { to: 'memberships', end: false, label: 'Memberships', icon: CreditCard },
  { to: 'performance', end: false, label: 'Staff Performance', icon: Users },
];

/** Shared shell for all Car Wash sub-pages: header + stats + plate lookup + sub-nav. */
export default function CarWashLayout() {
  const carwash = useCarWash();
  const { getStats } = carwash;
  const [stats, setStats] = useState<any>(null);
  const [plateQuery, setPlateQuery] = useState('');
  const [plateResult, setPlateResult] = useState<any>(null);

  const refreshStats = useCallback(async () => {
    const res = await getStats();
    setStats(res?.data ?? null);
  }, [getStats]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const doPlateLookup = async () => {
    if (!plateQuery.trim()) return;
    const res = await carwash.lookupPlate(plateQuery.trim());
    setPlateResult(res?.data ?? null);
  };

  const context: CarWashOutletContext = { refreshStats, stats };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Droplets className="w-6 h-6" /> Car Wash</h1>
          <p className="text-sm text-muted-foreground">Queue, services, packages & memberships</p>
        </div>
        <Button variant="outline" onClick={refreshStats}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Today's Jobs", value: stats?.todayJobs ?? 0 },
          { label: 'Waiting', value: stats?.waiting ?? 0 },
          { label: 'In Progress', value: stats?.inProgress ?? 0 },
          { label: 'Ready', value: stats?.ready ?? 0 },
          { label: "Today's Revenue", value: `Rs ${Number(stats?.todayRevenue ?? 0).toLocaleString()}` },
          { label: 'Active Members', value: stats?.activeMemberships ?? 0 },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Plate lookup */}
      <Card><CardContent className="p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-xs">
            <Label>Number Plate Lookup</Label>
            <Input placeholder="e.g. CAB-1234" value={plateQuery} onChange={(e) => setPlateQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doPlateLookup()} />
          </div>
          <Button onClick={doPlateLookup}><Search className="w-4 h-4 mr-1" /> Lookup</Button>
        </div>
        {plateResult && (
          <div className="mt-3 text-sm">
            <p className="font-semibold">{plateResult.plate}</p>
            <p>Active memberships: {plateResult.activeMemberships?.length ?? 0}
              {plateResult.activeMemberships?.map((m: any) => ` — ${m.plan?.name} (${m.remainingWashes ?? '∞'} left, ${m.customer?.name})`)}
            </p>
            <p>Recent visits: {plateResult.recentJobs?.length ?? 0}</p>
          </div>
        )}
      </CardContent></Card>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {navItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary bg-muted/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`
            }
          >
            <Icon className="w-4 h-4" /> {label}
          </NavLink>
        ))}
      </div>

      <Outlet context={context} />
    </div>
  );
}
