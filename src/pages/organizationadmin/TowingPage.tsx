/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Truck, Plus, Trash2, MapPin, Phone, RefreshCw, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useTowing, TOWING_STATUSES } from '../../hooks/useTowing';
import useCustomer from '../../hooks/useCustomer';
import { useStaff } from '../../hooks/useStaff';
import { useT } from '../../i18n/useT';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import LeafletMapPicker from '../../components/common/LeafletMapPicker';

const staffLabel = (s: any) => (s?.user?.name || s?.user?.firstName || s?.name || s?.staffId || 'Staff');

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  EN_ROUTE: 'bg-indigo-100 text-indigo-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

export default function TowingPage() {
  const { list, getStats, create, setStatus: updateTowingStatus, remove } = useTowing();
  const { t } = useT();
  const { getCustomers } = useCustomer();
  const { getAllStaff } = useStaff() as any;
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ active: 0, completedToday: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [form, setForm] = useState<any>({
    customerId: '', driverStaffId: '', customerName: '', customerPhone: '', vehicleReg: '', vehicleInfo: '',
    pickupLocation: '', pickupLat: null, pickupLng: null, dropLocation: '', charge: 0, notes: '',
  });
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f: any) => ({
        ...f,
        pickupLat: Number(pos.coords.latitude.toFixed(6)),
        pickupLng: Number(pos.coords.longitude.toFixed(6)),
        pickupLocation: f.pickupLocation || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
      }));
    });
  };
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([list({ status }), getStats()]);
      setRows((listRes?.data as any) ?? []);
      if (statsRes?.data) setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  }, [list, getStats, status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const c = await getCustomers();
        setCustomers((c?.data as any)?.customers ?? (Array.isArray(c?.data) ? c?.data : []));
      } catch { /* ignore */ }
      try {
        const s = await getAllStaff(1, 200);
        setStaffList(s?.data?.staff ?? s?.data?.data?.staff ?? (Array.isArray(s?.data) ? s.data : []));
      } catch { /* ignore */ }
    })();
  }, [getCustomers, getAllStaff]);

  const submit = async () => {
    if (!form.customerName || !form.pickupLocation) return;
    setSaving(true);
    try {
      const res = await create({
        customerId: form.customerId || null,
        driverStaffId: form.driverStaffId || null,
        customerName: form.customerName,
        customerPhone: form.customerPhone || null,
        vehicleReg: form.vehicleReg || null,
        vehicleInfo: form.vehicleInfo || null,
        pickupLocation: form.pickupLocation,
        pickupLat: form.pickupLat,
        pickupLng: form.pickupLng,
        dropLocation: form.dropLocation || null,
        charge: Number(form.charge) || 0,
        notes: form.notes || null,
      });
      if (res?.success || res?.status) {
        setShowCreate(false);
        setForm({ customerName: '', customerPhone: '', vehicleReg: '', vehicleInfo: '', pickupLocation: '', dropLocation: '', charge: 0, notes: '' });
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, s: any) => { await updateTowingStatus(id, s); load(); };
  const del = async (id: string) => { await remove(id); load(); };
  const mapLink = (r: any) =>
    r.pickupLat && r.pickupLng
      ? `https://www.google.com/maps?q=${r.pickupLat},${r.pickupLng}`
      : r.pickupLocation ? `https://www.google.com/maps/search/${encodeURIComponent(r.pickupLocation)}` : null;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-800">
          <Truck className="w-7 h-7" /> {t('towing')}
        </h1>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher />
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Request</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active jobs</p><p className="text-2xl font-bold text-blue-700">{stats.active ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed today</p><p className="text-2xl font-bold text-green-700">{stats.completedToday ?? 0}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label>Status</Label>
          <select className="block w-44 h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {TOWING_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">No.</th><th className="p-3">Customer</th><th className="p-3">Pickup → Drop</th>
                <th className="p-3">Charge</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{r.requestNo}</td>
                  <td className="p-3">
                    <span>{r.customer?.name || r.customerName || ' '}</span>
                    {(r.customer?.phone || r.customerPhone) && <span className="block text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{r.customer?.phone || r.customerPhone}</span>}
                    {r.vehicleReg && <span className="text-xs text-muted-foreground">{r.vehicleReg}</span>}
                  </td>
                  <td className="p-3 max-w-[220px]">
                    <span className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3 text-red-500" />{r.pickupLocation || ' '}</span>
                    {r.dropLocation && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Navigation className="w-3 h-3" />{r.dropLocation}</span>}
                    {mapLink(r) && <a href={mapLink(r)!} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Open in Maps</a>}
                  </td>
                  <td className="p-3">Rs {Number(r.charge || 0).toLocaleString()}</td>
                  <td className="p-3">
                    <select
                      className={`text-xs rounded px-2 py-1 border-0 ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}
                      value={r.status}
                      onChange={(e) => changeStatus(r.id, e.target.value)}
                    >
                      {TOWING_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" title="Delete" onClick={() => del(r.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{loading ? 'Loading…' : 'No towing requests.'}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Towing Request</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Existing Customer (optional)</Label>
              <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.customerId}
                onChange={(e) => {
                  const c = customers.find((x) => x.id === e.target.value);
                  setForm({ ...form, customerId: e.target.value, customerName: c?.name || form.customerName, customerPhone: c?.phone || form.customerPhone });
                }}>
                <option value="">  New / walk-in (type below)  </option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <Label>Assign Driver (optional)</Label>
              <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.driverStaffId} onChange={(e) => setForm({ ...form, driverStaffId: e.target.value })}>
                <option value="">  Unassigned  </option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{staffLabel(s)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Customer Name *</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vehicle Reg</Label><Input value={form.vehicleReg} onChange={(e) => setForm({ ...form, vehicleReg: e.target.value })} /></div>
              <div><Label>Vehicle Make/Model</Label><Input value={form.vehicleInfo} onChange={(e) => setForm({ ...form, vehicleInfo: e.target.value })} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Pickup Location *</Label>
                <div className="flex gap-3">
                  <button type="button" onClick={useMyLocation} className="text-xs text-blue-600 underline flex items-center gap-1"><MapPin className="w-3 h-3" /> Use my location</button>
                  <button type="button" onClick={() => setShowMap(!showMap)} className="text-xs text-blue-600 underline">{showMap ? 'Hide map' : 'Pick on map'}</button>
                </div>
              </div>
              <Input value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} />
              {form.pickupLat && <p className="text-[10px] text-green-600 mt-1">📍 {form.pickupLat}, {form.pickupLng} captured</p>}
              {showMap && (
                <LeafletMapPicker lat={form.pickupLat} lng={form.pickupLng}
                  onChange={(la, ln) => setForm((f: any) => ({ ...f, pickupLat: la, pickupLng: ln, pickupLocation: f.pickupLocation || `${la}, ${ln}` }))} />
              )}
              {!showMap && form.pickupLat && (
                <iframe title="pickup-map" className="w-full h-40 mt-2 rounded-md border" loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.pickupLng - 0.01},${form.pickupLat - 0.01},${form.pickupLng + 0.01},${form.pickupLat + 0.01}&marker=${form.pickupLat},${form.pickupLng}`} />
              )}
            </div>
            <div><Label>Drop Location</Label><Input value={form.dropLocation} onChange={(e) => setForm({ ...form, dropLocation: e.target.value })} /></div>
            <div><Label>Charge (Rs)</Label><Input type="number" value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.customerName || !form.pickupLocation}>{saving ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
