/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useRental } from '../../../hooks/useRental';
import { selectCls, statusColor } from './shared';

const VEHICLE_STATUSES = ['AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'CLEANING', 'ACCIDENT', 'RETIRED', 'SOLD'];

/** Service-due helper: due now, or within 500 km. */
const serviceState = (v: any): 'due' | 'soon' | null => {
  if (v.nextServiceOdometer == null) return null;
  const remaining = Number(v.nextServiceOdometer) - Number(v.currentOdometer ?? 0);
  if (remaining <= 0) return 'due';
  if (remaining <= 500) return 'soon';
  return null;
};

/** Fleet management: vehicle list — create / edit now open as full pages. */
export default function RentalFleetPage() {
  const { getVehicles } = useRental();

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVehicles({ search, limit: 100 });
      setVehicles((res?.data as any)?.vehicles ?? []);
    } finally {
      setLoading(false);
    }
  }, [getVehicles, search]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredVehicles = useMemo(
    () => (statusFilter ? vehicles.filter((v) => v.status === statusFilter) : vehicles),
    [vehicles, statusFilter]
  );

  if (loading && vehicles.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search reg no / make / model" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <select className={`${selectCls} max-w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Link to="new"><Button><Plus className="w-4 h-4 mr-1" /> Add Vehicle</Button></Link>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Vehicle</th><th className="p-3">Reg No</th><th className="p-3">Class</th>
              <th className="p-3">Fuel / Trans.</th><th className="p-3">Odometer</th>
              <th className="p-3">Insurance</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    {Array.isArray(v.photos) && v.photos[0] ? (
                      <img src={v.photos[0]} alt="" className="w-12 h-9 object-cover rounded-md shrink-0" />
                    ) : (
                      <div className="w-12 h-9 rounded-md bg-muted grid place-items-center shrink-0"><Car className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <div>
                      <p className="font-medium">{v.make} {v.model}</p>
                      <p className="text-xs text-muted-foreground">{v.year || ''} {v.color ? `· ${v.color}` : ''}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-medium">{v.registrationNo}</td>
                <td className="p-3">{v.vehicleClass}</td>
                <td className="p-3 text-xs">{v.fuelType || '—'}{v.transmission ? ` / ${v.transmission}` : ''}</td>
                <td className="p-3">
                  {Number(v.currentOdometer).toLocaleString()} km
                  {serviceState(v) === 'due' && <Badge className="ml-1.5 bg-red-100 text-red-800">Service due</Badge>}
                  {serviceState(v) === 'soon' && <Badge className="ml-1.5 bg-amber-100 text-amber-800">Service soon</Badge>}
                </td>
                <td className="p-3">{v.insuranceExpiry || '—'}</td>
                <td className="p-3"><Badge className={statusColor[v.status] || ''}>{v.status}</Badge></td>
                <td className="p-3">
                  <Link to={`${v.id}/edit`}>
                    <Button size="sm" variant="ghost"><Pencil className="w-4 h-4" /></Button>
                  </Link>
                </td>
              </tr>
            ))}
            {filteredVehicles.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">
                {vehicles.length === 0
                  ? <>No vehicles in the fleet yet — <Link to="new" className="underline">add the first one</Link></>
                  : 'No vehicles match this status'}
              </td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
