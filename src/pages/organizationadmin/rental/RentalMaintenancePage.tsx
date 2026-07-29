/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { selectCls, statusColor, type RentalOutletContext } from './shared';

/** Maintenance scheduling & tracking. */
export default function RentalMaintenancePage() {
  const { refreshStats } = useOutletContext<RentalOutletContext>();
  const rental = useRental();
  const { getMaintenances, getVehicles } = rental;

  const [loading, setLoading] = useState(true);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [form, setForm] = useState<any>({
    vehicleId: '', title: '', scheduledDate: '', cost: 0, serviceProvider: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMaintenances();
      setMaintenances((res?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getMaintenances]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVehicles = async () => {
    const res = await getVehicles({ limit: 100 });
    setVehicles((res?.data as any)?.vehicles ?? []);
  };

  const openModal = async () => {
    setEditingId(null);
    setForm({ vehicleId: '', title: '', scheduledDate: '', cost: 0, serviceProvider: '' });
    setShowModal(true);
    await loadVehicles();
  };

  const openEdit = async (m: any) => {
    setEditingId(m.id);
    setForm({
      vehicleId: m.vehicleId ?? '', title: m.title ?? '', scheduledDate: m.scheduledDate ?? '',
      cost: m.cost ?? 0, serviceProvider: m.serviceProvider ?? '',
    });
    setShowModal(true);
    await loadVehicles();
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        cost: Number(form.cost || 0),
        scheduledDate: form.scheduledDate || null,
      };
      const res = editingId
        ? await rental.updateMaintenance(editingId, payload)
        : await rental.createMaintenance(payload);
      if (res?.success || res?.status) {
        setShowModal(false);
        setEditingId(null);
        load();
        refreshStats();
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmCancelMaint = async () => {
    if (!cancelTarget) return;
    await rental.updateMaintenance(cancelTarget.id, { status: 'CANCELLED' });
    setCancelTarget(null);
    load();
    refreshStats();
  };

  if (loading && maintenances.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openModal}><Plus className="w-4 h-4 mr-1" /> Schedule Maintenance</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Vehicle</th><th className="p-3">Title</th><th className="p-3">Scheduled</th>
              <th className="p-3">Cost</th><th className="p-3">Status</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {maintenances.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-3">{m.vehicle ? `${m.vehicle.registrationNo}` : '—'}</td>
                <td className="p-3">{m.title}</td>
                <td className="p-3">{m.scheduledDate || '—'}</td>
                <td className="p-3">Rs {Number(m.cost).toLocaleString()}</td>
                <td className="p-3"><Badge className={statusColor[m.status] || ''}>{m.status}</Badge></td>
                <td className="p-3 space-x-1 whitespace-nowrap">
                  {m.status === 'SCHEDULED' && (
                    <Button size="sm" variant="outline" onClick={async () => { await rental.updateMaintenance(m.id, { status: 'IN_PROGRESS' }); load(); refreshStats(); }}>Start</Button>
                  )}
                  {m.status === 'IN_PROGRESS' && (
                    <Button size="sm" onClick={async () => { await rental.updateMaintenance(m.id, { status: 'COMPLETED', completedDate: new Date().toISOString().slice(0, 10) }); load(); refreshStats(); }}>Complete</Button>
                  )}
                  {(m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setCancelTarget(m)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {maintenances.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No maintenance records</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Maintenance dialog */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Maintenance' : 'Schedule Maintenance'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Vehicle *</Label>
              <select className={selectCls} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 5000km service" /></div>
            <div><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></div>
            <div><Label>Estimated Cost (Rs)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div><Label>Service Provider</Label><Input value={form.serviceProvider} onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.vehicleId || !form.title}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel maintenance confirmation */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel this maintenance?</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">{cancelTarget?.title} on {cancelTarget?.vehicle?.registrationNo || 'this vehicle'} will be marked cancelled.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep</Button>
            <Button variant="destructive" onClick={confirmCancelMaint}>Cancel maintenance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
