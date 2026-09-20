/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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
import { useGarage } from '../../../hooks/useGarage';
import { useCustomer } from '../../../hooks';
import { selectCls, statusColor, type GarageOutletContext } from './shared';

/** Service / insurance / license reminders. */
export default function GarageRemindersPage() {
  const { refreshStats } = useOutletContext<GarageOutletContext>();
  const garage = useGarage();
  const { getReminders, getVehicles } = garage;
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    customerId: '', customerVehicleId: '', reminderType: 'NEXT_SERVICE', message: '', dueDate: '', dueMileage: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReminders();
      setReminders((res?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getReminders]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = async () => {
    setShowModal(true);
    const [customersRes, vehiclesRes] = await Promise.all([
      getCustomers({ limit: 200 } as any),
      getVehicles({ limit: 100 }),
    ]);
    setCustomers((customersRes?.data as any)?.customers ?? (Array.isArray(customersRes?.data) ? customersRes?.data : []));
    setVehicles((vehiclesRes?.data as any)?.vehicles ?? []);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await garage.createReminder({
        ...form,
        dueMileage: form.dueMileage ? Number(form.dueMileage) : null,
        dueDate: form.dueDate || null,
      });
      if (res?.success || res?.status) { setShowModal(false); load(); refreshStats(); }
    } finally { setSaving(false); }
  };

  if (loading && reminders.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openModal}><Plus className="w-4 h-4 mr-1" /> New Reminder</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Customer</th><th className="p-3">Vehicle</th><th className="p-3">Type</th>
              <th className="p-3">Due</th><th className="p-3">Status</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.customer?.name || ' '}</td>
                <td className="p-3">{r.vehicle?.registrationNo || ' '}</td>
                <td className="p-3">{r.reminderType}</td>
                <td className="p-3">{r.dueDate || (r.dueMileage ? `${r.dueMileage} km` : ' ')}</td>
                <td className="p-3"><Badge className={statusColor[r.status] || ''}>{r.status}</Badge></td>
                <td className="p-3 space-x-1">
                  {r.status === 'PENDING' && (
                    <>
                      <Button size="sm" variant="outline" onClick={async () => { await garage.updateReminder(r.id, { status: 'SENT', sentChannel: 'SMS' }); load(); refreshStats(); }}>Mark Sent</Button>
                      <Button size="sm" onClick={async () => { await garage.updateReminder(r.id, { status: 'COMPLETED' }); load(); refreshStats(); }}>Done</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {reminders.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No reminders</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* New reminder dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Service Reminder</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Customer *</Label>
              <select className={selectCls} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, customerVehicleId: '' })}>
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Vehicle *</Label>
              <select className={selectCls} value={form.customerVehicleId} onChange={(e) => setForm({ ...form, customerVehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.filter((v) => !form.customerId || v.customerId === form.customerId).map((v) => (
                  <option key={v.id} value={v.id}>{v.registrationNo}</option>
                ))}
              </select>
            </div>
            <div><Label>Type</Label>
              <select className={selectCls} value={form.reminderType} onChange={(e) => setForm({ ...form, reminderType: e.target.value })}>
                <option value="NEXT_SERVICE">Next Service</option>
                <option value="INSURANCE">Insurance Renewal</option>
                <option value="LICENSE">License Renewal</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div><Label>Message *</Label><Input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              <div><Label>Due Mileage (km)</Label><Input type="number" value={form.dueMileage} onChange={(e) => setForm({ ...form, dueMileage: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.customerId || !form.customerVehicleId || !form.message}>
              {saving ? 'Saving...' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
