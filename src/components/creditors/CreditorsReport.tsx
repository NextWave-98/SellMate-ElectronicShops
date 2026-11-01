/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download, X, FileText, Printer, Truck, DollarSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';

type AgingBuckets = {
  '0-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
  total: number;
};

type CreditorRow = AgingBuckets & {
  supplierId: string;
  name: string;
  phone: string | null;
  supplierCode: string | null;
  invoiceCount: number;
  oldestAgeDays: number;
};

type StatementLine = {
  type: 'PO' | 'PAYMENT';
  date: string;
  ref: string;
  debit: number;
  credit: number;
  balanceDue?: number;
  ageDays?: number;
  bucket?: string;
  paymentMethod?: string;
  runningBalance?: number;
};

type StatementData = {
  asOf: string;
  supplierId: string;
  name: string;
  phone: string | null;
  supplierCode: string | null;
  address: string | null;
  summary: AgingBuckets;
  invoiceCount: number;
  lines: StatementLine[];
};

const emptyBuckets = (): AgingBuckets => ({ '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const money = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function downloadTextFile(contents: string, filename: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CreditorsReport() {
  const { fetchData } = useFetch();
  const [asOf, setAsOf] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CreditorRow[]>([]);
  const [totals, setTotals] = useState<AgingBuckets>(emptyBuckets());
  const [supplierCount, setSupplierCount] = useState(0);
  const [activeTab, setActiveTab] = useState('summary');
  const [openTabs, setOpenTabs] = useState<{ key: string; label: string }[]>([]);
  const [statementsByKey, setStatementsByKey] = useState<Record<string, StatementData>>({});
  const [statementLoadingKey, setStatementLoadingKey] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOf) params.set('asOf', asOf);
      if (search.trim()) params.set('search', search.trim());
      const qs = params.toString();
      const res = await fetchData({
        endpoint: `/purchaseorders/creditors/summary${qs ? `?${qs}` : ''}`,
        method: 'GET',
        silent: true,
      });
      const data = (res as any)?.data;
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotals(data?.totals || emptyBuckets());
      setSupplierCount(Number(data?.supplierCount) || 0);
    } catch {
      toast.error('Failed to load creditors');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchData, asOf, search]);

  useEffect(() => {
    loadSummary();
    // Load once on open. Apply refetches after the date or search changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatement = useCallback(async (supplierId: string): Promise<StatementData | null> => {
    setStatementLoadingKey(supplierId);
    try {
      const params = new URLSearchParams({ supplierId });
      if (asOf) params.set('asOf', asOf);
      const res = await fetchData({
        endpoint: `/purchaseorders/creditors/statement?${params.toString()}`,
        method: 'GET',
        silent: true,
      });
      const data = (res as any)?.data as StatementData | undefined;
      if (data) setStatementsByKey((prev) => ({ ...prev, [supplierId]: data }));
      return data || null;
    } catch {
      toast.error('Failed to load supplier statement');
      return null;
    } finally {
      setStatementLoadingKey(null);
    }
  }, [fetchData, asOf]);

  const openSupplierTab = async (row: CreditorRow) => {
    setOpenTabs((prev) => (
      prev.some((t) => t.key === row.supplierId) ? prev : [...prev, { key: row.supplierId, label: row.name }]
    ));
    setActiveTab(row.supplierId);
    if (!statementsByKey[row.supplierId]) await fetchStatement(row.supplierId);
  };

  const closeTab = (key: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setOpenTabs((prev) => prev.filter((t) => t.key !== key));
    if (activeTab === key) setActiveTab('summary');
  };

  const activeStatement = activeTab === 'summary' ? null : statementsByKey[activeTab];

  const exportCsv = () => {
    if (activeTab === 'summary') {
      const header = ['Supplier', 'Phone', 'Code', 'Orders', 'Amount', '0-30', '31-60', '61-90', '90+'];
      const body = rows.map((r) => [
        r.name, r.phone || '', r.supplierCode || '', r.invoiceCount,
        r.total, r['0-30'], r['31-60'], r['61-90'], r['90+'],
      ].join(','));
      downloadTextFile([header.join(','), ...body].join('\n'), `creditors-${asOf}.csv`);
      return;
    }
    if (!activeStatement) return;
    const header = ['Date', 'Type', 'Ref', 'Debit', 'Credit', 'Running', 'Age', 'Bucket'];
    const body = activeStatement.lines.map((l) => [
      l.date ? new Date(l.date).toLocaleDateString('en-LK') : '',
      l.type, l.ref, l.debit || '', l.credit || '', l.runningBalance || 0, l.ageDays ?? '', l.bucket || '',
    ].join(','));
    downloadTextFile([header.join(','), ...body].join('\n'), `creditor-${activeStatement.name.replace(/\s+/g, '-')}-${asOf}.csv`);
  };

  const printActive = () => {
    let html = '';
    if (activeTab === 'summary') {
      html += `<h1>Creditors / Accounts Payable</h1><p>As at ${asOf}</p>`;
      html += `<p>Suppliers: ${supplierCount} · Total AP: ${money(totals.total)} · 90+: ${money(totals['90+'])}</p>`;
      html += `<table><tr><th>#</th><th>Supplier</th><th>Phone</th><th>Orders</th><th>Amount</th><th>0–30</th><th>30–60</th><th>60–90</th><th>Over 90</th></tr>`;
      rows.forEach((r, i) => {
        html += `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.phone || ''}</td><td>${r.invoiceCount}</td><td style="text-align:right">${money(r.total)}</td><td style="text-align:right">${money(r['0-30'])}</td><td style="text-align:right">${money(r['31-60'])}</td><td style="text-align:right">${money(r['61-90'])}</td><td style="text-align:right">${money(r['90+'])}</td></tr>`;
      });
      html += '</table>';
    } else if (activeStatement) {
      html += `<h1>STATEMENT OF ACCOUNT</h1>`;
      html += `<p><b>Supplier:</b> ${activeStatement.name}${activeStatement.phone ? ` · ${activeStatement.phone}` : ''}</p>`;
      html += `<p><b>Statement Date:</b> ${activeStatement.asOf}</p>`;
      html += `<p>Total ${money(activeStatement.summary.total)} | 0–30 ${money(activeStatement.summary['0-30'])} | 30–60 ${money(activeStatement.summary['31-60'])} | 60–90 ${money(activeStatement.summary['61-90'])} | Over 90 ${money(activeStatement.summary['90+'])}</p>`;
      html += `<table><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Running</th><th>Age</th><th>Bucket</th></tr>`;
      activeStatement.lines.forEach((l) => {
        html += `<tr><td>${l.date ? new Date(l.date).toLocaleDateString('en-LK') : ''}</td><td>${l.type}</td><td>${l.ref}</td><td style="text-align:right">${l.debit ? money(l.debit) : ''}</td><td style="text-align:right">${l.credit ? money(l.credit) : ''}</td><td style="text-align:right">${money(l.runningBalance || 0)}</td><td>${l.ageDays ?? ''}</td><td>${l.bucket || ''}</td></tr>`;
      });
      html += '</table>';
    } else return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<html><head><title>Creditors</title><style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:4px 6px;border-bottom:1px solid #eee;font-size:12px;text-align:left}</style></head><body>${html}<script>window.onload=function(){window.print();}<\/script></body></html>`,
    );
    w.document.close();
  };

  const tabBar = useMemo(() => (
    <div className="flex items-end gap-0.5 overflow-x-auto border-b border-gray-300 bg-[#f3f3f3] px-2 pt-2">
      <button
        type="button"
        onClick={() => setActiveTab('summary')}
        className={`relative shrink-0 rounded-t-md border border-b-0 px-4 py-2 text-sm font-medium ${
          activeTab === 'summary' ? 'z-10 -mb-px border-gray-300 bg-white text-[#1e3a8a]' : 'border-transparent bg-[#e8e8e8] text-gray-600'
        }`}
      >
        Summary
      </button>
      {openTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActiveTab(tab.key)}
          className={`group relative flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-sm ${
            activeTab === tab.key ? 'z-10 -mb-px border-gray-300 bg-white text-[#1e3a8a] font-medium' : 'border-transparent bg-[#e8e8e8] text-gray-600'
          }`}
        >
          <span className="max-w-[140px] truncate">{tab.label}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => closeTab(tab.key, e)}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            aria-label={`Close ${tab.label}`}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        </button>
      ))}
    </div>
  ), [activeTab, openTabs]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="space-y-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Creditors</h1>
            <p className="mt-0.5 text-sm text-gray-500">Accounts Payable statements as at {asOf}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (activeTab === 'summary' ? loadSummary() : fetchStatement(activeTab))}
              disabled={loading || !!statementLoadingKey}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading || statementLoadingKey ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={activeTab === 'summary' ? !rows.length : !activeStatement}
              className="flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {activeTab === 'summary' ? 'Export CSV' : 'Export Statement CSV'}
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
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier / phone…"
            className="min-w-[160px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
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
                <div className="rounded-lg bg-blue-50 p-2 text-[#1e3a8a]"><DollarSign className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total AP</p>
                  <p className="text-lg font-bold text-gray-900">{money(totals.total)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-orange-50 p-2 text-orange-700"><Truck className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-gray-500">Suppliers with balance</p>
                  <p className="text-lg font-bold text-gray-900">{supplierCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-red-50 p-2 text-red-700"><Clock className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-gray-500">Over 90 days</p>
                  <p className="text-lg font-bold text-red-700">{money(totals['90+'])}</p>
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
                <p className="text-lg font-medium text-gray-600">No outstanding creditors</p>
                <p className="mt-1 text-sm text-gray-400">All purchase orders are paid as at {asOf}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Supplier', 'Phone', 'Orders', 'Amount', '0–30 Days', '30–60 Days', '60–90 Days', 'Over 90 Days'].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, idx) => (
                      <tr key={row.supplierId} className="hover:bg-orange-50/60">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => void openSupplierTab(row)} className="text-left font-medium text-[#2563eb] hover:underline">
                            {row.name}
                          </button>
                          {row.supplierCode && <p className="text-xs text-gray-400">{row.supplierCode}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.phone || '–'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.invoiceCount}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-900">{money(row.total)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{money(row['0-30'])}</td>
                        <td className="whitespace-nowrap px-4 py-3">{money(row['31-60'])}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-amber-700">{money(row['61-90'])}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-red-600">{money(row['90+'])}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-4 py-3" colSpan={4}>Total</td>
                      <td className="whitespace-nowrap px-4 py-3">{money(totals.total)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{money(totals['0-30'])}</td>
                      <td className="whitespace-nowrap px-4 py-3">{money(totals['31-60'])}</td>
                      <td className="whitespace-nowrap px-4 py-3">{money(totals['61-90'])}</td>
                      <td className="whitespace-nowrap px-4 py-3">{money(totals['90+'])}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab !== 'summary' && (
          statementLoadingKey === activeTab && !activeStatement ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          ) : activeStatement ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900">{activeStatement.name}</p>
                <p className="text-sm text-gray-500">
                  {activeStatement.phone || 'No phone'}
                  {activeStatement.address ? ` · ${activeStatement.address}` : ''}
                  {' · '}Balance {money(activeStatement.summary.total)}
                </p>
              </div>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Type', 'Ref', 'Debit', 'Credit', 'Running', 'Age', 'Bucket'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeStatement.lines.map((line, i) => (
                    <tr key={`${line.ref}-${i}`}>
                      <td className="px-4 py-3">{line.date ? new Date(line.date).toLocaleDateString('en-LK') : ''}</td>
                      <td className="px-4 py-3">{line.type}</td>
                      <td className="px-4 py-3">{line.ref}</td>
                      <td className="px-4 py-3 text-right">{line.debit ? money(line.debit) : ''}</td>
                      <td className="px-4 py-3 text-right">{line.credit ? money(line.credit) : ''}</td>
                      <td className="px-4 py-3 text-right">{money(line.runningBalance || 0)}</td>
                      <td className="px-4 py-3">{line.ageDays ?? ''}</td>
                      <td className="px-4 py-3">{line.bucket || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">Statement could not be loaded.</p>
          )
        )}
      </div>
    </div>
  );
}
