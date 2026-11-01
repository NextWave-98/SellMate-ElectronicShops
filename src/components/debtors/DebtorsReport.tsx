/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Download,
  CreditCard,
  X,
  FileText,
  Printer,
  Users,
  DollarSign,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import useSales from '../../hooks/useSales';
import { useLocation } from '../../hooks/useLocation';

type AgingBuckets = {
  '0-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
  total: number;
};

type DebtorRow = AgingBuckets & {
  customerKey: string;
  customerId: string | null;
  name: string;
  phone: string | null;
  locationNames: string[];
  invoiceCount: number;
  oldestAgeDays: number;
};

type StatementLine = {
  type: 'SALE' | 'PAYMENT';
  date: string;
  saleId?: string;
  saleNumber?: string;
  ref: string;
  debit: number;
  credit: number;
  balanceDue?: number;
  paidAmount?: number;
  totalAmount?: number;
  ageDays?: number;
  bucket?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  canPay?: boolean;
  runningBalance?: number;
};

type StatementData = {
  asOf: string;
  customerKey: string;
  customerId: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  summary: AgingBuckets;
  invoiceCount: number;
  lines: StatementLine[];
};

type OpenTab = {
  key: string;
  label: string;
};

type PaySale = {
  id: string;
  saleNumber: string;
  totalAmount: number;
  paidAmount: number;
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_MONEY', label: 'Online / Mobile Money' },
] as const;

const fmt = (n: number | string) =>
  `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

const moneyNum = (n: number | string) =>
  Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayISO = () => {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const shortTabLabel = (name: string) => {
  const t = String(name || 'Customer').trim();
  return t.length > 22 ? `${t.slice(0, 20)}…` : t;
};

function downloadTextFile(content: string, filename: string, mime = 'text/csv;charset=utf-8') {
  const bom = mime.includes('csv') ? '\uFEFF' : '';
  const url = URL.createObjectURL(new Blob([bom + content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function buildDetailedCsv(opts: {
  asOf: string;
  rows: DebtorRow[];
  totals: AgingBuckets;
  statements: StatementData[];
  businessLabel?: string;
}): string {
  const lines: string[] = [];
  const push = (...cells: unknown[]) => lines.push(cells.map(csvEscape).join(','));

  push('Accounts Receivable Statements as at', opts.asOf);
  if (opts.businessLabel) push('Business / Branch', opts.businessLabel);
  push('Generated', new Date().toLocaleString('en-LK'));
  push('');

  // ── Sheet: Summary ──
  push('=== SUMMARY ===');
  push(
    '#',
    'Name of the Customer',
    'Phone',
    'Invoices',
    'Amount',
    '0-30 Days',
    '30-60 Days',
    '60-90 Days',
    'Over 90 Days',
    'Oldest Age (days)',
    'Locations',
  );
  opts.rows.forEach((r, i) => {
    push(
      i + 1,
      r.name,
      r.phone || '',
      r.invoiceCount,
      moneyNum(r.total),
      moneyNum(r['0-30']),
      moneyNum(r['31-60']),
      moneyNum(r['61-90']),
      moneyNum(r['90+']),
      r.oldestAgeDays,
      (r.locationNames || []).join('; '),
    );
  });
  push(
    '',
    'TOTAL',
    '',
    '',
    moneyNum(opts.totals.total),
    moneyNum(opts.totals['0-30']),
    moneyNum(opts.totals['31-60']),
    moneyNum(opts.totals['61-90']),
    moneyNum(opts.totals['90+']),
    '',
    '',
  );
  push('');

  // ── Per-customer statements ──
  for (const st of opts.statements) {
    push(`=== STATEMENT: ${st.name} ===`);
    push('Customer', st.name);
    push('Phone', st.phone || '');
    push('Address', st.address || '');
    push('Statement Date', st.asOf);
    push(
      'Summary of Balance — Total',
      moneyNum(st.summary.total),
      '0-30',
      moneyNum(st.summary['0-30']),
      '30-60',
      moneyNum(st.summary['31-60']),
      '60-90',
      moneyNum(st.summary['61-90']),
      'Over 90',
      moneyNum(st.summary['90+']),
    );
    push('');
    push(
      'Date',
      'Type',
      'Ref / Invoice No',
      'Sale #',
      'Debit (In: Amount)',
      'Credit (Payment)',
      'Paid on Sale',
      'Balance Due',
      'Running Balance',
      'Age of Invoice (days)',
      'Aging Bucket',
      'Payment Method',
      'Payment Status',
    );
    for (const l of st.lines) {
      push(
        l.date ? new Date(l.date).toLocaleDateString('en-LK') : '',
        l.type === 'SALE' ? 'Invoice / Sale' : 'Payment',
        l.ref,
        l.saleNumber || '',
        l.debit ? moneyNum(l.debit) : '',
        l.credit ? moneyNum(l.credit) : '',
        l.paidAmount != null ? moneyNum(l.paidAmount) : '',
        l.balanceDue != null ? moneyNum(l.balanceDue) : '',
        l.runningBalance != null ? moneyNum(l.runningBalance) : '',
        l.ageDays ?? '',
        l.bucket || '',
        l.paymentMethod || '',
        l.paymentStatus || '',
      );
    }
    push('');
  }

  return lines.join('\n');
}

interface DebtorsReportProps {
  mode: 'branch' | 'org';
}

export default function DebtorsReport({ mode }: DebtorsReportProps) {
  const { user } = useAuth();
  const { getDebtorsSummary, getDebtorsStatement, addPaymentToSale, getSalePayments } = useSales();
  const locationHook = useLocation();

  const branchLocationId: string | undefined =
    (user as any)?.locationId || (user as any)?.branchId || undefined;

  const [asOf, setAsOf] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DebtorRow[]>([]);
  const [totals, setTotals] = useState<AgingBuckets>({
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
    total: 0,
  });
  const [customerCount, setCustomerCount] = useState(0);

  /** Excel-style sheet tabs: Summary + opened customer statements */
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [statementsByKey, setStatementsByKey] = useState<Record<string, StatementData>>({});
  const [statementLoadingKey, setStatementLoadingKey] = useState<string | null>(null);
  const [exportingFull, setExportingFull] = useState(false);

  const [payDialog, setPayDialog] = useState<{ sale: PaySale; customerKey: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY'>('CASH');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);
  const [payHistory, setPayHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'org') return;
    locationHook
      .getAllLocations()
      .then((res: any) => {
        const data = res?.data;
        const list = Array.isArray(data) ? data : Array.isArray(data?.locations) ? data.locations : [];
        setLocations(list);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const effectiveLocationId =
    mode === 'branch' ? branchLocationId : locationId || undefined;

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDebtorsSummary({
        asOf,
        locationId: effectiveLocationId,
        search: search.trim() || undefined,
      });
      const data = (res as any)?.data;
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotals(
        data?.totals || { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 },
      );
      setCustomerCount(Number(data?.customerCount) || 0);
    } catch {
      toast.error('Failed to load debtors summary');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [getDebtorsSummary, asOf, effectiveLocationId, search]);

  const fetchStatement = useCallback(
    async (customerKey: string): Promise<StatementData | null> => {
      setStatementLoadingKey(customerKey);
      try {
        const res = await getDebtorsStatement({
          customerKey,
          asOf,
          locationId: effectiveLocationId,
        });
        const data = (res as any)?.data as StatementData | undefined;
        if (data) {
          setStatementsByKey((prev) => ({ ...prev, [customerKey]: data }));
          return data;
        }
        return null;
      } catch {
        toast.error('Failed to load statement');
        return null;
      } finally {
        setStatementLoadingKey(null);
      }
    },
    [getDebtorsStatement, asOf, effectiveLocationId],
  );

  useEffect(() => {
    loadSummary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCustomerTab = async (row: DebtorRow) => {
    const key = row.customerKey;
    setOpenTabs((prev) =>
      prev.some((t) => t.key === key)
        ? prev
        : [...prev, { key, label: shortTabLabel(row.name) }],
    );
    setActiveTab(key);
    if (!statementsByKey[key]) {
      const data = await fetchStatement(key);
      if (data?.name) {
        setOpenTabs((prev) =>
          prev.map((t) => (t.key === key ? { ...t, label: shortTabLabel(data.name) } : t)),
        );
      }
    }
  };

  const closeCustomerTab = (key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs((prev) => prev.filter((t) => t.key !== key));
    setStatementsByKey((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (activeTab === key) setActiveTab('summary');
  };

  const activeStatement = activeTab !== 'summary' ? statementsByKey[activeTab] : null;

  const loadPayHistory = useCallback(
    async (saleId: string) => {
      setHistoryLoading(true);
      try {
        const res = await getSalePayments(saleId);
        const data = (res as any)?.data;
        setPayHistory(Array.isArray(data?.payments) ? data.payments : []);
      } catch {
        setPayHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [getSalePayments],
  );

  const openPayDialog = (line: StatementLine, customerKey: string) => {
    if (!line.saleId || !line.canPay) return;
    const balance = Number(line.balanceDue || 0);
    if (balance <= 0.01) {
      toast.error('This sale has no pending balance');
      return;
    }
    setPayDialog({
      sale: {
        id: line.saleId,
        saleNumber: line.saleNumber || line.ref,
        totalAmount: Number(line.totalAmount || 0),
        paidAmount: Number(line.paidAmount || 0),
      },
      customerKey,
    });
    setPayAmount(String(balance.toFixed(2)));
    setPayRef('');
    setPayMethod('CASH');
    setPayHistory([]);
    loadPayHistory(line.saleId);
  };

  const handlePayBalance = async () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount);
    const balance = Number(payDialog.sale.totalAmount) - Number(payDialog.sale.paidAmount);
    if (!payAmount || isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > balance + 0.01) {
      toast.error(`Amount cannot exceed balance due (${fmt(balance)})`);
      return;
    }
    setPaying(true);
    try {
      await addPaymentToSale(payDialog.sale.id, {
        paymentMethod: payMethod,
        amount,
        reference: payRef || `${payMethod}-${Date.now()}`,
      });
      toast.success('Payment recorded successfully');
      const key = payDialog.customerKey;
      setPayDialog(null);
      await fetchStatement(key);
      await loadSummary();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const exportFullDetailedCsv = async () => {
    if (!rows.length) {
      toast.error('Nothing to export');
      return;
    }
    setExportingFull(true);
    try {
      const statements: StatementData[] = [];
      // Prefer already-open tabs first, then fetch remaining customers
      const keys = rows.map((r) => r.customerKey);
      for (const key of keys) {
        let st = statementsByKey[key];
        if (!st) {
          const fetched = await getDebtorsStatement({
            customerKey: key,
            asOf,
            locationId: effectiveLocationId,
          });
          st = (fetched as any)?.data as StatementData | undefined;
          if (st) {
            setStatementsByKey((prev) => ({ ...prev, [key]: st! }));
          }
        }
        if (st) statements.push(st);
      }

      const csv = buildDetailedCsv({
        asOf,
        rows,
        totals,
        statements,
        businessLabel:
          mode === 'branch'
            ? (user as any)?.branch?.name || (user as any)?.location?.name || undefined
            : locations.find((l) => l.id === locationId)?.name || 'All locations',
      });
      downloadTextFile(csv, `debtors-full-detail-${asOf}.csv`);
      toast.success(`Exported summary + ${statements.length} customer statement(s)`);
    } catch {
      toast.error('Failed to export full details');
    } finally {
      setExportingFull(false);
    }
  };

  const exportActiveCsv = () => {
    if (activeTab === 'summary') {
      void exportFullDetailedCsv();
      return;
    }
    const st = statementsByKey[activeTab];
    if (!st) {
      toast.error('Open the statement first');
      return;
    }
    const csv = buildDetailedCsv({
      asOf,
      rows: rows.filter((r) => r.customerKey === st.customerKey),
      totals: st.summary,
      statements: [st],
      businessLabel: st.name,
    });
    downloadTextFile(csv, `debtors-statement-${st.name.replace(/\s+/g, '-')}-${asOf}.csv`);
    toast.success('Statement CSV downloaded');
  };

  const printActive = () => {
    const money = (n: number) =>
      `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    let html = '';
    if (activeTab === 'summary') {
      html += `<h1>Accounts Receivable Statements as at ${asOf}</h1>`;
      html += `<p>Customers: ${customerCount} · Total AR: ${money(totals.total)} · 90+: ${money(totals['90+'])}</p>`;
      html += `<table><tr><th>#</th><th>Name of the Customer</th><th>Phone</th><th>Invoices</th><th>Amount</th><th>0–30</th><th>30–60</th><th>60–90</th><th>Over 90</th></tr>`;
      rows.forEach((r, i) => {
        html += `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.phone || ''}</td><td>${r.invoiceCount}</td><td style="text-align:right">${money(r.total)}</td><td style="text-align:right">${money(r['0-30'])}</td><td style="text-align:right">${money(r['31-60'])}</td><td style="text-align:right">${money(r['61-90'])}</td><td style="text-align:right">${money(r['90+'])}</td></tr>`;
      });
      html += `<tr><td colspan="4"><b>Total</b></td><td style="text-align:right"><b>${money(totals.total)}</b></td><td style="text-align:right"><b>${money(totals['0-30'])}</b></td><td style="text-align:right"><b>${money(totals['31-60'])}</b></td><td style="text-align:right"><b>${money(totals['61-90'])}</b></td><td style="text-align:right"><b>${money(totals['90+'])}</b></td></tr></table>`;
    } else if (activeStatement) {
      const st = activeStatement;
      html += `<h1>STATEMENT OF ACCOUNT</h1>`;
      html += `<p><b>Customer:</b> ${st.name}${st.phone ? ` · ${st.phone}` : ''}</p>`;
      if (st.address) html += `<p><b>Address:</b> ${st.address}</p>`;
      html += `<p><b>Statement Date:</b> ${st.asOf}</p>`;
      html += `<p><b>Summary of Balance</b> — Total ${money(st.summary.total)} | 0–30 ${money(st.summary['0-30'])} | 30–60 ${money(st.summary['31-60'])} | 60–90 ${money(st.summary['61-90'])} | Over 90 ${money(st.summary['90+'])}</p>`;
      html += `<table><tr><th>Date</th><th>Type</th><th>Invoice / Ref</th><th>Debit</th><th>Credit</th><th>Running</th><th>Age</th><th>Bucket</th></tr>`;
      st.lines.forEach((l) => {
        html += `<tr><td>${l.date ? new Date(l.date).toLocaleDateString('en-LK') : ''}</td><td>${l.type}</td><td>${l.ref}</td><td style="text-align:right">${l.debit ? money(l.debit) : ''}</td><td style="text-align:right">${l.credit ? money(l.credit) : ''}</td><td style="text-align:right">${money(l.runningBalance || 0)}</td><td>${l.ageDays ?? ''}</td><td>${l.bucket || ''}</td></tr>`;
      });
      html += '</table>';
    } else {
      return;
    }
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<html><head><title>Debtors</title><style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:4px 6px;border-bottom:1px solid #eee;font-size:12px;text-align:left}</style></head><body>${html}<script>window.onload=function(){window.print();}<\/script></body></html>`,
    );
    w.document.close();
  };

  const tabBar = useMemo(
    () => (
      <div className="flex items-end gap-0.5 overflow-x-auto border-b border-gray-300 bg-[#f3f3f3] px-2 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`relative shrink-0 rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'summary'
              ? 'z-10 -mb-px border-gray-300 bg-white text-[#1e3a8a]'
              : 'border-transparent bg-[#e8e8e8] text-gray-600 hover:bg-[#eee]'
          }`}
        >
          Summary
        </button>
        {openTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`group relative flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-sm transition-colors ${
              activeTab === tab.key
                ? 'z-10 -mb-px border-gray-300 bg-white text-[#1e3a8a] font-medium'
                : 'border-transparent bg-[#e8e8e8] text-gray-600 hover:bg-[#eee]'
            }`}
            title={tab.label}
          >
            <span className="max-w-[140px] truncate">{tab.label}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => closeCustomerTab(tab.key, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') closeCustomerTab(tab.key);
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              aria-label={`Close ${tab.label}`}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </div>
    ),
    [activeTab, openTabs],
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="space-y-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Debtors</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Accounts Receivable Statements as at {asOf}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                activeTab === 'summary' ? loadSummary() : fetchStatement(activeTab)
              }
              disabled={loading || !!statementLoadingKey}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading || statementLoadingKey ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void exportActiveCsv()}
              disabled={!rows.length || exportingFull}
              className="flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50"
            >
              {exportingFull ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {activeTab === 'summary' ? 'Export Full CSV' : 'Export Statement CSV'}
            </button>
            <button
              type="button"
              onClick={printActive}
              disabled={activeTab === 'summary' ? !rows.length : !activeStatement}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-wrap gap-2 pt-1 sm:flex-row">
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            title="As of date"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer / phone…"
            className="min-w-[160px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          {mode === 'org' && (
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="min-w-[160px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              setStatementsByKey({});
              setOpenTabs([]);
              setActiveTab('summary');
              loadSummary();
            }}
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm text-white hover:bg-[#1e3a8a]/90"
          >
            Apply
          </button>
        </div>
      </div>

      {tabBar}

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {activeTab === 'summary' && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-blue-50 p-2 text-[#1e3a8a]">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total AR</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(totals.total)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-orange-50 p-2 text-orange-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customers with balance</p>
                  <p className="text-lg font-bold text-gray-900">{customerCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-red-50 p-2 text-red-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Over 90 days</p>
                  <p className="text-lg font-bold text-red-700">{fmt(totals['90+'])}</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white py-20 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-lg font-medium text-gray-600">No outstanding debtors</p>
                <p className="mt-1 text-sm text-gray-400">All sales are fully paid as at {asOf}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        '#',
                        'Name of the Customer',
                        'Phone',
                        'Invoices',
                        'Amount',
                        '0–30 Days',
                        '30–60 Days',
                        '60–90 Days',
                        'Over 90 Days',
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, idx) => (
                      <tr key={row.customerKey} className="transition-colors hover:bg-orange-50/60">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void openCustomerTab(row)}
                            className="text-left font-medium text-[#2563eb] underline-offset-2 hover:underline"
                          >
                            {row.name}
                          </button>
                          {row.locationNames?.length > 0 && mode === 'org' && (
                            <p className="text-xs text-gray-400">{row.locationNames.join(', ')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.phone || '–'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.invoiceCount}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-900">
                          {fmt(row.total)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmt(row['0-30'])}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmt(row['31-60'])}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-amber-700">{fmt(row['61-90'])}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-red-600">
                          {fmt(row['90+'])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-4 py-3" colSpan={4}>
                        Total
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{fmt(totals.total)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{fmt(totals['0-30'])}</td>
                      <td className="whitespace-nowrap px-4 py-3">{fmt(totals['31-60'])}</td>
                      <td className="whitespace-nowrap px-4 py-3">{fmt(totals['61-90'])}</td>
                      <td className="whitespace-nowrap px-4 py-3">{fmt(totals['90+'])}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab !== 'summary' && (
          <>
            {statementLoadingKey === activeTab && !activeStatement ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
              </div>
            ) : !activeStatement ? (
              <div className="rounded-xl border bg-white py-20 text-center">
                <p className="text-gray-600">No statement data</p>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2">
                    <h2 className="text-lg font-bold text-gray-900">STATEMENT OF ACCOUNT</h2>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Customer:</span> {activeStatement.name}
                      {activeStatement.phone ? ` · ${activeStatement.phone}` : ''}
                    </p>
                    {activeStatement.address && (
                      <p className="text-xs text-gray-500">{activeStatement.address}</p>
                    )}
                    <p className="text-xs text-gray-500">Statement Date: {activeStatement.asOf}</p>
                  </div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Summary of Balance
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-semibold">
                      Total {fmt(activeStatement.summary.total)}
                    </span>
                    <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-800">
                      0–30 {fmt(activeStatement.summary['0-30'])}
                    </span>
                    <span className="rounded-lg bg-sky-50 px-3 py-1.5 text-sky-800">
                      30–60 {fmt(activeStatement.summary['31-60'])}
                    </span>
                    <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800">
                      60–90 {fmt(activeStatement.summary['61-90'])}
                    </span>
                    <span className="rounded-lg bg-red-50 px-3 py-1.5 text-red-800">
                      Over 90 {fmt(activeStatement.summary['90+'])}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          'Date',
                          'Type',
                          'Invoice No / Ref',
                          'Debit',
                          'Credit',
                          'Running',
                          'Age',
                          'Bucket',
                          'Actions',
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeStatement.lines.map((line, i) => (
                        <tr key={`${line.type}-${line.ref}-${i}`} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {line.date
                              ? new Date(line.date).toLocaleDateString('en-LK', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '–'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                line.type === 'SALE'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {line.type === 'SALE' ? 'Sale' : 'Payment'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-800">
                            {line.ref}
                            {line.type === 'PAYMENT' && line.paymentMethod && (
                              <span className="block font-sans text-[11px] text-gray-400">
                                {line.paymentMethod}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                            {line.debit ? fmt(line.debit) : ''}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-green-700">
                            {line.credit ? fmt(line.credit) : ''}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium">
                            {fmt(line.runningBalance || 0)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {line.ageDays != null ? `${line.ageDays}d` : '–'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{line.bucket || '–'}</td>
                          <td className="px-4 py-3">
                            {line.type === 'SALE' && line.canPay && (
                              <button
                                type="button"
                                onClick={() => openPayDialog(line, activeTab)}
                                className="flex items-center gap-1 rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                              >
                                <CreditCard className="h-3 w-3" /> Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {payDialog && (
        <div
          className="glass-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !paying) setPayDialog(null);
          }}
        >
          <div className="glass-modal-panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Pay Balance</h2>
              <button
                type="button"
                onClick={() => setPayDialog(null)}
                disabled={paying}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sale #:</span>
                <span className="font-mono font-semibold text-orange-700">
                  {payDialog.sale.saleNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span>{fmt(payDialog.sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid:</span>
                <span className="font-medium text-green-700">{fmt(payDialog.sale.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance Due:</span>
                <span className="font-bold text-red-600">
                  {fmt(Number(payDialog.sale.totalAmount) - Number(payDialog.sale.paidAmount))}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Payment history</span>
                {historyLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              </div>
              {payHistory.length === 0 && !historyLoading ? (
                <p className="text-xs italic text-gray-400">No payments recorded yet.</p>
              ) : (
                <div className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100">
                  {payHistory.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <div className="font-semibold text-gray-800">{fmt(p.amount)}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(p.paymentDate || p.createdAt).toLocaleString('en-LK')}
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                        {p.paymentMethod}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Amount to Pay <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-lg font-semibold focus:ring-2 focus:ring-orange-400"
                  disabled={paying}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  disabled={paying}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Transaction reference"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  disabled={paying}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPayDialog(null)}
                disabled={paying}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayBalance}
                disabled={paying}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {paying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {paying ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
