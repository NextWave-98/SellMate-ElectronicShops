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
import PhotoUploadInput from '../../../components/common/PhotoUploadInput';
import { useTradeIn } from '../../../hooks/useTradeIn';
import { useCustomer } from '../../../hooks';
import { selectCls, statusColor, NEXT_ACTIONS, type TradeInOutletContext } from './shared';

/** Trade-in pipeline: quote → buy → refurbish → relist. */
export default function TradeInsListPage() {
  const { refreshStats } = useOutletContext<TradeInOutletContext>();
  const tradein = useTradeIn();
  const { getTradeIns } = tradein;
  const { getCustomers } = useCustomer();

  const [loading, setLoading] = useState(true);
  const [tradeIns, setTradeIns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [relistTarget, setRelistTarget] = useState<any>(null);
  const [relistPrice, setRelistPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    customerId: '', brand: '', model: '', imeiOrSerial: '', grade: 'B', quotedAmount: '', notes: '', photos: [] as string[],
  });
  const [quoteHint, setQuoteHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTradeIns({ limit: 100 });
      setTradeIns((res?.data as any)?.tradeIns ?? []);
    } finally {
      setLoading(false);
    }
  }, [getTradeIns]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = async () => {
    setShowModal(true);
    const res = await getCustomers({ limit: 200 } as any);
    setCustomers((res?.data as any)?.customers ?? (Array.isArray(res?.data) ? res?.data : []));
  };

  // Auto quote when brand/model/grade filled
  const fetchQuote = async () => {
    if (!form.brand || !form.model) return;
    const res = await tradein.getQuote(form.brand, form.model, form.grade);
    const data = res?.data as any;
    if (data?.found && data.suggestedPrice != null) {
      setQuoteHint(`Suggested price (grade ${form.grade}): Rs ${Number(data.suggestedPrice).toLocaleString()}`);
      setForm((f: any) => ({ ...f, quotedAmount: f.quotedAmount || String(data.suggestedPrice) }));
    } else {
      setQuoteHint('No price rule found for this model — enter a manual quote');
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await tradein.createTradeIn({
        ...form,
        customerId: form.customerId || null,
        quotedAmount: Number(form.quotedAmount || 0),
      });
      if (res?.success || res?.status) { setShowModal(false); setQuoteHint(null); load(); refreshStats(); }
    } finally { setSaving(false); }
  };

  const setStatus = async (t: any, status: string) => {
    const payload: any = { status };
    if (status === 'ACCEPTED') payload.dataWipeConfirmed = true;
    await tradein.updateTradeIn(t.id, payload);
    load();
    refreshStats();
  };

  const submitRelist = async () => {
    if (!relistTarget) return;
    setSaving(true);
    try {
      const res = await tradein.relistTradeIn(relistTarget.id, { unitPrice: Number(relistPrice || 0) });
      if (res?.success || res?.status) { setRelistTarget(null); setRelistPrice(''); load(); refreshStats(); }
    } finally { setSaving(false); }
  };

  if (loading && tradeIns.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openModal}><Plus className="w-4 h-4 mr-1" /> New Trade-In</Button>
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

      {/* New trade-in dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Trade-In</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Customer (optional)</Label>
              <select className={selectCls} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Walk-in</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Brand *</Label><Input value={form.brand} onBlur={fetchQuote} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Model *</Label><Input value={form.model} onBlur={fetchQuote} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>IMEI / Serial</Label><Input value={form.imeiOrSerial} onChange={(e) => setForm({ ...form, imeiOrSerial: e.target.value })} /></div>
            <div><Label>Condition Grade</Label>
              <select className={selectCls} value={form.grade} onChange={(e) => { setForm({ ...form, grade: e.target.value }); }}>
                <option value="A">A — Like new</option>
                <option value="B">B — Minor wear</option>
                <option value="C">C — Visible wear / faults</option>
                <option value="D">D — Damaged / parts</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label>Quoted Amount (Rs) *</Label>
              <Input type="number" value={form.quotedAmount} onChange={(e) => setForm({ ...form, quotedAmount: e.target.value })} />
              {quoteHint && <p className="text-xs text-muted-foreground mt-1">{quoteHint}</p>}
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="col-span-2">
              <PhotoUploadInput
                label="Device Photos"
                folder="trade-ins"
                photos={form.photos}
                onChange={(photos) => setForm({ ...form, photos })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.brand || !form.model || !form.quotedAmount}>
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
    </div>
  );
}
