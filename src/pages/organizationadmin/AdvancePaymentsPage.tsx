/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Download, CreditCard, X, CheckCircle,
  FileText, Search, Filter, TrendingDown, DollarSign, Clock, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from '../../hooks/useLocation';
import useSales from '../../hooks/useSales';
import useSaleJob from '../../hooks/useSaleJob';

interface AdvanceSale {
  id: string;
  saleNumber: string;
  createdAt: string;
  advanceDueDate?: string;
  customerName?: string;
  customerPhone?: string;
  customer?: { name?: string; phone?: string };
  location?: { id: string; name: string };
  soldBy?: { name: string };
  totalAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  paymentStatus: string;
  status: string;
}

interface LocationItem {
  id: string;
  name: string;
}

const PAYMENT_METHODS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'CARD',          label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_MONEY',  label: 'Online / Mobile Money' },
] as const;

const fmt = (n: number | string) =>
  `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

export default function OrgAdvancePaymentsPage() {
  const { getAdvanceSales, addPaymentToSale, getSalePayments, downloadAcknowledgement, downloadInvoice } = useSales();
  const { getSaleJobs, completeJob } = useSaleJob();
  const locationHook = useLocation();

  // Data
  const [sales, setSales] = useState<AdvanceSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [locationId, setLocationId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  // Summary stats derived from current page
  const totalBalance = sales.reduce((s, x) => s + Number(x.balanceAmount || 0), 0);
  const totalPaid    = sales.reduce((s, x) => s + Number(x.paidAmount    || 0), 0);

  // Pay-balance dialog
  const [payDialog, setPayDialog] = useState<{ sale: AdvanceSale } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY'>('CASH');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);

  // Payment history + job completion inside the dialog
  const [payHistory, setPayHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPayHistory = useCallback(async (saleId: string) => {
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
  }, [getSalePayments]);

  // Per-row loading flags
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  // Print format selector
  const [printFormat, setPrintFormat] = useState<'a4' | '80mm' | '58mm'>('a4');

  // Load locations once
  useEffect(() => {
    setLocationsLoading(true);
    locationHook.getAllLocations()
      .then((res: any) => {
        const data = res?.data;
        const list: LocationItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.locations) ? data.locations : [];
        setLocations(list);
      })
      .catch(() => {})
      .finally(() => setLocationsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const res = await getAdvanceSales(locationId || undefined, p, limit, searchQuery.trim() || undefined);
      const data = (res as any)?.data;
      if (data) {
        const list: AdvanceSale[] = Array.isArray(data.sales)
          ? data.sales
          : Array.isArray(data) ? data : [];
        setSales(list);
        setTotal(data.total ?? list.length);
      }
    } catch {
      toast.error('Failed to load advance payments');
    } finally {
      setLoading(false);
    }
  }, [getAdvanceSales, locationId, searchQuery]);

  // Completing the linked Sale Job (defined after `load`).
  const completeJobForSale = useCallback(async (sale: AdvanceSale, notify: boolean) => {
    setActionLoading(p => ({ ...p, [`job_${sale.id}`]: true }));
    try {
      const res = await getSaleJobs({ saleId: sale.id, limit: 1 });
      const list = ((res as any)?.data?.data ?? (res as any)?.data ?? []) as any[];
      const job = Array.isArray(list) ? list[0] : undefined;
      if (!job?.id) {
        toast.error('No job is linked to this sale');
        return;
      }
      await completeJob(job.id, { notifyCustomer: notify });
      toast.success(notify ? 'Job completed   customer notified' : 'Job completed');
      setPayDialog(null);
      load(page);
    } catch {
      toast.error('Failed to complete the job');
    } finally {
      setActionLoading(p => ({ ...p, [`job_${sale.id}`]: false }));
    }
  }, [getSaleJobs, completeJob, load, page]);

  useEffect(() => { load(page); }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); load(1); }, [locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1);
  };

  const handlePayBalance = async () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount);
    const balance = Number((payDialog.sale.totalAmount as number) - (payDialog.sale.paidAmount as number));
    if (!payAmount || isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > balance + 0.01) { toast.error(`Amount exceeds balance due (${fmt(balance)})`); return; }
    setPaying(true);
    try {
      await addPaymentToSale(payDialog.sale.id, {
        paymentMethod: payMethod,
        amount,
        reference: payRef || `${payMethod}-${Date.now()}`,
      });
      toast.success('Payment recorded successfully');
      setPayAmount(''); setPayRef(''); setPayMethod('CASH');
      // Keep the dialog open and refresh the history so the new payment shows.
      setPayDialog(prev =>
        prev ? { sale: { ...prev.sale, paidAmount: Number(prev.sale.paidAmount) + amount } } : prev,
      );
      await loadPayHistory(payDialog.sale.id);
      load(page);
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadAck = async (sale: AdvanceSale) => {
    setActionLoading(p => ({ ...p, [`ack_${sale.id}`]: true }));
    try {
      await downloadAcknowledgement(sale.id, printFormat);
      toast.success('Acknowledgement downloaded');
    } catch { toast.error('Failed to download acknowledgement'); }
    finally { setActionLoading(p => ({ ...p, [`ack_${sale.id}`]: false })); }
  };

  const handleDownloadInvoice = async (sale: AdvanceSale) => {
    setActionLoading(p => ({ ...p, [`inv_${sale.id}`]: true }));
    try {
      await downloadInvoice(sale.id, { format: printFormat });
      toast.success('Invoice downloaded');
    } catch { toast.error('Failed to download invoice'); }
    finally { setActionLoading(p => ({ ...p, [`inv_${sale.id}`]: false })); }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="bg-white/60 backdrop-blur-xl border-b border-white/20 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advance Payments</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              All sales with partial / advance payment pending   across all branches
            </p>
          </div>
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-orange-200">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-orange-100 rounded-lg"><Clock className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Pending Sales (this page)</p>
                <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200/40 bg-green-50/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Advance Collected</p>
                <p className="text-xl font-bold text-green-700">{fmt(totalPaid)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200/40 bg-red-50/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2.5 bg-red-100 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Balance Due</p>
                <p className="text-xl font-bold text-red-600">{fmt(totalBalance)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/30 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Branch filter */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                disabled={locationsLoading}
                className="w-full text-sm border border-white/40 rounded-xl px-3 py-2 bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by sale #, customer name or phone…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
              >
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setPage(1); load(1); }}
                  className="px-3 py-2 border border-white/40 text-gray-600 rounded-lg text-sm hover:bg-white/30 backdrop-blur-sm"
                >
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 bg-white/40 backdrop-blur-sm rounded-xl border border-white/30">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No pending advance payments</p>
            <p className="text-gray-400 text-sm mt-1">
              {locationId ? 'No pending payments for the selected branch.' : 'All sales have been fully paid.'}
            </p>
          </div>
        ) : (
          <>
            {/* Format selector */}
            <div className="flex items-center gap-3 mb-3">
              <Printer className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-600">Download Format:</label>
              <select
                value={printFormat}
                onChange={e => setPrintFormat(e.target.value as 'a4' | '80mm' | '58mm')}
                className="px-3 py-1.5 border border-white/40 rounded-xl text-sm bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                <option value="a4">A4</option>
                <option value="80mm">80mm Thermal</option>
                <option value="58mm">58mm Thermal</option>
              </select>
            </div>
            <div className="bg-white/40 backdrop-blur-sm rounded-xl shadow-sm border border-white/30 overflow-x-auto">
              <table className="min-w-full divide-y divide-white/20 text-sm">
                <thead className="bg-white/30 backdrop-blur-sm">
                  <tr>
                    {['Sale #', 'Date', 'Due Date', 'Branch', 'Customer', 'Total', 'Paid', 'Balance Due', 'Served By', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {sales.map(sale => {
                    const custName  = sale.customer?.name  || sale.customerName  || 'Walk-in';
                    const custPhone = sale.customer?.phone || sale.customerPhone;
                    const balance   = Number((sale.totalAmount as number) - (sale.paidAmount as number));
                    return (
                      <tr key={sale.id} className="hover:bg-orange-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-orange-700 font-semibold whitespace-nowrap">
                          {sale.saleNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(sale.createdAt).toLocaleDateString('en-LK', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {sale.advanceDueDate
                            ? <span className="text-amber-700 font-medium">{new Date(sale.advanceDueDate).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            : <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {sale.location?.name ?? <span className="text-gray-400 text-xs"> </span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{custName}</p>
                          {custPhone && <p className="text-xs text-gray-500">{custPhone}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(sale.totalAmount)}</td>
                        <td className="px-4 py-3 text-green-700 font-medium whitespace-nowrap">{fmt(sale.paidAmount)}</td>
                        <td className="px-4 py-3 text-red-600 font-bold whitespace-nowrap">{fmt(balance)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {sale.soldBy?.name ?? <span className="text-gray-400"> </span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 min-w-[400px]">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Pay Balance   hidden once fully paid */}
                            {balance > 0.01 && (
                              <button
                                onClick={() => { setPayDialog({ sale }); setPayAmount(balance.toFixed(2)); setPayHistory([]); loadPayHistory(sale.id); }}
                                className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 border-[1px] border-orange-500/70 text-orange-500 rounded text-xs hover:bg-orange-500/30 transition-colors whitespace-nowrap"
                              >
                                <CreditCard className="w-3 h-3" /> Pay
                              </button>
                            )}
                            {/* Complete job + notify customer */}
                            <button
                              onClick={() => completeJobForSale(sale, true)}
                              disabled={actionLoading[`job_${sale.id}`]}
                              title="Mark the job done and notify the customer (SMS/Email/WhatsApp)"
                              className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border-[1px] border-green-500/70 text-green-500 rounded text-xs hover:bg-green-500/30 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {actionLoading[`job_${sale.id}`]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <CheckCircle className="w-3 h-3" />}
                              Complete + Notify
                            </button>
                            {/* complete no SMS notify */}
                            <button
                              onClick={() => completeJobForSale(sale, false)}
                              disabled={actionLoading[`job_${sale.id}`]}
                              title="Mark the job done"
                              className="flex items-center gap-1 px-2 py-1 bg-gray-500/70 backdrop-blur-sm text-white rounded text-xs hover:bg-gray-600/70 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {actionLoading[`job_${sale.id}`]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <CheckCircle className="w-3 h-3" />}
                              Complete
                            </button>
                            {/* Download Acknowledgement */}
                            <button
                              onClick={() => handleDownloadAck(sale)}
                              disabled={actionLoading[`ack_${sale.id}`]}
                              title="Download Acknowledgement"
                              className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border-[1px] border-blue-500/70 text-blue-500 rounded text-xs hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading[`ack_${sale.id}`]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Download className="w-3 h-3" />}
                              Ack.
                            </button>
                            {/* Download Invoice */}
                            <button
                              onClick={() => handleDownloadInvoice(sale)}
                              disabled={actionLoading[`inv_${sale.id}`]}
                              title="Download Invoice"
                              className="flex items-center gap-1 px-2 py-1 bg-gray-500/20 border-[1px] border-gray-500/70 text-gray-500 rounded text-xs hover:bg-gray-500/30 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading[`inv_${sale.id}`]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <FileText className="w-3 h-3" />}
                              Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm bg-white/40 backdrop-blur-sm border border-white/40 rounded-lg disabled:opacity-40 hover:bg-white/60"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages} &nbsp;·&nbsp; {total} total
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm bg-white/40 backdrop-blur-sm border border-white/40 rounded-lg disabled:opacity-40 hover:bg-white/60"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Pay Balance Dialog ─────────────────────────────────────────────── */}
      {payDialog && (
        <div
          className="glass-modal-overlay overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !paying) setPayDialog(null);
          }}
        >
          <div
            className="glass-modal-panel w-full max-w-md p-6 !overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setPayDialog(null)} disabled={paying} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 mb-4 text-sm space-y-1.5 border border-white/20">
              <div className="flex justify-between">
                <span className="text-gray-500">Sale #:</span>
                <span className="font-mono font-semibold text-orange-700">{payDialog.sale.saleNumber}</span>
              </div>
              {payDialog.sale.location?.name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Branch:</span>
                  <span className="font-medium">{payDialog.sale.location.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span>{payDialog.sale.customer?.name || payDialog.sale.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sale Total:</span>
                <span>{fmt(payDialog.sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid:</span>
                <span className="text-green-700 font-medium">{fmt(payDialog.sale.paidAmount)}</span>
              </div>
              {payDialog.sale.advanceDueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Balance Due Date:</span>
                  <span className="text-amber-700 font-medium">
                    {new Date(payDialog.sale.advanceDueDate).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/20 pt-1.5">
                <span className="text-gray-700 font-medium">Balance Due:</span>
                <span className="text-red-600 font-bold">
                  {fmt(Number(payDialog.sale.totalAmount) - Number(payDialog.sale.paidAmount))}
                </span>
              </div>
            </div>

            {/* ── Advance payment history ── */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Payment history</span>
                {historyLoading && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
              </div>
              {payHistory.length === 0 && !historyLoading ? (
                <p className="text-xs text-gray-400 italic">No payments recorded yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-white/20 divide-y divide-white/10">
                  {payHistory.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <div className="font-semibold text-gray-800">{fmt(p.amount)}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(p.paymentDate || p.createdAt).toLocaleString('en-LK')}
                          {p.receivedBy?.name ? ` · ${p.receivedBy.name}` : ''}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white/40 text-gray-600 font-medium">
                        {p.paymentMethod}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(payDialog.sale.totalAmount) - Number(payDialog.sale.paidAmount)}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent text-lg font-semibold"
                  disabled={paying}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full px-3 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  disabled={paying}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  placeholder="Transaction reference"
                  className="w-full px-3 py-2 border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  disabled={paying}
                />
              </div>
            </div>

            {/* ── Complete the linked Sale Job ── */}
            <div className="mt-5 pt-4 border-t border-white/20">
              <p className="text-sm font-semibold text-gray-700 mb-2">Complete job</p>
              <div className="flex gap-2">
                <button
                  onClick={() => completeJobForSale(payDialog.sale, true)}
                  disabled={actionLoading[`job_${payDialog.sale.id}`] || paying}
                  title="Mark the job done and send the customer an SMS/Email/WhatsApp"
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                >
                  {actionLoading[`job_${payDialog.sale.id}`] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Complete + notify (SMS)
                </button>
                <button
                  onClick={() => completeJobForSale(payDialog.sale, false)}
                  disabled={actionLoading[`job_${payDialog.sale.id}`] || paying}
                  title="Mark the job done without messaging the customer"
                  className="flex-1 px-3 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete (no SMS)
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPayDialog(null)}
                disabled={paying}
                className="flex-1 px-4 py-2 border border-white/40 text-gray-700 rounded-xl hover:bg-white/30 backdrop-blur-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayBalance}
                disabled={paying}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {paying ? 'Processing…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
