/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Wrench, Car, FileText, BellRing, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useGarage } from '../../hooks/useGarage';
import { useCustomer } from '../../hooks';

const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SENT: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-200 text-gray-600',
  CONVERTED: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

interface EstItem {
  itemType: 'PART' | 'LABOR' | 'OUTWORK' | 'OTHER';
  description: string;
  quantity: number;
  laborHours?: number;
  unitPrice: number;
}

export default function GaragePage() {
  const garage = useGarage();
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vehicleForm, setVehicleForm] = useState<any>({
    customerId: '', registrationNo: '', make: '', model: '', year: '',
    vin: '', engineNo: '', fuelType: '', currentMileage: '',
  });
  const [estimateForm, setEstimateForm] = useState<any>({
    customerId: '', customerVehicleId: '', customerComplaints: '', mileageIn: '',
    isInsuranceJob: false, insuranceProvider: '', insuranceClaimNo: '',
  });
  const [estItems, setEstItems] = useState<EstItem[]>([]);
  const [reminderForm, setReminderForm] = useState<any>({
    customerId: '', customerVehicleId: '', reminderType: 'NEXT_SERVICE', message: '', dueDate: '', dueMileage: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, vehiclesRes, estimatesRes, remindersRes] = await Promise.all([
        garage.getStats(),
        garage.getVehicles({ limit: 100 }),
        garage.getEstimates({ limit: 100 }),
        garage.getReminders(),
      ]);
      setStats(statsRes?.data ?? null);
      setVehicles((vehiclesRes?.data as any)?.vehicles ?? []);
      setEstimates((estimatesRes?.data as any)?.estimates ?? []);
      setReminders((remindersRes?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [garage]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = useCallback(async () => {
    const res = await getCustomers({ limit: 200 } as any);
    setCustomers((res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []));
  }, [getCustomers]);

  const submitVehicle = async () => {
    setSaving(true);
    try {
      const res = await garage.createVehicle({
        ...vehicleForm,
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        currentMileage: vehicleForm.currentMileage ? Number(vehicleForm.currentMileage) : null,
      });
      if (res?.success || res?.status) { setShowVehicleModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const submitEstimate = async () => {
    setSaving(true);
    try {
      const res = await garage.createEstimate({
        ...estimateForm,
        mileageIn: estimateForm.mileageIn ? Number(estimateForm.mileageIn) : null,
        items: estItems.map((i) => ({
          ...i,
          quantity: Number(i.quantity || 1),
          laborHours: i.laborHours ? Number(i.laborHours) : null,
          unitPrice: Number(i.unitPrice || 0),
        })),
      });
      if (res?.success || res?.status) {
        setShowEstimateModal(false);
        setEstItems([]);
        loadAll();
      }
    } finally { setSaving(false); }
  };

  const submitReminder = async () => {
    setSaving(true);
    try {
      const res = await garage.createReminder({
        ...reminderForm,
        dueMileage: reminderForm.dueMileage ? Number(reminderForm.dueMileage) : null,
        dueDate: reminderForm.dueDate || null,
      });
      if (res?.success || res?.status) { setShowReminderModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const setEstimateStatus = async (id: string, status: string) => {
    await garage.setEstimateStatus(id, { status, approvalChannel: status === 'APPROVED' ? 'IN_PERSON' : undefined });
    loadAll();
  };

  const estTotal = estItems.reduce(
    (sum, i) => sum + (i.itemType === 'LABOR' ? Number(i.laborHours || 0) * Number(i.unitPrice || 0) : Number(i.quantity || 1) * Number(i.unitPrice || 0)),
    0
  );

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="w-6 h-6" /> Garage / Workshop</h1>
          <p className="text-sm text-muted-foreground">Customer vehicles, estimates & service reminders</p>
        </div>
        <Button variant="outline" onClick={loadAll}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Vehicles', value: stats?.totalVehicles ?? 0 },
          { label: 'Pending Estimates', value: stats?.pendingEstimates ?? 0 },
          { label: 'Approved', value: stats?.approvedEstimates ?? 0 },
          { label: 'Month Approved Value', value: `Rs ${Number(stats?.monthApprovedValue ?? 0).toLocaleString()}` },
          { label: 'Due Reminders', value: stats?.dueReminders ?? 0 },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="estimates">
        <TabsList>
          <TabsTrigger value="estimates"><FileText className="w-4 h-4 mr-1" /> Estimates</TabsTrigger>
          <TabsTrigger value="vehicles"><Car className="w-4 h-4 mr-1" /> Customer Vehicles</TabsTrigger>
          <TabsTrigger value="reminders"><BellRing className="w-4 h-4 mr-1" /> Reminders</TabsTrigger>
        </TabsList>

        {/* ESTIMATES */}
        <TabsContent value="estimates" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { loadCustomers(); setShowEstimateModal(true); }}><Plus className="w-4 h-4 mr-1" /> New Estimate</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Estimate #</th><th className="p-3">Customer</th><th className="p-3">Vehicle</th>
                  <th className="p-3">Parts</th><th className="p-3">Labor</th><th className="p-3">Total</th>
                  <th className="p-3">Status</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 font-medium">{e.estimateNumber} {e.isInsuranceJob && <Badge variant="outline">Insurance</Badge>}</td>
                    <td className="p-3">{e.customer?.name || '—'}</td>
                    <td className="p-3">{e.vehicle ? `${e.vehicle.registrationNo}` : '—'}</td>
                    <td className="p-3">Rs {Number(e.partsTotal).toLocaleString()}</td>
                    <td className="p-3">Rs {Number(e.laborTotal).toLocaleString()}</td>
                    <td className="p-3 font-semibold">Rs {Number(e.totalAmount).toLocaleString()}</td>
                    <td className="p-3"><Badge className={statusColor[e.status] || ''}>{e.status}</Badge></td>
                    <td className="p-3 space-x-1">
                      {e.status === 'DRAFT' && (
                        <>
                          <Button size="sm" variant="outline" onClick={async () => { await garage.sendEstimate(e.id, 'SMS'); loadAll(); }}>
                            Send SMS
                          </Button>
                          <Button size="sm" variant="outline" onClick={async () => { await garage.sendEstimate(e.id, 'WHATSAPP'); loadAll(); }}>
                            WhatsApp
                          </Button>
                        </>
                      )}
                      {(e.status === 'DRAFT' || e.status === 'SENT') && (
                        <>
                          <Button size="sm" onClick={() => setEstimateStatus(e.id, 'APPROVED')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => setEstimateStatus(e.id, 'REJECTED')}>Reject</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {estimates.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No estimates yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* VEHICLES */}
        <TabsContent value="vehicles" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { loadCustomers(); setShowVehicleModal(true); }}><Plus className="w-4 h-4 mr-1" /> Register Vehicle</Button>
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
                    <td className="p-3">{v.customer?.name || '—'}</td>
                    <td className="p-3">{v.currentMileage != null ? `${Number(v.currentMileage).toLocaleString()} km` : '—'}</td>
                    <td className="p-3">{v.nextServiceDate || (v.nextServiceMileage ? `${v.nextServiceMileage} km` : '—')}</td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No vehicles registered</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* REMINDERS */}
        <TabsContent value="reminders" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { loadCustomers(); setShowReminderModal(true); }}><Plus className="w-4 h-4 mr-1" /> New Reminder</Button>
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
                    <td className="p-3">{r.customer?.name || '—'}</td>
                    <td className="p-3">{r.vehicle?.registrationNo || '—'}</td>
                    <td className="p-3">{r.reminderType}</td>
                    <td className="p-3">{r.dueDate || (r.dueMileage ? `${r.dueMileage} km` : '—')}</td>
                    <td className="p-3"><Badge className={statusColor[r.status] || ''}>{r.status}</Badge></td>
                    <td className="p-3 space-x-1">
                      {r.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="outline" onClick={async () => { await garage.updateReminder(r.id, { status: 'SENT', sentChannel: 'SMS' }); loadAll(); }}>Mark Sent</Button>
                          <Button size="sm" onClick={async () => { await garage.updateReminder(r.id, { status: 'COMPLETED' }); loadAll(); }}>Done</Button>
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
        </TabsContent>
      </Tabs>

      {/* Register vehicle dialog */}
      <Dialog open={showVehicleModal} onOpenChange={setShowVehicleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Register Customer Vehicle</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Customer *</Label>
              <select className={selectCls} value={vehicleForm.customerId} onChange={(e) => setVehicleForm({ ...vehicleForm, customerId: e.target.value })}>
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
            <div><Label>Registration No *</Label><Input value={vehicleForm.registrationNo} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNo: e.target.value })} /></div>
            <div><Label>Year</Label><Input type="number" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} /></div>
            <div><Label>Make *</Label><Input value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} /></div>
            <div><Label>Model *</Label><Input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></div>
            <div><Label>VIN</Label><Input value={vehicleForm.vin} onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })} /></div>
            <div><Label>Engine No</Label><Input value={vehicleForm.engineNo} onChange={(e) => setVehicleForm({ ...vehicleForm, engineNo: e.target.value })} /></div>
            <div><Label>Fuel Type</Label><Input value={vehicleForm.fuelType} onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value })} /></div>
            <div><Label>Current Mileage (km)</Label><Input type="number" value={vehicleForm.currentMileage} onChange={(e) => setVehicleForm({ ...vehicleForm, currentMileage: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVehicleModal(false)}>Cancel</Button>
            <Button onClick={submitVehicle} disabled={saving || !vehicleForm.customerId || !vehicleForm.registrationNo || !vehicleForm.make || !vehicleForm.model}>
              {saving ? 'Saving...' : 'Register'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New estimate dialog */}
      <Dialog open={showEstimateModal} onOpenChange={setShowEstimateModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Repair Estimate</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Customer *</Label>
              <select className={selectCls} value={estimateForm.customerId} onChange={(e) => setEstimateForm({ ...estimateForm, customerId: e.target.value, customerVehicleId: '' })}>
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Vehicle *</Label>
              <select className={selectCls} value={estimateForm.customerVehicleId} onChange={(e) => setEstimateForm({ ...estimateForm, customerVehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.filter((v) => !estimateForm.customerId || v.customerId === estimateForm.customerId).map((v) => (
                  <option key={v.id} value={v.id}>{v.registrationNo} — {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2"><Label>Customer Complaints</Label><Input value={estimateForm.customerComplaints} onChange={(e) => setEstimateForm({ ...estimateForm, customerComplaints: e.target.value })} /></div>
            <div><Label>Mileage In (km)</Label><Input type="number" value={estimateForm.mileageIn} onChange={(e) => setEstimateForm({ ...estimateForm, mileageIn: e.target.value })} /></div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isInsurance" checked={estimateForm.isInsuranceJob} onChange={(e) => setEstimateForm({ ...estimateForm, isInsuranceJob: e.target.checked })} />
              <Label htmlFor="isInsurance">Insurance claim job</Label>
            </div>
            {estimateForm.isInsuranceJob && (
              <>
                <div><Label>Insurance Provider</Label><Input value={estimateForm.insuranceProvider} onChange={(e) => setEstimateForm({ ...estimateForm, insuranceProvider: e.target.value })} /></div>
                <div><Label>Claim No</Label><Input value={estimateForm.insuranceClaimNo} onChange={(e) => setEstimateForm({ ...estimateForm, insuranceClaimNo: e.target.value })} /></div>
              </>
            )}
          </div>

          {/* Line items */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button size="sm" variant="outline" onClick={() => setEstItems([...estItems, { itemType: 'PART', description: '', quantity: 1, unitPrice: 0 }])}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {estItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select className={`${selectCls} col-span-2`} value={item.itemType}
                    onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, itemType: e.target.value as any }; setEstItems(arr); }}>
                    <option value="PART">Part</option><option value="LABOR">Labor</option>
                    <option value="OUTWORK">Outwork</option><option value="OTHER">Other</option>
                  </select>
                  <Input className="col-span-4" placeholder="Description" value={item.description}
                    onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, description: e.target.value }; setEstItems(arr); }} />
                  {item.itemType === 'LABOR' ? (
                    <Input className="col-span-2" type="number" placeholder="Hours" value={item.laborHours ?? ''}
                      onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, laborHours: Number(e.target.value) }; setEstItems(arr); }} />
                  ) : (
                    <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity}
                      onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, quantity: Number(e.target.value) }; setEstItems(arr); }} />
                  )}
                  <Input className="col-span-3" type="number" placeholder={item.itemType === 'LABOR' ? 'Rate/hr' : 'Unit price'} value={item.unitPrice}
                    onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, unitPrice: Number(e.target.value) }; setEstItems(arr); }} />
                  <Button size="sm" variant="ghost" className="col-span-1" onClick={() => setEstItems(estItems.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-right font-semibold mt-2">Total: Rs {estTotal.toLocaleString()}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstimateModal(false)}>Cancel</Button>
            <Button onClick={submitEstimate} disabled={saving || !estimateForm.customerId || !estimateForm.customerVehicleId}>
              {saving ? 'Saving...' : 'Create Estimate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New reminder dialog */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Service Reminder</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Customer *</Label>
              <select className={selectCls} value={reminderForm.customerId} onChange={(e) => setReminderForm({ ...reminderForm, customerId: e.target.value, customerVehicleId: '' })}>
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Vehicle *</Label>
              <select className={selectCls} value={reminderForm.customerVehicleId} onChange={(e) => setReminderForm({ ...reminderForm, customerVehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {vehicles.filter((v) => !reminderForm.customerId || v.customerId === reminderForm.customerId).map((v) => (
                  <option key={v.id} value={v.id}>{v.registrationNo}</option>
                ))}
              </select>
            </div>
            <div><Label>Type</Label>
              <select className={selectCls} value={reminderForm.reminderType} onChange={(e) => setReminderForm({ ...reminderForm, reminderType: e.target.value })}>
                <option value="NEXT_SERVICE">Next Service</option>
                <option value="INSURANCE">Insurance Renewal</option>
                <option value="LICENSE">License Renewal</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div><Label>Message *</Label><Input value={reminderForm.message} onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input type="date" value={reminderForm.dueDate} onChange={(e) => setReminderForm({ ...reminderForm, dueDate: e.target.value })} /></div>
              <div><Label>Due Mileage (km)</Label><Input type="number" value={reminderForm.dueMileage} onChange={(e) => setReminderForm({ ...reminderForm, dueMileage: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderModal(false)}>Cancel</Button>
            <Button onClick={submitReminder} disabled={saving || !reminderForm.customerId || !reminderForm.customerVehicleId || !reminderForm.message}>
              {saving ? 'Saving...' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
