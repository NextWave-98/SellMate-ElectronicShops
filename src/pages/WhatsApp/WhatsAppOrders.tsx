import React, { useMemo, useState } from 'react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import useWhatsAppOrders, { type OrderStatusFilter } from '../../hooks/useWhatsAppOrders';
import type { WhatsAppOrder, WhatsAppOrderStatus } from '../../services/whatsappService';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Phone,
  MapPin,
  CreditCard,
  User,
  Pencil,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import type { OrderInput, ShipmentInput } from '../../services/whatsappService';
import alert from '../../utils/alert';

const STATUS_TABS: { value: OrderStatusFilter; label: string }[] = [
  { value: 'DRAFT', label: 'Drafts (to review)' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ALL', label: 'All' },
];

const STATUS_STYLES: Record<WhatsAppOrderStatus, string> = {
  DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
  SHIPPED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

function money(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n ?? 0;
  return `Rs ${Number(v || 0).toLocaleString()}`;
}

function paymentLabel(method: string | null): string {
  if (method === 'COD') return 'Cash on Delivery';
  if (method === 'BANK_TRANSFER') return 'Bank Transfer';
  return method || ' ';
}

const StatusBadge: React.FC<{ status: WhatsAppOrderStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
    {status}
  </span>
);

const OrderCard: React.FC<{
  order: WhatsAppOrder;
  selected: boolean;
  onToggleSelect: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
  busy: boolean;
}> = ({ order, selected, onToggleSelect, onConfirm, onCancel, onEdit, busy }) => {
  const [open, setOpen] = useState(false);
  const isDraft = order.status === 'DRAFT' || order.status === 'PENDING';

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-start gap-3 p-4">
        {isDraft && (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
            checked={selected}
            onChange={onToggleSelect}
            aria-label="Select order"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{order.orderNumber}</span>
            <StatusBadge status={order.status} />
            <span className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{order.customerName}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{order.customerPhone}</span>
            <span className="font-medium text-foreground">{money(order.totalAmount)}</span>
          </div>

          <div className="mt-1 text-sm">
            {order.items?.map((it, i) => (
              <span key={i} className="text-foreground">
                {it.quantity}× {it.productName}
                {it.variant ? ` (${it.variant})` : ''}
                {i < order.items.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>

          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? 'Hide details' : 'View details'}
          </button>

          {open && (
            <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{order.shippingAddress || ' '}</span></div>
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>{paymentLabel(order.paymentMethod)}</span></div>
              <div className="border-t border-border pt-2">
                {order.items?.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.quantity}× {it.productName}{it.variant ? ` (${it.variant})` : ''}</span>
                    <span>{money(it.total || it.unitPrice * it.quantity)}</span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{money(order.deliveryFee)}</span></div>
                <div className="mt-1 flex justify-between font-semibold"><span>Total</span><span>{money(order.totalAmount)}</span></div>
              </div>
              {order.notes && <div className="text-muted-foreground">Note: {order.notes}</div>}
            </div>
          )}
        </div>

        {isDraft && (
          <div className="flex shrink-0 flex-col gap-2">
            <button
              onClick={onConfirm}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm
            </button>
            <button
              onClick={onEdit}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

type FormItem = { productName: string; variant: string; quantity: number; unitPrice: number };

const OrderForm: React.FC<{
  initial?: WhatsAppOrder | null;
  onClose: () => void;
  onSubmit: (payload: OrderInput) => Promise<boolean>;
}> = ({ initial, onClose, onSubmit }) => {
  const [customerName, setCustomerName] = useState(initial?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? '');
  const [shippingAddress, setShippingAddress] = useState(initial?.shippingAddress ?? '');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>(
    (initial?.paymentMethod as 'COD' | 'BANK_TRANSFER') || 'COD',
  );
  const [deliveryFee, setDeliveryFee] = useState<number>(Number(initial?.deliveryFee) || 0);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<FormItem[]>(
    initial?.items?.length
      ? initial.items.map((it) => ({
          productName: it.productName,
          variant: it.variant ?? '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }))
      : [{ productName: '', variant: '', quantity: 1, unitPrice: 0 }],
  );
  const [saving, setSaving] = useState(false);

  const setItem = (i: number, patch: Partial<FormItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, { productName: '', variant: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const total = subtotal + (Number(deliveryFee) || 0);

  const submit = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert.error('Name and phone are required');
      return;
    }
    const validItems = items.filter((it) => it.productName.trim());
    if (!validItems.length) {
      alert.error('Add at least one item');
      return;
    }
    setSaving(true);
    const ok = await onSubmit({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      shippingAddress: shippingAddress.trim() || undefined,
      paymentMethod,
      deliveryFee: Number(deliveryFee) || 0,
      notes: notes.trim() || undefined,
      items: validItems.map((it) => ({
        productName: it.productName.trim(),
        variant: it.variant.trim() || undefined,
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
        unitPrice: Number(it.unitPrice) || 0,
      })),
    });
    setSaving(false);
    if (ok) onClose();
  };

  const input = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? 'Edit order' : 'New order'}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer name *</label>
              <input className={input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone *</label>
              <input className={input} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Delivery address</label>
            <textarea className={input} rows={2} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Payment</label>
              <select className={input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'COD' | 'BANK_TRANSFER')}>
                <option value="COD">Cash on Delivery</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Delivery fee (Rs)</label>
              <input type="number" min={0} className={input} value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Items *</label>
              <button onClick={addItem} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <input className={input} placeholder="Product name" value={it.productName} onChange={(e) => setItem(i, { productName: e.target.value })} />
                  </div>
                  <input className={`${input} w-16`} type="number" min={1} placeholder="Qty" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                  <input className={`${input} w-24`} type="number" min={0} placeholder="Price" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) })} />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="rounded-md p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
            <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Subtotal {money(subtotal)} + Delivery {money(deliveryFee)}</span>
            <span className="font-semibold">Total {money(total)}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create draft'}
          </button>
        </div>
      </div>
    </div>
  );
};

function deriveCity(address: string | null): string {
  if (!address) return '';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

const ShipmentConfirmModal: React.FC<{
  order: WhatsAppOrder;
  onClose: () => void;
  onConfirm: (order: WhatsAppOrder, shipment: ShipmentInput) => Promise<boolean>;
}> = ({ order, onClose, onConfirm }) => {
  const isCod = order.paymentMethod !== 'BANK_TRANSFER';
  const [recipientName, setRecipientName] = useState(order.customerName);
  const [recipientPhone, setRecipientPhone] = useState(order.customerPhone);
  const [recipientPhone2, setRecipientPhone2] = useState('');
  const [recipientAddress, setRecipientAddress] = useState(order.shippingAddress ?? '');
  const [recipientCity, setRecipientCity] = useState(deriveCity(order.shippingAddress));
  const [recipientDistrict, setRecipientDistrict] = useState('');
  const [weight, setWeight] = useState(1);
  const [numberOfPieces, setNumberOfPieces] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>(isCod ? 'cod' : 'bank');
  const [shippingCharge, setShippingCharge] = useState(Number(order.deliveryFee) || 0);
  const [codAmount, setCodAmount] = useState(Number(order.totalAmount) || 0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const input = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
  const label = 'mb-1 block text-xs font-medium text-muted-foreground';

  const submit = async () => {
    if (!recipientName.trim() || !recipientPhone.trim() || !recipientAddress.trim() || !recipientCity.trim()) {
      alert.error('Recipient name, phone, address and city are required');
      return;
    }
    setSaving(true);
    const ok = await onConfirm(order, {
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      recipientPhone2: recipientPhone2.trim() || undefined,
      recipientAddress: recipientAddress.trim(),
      recipientCity: recipientCity.trim(),
      recipientDistrict: recipientDistrict.trim() || undefined,
      weight: Number(weight) || 1,
      numberOfPieces: Number(numberOfPieces) || 1,
      paymentMethod: paymentMethod === 'cod' ? 'cod' : 'bank',
      shippingCharge: Number(shippingCharge) || 0,
      codAmount: paymentMethod === 'cod' ? Number(codAmount) || 0 : undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create courier shipment</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Order {order.orderNumber} · the order is confirmed only if the shipment is created successfully.
        </p>

        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Recipient</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className={label}>Name *</label><input className={input} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} /></div>
              <div><label className={label}>Phone *</label><input className={input} value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} /></div>
              <div><label className={label}>Phone 2</label><input className={input} value={recipientPhone2} onChange={(e) => setRecipientPhone2(e.target.value)} /></div>
              <div><label className={label}>City *</label><input className={input} value={recipientCity} onChange={(e) => setRecipientCity(e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>District</label><input className={input} value={recipientDistrict} onChange={(e) => setRecipientDistrict(e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>Address *</label><textarea rows={2} className={input} value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Package</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Weight (kg)</label><input type="number" min={0.1} step={0.1} className={input} value={weight} onChange={(e) => setWeight(Number(e.target.value))} /></div>
              <div><label className={label}>Pieces</label><input type="number" min={1} className={input} value={numberOfPieces} onChange={(e) => setNumberOfPieces(Number(e.target.value))} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Payment & charges</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Payment</label>
                <select className={input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cod' | 'bank')}>
                  <option value="cod">Cash on Delivery</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div><label className={label}>Shipping charge (Rs)</label><input type="number" min={0} className={input} value={shippingCharge} onChange={(e) => setShippingCharge(Number(e.target.value))} /></div>
              {paymentMethod === 'cod' && (
                <div className="col-span-2"><label className={label}>COD amount (Rs)</label><input type="number" min={0} className={input} value={codAmount} onChange={(e) => setCodAmount(Number(e.target.value))} /></div>
              )}
            </div>
          </section>

          <div><label className={label}>Notes</label><input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" /> {saving ? 'Creating shipment…' : 'Create shipment & confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

const WhatsAppOrdersPage: React.FC = () => {
  const { user } = useAuthRedux();
  const businessId = user?.businessId ?? undefined;
  const {
    orders,
    total,
    loading,
    statusFilter,
    setStatusFilter,
    actionId,
    reload,
    confirmOrder,
    cancelOrder,
    bulkConfirm,
    createOrder,
    updateOrder,
  } = useWhatsAppOrders(businessId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppOrder | null>(null);
  const [confirming, setConfirming] = useState<WhatsAppOrder | null>(null);

  const draftIds = useMemo(
    () => orders.filter((o) => o.status === 'DRAFT' || o.status === 'PENDING').map((o) => o.id),
    [orders],
  );
  const allSelected = draftIds.length > 0 && draftIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(draftIds));

  const handleBulk = async () => {
    await bulkConfirm([...selected]);
    setSelected(new Set());
  };

  const handleCancel = (id: string) => {
    const reason = window.prompt('Reason for cancelling (optional):') ?? undefined;
    cancelOrder(id, reason);
  };

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (order: WhatsAppOrder) => { setEditing(order); setFormOpen(true); };
  const handleFormSubmit = (payload: Parameters<typeof createOrder>[0]) =>
    editing ? updateOrder(editing.id, payload) : createOrder(payload);
  const handleShipmentConfirm = (order: WhatsAppOrder, shipment: ShipmentInput) =>
    confirmOrder(order.id, shipment);

  if (!businessId) {
    return <div className="p-6 text-muted-foreground">No organization context found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ShoppingBag className="h-5 w-5" /> WhatsApp Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Orders the AI agent collected on WhatsApp. Drafts wait here for you to review and confirm.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New order
          </button>
          <button
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setSelected(new Set()); }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {draftIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={allSelected} onChange={toggleAll} />
            Select all drafts ({draftIds.length})
          </label>
          <button
            onClick={handleBulk}
            disabled={selected.size === 0 || loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" /> Confirm selected ({selected.size})
          </button>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} orders yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">{total} order(s)</div>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selected.has(order.id)}
              onToggleSelect={() => toggle(order.id)}
              onConfirm={() => setConfirming(order)}
              onCancel={() => handleCancel(order.id)}
              onEdit={() => openEdit(order)}
              busy={actionId === order.id || loading}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <OrderForm
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {confirming && (
        <ShipmentConfirmModal
          order={confirming}
          onClose={() => setConfirming(null)}
          onConfirm={handleShipmentConfirm}
        />
      )}
    </div>
  );
};

export default WhatsAppOrdersPage;
