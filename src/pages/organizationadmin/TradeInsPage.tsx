/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Smartphone, Tags, RefreshCw, Plus, Trash2 } from 'lucide-react';
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
import PhotoUploadInput from '../../components/common/PhotoUploadInput';
import { useTradeIn } from '../../hooks/useTradeIn';
import { useCustomer } from '../../hooks';

const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

const GRADES = ['A', 'B', 'C', 'D'] as const;

const statusColor: Record<string, string> = {
  QUOTED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-sky-100 text-sky-800',
  REJECTED: 'bg-red-100 text-red-800',
  REFURBISHING: 'bg-blue-100 text-blue-800',
  READY_FOR_SALE: 'bg-green-100 text-green-800',
  SOLD: 'bg-gray-200 text-gray-700',
};

const NEXT_ACTIONS: Record<string, { label: string; status: string; variant?: any }[]> = {
  QUOTED: [
    { label: 'Accept (Buy)', status: 'ACCEPTED' },
    { label: 'Reject', status: 'REJECTED', variant: 'destructive' },
  ],
  ACCEPTED: [{ label: 'Send to Refurb', status: 'REFURBISHING' }, { label: 'Ready for Sale', status: 'READY_FOR_SALE' }],
  REFURBISHING: [{ label: 'Ready for Sale', status: 'READY_FOR_SALE' }],
  READY_FOR_SALE: [{ label: 'Mark Sold', status: 'SOLD' }],
};

export default function TradeInsPage() {
  const tradein = useTradeIn();
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tradeIns, setTradeIns] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [showTradeInModal, setShowTradeInModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [relistTarget, setRelistTarget] = useState<any>(null);
  const [relistPrice, setRelistPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const [tradeInForm, setTradeInForm] = useState<any>({
    customerId: '', brand: '', model: '', imeiOrSerial: '', grade: 'B', quotedAmount: '', notes: '', photos: [] as string[],
  });
  const [ruleForm, setRuleForm] = useState<any>({
    brand: '', model: '', variant: '', gradePrices: { A: '', B: '', C: '', D: '' },
  });
  const [quoteHint, setQuoteHint] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, tradeInsRes, rulesRes] = await Promise.all([
        tradein.getStats(),
        tradein.getTradeIns({ limit: 100 }),
        tradein.getRules(),
      ]);
      setStats(statsRes?.data ?? null);
      setTradeIns((tradeInsRes?.data as any)?.tradeIns ?? []);
      setRules((rulesRes?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [tradein]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = useCallback(async () => {
    const res = await getCustomers({ limit: 200 } as any);
    setCustomers((res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []));
  }, [getCustomers]);

  // Auto quote when brand/model/grade filled
  const fetchQuote = async () => {
    if (!tradeInForm.brand || !tradeInForm.model) return;
    const res = await tradein.getQuote(tradeInForm.brand, tradeInForm.model, tradeInForm.grade);
    const data = res?.data as any;
    if (data?.found && data.suggestedPrice != null) {
      setQuoteHint(`Suggested price (grade ${tradeInForm.grade}): Rs ${Number(data.suggestedPrice).toLocaleString()}`);
      setTradeInForm((f: any) => ({ ...f, quotedAmount: f.quotedAmount || String(data.suggestedPrice) }));
    } else {
      setQuoteHint('No price rule found for this model — enter a manual quote');
    }
  };

  const submitTradeIn = async () => {
    setSaving(true);
    try {
      const res = await tradein.createTradeIn({
        ...tradeInForm,
        customerId: tradeInForm.customerId || null,
        quotedAmount: Number(tradeInForm.quotedAmount || 0),
      });
      if (res?.success || res?.status) { setShowTradeInModal(false); setQuoteHint(null); loadAll(); }
    } finally { setSaving(false); }
  };

  const submitRule = async () => {
    setSaving(true);
    try {
      const gradePrices: Record<string, number> = {};
      Object.entries(ruleForm.gradePrices).forEach(([k, v]) => {
        if (v !== '' && v != null) gradePrices[k] = Number(v);
      });
      const res = await tradein.createRule({
        brand: ruleForm.brand,
        model: ruleForm.model,
        variant: ruleForm.variant || null,
        gradePrices,
      });
      if (res?.success || res?.status) { setShowRuleModal(false); loadAll(); }
    } finally { setSaving(false); }
  };

  const setStatus = async (t: any, status: string) => {
    const payload: any = { status };
    if (status === 'ACCEPTED') payload.dataWipeConfirmed = true;
    await tradein.updateTradeIn(t.id, payload);
    loadAll();
  };

  const submitRelist = async () => {
    if (!relistTarget) return;
    setSaving(true);
    try {
      const res = await tradein.relistTradeIn(relistTarget.id, { unitPrice: Number(relistPrice || 0) });
      if (res?.success || res?.status) { setRelistTarget(null); setRelistPrice(''); loadAll(); }
    } finally { setSaving(false); }
  };

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="w-6 h-6" /> Trade-In / Buyback</h1>
          <p className="text-sm text-muted-foreground">Buy used devices, refurbish and resell</p>
        </div>
        <Button variant="outline" onClick={loadAll}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open Quotes', value: stats?.quoted ?? 0 },
          { label: 'In Pipeline', value: stats?.inPipeline ?? 0 },
          { label: 'Ready for Sale', value: stats?.readyForSale ?? 0 },
          { label: 'Month Buyback Spend', value: `Rs ${Number(stats?.monthBuybackSpend ?? 0).toLocaleString()}` },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="tradeins">
        <TabsList>
          <TabsTrigger value="tradeins"><Smartphone className="w-4 h-4 mr-1" /> Trade-Ins</TabsTrigger>
          <TabsTrigger value="rules"><Tags className="w-4 h-4 mr-1" /> Price Rules</TabsTrigger>
        </TabsList>

        {/* TRADE-INS */}
        <TabsContent value="tradeins" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { loadCustomers(); setShowTradeInModal(true); }}><Plus className="w-4 h-4 mr-1" /> New Trade-In</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">#</th><th className="p-3">Device</th><th className="p-3">IMEI/Serial</th>
                  <th className="p-3">Grade</th><th className="p-3">Quoted</th><th className="p-3">Accepted</th>
                  <th className="p-3">Status</th><th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tradeIns.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3 font-medium">{t.tradeInNumber}</td>
                    <td className="p-3">{t.brand} {t.model}</td>
                    <td className="p-3">{t.imeiOrSerial || '—'}</td>
                    <td className="p-3"><Badge variant="outline">Grade {t.grade}</Badge></td>
                    <td className="p-3">Rs {Number(t.quotedAmount).toLocaleString()}</td>
                    <td className="p-3">{t.acceptedAmount != null ? `Rs ${Number(t.acceptedAmount).toLocaleString()}` : '—'}</td>
                    <td className="p-3"><Badge className={statusColor[t.status] || ''}>{t.status.replace(/_/g, ' ')}</Badge></td>
                    <td className="p-3 space-x-1">
                      {(NEXT_ACTIONS[t.status] ?? []).map((a) => (
                        <Button key={a.status} size="sm" variant={a.variant || 'outline'} onClick={() => setStatus(t, a.status)}>
                          {a.label}
                        </Button>
                      ))}
                      {(t.status === 'READY_FOR_SALE' || t.status === 'REFURBISHING') && !t.relistedProductId && (
                        <Button size="sm" onClick={() => { setRelistTarget(t); setRelistPrice(t.resalePrice ? String(t.resalePrice) : ''); }}>
                          Relist as Product
                        </Button>
                      )}
                      {t.relistedProductId && <Badge className="bg-green-100 text-green-800">In Stock</Badge>}
                    </td>
                  </tr>
                ))}
                {tradeIns.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No trade-ins yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* PRICE RULES */}
        <TabsContent value="rules" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowRuleModal(true)}><Plus className="w-4 h-4 mr-1" /> New Price Rule</Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Brand</th><th className="p-3">Model</th><th className="p-3">Variant</th>
                  {GRADES.map((g) => <th key={g} className="p-3">Grade {g}</th>)}
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.brand}</td>
                    <td className="p-3">{r.model}</td>
                    <td className="p-3">{r.variant || '—'}</td>
                    {GRADES.map((g) => (
                      <td key={g} className="p-3">{r.gradePrices?.[g] != null ? `Rs ${Number(r.gradePrices[g]).toLocaleString()}` : '—'}</td>
                    ))}
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={async () => { await tradein.deleteRule(r.id); loadAll(); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No price rules configured</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* New trade-in dialog */}
      <Dialog open={showTradeInModal} onOpenChange={setShowTradeInModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Trade-In</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Customer (optional)</Label>
              <select className={selectCls} value={tradeInForm.customerId} onChange={(e) => setTradeInForm({ ...tradeInForm, customerId: e.target.value })}>
                <option value="">Walk-in</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Brand *</Label><Input value={tradeInForm.brand} onBlur={fetchQuote} onChange={(e) => setTradeInForm({ ...tradeInForm, brand: e.target.value })} /></div>
            <div><Label>Model *</Label><Input value={tradeInForm.model} onBlur={fetchQuote} onChange={(e) => setTradeInForm({ ...tradeInForm, model: e.target.value })} /></div>
            <div><Label>IMEI / Serial</Label><Input value={tradeInForm.imeiOrSerial} onChange={(e) => setTradeInForm({ ...tradeInForm, imeiOrSerial: e.target.value })} /></div>
            <div><Label>Condition Grade</Label>
              <select className={selectCls} value={tradeInForm.grade} onChange={(e) => { setTradeInForm({ ...tradeInForm, grade: e.target.value }); }}>
                <option value="A">A — Like new</option>
                <option value="B">B — Minor wear</option>
                <option value="C">C — Visible wear / faults</option>
                <option value="D">D — Damaged / parts</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label>Quoted Amount (Rs) *</Label>
              <Input type="number" value={tradeInForm.quotedAmount} onChange={(e) => setTradeInForm({ ...tradeInForm, quotedAmount: e.target.value })} />
              {quoteHint && <p className="text-xs text-muted-foreground mt-1">{quoteHint}</p>}
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={tradeInForm.notes} onChange={(e) => setTradeInForm({ ...tradeInForm, notes: e.target.value })} /></div>
            <div className="col-span-2">
              <PhotoUploadInput
                label="Device Photos"
                folder="trade-ins"
                photos={tradeInForm.photos}
                onChange={(photos) => setTradeInForm({ ...tradeInForm, photos })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTradeInModal(false)}>Cancel</Button>
            <Button onClick={submitTradeIn} disabled={saving || !tradeInForm.brand || !tradeInForm.model || !tradeInForm.quotedAmount}>
              {saving ? 'Saving...' : 'Create Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relist dialog */}
      <Dialog open={!!relistTarget} onOpenChange={(open) => !open && setRelistTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Relist as Sellable Product</DialogTitle></DialogHeader>
          {relistTarget && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                {relistTarget.brand} {relistTarget.model} (Grade {relistTarget.grade})
                {relistTarget.imeiOrSerial ? ` — ${relistTarget.imeiOrSerial}` : ''}
                <br />
                Cost: Rs {Number(relistTarget.acceptedAmount ?? relistTarget.quotedAmount).toLocaleString()}
                {Number(relistTarget.refurbCost) > 0 && ` + refurb Rs ${Number(relistTarget.refurbCost).toLocaleString()}`}
              </p>
              <div>
                <Label>Resale Price (Rs) *</Label>
                <Input type="number" value={relistPrice} onChange={(e) => setRelistPrice(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelistTarget(null)}>Cancel</Button>
            <Button onClick={submitRelist} disabled={saving || !relistPrice || Number(relistPrice) <= 0}>
              {saving ? 'Saving...' : 'Relist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New rule dialog */}
      <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Buyback Price Rule</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Brand *</Label><Input value={ruleForm.brand} onChange={(e) => setRuleForm({ ...ruleForm, brand: e.target.value })} /></div>
              <div><Label>Model *</Label><Input value={ruleForm.model} onChange={(e) => setRuleForm({ ...ruleForm, model: e.target.value })} /></div>
            </div>
            <div><Label>Variant (e.g. 128GB)</Label><Input value={ruleForm.variant} onChange={(e) => setRuleForm({ ...ruleForm, variant: e.target.value })} /></div>
            <Label>Prices per grade (Rs)</Label>
            <div className="grid grid-cols-2 gap-2">
              {GRADES.map((g) => (
                <div key={g} className="flex items-center gap-2">
                  <span className="w-16 text-xs">Grade {g}</span>
                  <Input type="number" value={ruleForm.gradePrices[g]}
                    onChange={(e) => setRuleForm({ ...ruleForm, gradePrices: { ...ruleForm.gradePrices, [g]: e.target.value } })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleModal(false)}>Cancel</Button>
            <Button onClick={submitRule} disabled={saving || !ruleForm.brand || !ruleForm.model}>{saving ? 'Saving...' : 'Create Rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
