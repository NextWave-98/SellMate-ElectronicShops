/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useRental } from '../../../hooks/useRental';
import { selectCls, statusColor, type RentalOutletContext } from './shared';

const RATE_TYPES = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'];

const emptyItem = {
  name: '', sku: '', category: '', totalQuantity: '', unitRate: '', rateType: 'DAILY',
  depositPerUnit: '', replacementCost: '', notes: '',
};
const emptyUnit = {
  registrationNo: '', make: '', model: '', equipmentCategory: '', unitRate: '', rateType: 'DAILY',
  depositAmount: '', notes: '',
};

/**
 * Equipment rental stock.
 *  - Stock items: counted by quantity (chairs, tents, scaffolding frames)
 *  - Units: one row per physical unit with its own code / serial (generators, mixers)
 * Both are added to bookings as equipment lines; availability is checked per date range.
 */
export default function RentalEquipmentPage() {
  const { refreshStats } = useOutletContext<RentalOutletContext>();
  const rental = useRental();
  const { getRentalItems, getVehicles } = rental;

  const [tab, setTab] = useState<'items' | 'units'>('items');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [itemForm, setItemForm] = useState<any>(null); // { id?, ...fields }
  const [unitForm, setUnitForm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, unitsRes] = await Promise.all([
        getRentalItems({ includeInactive: 'false' }),
        getVehicles({ limit: 500, assetType: 'EQUIPMENT' }),
      ]);
      setItems(Array.isArray(itemsRes?.data) ? (itemsRes?.data as any[]) : []);
      setUnits(((unitsRes?.data as any)?.vehicles ?? []).filter((u: any) => u.isActive));
    } finally {
      setLoading(false);
    }
  }, [getRentalItems, getVehicles]);

  useEffect(() => { load(); }, [load]);

  const num = (v: any) => (v === '' || v == null ? 0 : Number(v));

  const saveItem = async () => {
    if (!itemForm) return;
    setSaving(true);
    try {
      const data = {
        name: itemForm.name.trim(),
        sku: itemForm.sku || null,
        category: itemForm.category || null,
        totalQuantity: Math.max(0, Math.floor(num(itemForm.totalQuantity))),
        unitRate: num(itemForm.unitRate),
        rateType: itemForm.rateType,
        depositPerUnit: num(itemForm.depositPerUnit),
        replacementCost: num(itemForm.replacementCost),
        notes: itemForm.notes || null,
      };
      const res = itemForm.id ? await rental.updateRentalItem(itemForm.id, data) : await rental.createRentalItem(data);
      if (res?.success || res?.status) { setItemForm(null); load(); refreshStats(); }
    } finally { setSaving(false); }
  };

  const saveUnit = async () => {
    if (!unitForm) return;
    setSaving(true);
    try {
      const data: any = {
        registrationNo: unitForm.registrationNo.trim(),
        make: unitForm.make.trim(),
        model: unitForm.model.trim(),
        equipmentCategory: unitForm.equipmentCategory || null,
        unitRate: unitForm.unitRate === '' ? null : num(unitForm.unitRate),
        rateType: unitForm.rateType,
        depositAmount: unitForm.depositAmount === '' ? null : num(unitForm.depositAmount),
        notes: unitForm.notes || null,
      };
      const res = unitForm.id
        ? await rental.updateVehicle(unitForm.id, data)
        : await rental.createVehicle({ ...data, assetType: 'EQUIPMENT' });
      if (res?.success || res?.status) { setUnitForm(null); load(); refreshStats(); }
    } finally { setSaving(false); }
  };

  const money = (n: any) => `Rs ${Number(n || 0).toLocaleString()}`;

  if (loading && items.length === 0 && units.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-md border overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 ${tab === 'items' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setTab('items')}>
            <Package className="w-4 h-4" /> Stock items (by quantity)
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 border-l ${tab === 'units' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setTab('units')}>
            <Wrench className="w-4 h-4" /> Units (serial / code)
          </button>
        </div>
        {tab === 'items'
          ? <Button onClick={() => setItemForm({ ...emptyItem })}><Plus className="w-4 h-4 mr-1" /> New Item</Button>
          : <Button onClick={() => setUnitForm({ ...emptyUnit })}><Plus className="w-4 h-4 mr-1" /> New Unit</Button>}
      </div>

      {tab === 'items' && (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Item</th><th className="p-3">Category</th><th className="p-3">Total</th>
                <th className="p-3">Out / booked now</th><th className="p-3">Free now</th><th className="p-3">Rate</th>
                <th className="p-3">Deposit / unit</th><th className="p-3">Replacement</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3 font-medium">{i.name}{i.sku ? <span className="text-xs text-muted-foreground"> · {i.sku}</span> : ''}</td>
                  <td className="p-3">{i.category || ' '}</td>
                  <td className="p-3">{i.totalQuantity}</td>
                  <td className="p-3">{i.reservedQuantity}</td>
                  <td className="p-3"><Badge className={i.availableQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{i.availableQuantity}</Badge></td>
                  <td className="p-3">{money(i.unitRate)} / {String(i.rateType).toLowerCase()}</td>
                  <td className="p-3">{money(i.depositPerUnit)}</td>
                  <td className="p-3">{money(i.replacementCost)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setItemForm({ ...i })}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await rental.deleteRentalItem(i.id); load(); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No stock items yet   e.g. chairs, tents, scaffolding</td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === 'units' && (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Code / Serial</th><th className="p-3">Unit</th><th className="p-3">Category</th>
                <th className="p-3">Rate</th><th className="p-3">Deposit</th><th className="p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.registrationNo}</td>
                  <td className="p-3">{u.make} {u.model}</td>
                  <td className="p-3">{u.equipmentCategory || ' '}</td>
                  <td className="p-3">{u.unitRate != null ? `${money(u.unitRate)} / ${String(u.rateType || 'DAILY').toLowerCase()}` : <span className="text-red-600 text-xs">no rate set</span>}</td>
                  <td className="p-3">{u.depositAmount != null ? money(u.depositAmount) : ' '}</td>
                  <td className="p-3"><Badge className={statusColor[u.status] || ''}>{u.status}</Badge></td>
                  <td className="p-3 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setUnitForm({
                      id: u.id, registrationNo: u.registrationNo, make: u.make, model: u.model,
                      equipmentCategory: u.equipmentCategory ?? '', unitRate: u.unitRate ?? '', rateType: u.rateType || 'DAILY',
                      depositAmount: u.depositAmount ?? '', notes: u.notes ?? '',
                    })}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" title="Retire" onClick={async () => { await rental.deleteVehicle(u.id); load(); refreshStats(); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No units yet   e.g. generators, concrete mixers, pressure washers</td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Item dialog */}
      <Dialog open={!!itemForm} onOpenChange={(open) => !open && setItemForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{itemForm?.id ? 'Edit Stock Item' : 'New Stock Item'}</DialogTitle></DialogHeader>
          <DialogBody>
            {itemForm && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Name *</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Plastic chair" /></div>
                <div><Label>SKU</Label><Input value={itemForm.sku ?? ''} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} /></div>
                <div><Label>Category</Label><Input value={itemForm.category ?? ''} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} placeholder="Furniture" /></div>
                <div><Label>Total quantity owned *</Label><Input type="number" value={itemForm.totalQuantity} onChange={(e) => setItemForm({ ...itemForm, totalQuantity: e.target.value })} /></div>
                <div><Label>Rate type</Label>
                  <select className={selectCls} value={itemForm.rateType} onChange={(e) => setItemForm({ ...itemForm, rateType: e.target.value })}>
                    {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><Label>Rate per unit (Rs) *</Label><Input type="number" value={itemForm.unitRate} onChange={(e) => setItemForm({ ...itemForm, unitRate: e.target.value })} /></div>
                <div><Label>Deposit per unit (Rs)</Label><Input type="number" value={itemForm.depositPerUnit} onChange={(e) => setItemForm({ ...itemForm, depositPerUnit: e.target.value })} /></div>
                <div className="col-span-2"><Label>Replacement cost per unit (charged if lost)</Label><Input type="number" value={itemForm.replacementCost} onChange={(e) => setItemForm({ ...itemForm, replacementCost: e.target.value })} /></div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemForm(null)}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving || !itemForm?.name || itemForm?.totalQuantity === '' || itemForm?.unitRate === ''}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit dialog */}
      <Dialog open={!!unitForm} onOpenChange={(open) => !open && setUnitForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{unitForm?.id ? 'Edit Unit' : 'New Equipment Unit'}</DialogTitle></DialogHeader>
          <DialogBody>
            {unitForm && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code / Serial *</Label><Input value={unitForm.registrationNo} onChange={(e) => setUnitForm({ ...unitForm, registrationNo: e.target.value })} placeholder="GEN-01" /></div>
                <div><Label>Brand *</Label><Input value={unitForm.make} onChange={(e) => setUnitForm({ ...unitForm, make: e.target.value })} placeholder="Honda" /></div>
                <div className="col-span-2"><Label>Name / Model *</Label><Input value={unitForm.model} onChange={(e) => setUnitForm({ ...unitForm, model: e.target.value })} placeholder="Generator 5 kVA" /></div>
                <div><Label>Category</Label><Input value={unitForm.equipmentCategory} onChange={(e) => setUnitForm({ ...unitForm, equipmentCategory: e.target.value })} placeholder="Power" /></div>
                <div><Label>Rate type</Label>
                  <select className={selectCls} value={unitForm.rateType} onChange={(e) => setUnitForm({ ...unitForm, rateType: e.target.value })}>
                    {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><Label>Rate (Rs) *</Label><Input type="number" value={unitForm.unitRate} onChange={(e) => setUnitForm({ ...unitForm, unitRate: e.target.value })} /></div>
                <div><Label>Deposit (Rs)</Label><Input type="number" value={unitForm.depositAmount} onChange={(e) => setUnitForm({ ...unitForm, depositAmount: e.target.value })} /></div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitForm(null)}>Cancel</Button>
            <Button onClick={saveUnit} disabled={saving || !unitForm?.registrationNo || !unitForm?.make || !unitForm?.model || unitForm?.unitRate === ''}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
