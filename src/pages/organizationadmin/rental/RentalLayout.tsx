/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Car, CalendarDays, Wrench, RefreshCw, AlertTriangle, Fuel, ShieldAlert, Tags, LayoutDashboard, IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRental } from '../../../hooks/useRental';
import type { RentalOutletContext } from './shared';

const navItems = [
  { to: '.', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: 'fleet', end: false, label: 'Fleet', icon: Car },
  { to: 'bookings', end: false, label: 'Bookings', icon: CalendarDays },
  { to: 'maintenance', end: false, label: 'Maintenance', icon: Wrench },
  { to: 'fuel', end: false, label: 'Fuel Logs', icon: Fuel },
  { to: 'claims', end: false, label: 'Claims', icon: ShieldAlert },
  { to: 'pricing', end: false, label: 'Pricing', icon: Tags },
  { to: 'licenses', end: false, label: 'Licenses', icon: IdCard },
];

/** Shared shell for all Vehicle Rental sub-pages: header + stats strip + sub-nav. */
export default function RentalLayout() {
  const { getStats } = useRental();
  const [stats, setStats] = useState<any>(null);

  const refreshStats = useCallback(async () => {
    const res = await getStats();
    setStats(res?.data ?? null);
  }, [getStats]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const context: RentalOutletContext = { refreshStats, stats };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Car className="w-6 h-6" /> Vehicle Rental</h1>
          <p className="text-sm text-muted-foreground">Fleet, bookings, agreements & maintenance</p>
        </div>
        <Button variant="outline" onClick={refreshStats}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Fleet', value: stats?.totalVehicles ?? 0 },
          { label: 'Available', value: stats?.available ?? 0 },
          { label: 'Rented', value: stats?.rented ?? 0 },
          { label: 'Maintenance', value: stats?.maintenance ?? 0 },
          { label: 'Active Bookings', value: stats?.activeBookings ?? 0 },
          { label: 'Utilization', value: `${stats?.utilizationPercent ?? 0}%` },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Expiring documents warning */}
      {(stats?.expiringDocuments?.length ?? 0) > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <p className="font-semibold flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4" /> Documents expiring within 30 days
            </p>
            <ul className="text-sm mt-1 text-amber-900">
              {stats.expiringDocuments.map((v: any) => (
                <li key={v.id}>
                  {v.registrationNo} ({v.make} {v.model}) — Insurance: {v.insuranceExpiry || '—'} | License: {v.licenseExpiry || '—'} | Emission: {v.emissionTestExpiry || '—'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
