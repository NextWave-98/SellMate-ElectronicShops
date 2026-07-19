/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Car, CalendarDays, Wrench, Fuel, ShieldAlert, Tags, ArrowRight, Plus } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRental } from '../../../hooks/useRental';
import { statusColor, type RentalOutletContext } from './shared';

const quickLinks = [
  { to: 'fleet', label: 'Fleet', desc: 'Vehicles, documents & status', icon: Car },
  { to: 'bookings', label: 'Bookings', desc: 'Reservations, check-out / check-in', icon: CalendarDays },
  { to: 'maintenance', label: 'Maintenance', desc: 'Scheduled services & repairs', icon: Wrench },
  { to: 'fuel', label: 'Fuel Logs', desc: 'Fill-ups & efficiency tracking', icon: Fuel },
  { to: 'claims', label: 'Insurance Claims', desc: 'Accidents & claim status', icon: ShieldAlert },
  { to: 'pricing', label: 'Pricing & Coupons', desc: 'Rate plans, rules, fees, coupons', icon: Tags },
];

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

/** Landing page for the Vehicle Rental vertical: charts + recent activity. */
export default function RentalDashboardPage() {
  const { stats } = useOutletContext<RentalOutletContext>();
  const { getBookings, getMaintenances } = useRental();
  const [bookings, setBookings] = useState<any[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [bookingsRes, maintRes] = await Promise.all([
        getBookings({ limit: 100 }),
        getMaintenances(),
      ]);
      setBookings((bookingsRes?.data as any)?.bookings ?? []);
      const maint = ((maintRes?.data as any) ?? []).filter((m: any) => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
      setUpcomingMaintenance(maint.slice(0, 5));
    })();
  }, [getBookings, getMaintenances]);

  // Last 6 months: bookings count + revenue
  const monthly = useMemo(() => {
    const months: { key: string; label: string; bookings: number; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en', { month: 'short' }),
        bookings: 0,
        revenue: 0,
      });
    }
    for (const b of bookings) {
      if (!b.startAt || b.status === 'CANCELLED') continue;
      const d = new Date(b.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find((x) => x.key === key);
      if (m) { m.bookings += 1; m.revenue += Number(b.totalAmount || 0); }
    }
    return months;
  }, [bookings]);

  const fleetPie = useMemo(() => ([
    { name: 'Available', value: Number(stats?.available ?? 0) },
    { name: 'Rented', value: Number(stats?.rented ?? 0) },
    { name: 'Reserved', value: Math.max(0, Number(stats?.totalVehicles ?? 0) - Number(stats?.available ?? 0) - Number(stats?.rented ?? 0) - Number(stats?.maintenance ?? 0)) },
    { name: 'Maintenance', value: Number(stats?.maintenance ?? 0) },
  ].filter((s) => s.value > 0)), [stats]);

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-md bg-muted p-2"><Icon className="w-5 h-5" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-sm flex items-center gap-1">{label} <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2"><CardContent className="p-4">
          <p className="font-semibold text-sm mb-3">Bookings & Revenue — last 6 months</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis yAxisId="left" fontSize={11} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" fontSize={11}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip formatter={(value: any, name: any) =>
                name === 'Revenue (Rs)' ? [`Rs ${Number(value).toLocaleString()}`, name] : [value, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" name="Revenue (Rs)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="font-semibold text-sm mb-3">Fleet Status</p>
          {fleetPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={fleetPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {fleetPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-16 text-center">No vehicles yet</p>
          )}
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent bookings */}
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Recent Bookings</p>
            <Link to="bookings"><Button size="sm" variant="ghost">View all <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2 font-medium">{b.bookingNumber}</td>
                  <td className="py-2">{b.vehicle?.registrationNo || '—'}</td>
                  <td className="py-2">{b.customer?.name || '—'}</td>
                  <td className="py-2"><Badge className={statusColor[b.status] || ''}>{b.status}</Badge></td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr><td className="py-6 text-center text-muted-foreground">
                  No bookings yet — <Link to="bookings" className="underline">create the first one</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>

        {/* Upcoming maintenance */}
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm flex items-center gap-1.5"><Wrench className="w-4 h-4" /> Open Maintenance</p>
            <Link to="maintenance"><Button size="sm" variant="ghost">View all <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {upcomingMaintenance.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2 font-medium">{m.vehicle?.registrationNo || '—'}</td>
                  <td className="py-2">{m.title}</td>
                  <td className="py-2">{m.scheduledDate || '—'}</td>
                  <td className="py-2"><Badge className={statusColor[m.status] || ''}>{m.status}</Badge></td>
                </tr>
              ))}
              {upcomingMaintenance.length === 0 && (
                <tr><td className="py-6 text-center text-muted-foreground">
                  No open maintenance — <Link to="maintenance" className="underline"><Plus className="w-3 h-3 inline" /> schedule one</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>
      </div>
    </div>
  );
}
