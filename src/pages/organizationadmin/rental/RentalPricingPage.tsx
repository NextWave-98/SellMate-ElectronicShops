/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, CalendarOff, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useRental, VEHICLE_CLASSES } from '../../../hooks/useRental';
import { selectCls } from './shared';

const RATE_TYPES = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'];

/** Pricing engine: rate plans, price rules, extra fees & coupons. */
export default function RentalPricingPage() {
  const rental = useRental();
  const { getPricingRules, getExtraFees, getCoupons, getRatePlans, getBlockedDays } = rental;

  const [loading, setLoading] = useState(true);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [extraFees, setExtraFees] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [ratePlans, setRatePlans] = useState<any[]>([]);
  const [blockedDays, setBlockedDays] = useState<any[]>([]);
  const [blockForm, setBlockForm] = useState({ date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [ruleForm, setRuleForm] = useState<any>({ name: '', ruleType: 'WEEKEND', vehicleClass: '', multiplier: '', flatAddition: '', startDate: '', endDate: '' });
  const [feeForm, setFeeForm] = useState<any>({ name: '', amount: '', perDay: false });
  const [couponForm, setCouponForm] = useState<any>({ code: '', discountType: 'PERCENT', value: '', validFrom: '', validTo: '', maxUses: '' });
  const [planForm, setPlanForm] = useState<any>({
    name: '', vehicleClass: '', rateType: 'DAILY', baseRate: '', withDriverRate: '',
    includedKm: '', excessKmRate: '', depositAmount: '', lateFeePerHour: '', fuelStepCharge: '',
    durationTiers: [] as any[],
  });

  /** Duration tiers: cheaper per-day rate the longer the rental runs. */
  const setTier = (idx: number, key: string, value: string) =>
    setPlanForm((prev: any) => ({
      ...prev,
      durationTiers: prev.durationTiers.map((t: any, i: number) => (i === idx ? { ...t, [key]: value } : t)),
    }));

  const addTier = () =>
    setPlanForm((prev: any) => {
      const last = prev.durationTiers[prev.durationTiers.length - 1];
      const nextMin = last?.maxDays ? Number(last.maxDays) + 1 : (prev.durationTiers.length === 0 ? 1 : '');
      return { ...prev, durationTiers: [...prev.durationTiers, { minDays: String(nextMin || ''), maxDays: '', rate: '', withDriverRate: '' }] };
    });

  const removeTier = (idx: number) =>
    setPlanForm((prev: any) => ({ ...prev, durationTiers: prev.durationTiers.filter((_: any, i: number) => i !== idx) }));

  /** SL default ladder — 1–3d full rate, 4–6d ~8% off, 7d+ ~15% off. */
  const applyTierPreset = () => {
    const base = Number(planForm.baseRate || 0);
    if (!base) return;
    setPlanForm((prev: any) => ({
      ...prev,
      durationTiers: [
        { minDays: '1', maxDays: '3', rate: String(base), withDriverRate: '' },
        { minDays: '4', maxDays: '6', rate: String(Math.round(base * 0.92)), withDriverRate: '' },
        { minDays: '7', maxDays: '', rate: String(Math.round(base * 0.85)), withDriverRate: '' },
      ],
    }));
  };

  /** Tiers must be complete and non-overlapping before we let the plan save. */
  const tierError = (() => {
    const tiers = planForm.durationTiers as any[];
    if (!tiers.length) return null;
    const parsed = tiers.map((t) => ({
      minDays: Number(t.minDays),
      maxDays: t.maxDays === '' || t.maxDays == null ? null : Number(t.maxDays),
      rate: Number(t.rate),
    }));
    if (parsed.some((t) => !t.minDays || t.minDays < 1 || !t.rate || t.rate < 0)) {
      return 'Every tier needs a min days (≥1) and a rate.';
    }
    if (parsed.some((t) => t.maxDays != null && t.maxDays < t.minDays)) {
      return 'A tier’s max days cannot be less than its min days.';
    }
    if (parsed.filter((t) => t.maxDays == null).length > 1) {
      return 'Only the last tier can be open-ended (blank max days).';
    }
    const sorted = [...parsed].sort((a, b) => a.minDays - b.minDays);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      if (prev.maxDays == null || sorted[i].minDays <= prev.maxDays) return 'Tier day ranges overlap.';
    }
    return null;
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, feesRes, couponsRes, plansRes, blockedRes] = await Promise.all([
        getPricingRules(), getExtraFees(), getCoupons(), getRatePlans(), getBlockedDays(),
      ]);
      setPricingRules((rulesRes?.data as any) ?? []);
      setExtraFees((feesRes?.data as any) ?? []);
      setCoupons((couponsRes?.data as any) ?? []);
      setRatePlans((plansRes?.data as any) ?? []);
      setBlockedDays((blockedRes?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getPricingRules, getExtraFees, getCoupons, getRatePlans]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitRule = async () => {
    setSaving(true);
    try {
      const res = await rental.createPricingRule({
        name: ruleForm.name,
        ruleType: ruleForm.ruleType,
        vehicleClass: ruleForm.vehicleClass || null,
        multiplier: ruleForm.multiplier ? Number(ruleForm.multiplier) : null,
        flatAddition: ruleForm.flatAddition ? Number(ruleForm.flatAddition) : null,
        startDate: ruleForm.startDate || null,
        endDate: ruleForm.endDate || null,
      });
      if (res?.success || res?.status) { setShowRuleModal(false); load(); }
    } finally { setSaving(false); }
  };

  const submitFee = async () => {
    setSaving(true);
    try {
      const res = await rental.createExtraFee({ name: feeForm.name, amount: Number(feeForm.amount || 0), perDay: feeForm.perDay });
      if (res?.success || res?.status) { setShowFeeModal(false); load(); }
    } finally { setSaving(false); }
  };

  const submitCoupon = async () => {
    setSaving(true);
    try {
      const res = await rental.createCoupon({
        code: couponForm.code,
        discountType: couponForm.discountType,
        value: Number(couponForm.value || 0),
        validFrom: couponForm.validFrom || null,
        validTo: couponForm.validTo || null,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null,
      });
      if (res?.success || res?.status) { setShowCouponModal(false); load(); }
    } finally { setSaving(false); }
  };

  const submitPlan = async () => {
    setSaving(true);
    try {
      const res = await rental.createRatePlan({
        name: planForm.name,
        vehicleClass: planForm.vehicleClass || null,
        rateType: planForm.rateType,
        baseRate: Number(planForm.baseRate || 0),
        withDriverRate: planForm.withDriverRate ? Number(planForm.withDriverRate) : null,
        includedKm: planForm.includedKm ? Number(planForm.includedKm) : null,
        excessKmRate: planForm.excessKmRate ? Number(planForm.excessKmRate) : null,
        depositAmount: planForm.depositAmount ? Number(planForm.depositAmount) : null,
        lateFeePerHour: planForm.lateFeePerHour ? Number(planForm.lateFeePerHour) : null,
        fuelStepCharge: planForm.fuelStepCharge ? Number(planForm.fuelStepCharge) : null,
        durationTiers: planForm.durationTiers.length
          ? planForm.durationTiers.map((t: any) => ({
              minDays: Number(t.minDays),
              maxDays: t.maxDays === '' || t.maxDays == null ? null : Number(t.maxDays),
              rate: Number(t.rate),
              withDriverRate: t.withDriverRate ? Number(t.withDriverRate) : null,
            }))
          : null,
      });
      if (res?.success || res?.status) { setShowPlanModal(false); load(); }
    } finally { setSaving(false); }
  };

  if (loading && pricingRules.length === 0 && ratePlans.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Rate plans */}
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm">Rate Plans (base pricing per class / vehicle)</p>
          <Button size="sm" onClick={() => setShowPlanModal(true)}><Plus className="w-3 h-3 mr-1" /> Rate Plan</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-2">Name</th><th className="p-2">Class</th><th className="p-2">Type</th><th className="p-2">Base Rate</th><th className="p-2">With Driver</th><th className="p-2">Included Km</th><th className="p-2">Deposit</th><th className="p-2">Active</th></tr>
          </thead>
          <tbody>
            {ratePlans.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2">{p.vehicleClass || 'All'}</td>
                <td className="p-2"><Badge variant="outline">{p.rateType}</Badge></td>
                <td className="p-2">
                  Rs {Number(p.baseRate).toLocaleString()}
                  {(p.durationTiers?.length ?? 0) > 0 && (
                    <span className="block text-[11px] text-muted-foreground">
                      {p.durationTiers.map((t: any) => `${t.minDays}${t.maxDays == null ? '+' : `–${t.maxDays}`}d: ${Number(t.rate).toLocaleString()}`).join(' · ')}
                    </span>
                  )}
                </td>
                <td className="p-2">{p.withDriverRate != null ? `Rs ${Number(p.withDriverRate).toLocaleString()}` : '—'}</td>
                <td className="p-2">{p.includedKm != null ? `${p.includedKm} km` : '—'}</td>
                <td className="p-2">{p.depositAmount != null ? `Rs ${Number(p.depositAmount).toLocaleString()}` : '—'}</td>
                <td className="p-2">
                  <input type="checkbox" checked={p.isActive} onChange={async () => { await rental.updateRatePlan(p.id, { isActive: !p.isActive }); load(); }} />
                </td>
              </tr>
            ))}
            {ratePlans.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No rate plans yet</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Rules */}
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm">Price Rules (weekend / holiday / seasonal)</p>
          <Button size="sm" onClick={() => setShowRuleModal(true)}><Plus className="w-3 h-3 mr-1" /> Rule</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Class</th><th className="p-2">Adjustment</th><th className="p-2">Period</th><th className="p-2">Active</th></tr>
          </thead>
          <tbody>
            {pricingRules.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-medium">{r.name}</td>
                <td className="p-2"><Badge variant="outline">{r.ruleType}</Badge></td>
                <td className="p-2">{r.vehicleClass || 'All'}</td>
                <td className="p-2">{r.multiplier ? `× ${r.multiplier}` : ''} {r.flatAddition ? `+Rs ${Number(r.flatAddition).toLocaleString()}/day` : ''}</td>
                <td className="p-2">{r.ruleType === 'WEEKEND' ? 'Sat & Sun' : `${r.startDate || '—'} → ${r.endDate || '—'}`}</td>
                <td className="p-2">
                  <input type="checkbox" checked={r.isActive} onChange={async () => { await rental.updatePricingRule(r.id, { isActive: !r.isActive }); load(); }} />
                </td>
              </tr>
            ))}
            {pricingRules.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No price rules</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Fees */}
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm">Extra Fees (airport pickup, delivery, baby seat...)</p>
          <Button size="sm" onClick={() => setShowFeeModal(true)}><Plus className="w-3 h-3 mr-1" /> Fee</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {extraFees.map((f) => (
            <Badge key={f.id} variant="outline" className={`text-xs py-1.5 px-3 cursor-pointer ${f.isActive ? '' : 'opacity-50 line-through'}`}
              onClick={async () => { await rental.updateExtraFee(f.id, { isActive: !f.isActive }); load(); }}>
              {f.name}: Rs {Number(f.amount).toLocaleString()}{f.perDay ? '/day' : ''}
            </Badge>
          ))}
          {extraFees.length === 0 && <p className="text-sm text-muted-foreground">No extra fees configured</p>}
        </div>
        {extraFees.length > 0 && <p className="text-[11px] text-muted-foreground mt-2">Tip: click a fee to enable / disable it.</p>}
      </CardContent></Card>

      {/* Coupons */}
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm">Coupons</p>
          <Button size="sm" onClick={() => setShowCouponModal(true)}><Plus className="w-3 h-3 mr-1" /> Coupon</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-2">Code</th><th className="p-2">Discount</th><th className="p-2">Valid</th><th className="p-2">Used</th><th className="p-2">Active</th></tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-mono font-bold">{c.code}</td>
                <td className="p-2">{c.discountType === 'PERCENT' ? `${c.value}%` : `Rs ${Number(c.value).toLocaleString()}`}</td>
                <td className="p-2">{c.validFrom || '—'} → {c.validTo || '—'}</td>
                <td className="p-2">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td className="p-2">
                  <input type="checkbox" checked={c.isActive} onChange={async () => { await rental.updateCoupon(c.id, { isActive: !c.isActive }); load(); }} />
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No coupons</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Blocked days (holidays / Poya) */}
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm flex items-center gap-1.5"><CalendarOff className="w-4 h-4" /> Blocked Days (no pickups / returns)</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <div><Label>Date</Label><Input type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} /></div>
          <div className="flex-1 min-w-40"><Label>Reason</Label><Input placeholder="e.g. Poya day / Public holiday" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} /></div>
          <Button size="sm" disabled={!blockForm.date}
            onClick={async () => {
              const res = await rental.createBlockedDay(blockForm.date, blockForm.reason || undefined);
              if (res?.success || res?.status) { setBlockForm({ date: '', reason: '' }); load(); }
            }}>
            <Plus className="w-3 h-3 mr-1" /> Block Day
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {blockedDays.map((d) => (
            <Badge key={d.id} variant="outline" className="text-xs py-1.5 px-3 gap-1.5">
              {d.date}{d.reason ? ` — ${d.reason}` : ''}
              <button onClick={async () => { await rental.deleteBlockedDay(d.id); load(); }}>
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </Badge>
          ))}
          {blockedDays.length === 0 && <p className="text-sm text-muted-foreground">No blocked days — bookings allowed on all dates.</p>}
        </div>
      </CardContent></Card>

      {/* Rate plan dialog */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Rate Plan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input placeholder="e.g. Sedan Daily Standard" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} /></div>
            <div><Label>Vehicle Class</Label>
              <select className={selectCls} value={planForm.vehicleClass} onChange={(e) => setPlanForm({ ...planForm, vehicleClass: e.target.value })}>
                <option value="">All classes</option>
                {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Rate Type</Label>
              <select className={selectCls} value={planForm.rateType} onChange={(e) => setPlanForm({ ...planForm, rateType: e.target.value })}>
                {RATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Base Rate (Rs) *</Label><Input type="number" value={planForm.baseRate} onChange={(e) => setPlanForm({ ...planForm, baseRate: e.target.value })} /></div>
            <div><Label>With-Driver Rate (Rs)</Label><Input type="number" value={planForm.withDriverRate} onChange={(e) => setPlanForm({ ...planForm, withDriverRate: e.target.value })} /></div>
            <div><Label>Included Km</Label><Input type="number" value={planForm.includedKm} onChange={(e) => setPlanForm({ ...planForm, includedKm: e.target.value })} /></div>
            <div><Label>Excess Km Rate (Rs)</Label><Input type="number" value={planForm.excessKmRate} onChange={(e) => setPlanForm({ ...planForm, excessKmRate: e.target.value })} /></div>
            <div><Label>Deposit (Rs)</Label><Input type="number" value={planForm.depositAmount} onChange={(e) => setPlanForm({ ...planForm, depositAmount: e.target.value })} /></div>
            <div><Label>Late Fee / Hour (Rs)</Label><Input type="number" value={planForm.lateFeePerHour} onChange={(e) => setPlanForm({ ...planForm, lateFeePerHour: e.target.value })} /></div>
            <div><Label>Fuel Charge / Gauge Step (Rs)</Label><Input type="number" placeholder="e.g. 3000 per ¼ tank" value={planForm.fuelStepCharge} onChange={(e) => setPlanForm({ ...planForm, fuelStepCharge: e.target.value })} /></div>

            {/* Duration tiers — cheaper day rate for longer rentals */}
            <div className="col-span-2 border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Duration Tiers</Label>
                  <p className="text-[11px] text-muted-foreground">Optional. Leave empty to charge the base rate for every day.</p>
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={applyTierPreset} disabled={!planForm.baseRate}>
                    Preset 1–3 / 4–6 / 7+
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addTier}>
                    <Plus className="w-3 h-3 mr-1" /> Tier
                  </Button>
                </div>
              </div>

              {planForm.durationTiers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[1fr_1fr_1.3fr_1.3fr_auto] gap-1.5 text-[11px] text-muted-foreground">
                    <span>Min days</span><span>Max days</span><span>Rate / day (Rs)</span><span>With driver (Rs)</span><span />
                  </div>
                  {planForm.durationTiers.map((t: any, i: number) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1.3fr_1.3fr_auto] gap-1.5 items-center">
                      <Input className="h-8" type="number" min={1} value={t.minDays} onChange={(e) => setTier(i, 'minDays', e.target.value)} />
                      <Input className="h-8" type="number" min={1} placeholder="∞" value={t.maxDays} onChange={(e) => setTier(i, 'maxDays', e.target.value)} />
                      <Input className="h-8" type="number" value={t.rate} onChange={(e) => setTier(i, 'rate', e.target.value)} />
                      <Input className="h-8" type="number" placeholder="optional" value={t.withDriverRate} onChange={(e) => setTier(i, 'withDriverRate', e.target.value)} />
                      <button type="button" onClick={() => removeTier(i)} className="px-1"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">Blank max days = “and above”. The last tier should be open-ended.</p>
                  {tierError && <p className="text-[11px] text-red-600">{tierError}</p>}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>Cancel</Button>
            <Button onClick={submitPlan} disabled={saving || !planForm.name || planForm.baseRate === '' || Boolean(tierError)}>
              {saving ? 'Saving...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing rule dialog */}
      <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Price Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input placeholder="e.g. Weekend surcharge / December season" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <select className={selectCls} value={ruleForm.ruleType} onChange={(e) => setRuleForm({ ...ruleForm, ruleType: e.target.value })}>
                <option value="WEEKEND">Weekend (Sat/Sun)</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="SEASONAL">Seasonal</option>
              </select>
            </div>
            <div><Label>Vehicle Class</Label>
              <select className={selectCls} value={ruleForm.vehicleClass} onChange={(e) => setRuleForm({ ...ruleForm, vehicleClass: e.target.value })}>
                <option value="">All classes</option>
                {VEHICLE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Multiplier (e.g. 1.25 = +25%)</Label><Input type="number" step="0.05" value={ruleForm.multiplier} onChange={(e) => setRuleForm({ ...ruleForm, multiplier: e.target.value })} /></div>
            <div><Label>OR Flat addition (Rs/day)</Label><Input type="number" value={ruleForm.flatAddition} onChange={(e) => setRuleForm({ ...ruleForm, flatAddition: e.target.value })} /></div>
            {ruleForm.ruleType !== 'WEEKEND' && (
              <>
                <div><Label>Start Date *</Label><Input type="date" value={ruleForm.startDate} onChange={(e) => setRuleForm({ ...ruleForm, startDate: e.target.value })} /></div>
                <div><Label>End Date *</Label><Input type="date" value={ruleForm.endDate} onChange={(e) => setRuleForm({ ...ruleForm, endDate: e.target.value })} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleModal(false)}>Cancel</Button>
            <Button onClick={submitRule} disabled={saving || !ruleForm.name || (!ruleForm.multiplier && !ruleForm.flatAddition)}>
              {saving ? 'Saving...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee dialog */}
      <Dialog open={showFeeModal} onOpenChange={setShowFeeModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Extra Fee</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input placeholder="e.g. Airport Pickup / Baby Seat" value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} /></div>
            <div><Label>Amount (Rs) *</Label><Input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="perDay" checked={feeForm.perDay} onChange={(e) => setFeeForm({ ...feeForm, perDay: e.target.checked })} />
              <Label htmlFor="perDay">Charge per day (otherwise one-time)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeModal(false)}>Cancel</Button>
            <Button onClick={submitFee} disabled={saving || !feeForm.name || !feeForm.amount}>{saving ? 'Saving...' : 'Create Fee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon dialog */}
      <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Coupon</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input placeholder="NEWYEAR25" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Type</Label>
              <select className={selectCls} value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}>
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed (Rs)</option>
              </select>
            </div>
            <div><Label>Value *</Label><Input type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} /></div>
            <div><Label>Max Uses</Label><Input type="number" value={couponForm.maxUses} onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })} /></div>
            <div><Label>Valid From</Label><Input type="date" value={couponForm.validFrom} onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })} /></div>
            <div><Label>Valid To</Label><Input type="date" value={couponForm.validTo} onChange={(e) => setCouponForm({ ...couponForm, validTo: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCouponModal(false)}>Cancel</Button>
            <Button onClick={submitCoupon} disabled={saving || !couponForm.code || !couponForm.value}>{saving ? 'Saving...' : 'Create Coupon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
