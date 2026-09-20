import React, { useMemo, useState } from "react";
import { Loader2, RotateCcw, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "../../../utils/currency";
import useSales from "../../../hooks/useSales";

type RefundMethod = "CASH" | "CARD" | "BANK_TRANSFER";

interface SaleLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isService?: boolean;
}

interface LoadedSale {
  id: string;
  saleNumber: string;
  locationId: string;
  status: string;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  createdAt: string;
  refundedAmount: number;
  remainingAmount: number;
  items: SaleLine[];
}

interface SearchHit {
  id: string;
  saleNumber: string;
  status: string;
  totalAmount: number;
  customerName?: string;
  createdAt: string;
}

const parseSaleList = (response: unknown): SearchHit[] => {
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
      createdAt: String(sale.createdAt || sale.created_at || ""),
    };
  }).filter((row) => row.id);
};

const mapLoadedSale = (raw: Record<string, unknown>): LoadedSale => {
  const nestedLocation = raw.location as { id?: string } | undefined;
  const nestedCustomer = raw.customer as { id?: string; name?: string; phone?: string } | undefined;
  const refunds = Array.isArray(raw.saleRefunds)
    ? (raw.saleRefunds as Array<{ amount?: number }>)
    : [];
  const refundedAmount = refunds.reduce(
    (sum, refund) => sum + Number(refund.amount || 0),
    0,
  );
  const totalAmount = Number(raw.totalAmount ?? raw.total_amount ?? 0);
  const itemsRaw = Array.isArray(raw.saleItems)
    ? (raw.saleItems as Array<Record<string, unknown>>)
    : Array.isArray(raw.items)
      ? (raw.items as Array<Record<string, unknown>>)
      : [];
  const items: SaleLine[] = itemsRaw.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    const product = (item.product as { id?: string; name?: string; isService?: boolean } | undefined) || {};
    return {
      productId: String(item.productId || item.product_id || product.id || ""),
      name: String(item.productName || item.product_name || product.name || "Item"),
      quantity,
      unitPrice,
      lineTotal: Number(item.subtotal ?? item.totalPrice ?? unitPrice * quantity),
      isService: Boolean(product.isService ?? item.isService),
    };
  });
  return {
    id: String(raw.id || ""),
    saleNumber: String(raw.saleNumber || raw.sale_number || raw.id || ""),
    locationId: String(
      raw.locationId || raw.location_id || nestedLocation?.id || "",
    ),
    status: String(raw.status || "").toUpperCase(),
    totalAmount,
    customerName: (raw.customerName || raw.customer_name || nestedCustomer?.name) as
      | string
      | undefined,
    customerPhone: (raw.customerPhone || raw.customer_phone || nestedCustomer?.phone) as
      | string
      | undefined,
    customerId: (raw.customerId || raw.customer_id || nestedCustomer?.id) as
      | string
      | undefined,
    createdAt: String(raw.createdAt || raw.created_at || ""),
    refundedAmount,
    remainingAmount: Math.max(0, totalAmount - refundedAmount),
    items,
  };
};

interface PosReturnDrawerProps {
  open: boolean;
  locationId: string;
  userId?: string;
  onClose: () => void;
  onCompleted?: () => void;
}

const PosReturnDrawer: React.FC<PosReturnDrawerProps> = ({
  open,
  locationId,
  userId,
  onClose,
  onCompleted,
}) => {
  const { getSales, getSaleById, createRefund } = useSales();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [sale, setSale] = useState<LoadedSale | null>(null);
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setQuery("");
    setHits([]);
    setSale(null);
    setQtyByProduct({});
    setReason("");
    setRefundMethod("CASH");
  };

  const close = () => {
    reset();
    onClose();
  };

  const selectedItems = useMemo(
    () =>
      (sale?.items || [])
        .map((item) => ({
          ...item,
          returnQty: Math.min(
            item.quantity,
            Math.max(0, Number(qtyByProduct[item.productId] || 0)),
          ),
        }))
        .filter((item) => item.returnQty > 0),
    [qtyByProduct, sale],
  );

  const refundAmount = useMemo(() => {
    if (!sale) return 0;
    return selectedItems.reduce((sum, item) => {
      const unit = item.quantity > 0 ? item.lineTotal / item.quantity : item.unitPrice;
      return sum + unit * item.returnQty;
    }, 0);
  }, [sale, selectedItems]);

  const policy = useMemo(() => {
    if (!sale) {
      return { mode: "none" as const, message: "" };
    }
    if (sale.status === "REFUNDED" || sale.remainingAmount <= 0.001) {
      return {
        mode: "blocked" as const,
        message: "This sale is already fully refunded.",
      };
    }
    if (sale.status === "CANCELLED" || sale.status === "DRAFT") {
      return {
        mode: "blocked" as const,
        message: "Only completed sales can be returned from POS.",
      };
    }
    return {
      mode: "fast" as const,
      message:
        "This refunds the sale and restores stock. Analytics will show the invoice as refunded or partial refund.",
    };
  }, [sale]);

  const searchSales = async () => {
    const term = query.trim();
    if (term.length < 3) {
      toast.error("Enter at least 3 characters (sale number or phone)");
      return;
    }
    setSearching(true);
    setSale(null);
    setQtyByProduct({});
    try {
      const response = await getSales({
        locationId: locationId || undefined,
        search: term,
        page: 1,
        limit: 10,
      });
      const next = parseSaleList(response);
      setHits(next);
      if (next.length === 0) toast.error("No matching sales");
    } catch {
      setHits([]);
      toast.error("Could not search sales");
    } finally {
      setSearching(false);
    }
  };

  const loadSale = async (id: string) => {
    try {
      const response = await getSaleById(id);
      const payload = (response as { data?: { sale?: unknown } | Record<string, unknown> })?.data;
      const raw = (
        payload &&
        typeof payload === "object" &&
        "sale" in payload &&
        (payload as { sale?: unknown }).sale
          ? (payload as { sale: Record<string, unknown> }).sale
          : (payload as Record<string, unknown> | undefined)
      );
      if (!raw?.id) {
        toast.error("Sale not found");
        return;
      }
      const loaded = mapLoadedSale(raw);
      setSale(loaded);
      setQtyByProduct({});
    } catch {
      toast.error("Could not load sale");
    }
  };

  const submit = async () => {
    if (!sale || !userId) {
      toast.error("User or sale missing");
      return;
    }
    if (policy.mode === "blocked") {
      toast.error(policy.message);
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Select at least one item quantity to return");
      return;
    }
    if (!reason.trim()) {
      toast.error("Return reason is required");
      return;
    }
    if (refundAmount > sale.remainingAmount + 0.05) {
      toast.error("Return amount exceeds remaining refundable total");
      return;
    }
    setSubmitting(true);
    try {
      const items = selectedItems
        .filter((item) => !item.isService && item.productId)
        .map((item) => ({
          productId: item.productId,
          quantity: item.returnQty,
        }));
      const response = await createRefund(sale.id, {
        amount: Number(refundAmount.toFixed(2)),
        reason: reason.trim(),
        refundMethod,
        processedById: userId,
        items,
      });
      if (response && response.success === false) {
        throw new Error(response.message || "Refund failed");
      }
      if (!response?.success && !response?.data) {
        throw new Error(response?.message || "Refund failed");
      }
      toast.success(`Refunded ${sale.saleNumber}   sale marked returned`);
      onCompleted?.();
      close();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Return failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white border border-gray-200 p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            POS return
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-gray-400 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              placeholder="Sale number or customer phone"
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
                  <p className="text-sm font-semibold text-gray-900">
                    {hit.saleNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {hit.customerName || "Walk-in"} · {hit.status} ·{" "}
                    {formatCurrency(hit.totalAmount)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {sale && (
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs">
              <p className="font-semibold text-gray-900">{sale.saleNumber}</p>
              <p className="text-gray-500">
                {sale.customerName || "Walk-in"} · {sale.status}
              </p>
              <p className="text-gray-600 mt-1">
                Remaining refundable {formatCurrency(sale.remainingAmount)} of{" "}
                {formatCurrency(sale.totalAmount)}
              </p>
            </div>

            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                policy.mode === "fast"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {policy.message}
            </div>

            {policy.mode !== "blocked" && (
              <>
                <ul className="space-y-2">
                  {sale.items.map((item) => (
                    <li
                      key={item.productId || item.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Sold {item.quantity} · {formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        step={1}
                        value={qtyByProduct[item.productId] ?? 0}
                        onChange={(e) =>
                          setQtyByProduct((prev) => ({
                            ...prev,
                            [item.productId]: Math.max(
                              0,
                              Math.min(item.quantity, Number(e.target.value) || 0),
                            ),
                          }))
                        }
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md"
                      />
                    </li>
                  ))}
                </ul>

                {policy.mode === "fast" && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Refund method
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) =>
                        setRefundMethod(e.target.value as RefundMethod)
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Reason
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
                    placeholder="Why is this being returned?"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting || selectedItems.length === 0}
                  onClick={() => void submit()}
                  className="w-full py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-orange-700"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                    </span>
                  ) : (
                    `Refund ${formatCurrency(refundAmount)}`
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PosReturnDrawer;
