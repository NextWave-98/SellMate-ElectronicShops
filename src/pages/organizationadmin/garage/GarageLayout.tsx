/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Wrench, Car, FileText, BellRing, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGarage } from '../../../hooks/useGarage';
import type { GarageOutletContext } from './shared';

const navItems = [
  { to: '.', end: true, label: 'Estimates', icon: FileText },
  { to: 'vehicles', end: false, label: 'Customer Vehicles', icon: Car },
  { to: 'reminders', end: false, label: 'Reminders', icon: BellRing },
];

/** Shared shell for all Garage / Workshop sub-pages. */
export default function GarageLayout() {
  const { getStats } = useGarage();
  const [stats, setStats] = useState<any>(null);

  const refreshStats = useCallback(async () => {
    const res = await getStats();
    setStats(res?.data ?? null);
  }, [getStats]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const context: GarageOutletContext = { refreshStats, stats };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="w-6 h-6" /> Garage / Workshop</h1>
          <p className="text-sm text-muted-foreground">Customer vehicles, estimates & service reminders</p>
        </div>
        <Button variant="outline" onClick={refreshStats}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Vehicles', value: stats?.totalVehicles ?? 0 },
          { label: 'Pending Estimates', value: stats?.pendingEstimates ?? 0 },
          { label: 'Approved', value: stats?.approvedEstimates ?? 0 },
          { label: 'Month Approved Value', value: `Rs ${Number(stats?.monthApprovedValue ?? 0).toLocaleString()}` },
          { label: 'Due Reminders', value: stats?.dueReminders ?? 0 },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

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
