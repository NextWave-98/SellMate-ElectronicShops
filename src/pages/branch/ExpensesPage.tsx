import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Wallet,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import usePosExpense, {
  type PosExpenseRecord,
  type PosDaySummary,
} from "../../hooks/usePosExpense";
import useFetch from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/currency";

const CATEGORIES = [
  { value: "TEA", label: "Tea / Staff welfare" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "SALARIES", label: "Salaries" },
  { value: "RENT", label: "Rent" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OTHER", label: "Other" },
] as const;

type BranchOption = { id: string; name: string };

function todayColombo() {
  return new Date().toLocaleString("en-CA", { timeZone: "Asia/Colombo" }).slice(0, 10);
}

/**
 * Cash / petty expenses — separate from Product Usage (stock consume).
 * Uses existing live `pos_expenses` table; no schema change.
 */
export default function ExpensesPage() {
  const { branchCode } = useParams();
  const { user } = useAuth();
  const isOrgAdmin =
    user?.role?.name === "ADMIN" ||
    user?.role?.name === "SUPER_ADMIN" ||
    !branchCode;

  const { listExpenses, createExpense, voidExpense, getDaySummary } =
    usePosExpense();
  const { fetchData } = useFetch();

  const userLocationId = user?.locationId || user?.branchId || "";
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [locationId, setLocationId] = useState(userLocationId);
  const [date, setDate] = useState(todayColombo);
  const [rows, setRows] = useState<PosExpenseRecord[]>([]);
  const [summary, setSummary] = useState<PosDaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("OTHER");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!isOrgAdmin) {
      setLocationId(userLocationId);
      return;
    }
    void fetchData({
      endpoint: "/locations?branch=branch&limit=100",
      method: "GET",
      silent: true,
    }).then((res) => {
      const d = res?.data as { locations?: BranchOption[] } | BranchOption[] | null;
      const list: BranchOption[] = Array.isArray(d) ? d : d?.locations ?? [];
      setBranches(list);
      if (!locationId && list.length === 1) setLocationId(list[0].id);
      if (!locationId && userLocationId) setLocationId(userLocationId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgAdmin, userLocationId]);

  const load = useCallback(async () => {
    if (!locationId) {
      setRows([]);
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        listExpenses(locationId, date),
        getDaySummary(locationId, date),
      ]);
      const list = (expRes as { data?: PosExpenseRecord[] } | null)?.data;
      setRows(Array.isArray(list) ? list : []);
      setSummary(
        ((sumRes as { data?: PosDaySummary } | null)?.data as PosDaySummary) ||
          null,
      );
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [date, getDaySummary, listExpenses, locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPosted = useMemo(
    () => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows],
  );

  const submit = async () => {
    if (!locationId) {
      toast.error("Select a branch first");
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const res = await createExpense({
        locationId,
        amount: amt,
        category,
        note: note.trim() || undefined,
      });
      if (!res?.success && !res?.data) {
        throw new Error(res?.message || "Failed");
      }
      toast.success("Expense recorded");
      setAmount("");
      setNote("");
      setCategory("OTHER");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save expense");
    } finally {
      setSaving(false);
    }
  };

  const onVoid = async (id: string) => {
    if (!window.confirm("Void this expense? This cannot be undone easily.")) return;
    try {
      const res = await voidExpense(id);
      if (!res?.success) {
        throw new Error(res?.message || "Void failed");
      }
      toast.success("Expense voided");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Void failed");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            Expenses
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cash / petty expenses (tea, transport, rent…). Separate from Product
            Usage, which is for stock consume / write-off.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isOrgAdmin && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Branch
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 flex flex-col justify-center">
          <p className="text-[11px] text-amber-800 font-medium">Day total (posted)</p>
          <p className="text-lg font-bold text-amber-900">
            {formatCurrency(totalPosted)}
          </p>
          {summary && (
            <p className="text-[11px] text-amber-700">
              Net profit snapshot: {formatCurrency(summary.netProfit)}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add expense
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Amount (LKR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Note
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={saving || !locationId}
          onClick={() => void submit()}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Record expense"}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Expenses for {date}
          </h2>
          <span className="text-xs text-gray-500">{rows.length} posted</span>
        </div>
        {!locationId ? (
          <p className="p-6 text-sm text-gray-500 text-center">
            Select a branch to view expenses.
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">
            {loading ? "Loading…" : "No expenses for this day."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {rows.map((row) => (
              <li
                key={row.id}
                className="px-4 py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {row.category} · {formatCurrency(Number(row.amount))}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {row.note || "No note"}
                    {row.createdBy?.name ? ` · ${row.createdBy.name}` : ""}
                    {row.createdAt
                      ? ` · ${new Date(row.createdAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onVoid(row.id)}
                  className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded-md inline-flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="w-3 h-3" /> Void
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
