/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Droplets, ListChecks, CreditCard, RefreshCw, Plus, Search, Users } from 'lucide-react';
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
import { useCarWash, VEHICLE_SIZE_CLASSES } from '../../hooks/useCarWash';
import { useCustomer } from '../../hooks';

const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

const statusColor: Record<string, string> = {
  WAITING: 'bg-amber-100 text-amber-800',
  IN_BAY: 'bg-blue-100 text-blue-800',
  DRYING: 'bg-sky-100 text-sky-800',
  READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-200 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  EXHAUSTED: 'bg-gray-200 text-gray-700',
};

const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  WAITING: [{ label: 'Start (In Bay)', value: 'IN_BAY' }, { label: 'Cancel', value: 'CANCELLED' }],
  IN_BAY: [{ label: 'Drying', value: 'DRYING' }, { label: 'Ready', value: 'READY' }],
  DRYING: [{ label: 'Ready', value: 'READY' }],
  READY: [{ label: 'Delivered', value: 'DELIVERED' }],
};

export default function CarWashPage() {
  const carwash = useCarWash();
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [plateQuery, setPlateQuery] = useState('');
  const [plateResult, setPlateResult] = useState<any>(null);

  // Staff performance
  const [performance, setPerformance] = useState<any>(null);
  const [perfCommission, setPerfCommission] = useState('10');

  const loadPerformance = useCallback(async (commissionPercent?: string) => {
    const res = await carwash.getStaffPerformance({ commissionPercent: commissionPercent ?? perfCommission });
    setPerformance(res?.data ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carwash, perfCommission]);

  const [showJobModal, setShowJobModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [jobForm, setJobForm] = useState<any>({
    vehiclePlate: '', vehicleSizeClass: 'CAR', customerId: '', serviceIds: [] as string[], notes: '',
  });
  const [serviceForm, setServiceForm] = useState<any>({
    name: '', description: '', estimatedMinutes: '', isAddon: false,
    priceMatrix: Object.fromEntries(VEHICLE_SIZE_CLASSES.map((c) => [c, ''])),
  });
  const [planForm, setPlanForm] = useState<any>({
    name: '', planType: 'PREPAID_COUNT', price: '', washCount: '', validityDays: '',
  });
  const [sellForm, setSellForm] = useState<any>({ customerId: '', planId: '', vehiclePlate: '', paidAmount: '' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, servicesRes, baysRes, plansRes, memRes] = await Promise.all([
        carwash.getStats(),
        carwash.getJobs({ limit: 100 }),
        carwash.getServices(true),
        carwash.getBays(),
        carwash.getPlans(),
        carwash.getMemberships(),
      ]);
      setStats(statsRes?.data ?? null);
      setJobs((jobsRes?.data as any)?.jobs ?? []);
      setServices((servicesRes?.data as any) ?? []);
      setBays((baysRes?.data as any) ?? []);
      setPlans((plansRes?.data as any) ?? []);
      setMemberships((memRes?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [carwash]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = useCallback(async () => {
    const res = await getCustomers({ limit: 200 } as any);
    setCustomers((res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []));
  }, [getCustomers]);

  const doPlateLookup = async () => {
    if (!plateQuery.trim()) return;
    const res = await carwash.lookupPlate(plateQuery.trim());
    setPlateResult(res?.data ?? null);
  };

  const submitJob = async () => {
    setSaving(true);
    try {
      const res = await carwash.createJob({
        ...jobForm,
        customerId: jobForm.customerId || null,
      });
      if (res?.success || res?.status) { setShowJobModal(false); setJobForm({ vehiclePlate: '', vehicleSizeClass: 'CAR', customerId: '', serviceIds: [], notes: '' }); loadAll(); }
    } finally { setSaving(false); }
  };

  const submitService = async () => {
    setSaving(true);
    try {
      const priceMatrix: Record<string, number> = {};
      Object.entries(serviceForm.priceMatrix).forEach(([k, v]) => {
        if (v !== '' && v != null) priceMatrix[k] = Number(v);
      });
      const res = await carwash.createService({
        name: serviceForm.name,
        description: serviceForm.description || null,
        estimatedMinutes: serviceForm.estimatedMinutes ? Number(serviceForm.estimatedMinutes) : null,
        isAddon: serviceForm.isAddon,
        priceMatrix,
      });
      if (res?.success || res?.status) { setShowServiceModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const submitPlan = async () => {
    setSaving(true);
    try {
      const res = await carwash.createPlan({
        name: planForm.name,
        planType: planForm.planType,
        price: Number(planForm.price || 0),
        washCount: planForm.washCount ? Number(planForm.washCount) : null,
        validityDays: planForm.validityDays ? Number(planForm.validityDays) : null,
      });
      if (res?.success || res?.status) { setShowPlanModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const submitSell = async () => {
    setSaving(true);
    try {
      const res = await carwash.sellMembership({
        customerId: sellForm.customerId,
        planId: sellForm.planId,
        vehiclePlate: sellForm.vehiclePlate || null,
        paidAmount: Number(sellForm.paidAmount || 0),
      });
      if (res?.success || res?.status) { setShowSellModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const setJobStatus = async (id: string, status: string) => {
    await carwash.updateJob(id, { status });
    loadAll();
  };

  const toggleService = (id: string) => {
    setJobForm((f: any) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s: string) => s !== id) : [...f.serviceIds, id],
    }));
  };

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Droplets className="w-6 h-6" /> Car Wash</h1>
          <p className="text-sm text-muted-foreground">Queue, services, packages & memberships</p>
        </div>
        <Button variant="outline" onClick={loadAll}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Today's Jobs", value: stats?.todayJobs ?? 0 },
          { label: 'Waiting', value: stats?.waiting ?? 0 },
          { label: 'In Progress', value: stats?.inProgress ?? 0 },
          { label: 'Ready', value: stats?.ready ?? 0 },
          { label: "Today's Revenue", value: `Rs ${Number(stats?.todayRevenue ?? 0).toLocaleString()}` },
          { label: 'Active Members', value: stats?.activeMemberships ?? 0 },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Plate lookup */}
      <Card><CardContent className="p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-xs">
            <Label>Number Plate Lookup</Label>
            <Input placeholder="e.g. CAB-1234" value={plateQuery} onChange={(e) => setPlateQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doPlateLookup()} />
          </div>
          <Button onClick={doPlateLookup}><Search className="w-4 h-4 mr-1" /> Lookup</Button>
        </div>
        {plateResult && (
          <div className="mt-3 text-sm">
            <p className="font-semibold">{plateResult.plate}</p>
            <p>Active memberships: {plateResult.activeMemberships?.length ?? 0}
              {plateResult.activeMemberships?.map((m: any) => ` — ${m.plan?.name} (${m.remainingWashes ?? '∞'} left, ${m.customer?.name})`)}
            </p>
            <p>Recent visits: {plateResult.recentJobs?.length ?? 0}</p>
          </div>
        )}
      </CardContent></Card>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue"><ListChecks className="w-4 h-4 mr-1" /> Queue</TabsTrigger>
          <TabsTrigger value="services"><Droplets className="w-4 h-4 mr-1" /> Services</TabsTrigger>
          <TabsTrigger value="memberships"><CreditCard className="w-4 h-4 mr-1" /> Memberships</TabsTrigger>
          <TabsTrigger value="performance" onClick={() => loadPerformance()}><Users className="w-4 h-4 mr-1" /> Staff Performance</TabsTrigger>
        </TabsList>

        {/* QUEUE */}
        <TabsContent value="queue" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { loadCustomers(); setShowJobModal(true); }}><Plus className="w-4 h-4 mr-1" /> New Wash Job</Button>
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
                        onChange={async (e) => { await carwash.updateJob(j.id, { bayId: e.target.value || null }); loadAll(); }}>
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
        </TabsContent>

        {/* SERVICES */}
        <TabsContent value="services" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowServiceModal(true)}><Plus className="w-4 h-4 mr-1" /> Add Service</Button>
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
                      <td key={c} className="p-3">{s.priceMatrix?.[c] != null ? `Rs ${Number(s.priceMatrix[c]).toLocaleString()}` : '—'}</td>
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
        </TabsContent>

        {/* MEMBERSHIPS */}
        <TabsContent value="memberships" className="space-y-3">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPlanModal(true)}><Plus className="w-4 h-4 mr-1" /> New Plan</Button>
            <Button onClick={() => { loadCustomers(); setShowSellModal(true); }}><Plus className="w-4 h-4 mr-1" /> Sell Membership</Button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {plans.map((p: any) => (
              <Card key={p.id}><CardContent className="p-4">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.planType === 'PREPAID_COUNT' ? `${p.washCount} washes` : `Unlimited / ${p.validityDays ?? 30} days`}</p>
                <p className="text-lg font-bold mt-1">Rs {Number(p.price).toLocaleString()}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Plate</th>
                  <th className="p-3">Remaining</th><th className="p-3">Expiry</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m: any) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{m.customer?.name || '—'}</td>
                    <td className="p-3">{m.plan?.name || '—'}</td>
                    <td className="p-3">{m.vehiclePlate || '—'}</td>
                    <td className="p-3">{m.remainingWashes ?? '∞'} <span className="text-xs text-muted-foreground">(used {m.usedWashes})</span></td>
                    <td className="p-3">{m.expiryDate || '—'}</td>
                    <td className="p-3"><Badge className={statusColor[m.status] || ''}>{m.status}</Badge></td>
                  </tr>
                ))}
                {memberships.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No memberships sold yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* STAFF PERFORMANCE */}
        <TabsContent value="performance" className="space-y-3">
          <div className="flex items-end gap-2">
            <div>
              <Label>Commission %</Label>
              <Input type="number" className="w-28" value={perfCommission} onChange={(e) => setPerfCommission(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => loadPerformance(perfCommission)}>
              <RefreshCw className="w-4 h-4 mr-1" /> Recalculate
            </Button>
            {performance && (
              <span className="text-sm text-muted-foreground pb-2">
                {performance.from} → {performance.to} | {performance.totalJobs} completed washes
              </span>
            )}
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Staff</th><th className="p-3">Washes</th>
                  <th className="p-3">Revenue</th><th className="p-3">Commission ({performance?.commissionPercent ?? perfCommission}%)</th>
                </tr>
              </thead>
              <tbody>
                {(performance?.staff ?? []).map((s: any) => (
                  <tr key={s.staff?.id} className="border-t">
                    <td className="p-3 font-medium">{s.staff?.staffId || s.staff?.id}</td>
                    <td className="p-3">{s.jobCount}</td>
                    <td className="p-3">Rs {Number(s.revenue).toLocaleString()}</td>
                    <td className="p-3 font-semibold">Rs {Number(s.commission).toLocaleString()}</td>
                  </tr>
                ))}
                {(!performance || performance.staff?.length === 0) && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No completed washes with assigned staff in this period</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

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

      {/* New service dialog */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Wash Service</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estimated Minutes</Label><Input type="number" value={serviceForm.estimatedMinutes} onChange={(e) => setServiceForm({ ...serviceForm, estimatedMinutes: e.target.value })} /></div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="isAddon" checked={serviceForm.isAddon} onChange={(e) => setServiceForm({ ...serviceForm, isAddon: e.target.checked })} />
                <Label htmlFor="isAddon">Add-on service</Label>
              </div>
            </div>
            <Label>Prices per vehicle size (Rs)</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_SIZE_CLASSES.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <span className="w-32 text-xs">{c}</span>
                  <Input type="number" value={serviceForm.priceMatrix[c]}
                    onChange={(e) => setServiceForm({ ...serviceForm, priceMatrix: { ...serviceForm.priceMatrix, [c]: e.target.value } })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceModal(false)}>Cancel</Button>
            <Button onClick={submitService} disabled={saving || !serviceForm.name}>{saving ? 'Saving...' : 'Create Service'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New plan dialog */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Membership Plan</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <select className={selectCls} value={planForm.planType} onChange={(e) => setPlanForm({ ...planForm, planType: e.target.value })}>
                <option value="PREPAID_COUNT">Prepaid wash book</option>
                <option value="UNLIMITED_MONTHLY">Unlimited monthly</option>
              </select>
            </div>
            <div><Label>Price (Rs) *</Label><Input type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} /></div>
            {planForm.planType === 'PREPAID_COUNT' && (
              <div><Label>Wash Count *</Label><Input type="number" value={planForm.washCount} onChange={(e) => setPlanForm({ ...planForm, washCount: e.target.value })} /></div>
            )}
            <div><Label>Validity Days</Label><Input type="number" placeholder={planForm.planType === 'UNLIMITED_MONTHLY' ? '30' : 'No expiry'} value={planForm.validityDays} onChange={(e) => setPlanForm({ ...planForm, validityDays: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>Cancel</Button>
            <Button onClick={submitPlan} disabled={saving || !planForm.name || !planForm.price}>{saving ? 'Saving...' : 'Create Plan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell membership dialog */}
      <Dialog open={showSellModal} onOpenChange={setShowSellModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sell Membership</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Customer *</Label>
              <select className={selectCls} value={sellForm.customerId} onChange={(e) => setSellForm({ ...sellForm, customerId: e.target.value })}>
                <option value="">Select customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Plan *</Label>
              <select className={selectCls} value={sellForm.planId} onChange={(e) => {
                const plan = plans.find((p: any) => p.id === e.target.value);
                setSellForm({ ...sellForm, planId: e.target.value, paidAmount: plan ? String(plan.price) : sellForm.paidAmount });
              }}>
                <option value="">Select plan</option>
                {plans.filter((p: any) => p.isActive).map((p: any) => <option key={p.id} value={p.id}>{p.name} — Rs {Number(p.price).toLocaleString()}</option>)}
              </select>
            </div>
            <div><Label>Vehicle Plate</Label><Input value={sellForm.vehiclePlate} onChange={(e) => setSellForm({ ...sellForm, vehiclePlate: e.target.value })} /></div>
            <div><Label>Paid Amount (Rs) *</Label><Input type="number" value={sellForm.paidAmount} onChange={(e) => setSellForm({ ...sellForm, paidAmount: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSellModal(false)}>Cancel</Button>
            <Button onClick={submitSell} disabled={saving || !sellForm.customerId || !sellForm.planId}>{saving ? 'Saving...' : 'Sell'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
