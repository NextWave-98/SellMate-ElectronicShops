/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useRental } from '../../../hooks/useRental';
import { selectCls } from './shared';

/** Fuel logs & efficiency tracking. */
export default function RentalFuelPage() {
  const rental = useRental();
  const { getFuelLogs, getVehicles } = rental;

  const [loading, setLoading] = useState(true);
  const [fuelData, setFuelData] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState<any>({ vehicleId: '', filledAt: '', odometer: '', liters: '', ratePerLiter: '', cost: '', station: '' });

  /** liters × rate → cost auto-calc (manual cost entry still allowed) */
  const updateFuelCalc = (patch: any) => {
    const next = { ...form, ...patch };
    const liters = Number(next.liters);
    const rate = Number(next.ratePerLiter);
    if (('liters' in patch || 'ratePerLiter' in patch) && liters > 0 && rate > 0) {
      next.cost = String(Math.round(liters * rate * 100) / 100);
    }
    setForm(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFuelLogs();
      setFuelData(res?.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [getFuelLogs]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = async () => {
    setShowModal(true);
    const res = await getVehicles({ limit: 100 });
    setVehicles((res?.data as any)?.vehicles ?? []);
  };

  const submit = async () => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ratePerLiter, ...payload } = form;
      const res = await rental.createFuelLog({
        ...payload,
        odometer: Number(form.odometer || 0),
        liters: Number(form.liters || 0),
        cost: Number(form.cost || 0),
        station: form.station || null,
      });
      if (res?.success || res?.status) { setShowModal(false); load(); }
    } finally { setSaving(false); }
  };

  if (loading && !fuelData) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total: Rs {Number(fuelData?.totalCost ?? 0).toLocaleString()} · {Number(fuelData?.totalLiters ?? 0).toLocaleString()} L
        </p>
        <Button onClick={openModal}><Plus className="w-4 h-4 mr-1" /> Add Fuel Log</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Date</th><th className="p-3">Vehicle</th><th className="p-3">Odometer</th>
              <th className="p-3">Liters</th><th className="p-3">Cost</th><th className="p-3">Efficiency</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(fuelData?.logs ?? []).map((l: any) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.filledAt}</td>
                <td className="p-3">{l.vehicle?.registrationNo || '—'}</td>
                <td className="p-3">{Number(l.odometer).toLocaleString()} km</td>
                <td className="p-3">{l.liters} L</td>
                <td className="p-3">Rs {Number(l.cost).toLocaleString()}</td>
                <td className="p-3">{l.kmPerLiter != null ? <Badge className="bg-green-100 text-green-800">{l.kmPerLiter} km/L</Badge> : '—'}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(l)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
            {(fuelData?.logs ?? []).length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No fuel logs yet</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Fuel log dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Fuel Log</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Vehicle *</Label>
              <select className={selectCls} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.filledAt} onChange={(e) => setForm({ ...form, filledAt: e.target.value })} /></div>
            <div><Label>Odometer (km) *</Label><Input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
            <div><Label>Liters *</Label><Input type="number" value={form.liters} onChange={(e) => updateFuelCalc({ liters: e.target.value })} /></div>
            <div><Label>Fuel Rate (Rs / L)</Label><Input type="number" placeholder="e.g. 365" value={form.ratePerLiter} onChange={(e) => updateFuelCalc({ ratePerLiter: e.target.value })} /></div>
            <div><Label>Cost (Rs) *</Label>
              <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              {Number(form.liters) > 0 && Number(form.ratePerLiter) > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">{form.liters} L × Rs {form.ratePerLiter} = Rs {Number(form.cost).toLocaleString()}</p>
              )}
            </div>
            <div><Label>Station</Label><Input value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.vehicleId || !form.filledAt || !form.odometer || !form.liters}>
              {saving ? 'Saving...' : 'Add Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this fuel log?</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {deleteTarget?.vehicle?.registrationNo || 'Vehicle'} · {deleteTarget?.filledAt} · {deleteTarget?.liters} L — this cannot be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { await rental.deleteFuelLog(deleteTarget.id); setDeleteTarget(null); load(); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
