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
import { useCarWash, VEHICLE_SIZE_CLASSES } from '../../../hooks/useCarWash';
import { useCustomer } from '../../../hooks';
import { selectCls, statusColor, NEXT_STATUS, type CarWashOutletContext } from './shared';

/** Wash queue: live job board + new job intake. */
export default function CarWashQueuePage() {
  const { refreshStats } = useOutletContext<CarWashOutletContext>();
  const carwash = useCarWash();
  const { getJobs, getServices, getBays } = carwash;
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobForm, setJobForm] = useState<any>({
    vehiclePlate: '', vehicleSizeClass: 'CAR', customerId: '', serviceIds: [] as string[], notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, servicesRes, baysRes] = await Promise.all([
        getJobs({ limit: 100 }),
        getServices(true),
        getBays(),
      ]);
      setJobs((jobsRes?.data as any)?.jobs ?? []);
      setServices((servicesRes?.data as any) ?? []);
      setBays((baysRes?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getJobs, getServices, getBays]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openJobModal = async () => {
    setShowJobModal(true);
    const res = await getCustomers({ limit: 200 } as any);
    setCustomers((res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []));
  };

  const submitJob = async () => {
    setSaving(true);
    try {
      const res = await carwash.createJob({
        ...jobForm,
        customerId: jobForm.customerId || null,
      });
      if (res?.success || res?.status) {
        setShowJobModal(false);
        setJobForm({ vehiclePlate: '', vehicleSizeClass: 'CAR', customerId: '', serviceIds: [], notes: '' });
        load();
        refreshStats();
      }
    } finally { setSaving(false); }
  };

  const setJobStatus = async (id: string, status: string) => {
    await carwash.updateJob(id, { status });
    load();
    refreshStats();
  };

  const toggleService = (id: string) => {
    setJobForm((f: any) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s: string) => s !== id) : [...f.serviceIds, id],
    }));
  };

  if (loading && jobs.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openJobModal}><Plus className="w-4 h-4 mr-1" /> New Wash Job</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Job #</th><th className="p-3">Plate</th><th className="p-3">Services</th>
              <th className="p-3">Bay</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="p-3 font-medium">{j.jobNumber}</td>
                <td className="p-3">{j.vehiclePlate} <span className="text-xs text-muted-foreground">({j.vehicleSizeClass})</span></td>
                <td className="p-3">{(j.items ?? []).map((i: any) => i.serviceName).join(', ')}</td>
                <td className="p-3">
                  <select className={selectCls} value={j.bay?.id || j.bayId || ''}
                    onChange={async (e) => { await carwash.updateJob(j.id, { bayId: e.target.value || null }); load(); }}>
                    <option value="">No bay</option>
                    {bays.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </td>
                <td className="p-3">{j.redeemedViaMembership ? <Badge className="bg-purple-100 text-purple-800">Membership</Badge> : `Rs ${Number(j.totalAmount).toLocaleString()}`}</td>
                <td className="p-3"><Badge className={statusColor[j.status] || ''}>{j.status}</Badge></td>
                <td className="p-3 space-x-1">
                  {(NEXT_STATUS[j.status] ?? []).map((a) => (
                    <Button key={a.value} size="sm" variant={a.value === 'CANCELLED' ? 'destructive' : 'outline'}
                      onClick={() => setJobStatus(j.id, a.value)}>{a.label}</Button>
                  ))}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Queue is empty</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

      {/* New job dialog */}
      <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Wash Job</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vehicle Plate *</Label><Input value={jobForm.vehiclePlate} onChange={(e) => setJobForm({ ...jobForm, vehiclePlate: e.target.value })} /></div>
              <div><Label>Vehicle Size</Label>
                <select className={selectCls} value={jobForm.vehicleSizeClass} onChange={(e) => setJobForm({ ...jobForm, vehicleSizeClass: e.target.value })}>
                  {VEHICLE_SIZE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Customer (optional)</Label>
              <select className={selectCls} value={jobForm.customerId} onChange={(e) => setJobForm({ ...jobForm, customerId: e.target.value })}>
                <option value="">Walk-in</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Services *</Label>
              <div className="grid grid-cols-2 gap-1 mt-1 max-h-48 overflow-y-auto border rounded-md p-2">
                {services.filter((s: any) => s.isActive).map((s: any) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={jobForm.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                    {s.name} {s.priceMatrix?.[jobForm.vehicleSizeClass] != null && `— Rs ${Number(s.priceMatrix[jobForm.vehicleSizeClass]).toLocaleString()}`}
                  </label>
                ))}
              </div>
            </div>
            <div><Label>Notes</Label><Input value={jobForm.notes} onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobModal(false)}>Cancel</Button>
            <Button onClick={submitJob} disabled={saving || !jobForm.vehiclePlate || jobForm.serviceIds.length === 0}>
              {saving ? 'Saving...' : 'Add to Queue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
