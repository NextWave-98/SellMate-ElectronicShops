import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import useFetch from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "@/utils/currency";

type PendingCancelSale = {
  id: string;
  saleNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount?: number;
  paidAmount?: number;
  cancelRequestReason?: string | null;
  cancelPreviousStatus?: string | null;
  cancelRequestedAt?: string | null;
  createdAt?: string;
  location?: { id: string; name?: string };
  soldBy?: { id: string; name?: string };
  cancelRequestedBy?: { id: string; name?: string; email?: string } | null;
  saleItems?: Array<{
    id: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
};

export default function PendingCancelApprovalsPage() {
  const { branchCode } = useParams();
  const { user } = useAuth();
  const { fetchData, loading } = useFetch();
  const locationId = user?.locationId || user?.branchId || "";

  const [rows, setRows] = useState<PendingCancelSale[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (locationId && branchCode) params.set("locationId", locationId);
    params.set("limit", "50");
    const res = await fetchData({
      endpoint: `/sales/pos/pending-cancel-approvals?${params.toString()}`,
      method: "GET",
      silent: true,
    });
    const list = (res as any)?.data?.sales;
    setRows(Array.isArray(list) ? list : []);
  }, [fetchData, locationId, branchCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, approve: boolean) => {
    if (!approve && !rejectionReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setBusyId(id);
    try {
      const res = await fetchData({
        endpoint: `/sales/pos/pending-cancel-approvals/${id}/decide`,
        method: "POST",
        data: {
          approve,
          ...(approve ? {} : { rejectionReason: rejectionReason.trim() }),
        },
        silent: false,
        successMessage: approve
          ? "Cancel approved — sale cancelled"
          : "Cancel request rejected",
      });
      if (!(res as any)?.success) {
        throw new Error((res as any)?.message || "Decision failed");
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setRejecting(null);
      setRejectionReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-600" />
            Pending cancel approvals
          </h1>
          <p className="text-sm text-gray-500">
            Staff cancel requests awaiting admin review
            {branchCode ? ` · ${branchCode}` : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {rows.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <CheckCircle className="w-12 h-12 mb-3 text-green-300" />
          <p className="text-sm font-medium">No cancel requests pending</p>
          <p className="text-xs mt-1">
            When staff cancel a sale and approval is required, requests appear
            here
          </p>
        </div>
      )}

      {loading && rows.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      )}

      <div className="space-y-3">
        {rows.map((sale) => {
          const isExpanded = expanded === sale.id;
          const isBusy = busyId === sale.id;
          const isRejecting = rejecting === sale.id;
          return (
            <div
              key={sale.id}
              className="border border-gray-200 rounded-xl bg-white overflow-hidden"
            >
              <div className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {sale.saleNumber}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3" />
                      Pending cancel
                    </span>
                    {sale.cancelPreviousStatus && (
                      <span className="text-xs text-gray-500">
                        was {sale.cancelPreviousStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {sale.customerName || "Walk-in"}
                    {sale.customerPhone ? ` · ${sale.customerPhone}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested by{" "}
                    {sale.cancelRequestedBy?.name || "Staff"}
                    {sale.cancelRequestedAt
                      ? ` · ${new Date(sale.cancelRequestedAt).toLocaleString()}`
                      : ""}
                    {sale.location?.name ? ` · ${sale.location.name}` : ""}
                  </p>
                  {sale.cancelRequestReason && (
                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      Reason: {sale.cancelRequestReason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(Number(sale.totalAmount || 0))}
                  </p>
                  <p className="text-xs text-gray-500">
                    Paid {formatCurrency(Number(sale.paidAmount || 0))}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(isExpanded ? null : sale.id)
                  }
                  className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  Items
                </button>
                <div className="flex-1" />
                {!isRejecting ? (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void decide(sale.id, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve cancel
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setRejecting(sale.id);
                        setRejectionReason("");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                ) : (
                  <div className="w-full flex flex-col sm:flex-row gap-2 mt-1">
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Rejection reason"
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void decide(sale.id, false)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setRejecting(null)}
                      className="px-3 py-1.5 text-sm rounded-lg border"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t bg-gray-50 px-4 py-3 text-sm space-y-1">
                  {(sale.saleItems || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-gray-700"
                    >
                      <span>
                        {item.productName} × {item.quantity}
                      </span>
                      <span>
                        {formatCurrency(
                          Number(item.unitPrice || 0) * Number(item.quantity || 0),
                        )}
                      </span>
                    </div>
                  ))}
                  {(sale.saleItems || []).length === 0 && (
                    <p className="text-gray-400 text-xs">No line items</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
