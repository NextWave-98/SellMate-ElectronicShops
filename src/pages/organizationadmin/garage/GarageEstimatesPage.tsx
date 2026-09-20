/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
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
import useProduct from '../../../hooks/useProduct';
import { useLocation as useLocations } from '../../../hooks/useLocation';
import { selectCls, statusColor, type EstItem, type GarageOutletContext } from './shared';

/** Repair estimates: create, send for approval, approve / reject. */
export default function GarageEstimatesPage() {
  const { refreshStats } = useOutletContext<GarageOutletContext>();
  const garage = useGarage();
  const { getEstimates, getVehicles } = garage;
  const { getCustomers } = useCustomer();
  const productHook = useProduct();
  const { getAllLocations } = useLocations();
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  // Convert approved estimate -> job sheet
  const [convertTarget, setConvertTarget] = useState<any>(null);
  const [convertForm, setConvertForm] = useState({ locationId: '', expectedDate: '' });

  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    customerId: '', customerVehicleId: '', customerComplaints: '', mileageIn: '',
    isInsuranceJob: false, insuranceProvider: '', insuranceClaimNo: '',
  });
  const [estItems, setEstItems] = useState<EstItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEstimates({ limit: 100 });
      setEstimates((res?.data as any)?.estimates ?? []);
    } finally {
      setLoading(false);
    }
  }, [getEstimates]);

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
    if (products.length === 0) {
      const res: any = await productHook.getAllProducts({ limit: 500, isActive: true } as any);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.products) ? res.data.products : Array.isArray(res?.products) ? res.products : [];
      setProducts(list.filter((p: any) => !p.isService));
    }
  };

  const openConvert = async (estimate: any) => {
    setConvertTarget(estimate);
    let list = locations;
    if (list.length === 0) {
      const res: any = await getAllLocations();
      const raw = res?.data;
      list = (Array.isArray(raw) ? raw : Array.isArray(raw?.locations) ? raw.locations : []).filter((l: any) => l.isActive !== false);
      setLocations(list);
    }
    setConvertForm({ locationId: list.length === 1 ? list[0].id : '', expectedDate: '' });
  };

  const submitConvert = async () => {
    if (!convertTarget || !convertForm.locationId) return;
    setSaving(true);
    try {
      const res: any = await garage.convertEstimate(convertTarget.id, {
        locationId: convertForm.locationId,
        expectedDate: convertForm.expectedDate || null,
      });
      if (res?.success || res?.status || res?.data) {
        setConvertTarget(null);
        load();
        refreshStats();
      }
    } finally { setSaving(false); }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await garage.createEstimate({
        ...form,
        mileageIn: form.mileageIn ? Number(form.mileageIn) : null,
        items: estItems.map((i) => ({
          ...i,
          quantity: Number(i.quantity || 1),
          laborHours: i.laborHours ? Number(i.laborHours) : null,
          unitPrice: Number(i.unitPrice || 0),
        })),
      });
      if (res?.success || res?.status) {
        setShowModal(false);
        setEstItems([]);
        load();
        refreshStats();
      }
    } finally { setSaving(false); }
  };

  const setEstimateStatus = async (id: string, status: string) => {
    await garage.setEstimateStatus(id, { status, approvalChannel: status === 'APPROVED' ? 'IN_PERSON' : undefined });
    load();
    refreshStats();
  };

  const estTotal = estItems.reduce(
    (sum, i) => sum + (i.itemType === 'LABOR' ? Number(i.laborHours || 0) * Number(i.unitPrice || 0) : Number(i.quantity || 1) * Number(i.unitPrice || 0)),
    0
  );

  if (loading && estimates.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openModal}><Plus className="w-4 h-4 mr-1" /> New Estimate</Button>
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
                <td className="p-3">{e.customer?.name || ' '}</td>
                <td className="p-3">{e.vehicle ? `${e.vehicle.registrationNo}` : ' '}</td>
                <td className="p-3">Rs {Number(e.partsTotal).toLocaleString()}</td>
                <td className="p-3">Rs {Number(e.laborTotal).toLocaleString()}</td>
                <td className="p-3 font-semibold">Rs {Number(e.totalAmount).toLocaleString()}</td>
                <td className="p-3"><Badge className={statusColor[e.status] || ''}>{e.status}</Badge></td>
                <td className="p-3 space-x-1">
                  {e.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="outline" onClick={async () => { await garage.sendEstimate(e.id, 'SMS'); load(); }}>
                        Send SMS
                      </Button>
                      <Button size="sm" variant="outline" onClick={async () => { await garage.sendEstimate(e.id, 'WHATSAPP'); load(); }}>
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
                  {e.status === 'APPROVED' && (
                    <Button size="sm" onClick={() => openConvert(e)}>Create Job Sheet</Button>
                  )}
                  {e.status === 'CONVERTED' && (
                    <span className="text-xs text-muted-foreground">Job sheet created</span>
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

      {/* New estimate dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Repair Estimate</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
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
                  <option key={v.id} value={v.id}>{v.registrationNo}   {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2"><Label>Customer Complaints</Label><Input value={form.customerComplaints} onChange={(e) => setForm({ ...form, customerComplaints: e.target.value })} /></div>
            <div><Label>Mileage In (km)</Label><Input type="number" value={form.mileageIn} onChange={(e) => setForm({ ...form, mileageIn: e.target.value })} /></div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isInsurance" checked={form.isInsuranceJob} onChange={(e) => setForm({ ...form, isInsuranceJob: e.target.checked })} />
              <Label htmlFor="isInsurance">Insurance claim job</Label>
            </div>
            {form.isInsuranceJob && (
              <>
                <div><Label>Insurance Provider</Label><Input value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} /></div>
                <div><Label>Claim No</Label><Input value={form.insuranceClaimNo} onChange={(e) => setForm({ ...form, insuranceClaimNo: e.target.value })} /></div>
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
                  {item.itemType === 'PART' && (
                    <select className={`${selectCls} col-span-3`} value={item.productId || ''}
                      title="Stock item   issued from inventory when the job is created"
                      onChange={(e) => {
                        const p = products.find((x: any) => x.id === e.target.value);
                        const arr = [...estItems];
                        arr[idx] = p
                          ? { ...item, productId: p.id, description: p.name, unitPrice: Number(p.unitPrice ?? p.sellingPrice ?? item.unitPrice ?? 0) }
                          : { ...item, productId: null };
                        setEstItems(arr);
                      }}>
                      <option value="">Non-stock / free text</option>
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.productCode ? ` (${p.productCode})` : ''}</option>)}
                    </select>
                  )}
                  <Input className={item.itemType === 'PART' ? 'col-span-3' : 'col-span-6'} placeholder="Description" value={item.description}
                    onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, description: e.target.value }; setEstItems(arr); }} />
                  {item.itemType === 'LABOR' ? (
                    <Input className="col-span-1" type="number" placeholder="Hours" value={item.laborHours ?? ''}
                      onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, laborHours: Number(e.target.value) }; setEstItems(arr); }} />
                  ) : (
                    <Input className="col-span-1" type="number" placeholder="Qty" value={item.quantity}
                      onChange={(e) => { const arr = [...estItems]; arr[idx] = { ...item, quantity: Number(e.target.value) }; setEstItems(arr); }} />
                  )}
                  <Input className="col-span-2" type="number" placeholder={item.itemType === 'LABOR' ? 'Rate/hr' : 'Unit price'} value={item.unitPrice}
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
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.customerId || !form.customerVehicleId}>
              {saving ? 'Saving...' : 'Create Estimate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approved estimate -> job sheet */}
      <Dialog open={!!convertTarget} onOpenChange={(open) => !open && setConvertTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Job Sheet from {convertTarget?.estimateNumber}</DialogTitle></DialogHeader>
          {convertTarget && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                {convertTarget.vehicle?.registrationNo} · {convertTarget.customer?.name} · Total Rs {Number(convertTarget.totalAmount).toLocaleString()}
                <br />
                Labour lines become the job's labour charge. Parts linked to a stock item are taken out of the selected
                branch's stock now; other lines are added as charges.
              </p>
              <div><Label>Branch / workshop *</Label>
                <select className={selectCls} value={convertForm.locationId} onChange={(e) => setConvertForm({ ...convertForm, locationId: e.target.value })}>
                  <option value="">Select branch</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><Label>Expected completion</Label>
                <Input type="date" value={convertForm.expectedDate} onChange={(e) => setConvertForm({ ...convertForm, expectedDate: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertTarget(null)}>Cancel</Button>
            <Button onClick={submitConvert} disabled={saving || !convertForm.locationId}>
              {saving ? 'Creating...' : 'Create Job Sheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
