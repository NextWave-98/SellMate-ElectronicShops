/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag, RefreshCw, Search, Truck, Receipt, XCircle, Phone, MapPin, PackageCheck, AlertTriangle, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import useFetch from '../../hooks/useFetch';
import useCourier, { type CourierShipment } from '../../hooks/useCourier';
import { usePermissions } from '../../hooks/usePermissions';
import { CourierShipmentModal } from '../../components/courier/modals';

/**
 * Orders placed on the organization's public website.
 *
 *  PENDING     stock is reserved; staff reviews the order
 *  CONFIRMED   turned into a normal sale (pickup / in store)
 *  DISPATCHED  handed to a courier (shipment + sale created by the courier flow)
 *  CANCELLED   reservation released, or the sale cancelled and restocked
 */

type Status = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'DISPATCHED' | 'CANCELLED';

const STATUS_TABS: Array<{ key: '' | Status; label: string }> = [
  { key: 'PENDING', label: 'New' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'DISPATCHED', label: 'With courier' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: '', label: 'All' },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  DISPATCHED: 'bg-indigo-100 text-indigo-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'New',
  PROCESSING: 'Processing',
  CONFIRMED: 'Confirmed',
  DISPATCHED: 'With courier',
  CANCELLED: 'Cancelled',
};

const money = (v: any) => `Rs. ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (v: any) => (v ? new Date(v).toLocaleString() : '');
const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE'];

export default function WebsiteOrdersPage() {
  const { fetchData } = useFetch();
  const { courierServices, fetchCourierServices } = useCourier();
  const { hasCourierAccess } = usePermissions();
  const canUseCourier = hasCourierAccess();

  const [status, setStatus] = useState<'' | Status>('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [shipFor, setShipFor] = useState<any | null>(null);
  const [saleFor, setSaleFor] = useState<any | null>(null);
  const [salePayment, setSalePayment] = useState({ method: 'CASH', amount: '' });
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [cancelFor, setCancelFor] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (search.trim()) qs.set('search', search.trim());
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      const res: any = await fetchData({ endpoint: `/website-orders?${qs.toString()}`, method: 'GET', silent: true });
      const data = res?.data ?? {};
      setEnabled(data.enabled !== false);
      setRows(Array.isArray(data.orders) ? data.orders : []);
      setTotal(Number(data.total || 0));
      setCounts(data.counts || {});
    } finally {
      setLoading(false);
    }
  }, [fetchData, status, search, page]);

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  // New orders arrive while the page is open.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (canUseCourier) fetchCourierServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseCourier]);

  const refreshSelected = async (id: string) => {
    const res: any = await fetchData({ endpoint: `/website-orders/${id}`, method: 'GET', silent: true });
    if (res?.success) setSelected(res.data);
  };

  const afterAction = async (id?: string) => {
    await load();
    if (id) await refreshSelected(id);
  };

  // ── actions ──
  const openSale = (order: any) => {
    setSaleFor(order);
    setSalePayment({ method: order.payment_method === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH', amount: '' });
    setSerials({});
  };

  const submitSale = async () => {
    if (!saleFor) return;
    setBusy(true);
    try {
      const serialPayload: Record<string, string[]> = {};
      for (const [pid, txt] of Object.entries(serials)) {
        const list = txt.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
        if (list.length) serialPayload[pid] = list;
      }
      const res: any = await fetchData({
        endpoint: `/website-orders/${saleFor.id}/confirm`,
        method: 'POST',
        data: {
          paymentMethod: salePayment.method,
          paidAmount: Number(salePayment.amount) || 0,
          serials: serialPayload,
        },
      });
      if (res?.success) {
        const id = saleFor.id;
        setSaleFor(null);
        await afterAction(id);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelFor) return;
    setBusy(true);
    try {
      const res: any = await fetchData({
        endpoint: `/website-orders/${cancelFor.id}/cancel`,
        method: 'POST',
        data: { reason: cancelReason.trim() || undefined },
      });
      if (res?.success) {
        const id = cancelFor.id;
        setCancelFor(null);
        setCancelReason('');
        await afterAction(id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleShipmentSave = async (data: Partial<CourierShipment>) => {
    if (!shipFor) return { success: false, message: 'No order selected' };
    const res: any = await fetchData({
      endpoint: `/website-orders/${shipFor.id}/courier`,
      method: 'POST',
      data,
      silent: false,
      successMessage: 'Order sent to courier',
    });
    if (res?.success) {
      const id = shipFor.id;
      await afterAction(id);
      return { success: true, data: { shipment_number: res.data?.shipmentNumber || '' } };
    }
    return res ?? { success: false };
  };

  const shipPrefill = useMemo<Partial<CourierShipment> | null>(() => {
    if (!shipFor) return null;
    return {
      recipientName: shipFor.customer_name,
      recipientPhone: shipFor.customer_phone,
      recipientEmail: shipFor.customer_email || undefined,
      recipientAddress: shipFor.delivery_address || '',
      recipientCity: shipFor.delivery_city || '',
      numberOfPieces: 1,
      description: `Website order ${shipFor.order_number}`,
      notes: [`Website order ${shipFor.order_number}`, shipFor.notes].filter(Boolean).join('\n'),
    } as Partial<CourierShipment>;
  }, [shipFor]);

  const shipProducts = useMemo(
    () => (shipFor?.items || []).map((l: any) => ({
      productId: l.productId,
      name: l.name,
      sku: '',
      quantity: Number(l.quantity) || 1,
      unitPrice: Number(l.unitPrice) || 0,
    })),
    [shipFor],
  );

  const pages = Math.max(1, Math.ceil(total / limit));
  const pendingCount = counts.PENDING || 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-orange-600" />
          <h1 className="text-xl font-bold">Website Orders</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-orange-600 text-white text-xs px-2 py-0.5">{pendingCount} new</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {!enabled && (
        <Card>
          <CardContent className="p-4 text-sm text-amber-800 bg-amber-50 rounded-md flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            Website orders are not switched on yet: the database update (migration) for this feature has not been applied.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key || 'all'}
            onClick={() => { setStatus(t.key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm border ${status === t.key ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-gray-50'}`}
          >
            {t.label}
            {t.key && counts[t.key] ? <span className="ml-1 opacity-80">({counts[t.key]})</span> : null}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
          <Input
            className="pl-8"
            placeholder="Order no, name or phone"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">{loading ? 'Loading…' : 'No orders here.'}</td></tr>
              )}
              {rows.map((o) => (
                <tr key={o.id} className="border-t hover:bg-orange-50/40 cursor-pointer" onClick={() => setSelected(o)}>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{o.order_number}</div>
                    <div className="text-xs text-gray-500">{when(o.created_at)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{o.customer_name}</div>
                    <div className="text-xs text-gray-500">{o.customer_phone}</div>
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="truncate">
                      {(o.items || []).map((l: any) => `${l.name} × ${l.quantity}`).join(', ')}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{money(o.total_amount)}</td>
                  <td className="px-3 py-2 text-xs">{o.payment_method === 'BANK_TRANSFER' ? 'Bank transfer' : 'Cash on delivery'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[o.status] || ''}`}>{STATUS_LABEL[o.status] || o.status}</span>
                    {o.status === 'PENDING' && o.stock_reserved && (
                      <span className="ml-1 text-[10px] text-gray-500 inline-flex items-center gap-0.5"><Lock className="w-3 h-3" />reserved</span>
                    )}
                    {o.status === 'PENDING' && !o.stock_reserved && (o.items || []).some((l: any) => !l.isService) && (
                      <span className="ml-1 text-[10px] text-red-600">not reserved</span>
                    )}
                    {o.shipment_status && <div className="text-[11px] text-gray-500 mt-0.5">Courier: {String(o.shipment_status).replace(/_/g, ' ').toLowerCase()}</div>}
                    {o.sale_number && <div className="text-[11px] text-gray-500">Sale {o.sale_number}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* ── Order detail ── */}
      <Dialog open={!!selected && !shipFor && !saleFor && !cancelFor} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.order_number}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[selected.status] || ''}`}>{STATUS_LABEL[selected.status] || selected.status}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="font-semibold">{selected.customer_name}</div>
                    <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${selected.customer_phone}`} className="hover:underline">{selected.customer_phone}</a>
                    </div>
                    {selected.customer_email && <div className="text-gray-600">{selected.customer_email}</div>}
                  </div>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{[selected.delivery_address, selected.delivery_city].filter(Boolean).join(', ') || 'No address given'}</span>
                    </div>
                    <div>Placed {when(selected.created_at)}</div>
                    <div>{selected.payment_method === 'BANK_TRANSFER' ? 'Bank transfer' : 'Cash on delivery'}</div>
                  </div>
                </div>

                <div className="border rounded-md divide-y">
                  {(selected.items || []).map((l: any) => (
                    <div key={l.productId} className="flex justify-between px-3 py-2">
                      <span>{l.name} <span className="text-gray-500">× {l.quantity}</span>
                        {l.trackSerials && <span className="ml-1 text-[10px] text-indigo-600">(serial / IMEI)</span>}
                      </span>
                      <span>{money(l.lineTotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 font-semibold">
                    <span>Total</span><span>{money(selected.total_amount)}</span>
                  </div>
                </div>

                {selected.notes && <div className="bg-gray-50 rounded p-2 whitespace-pre-wrap">{selected.notes}</div>}

                {selected.status === 'PENDING' && (
                  <div className={`text-xs ${selected.stock_reserved ? 'text-gray-600' : 'text-red-600'}`}>
                    {selected.stock_reserved
                      ? 'Stock for this order is reserved and cannot be sold at the POS until you confirm or cancel.'
                      : 'Stock is NOT reserved for this order (it was sold meanwhile) — check stock before confirming.'}
                  </div>
                )}
                {selected.last_error && (
                  <div className="text-xs text-red-700 bg-red-50 rounded p-2">Last attempt failed: {selected.last_error}</div>
                )}
                {selected.sale_number && <div className="text-xs text-gray-600"><PackageCheck className="w-3.5 h-3.5 inline mr-1" />Sale {selected.sale_number} ({String(selected.sale_status || '').toLowerCase()})</div>}
                {selected.shipment_number && (
                  <div className="text-xs text-gray-600"><Truck className="w-3.5 h-3.5 inline mr-1" />
                    Shipment {selected.shipment_number}{selected.tracking_number ? ` · ${selected.tracking_number}` : ''} · {String(selected.shipment_status || '').replace(/_/g, ' ').toLowerCase()}
                  </div>
                )}
                {selected.status === 'CANCELLED' && (
                  <div className="text-xs text-gray-600">Cancelled {when(selected.cancelled_at)}{selected.cancel_reason ? ` — ${selected.cancel_reason}` : ''}</div>
                )}
              </div>
              <DialogFooter className="flex flex-wrap gap-2">
                {(selected.status === 'PENDING' || selected.status === 'PROCESSING') && (
                  <>
                    {canUseCourier && (
                      <Button onClick={() => setShipFor(selected)} disabled={busy}>
                        <Truck className="w-4 h-4 mr-1" /> Send to courier
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => openSale(selected)} disabled={busy}>
                      <Receipt className="w-4 h-4 mr-1" /> Create sale (pickup)
                    </Button>
                  </>
                )}
                {selected.status === 'CONFIRMED' && canUseCourier && !selected.courier_shipment_id && (
                  <Button onClick={() => setShipFor(selected)} disabled={busy}>
                    <Truck className="w-4 h-4 mr-1" /> Send to courier
                  </Button>
                )}
                {selected.status !== 'CANCELLED' && (
                  <Button variant="outline" className="text-red-600" onClick={() => setCancelFor(selected)} disabled={busy}>
                    <XCircle className="w-4 h-4 mr-1" /> Cancel order
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create sale ── */}
      <Dialog open={!!saleFor} onOpenChange={(o) => { if (!o) setSaleFor(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create sale for {saleFor?.order_number}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">The reserved stock becomes a normal sale at your branch ({money(saleFor?.total_amount)}).</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment method</Label>
                <select
                  className="w-full border rounded-md h-9 px-2 bg-white"
                  value={salePayment.method}
                  onChange={(e) => setSalePayment((p) => ({ ...p, method: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <Label>Amount received now</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0 = pay later"
                  value={salePayment.amount}
                  onChange={(e) => setSalePayment((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>
            {(saleFor?.items || []).filter((l: any) => l.trackSerials).map((l: any) => (
              <div key={l.productId}>
                <Label>{l.name} — serial / IMEI ({l.quantity})</Label>
                <Input
                  placeholder="SN1, SN2"
                  value={serials[l.productId] || ''}
                  onChange={(e) => setSerials((s) => ({ ...s, [l.productId]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleFor(null)} disabled={busy}>Back</Button>
            <Button onClick={submitSale} disabled={busy}>{busy ? 'Creating…' : 'Create sale'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel ── */}
      <Dialog open={!!cancelFor} onOpenChange={(o) => { if (!o) setCancelFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancel {cancelFor?.order_number}?</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              {cancelFor?.status === 'PENDING'
                ? 'The reserved stock goes back to available.'
                : cancelFor?.status === 'CONFIRMED'
                  ? 'The sale is cancelled and its stock goes back on the shelf.'
                  : 'If the parcel is with the courier, cancel the shipment on the Courier page first — that restores the stock.'}
            </p>
            <Label>Reason (optional)</Label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. customer did not answer" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelFor(null)} disabled={busy}>Keep order</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={submitCancel} disabled={busy}>
              {busy ? 'Cancelling…' : 'Cancel order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send to courier (the normal courier form, prefilled) ── */}
      {shipFor && shipPrefill && (
        <CourierShipmentModal
          key={shipFor.id}
          variant="orange"
          courierServices={courierServices}
          initialPaymentMethod={shipFor.payment_method === 'BANK_TRANSFER' ? 'bank' : 'cod'}
          initialData={shipPrefill}
          initialProducts={shipProducts}
          onClose={() => setShipFor(null)}
          onSave={handleShipmentSave}
        />
      )}
    </div>
  );
}
