import React, { useMemo, useState } from "react";
import { ArrowLeftRight, Loader2, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../../utils/currency";
import useSales from "../../../hooks/useSales";

type RefundMethod = "CASH" | "CARD" | "BANK_TRANSFER";

interface SaleLine {
  productId: string;
  name: string;
  quantity: number;
  remainingQty: number;
  lineTotal: number;
}

interface LoadedSale {
  id: string;
  saleNumber: string;
  status: string;
  totalAmount: number;
  remainingAmount: number;
  items: SaleLine[];
}

interface ReplacementItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discount?: number;
  warrantyMonths?: number;
  serialNumber?: string;
  reloadPhone?: string;
}

interface PosExchangeDrawerProps {
  open: boolean;
  locationId: string;
  userId?: string;
  replacementItems: ReplacementItem[];
  replacementTotal: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
  onCompleted?: () => void;
}

const parseHits = (response: unknown) => {
  const payload = (response as { data?: { data?: unknown } | unknown })?.data;
  const rows = Array.isArray((payload as { data?: unknown })?.data)
    ? (payload as { data: unknown[] }).data
    : Array.isArray(payload)
      ? payload
      : [];
  return rows.map((row) => {
    const sale = row as Record<string, unknown>;
    return {
      id: String(sale.id || ""),
      saleNumber: String(sale.saleNumber || sale.sale_number || sale.id || ""),
      status: String(sale.status || "").toUpperCase(),
      totalAmount: Number(sale.totalAmount ?? sale.total_amount ?? 0),
      customerName: (sale.customerName || sale.customer_name) as string | undefined,
    };
  }).filter((row) => row.id);
};

const PosExchangeDrawer: React.FC<PosExchangeDrawerProps> = ({
  open,
  locationId,
  userId,
  replacementItems,
  replacementTotal,
  customerId,
  customerName,
  customerPhone,
  onClose,
  onCompleted,
}) => {
  const { getSales, getSaleById, exchangeSale } = useSales();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<ReturnType<typeof parseHits>>([]);
  const [sale, setSale] = useState<LoadedSale | null>(null);
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("POS exchange");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);

  const selectedReturns = useMemo(
    () =>
      (sale?.items || [])
        .map((item) => ({
          ...item,
          returnQty: Math.min(
            item.remainingQty,
            Math.max(0, Number(qtyByProduct[item.productId] || 0)),
          ),
        }))
        .filter((item) => item.returnQty > 0),
    [qtyByProduct, sale],
  );

  const returnCredit = useMemo(
    () =>
      selectedReturns.reduce((sum, item) => {
        const unit = item.quantity > 0 ? item.lineTotal / item.quantity : 0;
        return sum + unit * item.returnQty;
      }, 0),
    [selectedReturns],
  );

  const searchSales = async () => {
    const term = query.trim();
    if (term.length < 3) {
      toast.error("Enter at least 3 characters");
      return;
    }
    setSearching(true);
    setSale(null);
    try {
      const response = await getSales({
        locationId: locationId || undefined,
        search: term,
        page: 1,
        limit: 10,
      });
      const next = parseHits(response);
      setHits(next);
      if (next.length === 0) toast.error("No matching sales");
    } catch {
      toast.error("Could not search sales");
    } finally {
      setSearching(false);
    }
  };

  const loadSale = async (id: string) => {
    try {
      const response = await getSaleById(id);
      const raw =
        ((response as { data?: { sale?: unknown } })?.data?.sale as Record<string, unknown> | undefined) ||
        ((response as { data?: unknown })?.data as Record<string, unknown> | undefined);
      if (!raw?.id) {
        toast.error("Sale not found");
        return;
      }
      const refunds = Array.isArray(raw.saleRefunds)
        ? (raw.saleRefunds as Array<{
            amount?: number;
            refundItems?: Array<{ productId?: string; product_id?: string; quantity?: number }>;
          }>)
        : [];
      const refunded = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const returnedQtyByProduct = new Map<string, number>();
      for (const refund of refunds) {
        for (const item of refund.refundItems || []) {
          const productId = String(item.productId || item.product_id || "");
          if (!productId) continue;
          returnedQtyByProduct.set(
            productId,
            (returnedQtyByProduct.get(productId) || 0) + Number(item.quantity || 0),
          );
        }
      }
      const totalAmount = Number(raw.totalAmount ?? raw.total_amount ?? 0);
      const itemsRaw = Array.isArray(raw.saleItems)
        ? (raw.saleItems as Array<Record<string, unknown>>)
        : Array.isArray(raw.items)
          ? (raw.items as Array<Record<string, unknown>>)
          : [];
      setSale({
        id: String(raw.id),
        saleNumber: String(raw.saleNumber || raw.sale_number || raw.id),
        status: String(raw.status || "").toUpperCase(),
        totalAmount,
        remainingAmount: Math.max(0, totalAmount - refunded),
        items: itemsRaw.map((item) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
          const product = (item.product as { id?: string; name?: string } | undefined) || {};
          const productId = String(item.productId || item.product_id || product.id || "");
          return {
            productId,
            name: String(item.productName || item.product_name || product.name || "Item"),
            quantity,
            remainingQty: Math.max(0, quantity - (returnedQtyByProduct.get(productId) || 0)),
            lineTotal: Number(item.subtotal ?? item.totalPrice ?? unitPrice * quantity),
          };
        }),
      });
      setQtyByProduct({});
    } catch {
      toast.error("Could not load sale");
    }
  };

  const submit = async () => {
    if (!sale || !userId) return;
    if (replacementItems.length === 0) {
      toast.error("Add replacement items to the cart first");
      return;
    }
    if (selectedReturns.length === 0) {
      toast.error("Select items to take back");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSubmitting(true);
    try {
      const response = await exchangeSale(sale.id, {
        returnItems: selectedReturns.map((item) => ({
          productId: item.productId,
          quantity: item.returnQty,
        })),
        reason: reason.trim(),
        refundMethod,
        replacement: {
          locationId,
          soldById: userId,
          customerId,
          customerName,
          customerPhone,
          items: replacementItems,
          payments: [
            {
              method: refundMethod,
              amount: replacementTotal,
              reference: `QPOS-EXCHANGE-${Date.now()}`,
            },
          ],
          type: "DIRECT_SALE",
          notes: `POS exchange from ${sale.saleNumber}`,
        },
      });
      if (!response?.success && !response?.data) {
        throw new Error(response?.message || "Exchange failed");
      }
      toast.success("Exchange completed   original sale kept, new bill created");
      onCompleted?.();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Exchange failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white border border-gray-200 p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            POS exchange
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Cart is the replacement. Original bill stays; returned lines are refunded
          and restocked in the same transaction as the new bill.
        </p>
        <p className="text-xs font-semibold text-gray-800 mb-3">
          Replacement total {formatCurrency(replacementTotal)} · {replacementItems.length} line(s)
        </p>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchSales();
                }
              }}
              placeholder="Original sale number or phone"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => void searchSales()}
            disabled={searching}
            className="px-3 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm font-semibold disabled:opacity-40"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find"}
          </button>
        </div>

        {!sale && hits.length > 0 && (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg mb-3">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => void loadSale(hit.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  <p className="text-sm font-semibold">{hit.saleNumber}</p>
                  <p className="text-xs text-gray-500">
                    {hit.customerName || "Walk-in"} · {hit.status}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {sale && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              {sale.saleNumber} · remaining {formatCurrency(sale.remainingAmount)}
            </p>
            <ul className="space-y-2">
              {sale.items.map((item) => (
                <li key={item.productId} className="flex items-center gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-[11px] text-gray-500">
                      Sold {item.quantity} · remaining {item.remainingQty}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={item.remainingQty}
                    value={qtyByProduct[item.productId] ?? 0}
                    onChange={(e) =>
                      setQtyByProduct((prev) => ({
                        ...prev,
                        [item.productId]: Math.max(
                          0,
                          Math.min(item.remainingQty, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md"
                  />
                </li>
              ))}
            </ul>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="CASH">Refund cash</option>
              <option value="CARD">Refund card</option>
              <option value="BANK_TRANSFER">Refund bank</option>
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
            />
            <p className="text-xs text-gray-600">
              Return credit {formatCurrency(returnCredit)}. Collect replacement{" "}
              {formatCurrency(replacementTotal)} on the new bill.
            </p>
            <button
              type="button"
              disabled={submitting || selectedReturns.length === 0 || replacementItems.length === 0}
              onClick={() => void submit()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40"
            >
              {submitting ? "Processing…" : "Complete exchange"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PosExchangeDrawer;
