import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Package, User, Tag, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import useCourier from '../../hooks/useCourier';
import { formatCurrency } from '@/utils/currency';
import { formatDateTime } from '@/utils/dateUtils';

interface PendingShipment {
  id: string;
  shipmentNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  shippingCharge: number;
  codAmount?: number;
  notes?: string;
  createdAt: string;
  sale?: {
    saleNumber: string;
    discount: number;
    discountType: string;
    totalAmount: number;
    subtotal: number;
    soldBy?: { name: string };
    saleItems?: Array<{ productName: string; quantity: number; unitPrice: number }>;
  };
  courier?: { name: string; provider: string; baseCharge?: number };
}

const resolveDefaultShippingCharge = (shipment: PendingShipment): number => {
  const stored = Number(shipment.shippingCharge ?? 0);
  if (stored > 0) return stored;
  return Number(shipment.courier?.baseCharge ?? 0);
};

type AdjustmentState = {
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: string;
  shippingCharge: string;
};

export default function PendingApprovalShipments() {
  const { fetchPendingApprovalShipments, approveShipment, loading } = useCourier();
  const [shipments, setShipments] = useState<PendingShipment[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, AdjustmentState>>({});

  const load = useCallback(async () => {
    const data = await fetchPendingApprovalShipments();
    setShipments(data);
    setAdjustments((prev) => {
      const next = { ...prev };
      data.forEach((shipment: PendingShipment) => {
        if (!next[shipment.id]) {
          const subtotal = Number(shipment.sale?.subtotal ?? 0);
          const discountAmount = Number(shipment.sale?.discount ?? 0);
          const discountType = shipment.sale?.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
          const discountValue = discountType === 'PERCENTAGE' && subtotal > 0
            ? String(((discountAmount / subtotal) * 100).toFixed(2))
            : String(discountAmount);

          next[shipment.id] = {
            discountType,
            discountValue,
            shippingCharge: String(resolveDefaultShippingCharge(shipment)),
          };
        }
      });
      return next;
    });
  }, [fetchPendingApprovalShipments]);

  useEffect(() => { load(); }, [load]);

  const getPreviewTotal = useCallback((shipment: PendingShipment) => {
    const state = adjustments[shipment.id];
    const subtotal = Number(shipment.sale?.subtotal ?? 0);
    const discountValue = Number(state?.discountValue ?? 0);
    const discountAmount = state?.discountType === 'PERCENTAGE'
      ? subtotal * (discountValue / 100)
      : discountValue;
    const shipping = Number(state?.shippingCharge ?? resolveDefaultShippingCharge(shipment));
    return Math.max(0, subtotal - discountAmount + shipping);
  }, [adjustments]);

  const handleApprove = async (shipment: PendingShipment) => {
    const state = adjustments[shipment.id];
    setProcessing(shipment.id);
    try {
      await approveShipment(shipment.id, true, undefined, {
        adjustedDiscountType: state?.discountType,
        adjustedDiscountValue: Number(state?.discountValue ?? 0),
        adjustedShippingCharge: Number(state?.shippingCharge ?? resolveDefaultShippingCharge(shipment)),
      });
      toast.success('Order approved — courier booking created');
      setShipments(prev => prev.filter(s => s.id !== shipment.id));
    } catch {
      toast.error('Failed to approve order');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    setProcessing(id);
    try {
      await approveShipment(id, false, rejectionReason);
      toast.success('Order rejected');
      setShipments(prev => prev.filter(s => s.id !== id));
      setRejecting(null);
      setRejectionReason('');
    } catch {
      toast.error('Failed to reject order');
    } finally {
      setProcessing(null);
    }
  };

  if (shipments.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <CheckCircle className="w-12 h-12 mb-3 text-green-300" />
        <p className="text-sm font-medium">No orders pending approval</p>
        <p className="text-xs mt-1">Discounted orders created by staff will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loading && shipments.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      )}

      {shipments.map(s => {
        const isExpanded = expanded === s.id;
        const isProcessing = processing === s.id;
        const isRejecting = rejecting === s.id;
        const adjustment = adjustments[s.id];
        const discountAmount = Number(s.sale?.discount ?? 0);
        const discountType = s.sale?.discountType;
        const subtotal = Number(s.sale?.subtotal ?? 0);
        const discountDisplay = discountType === 'PERCENTAGE'
          ? `${((discountAmount / subtotal) * 100).toFixed(1)}% off`
          : formatCurrency(discountAmount);
        const previewTotal = getPreviewTotal(s);

        return (
          <div key={s.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-800">{s.shipmentNumber}</span>
                  {s.sale?.saleNumber && (
                    <span className="text-xs text-gray-400">· {s.sale.saleNumber}</span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-full">
                    <Tag className="w-3 h-3" />
                    Discount: {discountDisplay}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{s.recipientName} · {s.recipientPhone}</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{s.recipientCity}</span>
                  {s.courier?.name && <span>{s.courier.name}</span>}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-800">{formatCurrency(previewTotal)}</p>
                <p className="text-[11px] text-gray-400">{s.createdAt ? formatDateTime(s.createdAt) : '—'}</p>
              </div>

              <button
                onClick={() => setExpanded(isExpanded ? null : s.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
                {s.sale?.saleItems && s.sale.saleItems.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Items</p>
                    <div className="space-y-1">
                      {s.sale.saleItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-gray-700">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-amber-100 bg-white p-3 space-y-3">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Adjust Before Approval</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type</label>
                      <select
                        value={adjustment?.discountType ?? 'FIXED'}
                        onChange={(e) => setAdjustments((prev) => ({
                          ...prev,
                          [s.id]: {
                            ...prev[s.id],
                            discountType: e.target.value as 'FIXED' | 'PERCENTAGE',
                          },
                        }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <option value="FIXED">Fixed (LKR)</option>
                        <option value="PERCENTAGE">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Discount Value</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={adjustment?.discountValue ?? '0'}
                        onChange={(e) => setAdjustments((prev) => ({
                          ...prev,
                          [s.id]: {
                            ...prev[s.id],
                            discountValue: e.target.value,
                          },
                        }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Shipping Charge</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={adjustment?.shippingCharge ?? '0'}
                        onChange={(e) => setAdjustments((prev) => ({
                          ...prev,
                          [s.id]: {
                            ...prev[s.id],
                            shippingCharge: e.target.value,
                          },
                        }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-sm space-y-1 border-t border-gray-100 pt-2">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>Discount</span>
                    <span>- {formatCurrency(
                      adjustment?.discountType === 'PERCENTAGE'
                        ? subtotal * (Number(adjustment?.discountValue ?? 0) / 100)
                        : Number(adjustment?.discountValue ?? 0),
                    )}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span><span>{formatCurrency(Number(adjustment?.shippingCharge ?? resolveDefaultShippingCharge(s)))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-1">
                    <span>Total</span><span>{formatCurrency(previewTotal)}</span>
                  </div>
                </div>

                {s.notes && (
                  <p className="text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-100">{s.notes}</p>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2 flex-wrap">
              {isRejecting ? (
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Reason for rejection…"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReject(s.id)}
                    className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-red-200"
                  />
                  <button
                    onClick={() => handleReject(s.id)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                  <button
                    onClick={() => { setRejecting(null); setRejectionReason(''); }}
                    className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleApprove(s)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {isProcessing ? 'Processing…' : 'Approve & Create Courier'}
                  </button>
                  <button
                    onClick={() => setRejecting(s.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors border border-red-200"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
