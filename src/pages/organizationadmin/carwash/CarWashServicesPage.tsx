/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useCarWash, VEHICLE_SIZE_CLASSES } from '../../../hooks/useCarWash';

/** Wash services & price matrix per vehicle size. */
export default function CarWashServicesPage() {
  const carwash = useCarWash();
  const { getServices } = carwash;

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: '', description: '', estimatedMinutes: '', isAddon: false,
    priceMatrix: Object.fromEntries(VEHICLE_SIZE_CLASSES.map((c) => [c, ''])),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getServices(true);
      setServices((res?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getServices]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      const priceMatrix: Record<string, number> = {};
      Object.entries(form.priceMatrix).forEach(([k, v]) => {
        if (v !== '' && v != null) priceMatrix[k] = Number(v);
      });
      const res = await carwash.createService({
        name: form.name,
        description: form.description || null,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
        isAddon: form.isAddon,
        priceMatrix,
      });
      if (res?.success || res?.status) { setShowModal(false); load(); }
    } finally { setSaving(false); }
  };

  if (loading && services.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" /> Add Service</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Service</th>
              {VEHICLE_SIZE_CLASSES.map((c) => <th key={c} className="p-3">{c}</th>)}
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name} {s.isAddon && <Badge variant="outline">Add-on</Badge>}</td>
                {VEHICLE_SIZE_CLASSES.map((c) => (
                  <td key={c} className="p-3">{s.priceMatrix?.[c] != null ? `Rs ${Number(s.priceMatrix[c]).toLocaleString()}` : ' '}</td>
                ))}
                <td className="p-3">
                  <Badge className={s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No services configured</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* New service dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Wash Service</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estimated Minutes</Label><Input type="number" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })} /></div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="isAddon" checked={form.isAddon} onChange={(e) => setForm({ ...form, isAddon: e.target.checked })} />
                <Label htmlFor="isAddon">Add-on service</Label>
              </div>
            </div>
            <Label>Prices per vehicle size (Rs)</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_SIZE_CLASSES.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <span className="w-32 text-xs">{c}</span>
                  <Input type="number" value={form.priceMatrix[c]}
                    onChange={(e) => setForm({ ...form, priceMatrix: { ...form.priceMatrix, [c]: e.target.value } })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Create Service'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
