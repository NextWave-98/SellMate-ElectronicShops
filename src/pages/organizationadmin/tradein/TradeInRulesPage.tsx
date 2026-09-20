/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useTradeIn } from '../../../hooks/useTradeIn';
import { GRADES } from './shared';

/** Buyback price rules per brand / model / grade. */
export default function TradeInRulesPage() {
  const tradein = useTradeIn();
  const { getRules } = tradein;

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    brand: '', model: '', variant: '', gradePrices: { A: '', B: '', C: '', D: '' },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRules();
      setRules((res?.data as any) ?? []);
    } finally {
      setLoading(false);
    }
  }, [getRules]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setSaving(true);
    try {
      const gradePrices: Record<string, number> = {};
      Object.entries(form.gradePrices).forEach(([k, v]) => {
        if (v !== '' && v != null) gradePrices[k] = Number(v);
      });
      const res = await tradein.createRule({
        brand: form.brand,
        model: form.model,
        variant: form.variant || null,
        gradePrices,
      });
      if (res?.success || res?.status) { setShowModal(false); load(); }
    } finally { setSaving(false); }
  };

  if (loading && rules.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-1" /> New Price Rule</Button>
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
                <td className="p-3">{r.variant || ' '}</td>
                {GRADES.map((g) => (
                  <td key={g} className="p-3">{r.gradePrices?.[g] != null ? `Rs ${Number(r.gradePrices[g]).toLocaleString()}` : ' '}</td>
                ))}
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={async () => { await tradein.deleteRule(r.id); load(); }}>
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

      {/* New rule dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Buyback Price Rule</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Brand *</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div><Label>Model *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            </div>
            <div><Label>Variant (e.g. 128GB)</Label><Input value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} /></div>
            <Label>Prices per grade (Rs)</Label>
            <div className="grid grid-cols-2 gap-2">
              {GRADES.map((g) => (
                <div key={g} className="flex items-center gap-2">
                  <span className="w-16 text-xs">Grade {g}</span>
                  <Input type="number" value={form.gradePrices[g]}
                    onChange={(e) => setForm({ ...form, gradePrices: { ...form.gradePrices, [g]: e.target.value } })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.brand || !form.model}>{saving ? 'Saving...' : 'Create Rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
