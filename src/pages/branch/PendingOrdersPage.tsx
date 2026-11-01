import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Package, RefreshCw, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import useFetch from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";

type PendingSale = {
  id: string;
  saleNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount?: number;
  paidAmount?: number;
  notes?: string | null;
  createdAt?: string;
  location?: { id: string; name?: string };
  saleItems?: Array<{
    id: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
};

export default function PendingOrdersPage() {
  const { branchCode } = useParams();
  const { user } = useAuth();
  const { fetchData, loading } = useFetch();
  const locationId = user?.locationId || user?.branchId || "";

  const [rows, setRows] = useState<PendingSale[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    // Branch users are scoped to their location; org admin sees all when no location.
    if (locationId && branchCode) params.set("locationId", locationId);
    if (search.trim()) params.set("search", search.trim());
    params.set("limit", "50");
    const res = await fetchData({
      endpoint: `/sales/pos/awaiting-stock?${params.toString()}`,
      method: "GET",
      silent: true,
    });
    const list = (res as any)?.data;
    setRows(Array.isArray(list) ? list : []);
    setSelected(new Set());
  }, [fetchData, locationId, search, branchCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fulfillOne = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetchData({
        endpoint: `/sales/pos/${id}/fulfill`,
        method: "POST",
        silent: false,
        successMessage: "Order fulfilled — stock deducted",
      });
      if (!(res as any)?.success) {
        throw new Error((res as any)?.message || "Fulfill failed");
      }
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Fulfill failed");
    } finally {
      setBusyId(null);
    }
  };

  const fulfillBulk = async () => {
    const saleIds = Array.from(selected);
    if (saleIds.length === 0) {
      toast.error("Select at least one order");
      return;
    }
    setBusyId("bulk");
    try {
      const res = await fetchData({
        endpoint: `/sales/pos/fulfill-bulk`,
        method: "POST",
        data: { saleIds },
        silent: false,
        successMessage: "Bulk fulfill finished",
      });
      const data = (res as any)?.data;
      const failed = (data?.results || []).filter((r: any) => !r.ok);
      if (failed.length) {
        toast.error(
          `${failed.length} order(s) could not be fulfilled (check stock)`,
        );
      }
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk fulfill failed");
    } finally {
      setBusyId(null);
    }
  };

  const cancelOne = async (id: string) => {
    if (!window.confirm("Cancel this pending order? No stock will change.")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetchData({
        endpoint: `/sales/pos/${id}/cancel-pending`,
        method: "POST",
        data: { reason: "Cancelled from pending orders" },
        silent: false,
        showToastOnError: false,
      });
      const pendingApproval = Boolean((res as any)?.data?.pendingApproval);
      if (pendingApproval) {
        toast.success("Cancel request submitted — awaiting admin approval");
      } else if ((res as any)?.success !== false) {
        toast.success("Pending order cancelled");
      } else {
        throw new Error((res as any)?.message || "Cancel failed");
      }
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  const formatMoney = (n: number) =>
    `Rs. ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Pending orders
          </h1>
          <p className="text-sm text-gray-500">
            Pre-orders awaiting stock{branchCode ? ` · ${branchCode}` : ""}.
            Fulfill after inventory arrives to deduct stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || busyId === "bulk"}
            onClick={() => void fulfillBulk()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1e3a8a] text-white disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            Fulfill selected ({selected.size})
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sale # / customer / phone"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          No pending orders for this branch.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-start gap-3"
            >
              <label className="flex items-start gap-2 shrink-0 pt-0.5">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  className="mt-1"
                />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {row.saleNumber}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Awaiting stock
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.customerName || "Walk-in"}
                  {row.customerPhone ? ` · ${row.customerPhone}` : ""}
                  {row.createdAt
                    ? ` · ${new Date(row.createdAt).toLocaleString()}`
                    : ""}
                </p>
                {row.notes?.includes("Lead pending restock") && (
                  <p className="text-[11px] text-rose-700 mt-1 font-medium">
                    Lead pending restock
                    {row.notes.length > 80 ? ` · ${row.notes.slice(0, 80)}…` : ` · ${row.notes}`}
                  </p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  {formatMoney(Number(row.totalAmount))}
                  {Number(row.paidAmount) > 0
                    ? ` · paid ${formatMoney(Number(row.paidAmount))}`
                    : " · no payment yet"}
                </p>
                {row.saleItems && row.saleItems.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-600 space-y-0.5">
                    {row.saleItems.slice(0, 6).map((it) => (
                      <li key={it.id}>
                        {it.productName} × {it.quantity}
                      </li>
                    ))}
                    {row.saleItems.length > 6 && (
                      <li>+{row.saleItems.length - 6} more</li>
                    )}
                  </ul>
                )}
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void fulfillOne(row.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white disabled:opacity-50"
                >
                  Fulfill
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void cancelOne(row.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
