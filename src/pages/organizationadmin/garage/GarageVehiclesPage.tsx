/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useGarage } from '../../../hooks/useGarage';
import { useCustomer } from '../../../hooks';
import { selectCls, type GarageOutletContext } from './shared';

/** Customer vehicle registry. */
export default function GarageVehiclesPage() {
  const { refreshStats } = useOutletContext<GarageOutletContext>();
  const garage = useGarage();
  const { getVehicles } = garage;
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    customerId: '', registrationNo: '', make: '', model: '', year: '',
    vin: '', engineNo: '', fuelType: '', currentMileage: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVehicles({ limit: 100 });
      setVehicles((res?.data as any)?.vehicles ?? []);
    } finally {
      setLoading(false);
    }
  }, [getVehicles]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = async () => {
    setShowModal(true);
    const res = await getCustomers({ limit: 200 } as any);
    setCustomers((res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await garage.createVehicle({
        ...form,
        year: form.year ? Number(form.year) : null,
        currentMileage: form.currentMileage ? Number(form.currentMileage) : null,
      });
      if (res?.success || res?.status) { setShowModal(false); load(); refreshStats(); }
    } finally { setSaving(false); }
  };

  if (loading && vehicles.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openModal}><Plus className="w-4 h-4 mr-1" /> Register Vehicle</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Reg No</th><th className="p-3">Vehicle</th><th className="p-3">Owner</th>
              <th className="p-3">Mileage</th><th className="p-3">Next Service</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-3 font-medium">{v.registrationNo}</td>
                <td className="p-3">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</td>
                <td className="p-3">{v.customer?.name || ' '}</td>
                <td className="p-3">{v.currentMileage != null ? `${Number(v.currentMileage).toLocaleString()} km` : ' '}</td>
                <td className="p-3">{v.nextServiceDate || (v.nextServiceMileage ? `${v.nextServiceMileage} km` : ' ')}</td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No vehicles registered</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Register vehicle dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Register Customer Vehicle</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Customer *</Label>
              <select className={selectCls} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
            <div><Label>Registration No *</Label><Input value={form.registrationNo} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} /></div>
            <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
            <div><Label>Make *</Label><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
            <div><Label>Model *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>VIN</Label><Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></div>
            <div><Label>Engine No</Label><Input value={form.engineNo} onChange={(e) => setForm({ ...form, engineNo: e.target.value })} /></div>
            <div><Label>Fuel Type</Label><Input value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} /></div>
            <div><Label>Current Mileage (km)</Label><Input type="number" value={form.currentMileage} onChange={(e) => setForm({ ...form, currentMileage: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.customerId || !form.registrationNo || !form.make || !form.model}>
              {saving ? 'Saving...' : 'Register'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
