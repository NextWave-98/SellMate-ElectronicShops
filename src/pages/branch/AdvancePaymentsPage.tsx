/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Download, CreditCard, X, CheckCircle, FileText, Printer, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import  useSales  from '../../hooks/useSales';
import useSaleJob from '../../hooks/useSaleJob';
import BarcodeScannerModal from '../../components/common/BarcodeScannerModal';

interface AdvanceSale {
  id: string;
  saleNumber: string;
  createdAt: string;
  advanceDueDate?: string;
  customerName?: string;
  customerPhone?: string;
  customer?: { name?: string; phone?: string };
  totalAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  paymentStatus: string;
  status: string;
}

const PAYMENT_METHODS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'CARD',          label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_MONEY',  label: 'Online / Mobile Money' },
];

const fmt = (n: number | string) => `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

export default function AdvancePaymentsPage() {
  const { user } = useAuth();
  const { getAdvanceSales, addPaymentToSale, getSalePayments, downloadAcknowledgement, downloadInvoice } = useSales();
  const { getSaleJobs, completeJob } = useSaleJob();

  const [sales, setSales] = useState<AdvanceSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Pay-balance dialog state
  const [payDialog, setPayDialog] = useState<{ sale: AdvanceSale } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY'>('CASH');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Payment history for the sale open in the dialog
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

  // Action loading flags
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  // Print format selector
  const [printFormat, setPrintFormat] = useState<'a4' | '80mm' | '58mm'>('a4');

  const locationId: string | undefined =
    (user as any)?.locationId || (user as any)?.branchId || undefined;

  const load = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const res = await getAdvanceSales(locationId, p, limit);
      const data = (res as any)?.data;
      if (data) {
        setSales(Array.isArray(data.sales) ? data.sales : Array.isArray(data) ? data : []);
        setTotal(data.total ?? (Array.isArray(data) ? data.length : 0));
      }
    } catch {
      toast.error('Failed to load advance payments');
    } finally {
      setLoading(false);
    }
  }, [getAdvanceSales, locationId]);

  // Completing the linked Sale Job from this page (defined after `load`).
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

  const openPayDialogForSale = useCallback((sale: AdvanceSale) => {
    const balance = Number((sale.totalAmount as number) - (sale.paidAmount as number));
    if (balance <= 0.01) {
      toast.error('This sale has no pending balance');
      return;
    }
    setPayDialog({ sale });
    setPayAmount(String(balance.toFixed(2)));
    setPayHistory([]);
    loadPayHistory(sale.id);
  }, [loadPayHistory]);

  const normalizeScannedSaleKey = (rawValue: string): string => {
    const raw = rawValue.trim();
    if (!raw) return '';

    try {
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const candidate =
          String(parsed.saleNumber || parsed.saleNo || parsed.saleId || parsed.id || '').trim();
        if (candidate) return candidate;
      }
    } catch {
      // Ignore JSON parse errors and continue with raw text fallback.
    }

    if (raw.includes('/')) {
      const parts = raw.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart) return decodeURIComponent(lastPart).trim();
    }

    return raw;
  };

  const handleSaleScan = useCallback(async (scannedValue: string) => {
    const scanKey = normalizeScannedSaleKey(scannedValue);
    if (!scanKey) {
      toast.error('Invalid QR/barcode value');
      return;
    }

    const normalizedScan = scanKey.toLowerCase();
    const localMatch = sales.find((sale) => {
      const saleNumber = String(sale.saleNumber || '').toLowerCase();
      const saleId = String(sale.id || '').toLowerCase();
      return saleNumber === normalizedScan || saleId === normalizedScan;
    });

    if (localMatch) {
      setShowScanner(false);
      openPayDialogForSale(localMatch);
      return;
    }

    try {
      const res = await getAdvanceSales(locationId, 1, 20, scanKey);
      const data = (res as any)?.data;
      const remoteSales: AdvanceSale[] = Array.isArray(data?.sales)
        ? data.sales
        : Array.isArray(data)
        ? data
        : [];

      const remoteMatch = remoteSales.find((sale) => {
        const saleNumber = String(sale.saleNumber || '').toLowerCase();
        const saleId = String(sale.id || '').toLowerCase();
        return saleNumber === normalizedScan || saleId === normalizedScan;
      }) || remoteSales[0];

      if (!remoteMatch) {
        toast.error(`No pending advance sale found for: ${scanKey}`);
        return;
      }

      setShowScanner(false);
      openPayDialogForSale(remoteMatch);
    } catch {
      toast.error('Failed to fetch sale from scanned code');
    }
  }, [getAdvanceSales, locationId, openPayDialogForSale, sales]);

  const handlePayBalance = async () => {
    if (!payDialog) return;
    const amount = parseFloat(payAmount);
    const balance = Number((payDialog.sale.totalAmount as number) - (payDialog.sale.paidAmount as number));
    if (!payAmount || isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount'); return;
    }
    if (amount > balance + 0.01) {
      toast.error(`Amount cannot exceed balance due (${fmt(balance)})`); return;
    }
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
    setActionLoading(prev => ({ ...prev, [`ack_${sale.id}`]: true }));
    try {
      await downloadAcknowledgement(sale.id, printFormat);
      toast.success('Acknowledgement downloaded');
    } catch {
      toast.error('Failed to download acknowledgement');
    } finally {
      setActionLoading(prev => ({ ...prev, [`ack_${sale.id}`]: false }));
    }
  };

  const handleDownloadInvoice = async (sale: AdvanceSale) => {
    setActionLoading(prev => ({ ...prev, [`inv_${sale.id}`]: true }));
    try {
      await downloadInvoice(sale.id, { format: printFormat });
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Failed to download invoice');
    } finally {
      setActionLoading(prev => ({ ...prev, [`inv_${sale.id}`]: false }));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Advance Payments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Sales with partial / advance payment pending collection</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ScanLine className="w-4 h-4" />
            Scan Sale
          </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No pending advance payments</p>
            <p className="text-gray-400 text-sm mt-1">All sales have been fully paid.</p>
          </div>
        ) : 
        (
          <>
            {/* Format selector */}
            <div className="flex items-center gap-3 mb-3">
              <Printer className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-600">Download Format:</label>
              <select
                value={printFormat}
                onChange={e => setPrintFormat(e.target.value as 'a4' | '80mm' | '58mm')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
              >
                <option value="a4">A4</option>
                <option value="80mm">80mm Thermal</option>
                <option value="58mm">58mm Thermal</option>
              </select>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Sale #', 'Date', 'Due Date', 'Customer', 'Total', 'Paid', 'Balance Due', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map(sale => {
                    const custName = sale.customer?.name || sale.customerName || 'Walk-in';
                    const custPhone = sale.customer?.phone || sale.customerPhone;
                    const balance = Number(((sale.totalAmount as number) || 0) - ((sale.paidAmount as number) || 0));
                    return (
                      <tr key={sale.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-orange-700 font-semibold">{sale.saleNumber}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(sale.createdAt).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {sale.advanceDueDate
                            ? <span className="text-amber-700 font-medium">{new Date(sale.advanceDueDate).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            : <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{custName}</p>
                          {custPhone && <p className="text-xs text-gray-500">{custPhone}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{fmt(sale.totalAmount)}</td>
                        <td className="px-4 py-3 text-green-700 font-medium">{fmt(sale.paidAmount)}</td>
                        <td className="px-4 py-3 text-red-600 font-bold">{fmt(balance)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Pay Balance */}
                            {balance > 0.01 && (
                              <button
                                onClick={() => openPayDialogForSale(sale)}
                                className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                              >
                                <CreditCard className="w-3 h-3" /> Pay
                              </button>
                            )}
                            {/* Complete job + notify customer */}
                            <button
                              onClick={() => completeJobForSale(sale, true)}
                              disabled={actionLoading[`job_${sale.id}`]}
                              title="Mark the job done and notify the customer (SMS/Email/WhatsApp)"
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {actionLoading[`job_${sale.id}`]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <CheckCircle className="w-3 h-3" />}
                              Complete + Notify
                            </button>
                            {/* Download Acknowledgement */}
                            <button
                              onClick={() => handleDownloadAck(sale)}
                              disabled={actionLoading[`ack_${sale.id}`]}
                              title="Download Acknowledgement"
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                              className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50 transition-colors"
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
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Prev
                </button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pay Balance Dialog */}
      {payDialog && (
        <div
          className="glass-modal-overlay "
          onClick={(e) => {
            if (e.target === e.currentTarget && !paying) setPayDialog(null);
          }}
        >
          <div className="glass-modal-panel w-full  max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Pay Balance</h2>
              <button onClick={() => setPayDialog(null)} disabled={paying}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Sale #:</span>
                <span className="font-mono font-semibold text-orange-700">{payDialog.sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span>{fmt(payDialog.sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid:</span>
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
              <div className="flex justify-between">
                <span className="text-gray-500">Balance Due:</span>
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
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100">
                  {payHistory.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <div className="font-semibold text-gray-800">{fmt(p.amount)}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(p.paymentDate || p.createdAt).toLocaleString('en-LK')}
                          {p.receivedBy?.name ? ` · ${p.receivedBy.name}` : ''}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
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
                  Amount to Pay <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(payDialog.sale.balanceAmount)}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-lg font-semibold"
                  disabled={paying}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  disabled={paying}
                />
              </div>
            </div>

            {/* ── Complete the linked Sale Job ── */}
            <div className="mt-5 pt-4 border-t border-gray-100">
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
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayBalance}
                disabled={paying}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {paying ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleSaleScan}
        title="Scan Sale QR/Barcode"
      />
    </div>
  );
}
