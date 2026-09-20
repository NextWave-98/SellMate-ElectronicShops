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
import { useCarWash } from '../../../hooks/useCarWash';
import { useCustomer } from '../../../hooks';
import { selectCls, statusColor, type CarWashOutletContext } from './shared';

/** Membership plans + sold memberships. */
export default function CarWashMembershipsPage() {
  const { refreshStats } = useOutletContext<CarWashOutletContext>();
  const carwash = useCarWash();
  const { getPlans, getMemberships } = carwash;
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState<any>({
    name: '', planType: 'PREPAID_COUNT', price: '', washCount: '', validityDays: '',
  });
  const [sellForm, setSellForm] = useState<any>({ customerId: '', planId: '', vehiclePlate: '', paidAmount: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, memRes] = await Promise.all([getPlans(), getMemberships()]);
      setPlans((plansRes?.data as any) ?? []);
      setMemberships((memRes?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getPlans, getMemberships]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSellModal = async () => {
    setShowSellModal(true);
    const res = await getCustomers({ limit: 200 } as any);
    setCustomers((res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []));
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
      if (res?.success || res?.status) { setShowPlanModal(false); load(); }
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
      if (res?.success || res?.status) { setShowSellModal(false); load(); refreshStats(); }
    } finally { setSaving(false); }
  };

  if (loading && plans.length === 0 && memberships.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowPlanModal(true)}><Plus className="w-4 h-4 mr-1" /> New Plan</Button>
        <Button onClick={openSellModal}><Plus className="w-4 h-4 mr-1" /> Sell Membership</Button>
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
                <td className="p-3">{m.customer?.name || ' '}</td>
                <td className="p-3">{m.plan?.name || ' '}</td>
                <td className="p-3">{m.vehiclePlate || ' '}</td>
                <td className="p-3">{m.remainingWashes ?? '∞'} <span className="text-xs text-muted-foreground">(used {m.usedWashes})</span></td>
                <td className="p-3">{m.expiryDate || ' '}</td>
                <td className="p-3"><Badge className={statusColor[m.status] || ''}>{m.status}</Badge></td>
              </tr>
            ))}
            {memberships.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No memberships sold yet</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>

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
                {plans.filter((p: any) => p.isActive).map((p: any) => <option key={p.id} value={p.id}>{p.name}   Rs {Number(p.price).toLocaleString()}</option>)}
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
