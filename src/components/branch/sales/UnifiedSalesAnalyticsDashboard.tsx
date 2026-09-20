/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, DollarSign, ShoppingCart, Package, AlertCircle, TrendingUp, CreditCard, Eye, CheckSquare, Square, Layers, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import useBranchSales from '../../../hooks/useBranchSales';
import useBranchScope from '../../../hooks/useBranchScope';
import useSales from '../../../hooks/useSales';
import SaleInvoiceFormatModal, { type InvoiceAction } from '../../sales/SaleInvoiceFormatModal';
import type { PaperFormat } from '../pos/PrintOptionsModal';
import type { POSAnalyticsFilters, CourierShipmentsFilters } from '../../../hooks/useBranchSales';
import Pagination from '../../common/Pagination';
import { formatCurrency } from '../../../utils/currency';
import { formatDateTime } from '../../../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Label } from '../../ui/label';

// ---- Types ----

interface UnifiedAnalytics {
  period: { start: string; end: string };
  pos: {
    totalRevenue: number;
    totalOrders: number;
    paidAmount: number;
    outstandingAmount: number;
    avgOrderValue: number;
    paymentMethodBreakdown: Array<{ method: string; count: number; amount: number; percentage: number }>;
  };
  courier: {
    total: number;
    pending: number;
    delivered: number;
    inTransit: number;
    cancelled: number;
    totalCharge: number;
    codTotal: number;
  };
  combined: {
    totalRevenue: number;
    totalTransactions: number;
  };
}

interface POSAnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    paidAmount: number;
    outstandingAmount: number;
    avgOrderValue: number;
  };
  paymentMethodBreakdown: Array<{ method: string; count: number; amount: number; percentage: number }>;
  sales: Array<{
    id: string;
    saleNumber: string;
    customerName: string;
    customerPhone: string | null;
    totalAmount: number;
    paidAmount: number;
    status: string;
    paymentStatus: string;
    paymentMethods: string[];
    shipmentPaymentStatus: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CourierShipment {
  id: string;
  shipmentNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  totalCharge: number;
  codAmount: number;
  fullAmount: number;
  codEnabled: boolean;
  status: string;
  trackingNumber?: string;
  createdAt: string;
  courier?: { name: string };
  saleId?: string | null;
  saleTotal?: number;
  salePaymentStatus?: string | null;
  paymentReference?: string | null;
}

interface PaymentModalData {
  saleId: string;
  label: string;
  totalAmount: number;
  paidAmount: number;
}

// ---- Constants ----

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
] as const;

const PAYMENT_METHODS = [
  'CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT',
  'MOBILE_MONEY', 'CHECK', 'KOKO', 'MINTPAY', 'PAYZY', 'OTHER',
];

const POS_STATUSES = ['COMPLETED', 'PENDING', 'PARTIAL', 'CANCELLED', 'DRAFT'];

const COURIER_STATUSES = [
  'PENDING', 'PENDING_PICKUP', 'PICKED_UP', 'IN_TRANSIT',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY',
  'RETURNED_TO_SENDER', 'CANCELLED', 'ON_HOLD',
];

const PM_COLORS: Record<string, string> = {
  CASH: 'bg-green-500',
  CARD: 'bg-blue-500',
  BANK_TRANSFER: 'bg-purple-500',
  MOBILE_PAYMENT: 'bg-orange-500',
  MOBILE_MONEY: 'bg-cyan-500',
  CHECK: 'bg-gray-500',
  KOKO: 'bg-pink-500',
  MINTPAY: 'bg-indigo-500',
  PAYZY: 'bg-violet-500',
  OTHER: 'bg-stone-500',
};

const POS_STATUS_CLASSES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  PARTIAL: 'bg-orange-100 text-orange-800 border-orange-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
};

const COURIER_STATUS_CLASSES: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-200',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-800 border-blue-200',
  PICKED_UP: 'bg-sky-100 text-sky-800 border-sky-200',
  PENDING_PICKUP: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  FAILED_DELIVERY: 'bg-red-100 text-red-800 border-red-200',
  RETURNED_TO_SENDER: 'bg-orange-100 text-orange-800 border-orange-200',
  ON_HOLD: 'bg-gray-100 text-gray-700 border-gray-200',
};

// ---- Helpers ----

function StatusPill({ status, classes }: { status: string; classes: Record<string, string> }) {
  const cls = classes[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ---- Main Component ----

export default function UnifiedSalesAnalyticsDashboard() {
  const { ready: branchReady } = useBranchScope();
  const { getBranchUnifiedAnalytics, getBranchPOSAnalytics, getBranchCourierShipments, completeSalePayment, bulkCompletePayments, getSaleById } = useBranchSales();
  const { downloadInvoice, printInvoice } = useSales();

  // Period / date range
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Unified summary state
  const [unifiedData, setUnifiedData] = useState<UnifiedAnalytics | null>(null);
  const [unifiedLoading, setUnifiedLoading] = useState(false);

  // POS state
  const [posData, setPosData] = useState<POSAnalyticsData | null>(null);
  const [posLoading, setPosLoading] = useState(false);
  const [posSearch, setPosSearch] = useState('');
  const [posStatus, setPosStatus] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('');
  const [posPage, setPosPage] = useState(1);
  const [posLimit, setPosLimit] = useState(10);

  // Courier state
  const [courierShipments, setCourierShipments] = useState<CourierShipment[]>([]);
  const [courierTotal, setCourierTotal] = useState(0);
  const [courierTotalPages, setCourierTotalPages] = useState(0);
  const [courierLoading, setCourierLoading] = useState(false);

  // Items modal state
  const [itemsModal, setItemsModal] = useState<{ label: string; loading: boolean; items: any[] } | null>(null);

  // Payment modal state
  const [payModal, setPayModal] = useState<PaymentModalData | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payConfirm, setPayConfirm] = useState<{label: string; amount: number; method: string; reference: string} | null>(null);
  const [courierStatus, setCourierStatus] = useState('');

  // Bulk payment state
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkMethod, setBulkMethod] = useState('CASH');
  const [bulkReference, setBulkReference] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; failureCount: number; results: any[] } | null>(null);
  const [courierPage, setCourierPage] = useState(1);
  const [courierLimit, setCourierLimit] = useState(10);

  const [invoiceFormatModal, setInvoiceFormatModal] = useState<{
    saleId: string;
    saleNumber: string;
    action: InvoiceAction;
  } | null>(null);

  // Build the shared date args for the current period selection
  const buildDateArgs = useCallback(() => {
    if (period === 'custom') {
      return {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
    }
    return { period } as { period: 'today' | 'yesterday' | 'week' | 'month' | 'year' };
  }, [period, startDate, endDate]);

  // ---- Loaders ----

  const loadUnified = useCallback(async () => {
    setUnifiedLoading(true);
    try {
      const res = await getBranchUnifiedAnalytics(buildDateArgs());
      if (res?.success && res?.data) {
        setUnifiedData(res.data as UnifiedAnalytics);
      }
    } catch {
      toast.error('Failed to load summary analytics');
    } finally {
      setUnifiedLoading(false);
    }
  }, [getBranchUnifiedAnalytics, buildDateArgs]);

  const loadPOS = useCallback(
    async (page: number, limit: number) => {
      setPosLoading(true);
      try {
        const filters: POSAnalyticsFilters = { ...buildDateArgs(), page, limit };
        if (posSearch) filters.search = posSearch;
        if (posStatus) filters.status = posStatus;
        if (posPaymentMethod) filters.paymentMethod = posPaymentMethod;
        const res = await getBranchPOSAnalytics(filters);
        if (res?.success && res?.data) {
          setPosData(res.data as POSAnalyticsData);
        }
      } catch {
        toast.error('Failed to load POS sales');
      } finally {
        setPosLoading(false);
      }
    },
    [getBranchPOSAnalytics, buildDateArgs, posSearch, posStatus, posPaymentMethod]
  );

  const loadCourier = useCallback(
    async (page: number, limit: number) => {
      setCourierLoading(true);
      try {
        const filters: CourierShipmentsFilters = { ...buildDateArgs(), page, limit };
        if (courierStatus) filters.status = courierStatus;
        const res = await getBranchCourierShipments(filters);
        if (res?.success && res?.data) {
          const data = res.data as any;
          const list = (data.shipments || []).map((s: any) => ({
            id: s.id,
            shipmentNumber: s.shipment_number ?? s.shipmentNumber,
            recipientName: s.recipient_name ?? s.recipientName,
            recipientPhone: s.recipient_phone ?? s.recipientPhone,
            recipientCity: s.recipient_city ?? s.recipientCity,
            totalCharge: parseFloat(s.total_charge ?? s.totalCharge) || 0,
            codAmount: parseFloat(s.cod_amount ?? s.codAmount) || 0,
            fullAmount : parseFloat(s.declared_value ?? (s.declared_value + (parseFloat(s.total_charge ?? s.totalCharge) || 0))) || 0,
            codEnabled: s.cod_enabled ?? s.codEnabled ?? false,
            status: s.status,
            trackingNumber: s.tracking_number ?? s.trackingNumber,
            createdAt: s.created_at ?? s.createdAt,
            courier: s.courier,
            saleId: s.sale_id ?? s.saleId ?? null,
            saleTotal: parseFloat(s.sale?.totalAmount ?? s.sale?.total_amount) || parseFloat(s.cod_amount ?? s.codAmount) || 0,
            salePaymentStatus: s.sale?.paymentStatus ?? s.sale?.payment_status ?? null,
            paymentReference: s.sale?.paymentReference ?? s.sale?.payment_reference ?? null,
          }));
          setCourierShipments(list);
          setCourierTotal(data.total ?? data.pagination?.total ?? list.length);
          setCourierTotalPages(data.totalPages ?? data.pagination?.totalPages ?? 1);
        }
      } catch {
        toast.error('Failed to load courier shipments');
      } finally {
        setCourierLoading(false);
      }
    },
    [getBranchCourierShipments, buildDateArgs, courierStatus]
  );

  // ---- Effects ----

  // Reload everything when period / date range / branch scope changes
  useEffect(() => {
    if (!branchReady) return;
    loadUnified();
    setPosPage(1);
    loadPOS(1, posLimit);
    setCourierPage(1);
    loadCourier(1, courierLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchReady, period, startDate, endDate]);

  // Reload POS when its filters change (reset to page 1)
  useEffect(() => {
    if (!branchReady) return;
    setPosPage(1);
    loadPOS(1, posLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchReady, posStatus, posPaymentMethod]);

  // Reload courier when its status filter changes
  useEffect(() => {
    if (!branchReady) return;
    setCourierPage(1);
    loadCourier(1, courierLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchReady, courierStatus]);

  // ---- Event Handlers ----

  const handleViewItems = async (id: string, label: string) => {
    setItemsModal({ label, loading: true, items: [] });
    try {
      const res = await getSaleById(id);
      if (res?.success && res?.data) {
        const items = (res.data as any).saleItems || (res.data as any).items || [];
        setItemsModal({ label, loading: false, items });
      } else {
        toast.error('Failed to load sale items');
        setItemsModal(null);
      }
    } catch {
      toast.error('Failed to load sale items');
      setItemsModal(null);
    }
  };

  const openInvoiceFormatModal = (
    saleId: string,
    saleNumber: string,
    action: InvoiceAction,
  ) => {
    setInvoiceFormatModal({ saleId, saleNumber, action });
  };

  const handleInvoiceFormatConfirm = async (format: PaperFormat) => {
    if (!invoiceFormatModal) return;
    const { saleId, action } = invoiceFormatModal;
    try {
      if (action === 'print') {
        await printInvoice(saleId, { format });
        toast.success(`Invoice sent to printer (${format})`);
      } else {
        await downloadInvoice(saleId, { format });
        toast.success(`Invoice downloaded (${format})`);
      }
    } catch {
      toast.error(action === 'print' ? 'Failed to print invoice' : 'Failed to download invoice');
      throw new Error('invoice action failed');
    }
  };

  const openPayModal = (data: PaymentModalData) => {
    const balance = data.totalAmount - data.paidAmount;
    setPayModal(data);
    setPayAmount(balance > 0 ? balance.toFixed(2) : data.totalAmount.toFixed(2));
    setPayMethod('CASH');
    setPayReference('');
    setPayNotes('');
  };

  const closePayModal = () => {
    if (paySubmitting) return;
    setPayModal(null);
    setPayConfirm(null);
  };

  const handlePaySubmit = async () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    const balance = payModal.totalAmount - payModal.paidAmount;
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > (balance > 0 ? balance : payModal.totalAmount) + 0.01) {
      toast.error('Amount exceeds balance due');
      return;
    }
    setPaySubmitting(true);
    try {
      const res = await completeSalePayment(payModal.saleId, {
        amount,
        paymentMethod: payMethod,
        referenceNumber: payReference || undefined,
        notes: payNotes || undefined,
      });
      if (res?.success) {
        toast.success('Payment completed successfully');
        setPayConfirm({ label: payModal.label, amount, method: payMethod, reference: (res.data as any)?.referenceNumber ?? payReference });
        await Promise.all([
          loadUnified(),
          loadPOS(posPage, posLimit),
          loadCourier(courierPage, courierLimit),
        ]);
      } else {
        toast.error(res?.message || 'Failed to complete payment');
      }
    } catch {
      toast.error('Failed to complete payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handlePOSSearch = () => {
    setPosPage(1);
    loadPOS(1, posLimit);
  };

  // Bulk selection helpers
  const unpaidSaleIds = (posData?.sales ?? [])
    .filter((s) => s.paymentStatus !== 'COMPLETED' && s.status !== 'CANCELLED')
    .map((s) => s.id);

  const toggleBulkSelect = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllUnpaid = () => {
    if (bulkSelected.size === unpaidSaleIds.length && unpaidSaleIds.length > 0) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(unpaidSaleIds));
    }
  };

  const openBulkModal = () => {
    setBulkMethod('CASH');
    setBulkReference('');
    setBulkNotes('');
    setBulkResult(null);
    setBulkModal(true);
  };

  const closeBulkModal = () => {
    if (bulkSubmitting) return;
    setBulkModal(false);
    setBulkResult(null);
  };

  const handleBulkSubmit = async () => {
    if (bulkSelected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const items = [...bulkSelected].map((saleId) => {
        const sale = posData!.sales.find((s) => s.id === saleId)!;
        const balance = sale.totalAmount - sale.paidAmount;
        return {
          saleId,
          amount: balance > 0 ? balance : sale.totalAmount,
          paymentMethod: bulkMethod,
          referenceNumber: bulkReference || undefined,
          notes: bulkNotes || undefined,
        };
      });
      const res = await bulkCompletePayments(items);
      if (res?.success && res?.data) {
        const data = res.data as { successCount: number; failureCount: number; results: any[] };
        setBulkResult(data);
        if (data.successCount > 0) {
          toast.success(`${data.successCount} payment(s) completed`);
          setBulkSelected(new Set());
          await Promise.all([
            loadUnified(),
            loadPOS(posPage, posLimit),
            loadCourier(courierPage, courierLimit),
          ]);
        }
        if (data.failureCount > 0) {
          toast.error(`${data.failureCount} payment(s) failed`);
        }
      } else {
        toast.error((res as any)?.message || 'Bulk payment failed');
      }
    } catch {
      toast.error('Bulk payment failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handlePOSPageChange = (page: number) => {
    setPosPage(page);
    loadPOS(page, posLimit);
  };

  const handlePOSLimitChange = (limit: number) => {
    setPosLimit(limit);
    setPosPage(1);
    loadPOS(1, limit);
  };

  const handleCourierPageChange = (page: number) => {
    setCourierPage(page);
    loadCourier(page, courierLimit);
  };

  const handleCourierLimitChange = (limit: number) => {
    setCourierLimit(limit);
    setCourierPage(1);
    loadCourier(1, limit);
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadUnified(),
      loadPOS(posPage, posLimit),
      loadCourier(courierPage, courierLimit),
    ]);
    toast.success('Data refreshed');
  };

  const applyCustomRange = () => {
    loadUnified();
    setPosPage(1);
    loadPOS(1, posLimit);
    setCourierPage(1);
    loadCourier(1, courierLimit);
  };

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            POS sales &amp; courier shipments for your branch
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              period === opt.value
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">From:</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">To:</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 text-sm"
            />
          </div>
          <Button size="sm" onClick={applyCustomRange}>
            Apply
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Combined Revenue"
          value={formatCurrency(unifiedData?.combined?.totalRevenue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-green-500"
          loading={unifiedLoading}
        />
        <SummaryCard
          label="POS Orders"
          value={String(unifiedData?.pos?.totalOrders ?? 0)}
          icon={<ShoppingCart className="w-5 h-5" />}
          iconBg="bg-blue-500"
          sub={`Avg ${formatCurrency(unifiedData?.pos?.avgOrderValue ?? 0)}`}
          loading={unifiedLoading}
        />
        <SummaryCard
          label="Courier Shipments"
          value={String(unifiedData?.courier?.total ?? 0)}
          icon={<Package className="w-5 h-5" />}
          iconBg="bg-orange-500"
          sub={`${unifiedData?.courier?.delivered ?? 0} delivered`}
          loading={unifiedLoading}
        />
        <SummaryCard
          label="POS Outstanding"
          value={formatCurrency(unifiedData?.pos?.outstandingAmount ?? 0)}
          icon={<AlertCircle className="w-5 h-5" />}
          iconBg="bg-red-500"
          sub={`Paid: ${formatCurrency(unifiedData?.pos?.paidAmount ?? 0)}`}
          loading={unifiedLoading}
        />
      </div>

      {/* Payment Method Breakdown */}
      {(posData?.paymentMethodBreakdown?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              All Payment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posData!.paymentMethodBreakdown.map((pm) => (
                <div key={pm.method} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {pm.method.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{pm.count} txns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${PM_COLORS[pm.method] ?? 'bg-gray-400'}`}
                        style={{ width: `${Math.min(pm.percentage, 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-10 text-right">
                      {pm.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatCurrency(pm.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* POS + Courier Tabs */}
      <Tabs defaultValue="pos">
        <TabsList className="mb-4">
          <TabsTrigger value="pos">
            All Transactions(All Branches)
            {posData && (
              <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                {posData.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="courier">
            Courier Shipments(current branch)
            {courierTotal > 0 && (
              <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">
                {courierTotal}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* POS Tab */}
        <TabsContent value="pos">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold">
                  All Sales
                  {posData?.summary && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        Total: {formatCurrency(posData.summary.totalRevenue)}
                    </span>
                  )}
                </CardTitle>
                {/* Bulk action bar */}
                {bulkSelected.size > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-sm text-gray-600 font-medium">{bulkSelected.size} selected</span>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-1 h-8 text-xs"
                      onClick={openBulkModal}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Complete All Payments
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkSelected(new Set())}>
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              {/* POS Filters */}
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="flex gap-2 flex-1 min-w-55">
                  <Input
                    placeholder="Search invoice or customer..."
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePOSSearch()}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={handlePOSSearch}>
                    Search
                  </Button>
                </div>
                <Select value={posStatus || 'ALL'} onValueChange={(v) => setPosStatus(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="w-40 text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    {POS_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={posPaymentMethod || 'ALL'} onValueChange={(v) => setPosPaymentMethod(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="w-44 text-sm">
                    <SelectValue placeholder="All Payment Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm} value={pm}>
                        {pm.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {unpaidSaleIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={selectAllUnpaid}
                  >
                    {bulkSelected.size === unpaidSaleIds.length ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    {bulkSelected.size === unpaidSaleIds.length ? 'Deselect All' : `Select All Unpaid (${unpaidSaleIds.length})`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {posLoading ? (
                <TableSkeleton rows={6} />
              ) : (posData?.sales?.length ?? 0) === 0 ? (
                <div className="text-center py-14 text-gray-400 text-sm">
                  No POS transactions found for this period.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-8 text-xs font-semibold"></TableHead>
                          <TableHead className="text-xs font-semibold">Invoice #</TableHead>
                          <TableHead className="text-xs font-semibold">Customer</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Paid</TableHead>
                          <TableHead className="text-xs font-semibold">Payment Method(s)</TableHead>
                          <TableHead className="text-xs font-semibold">Pay Status</TableHead>
                          <TableHead className="text-xs font-semibold">Date</TableHead>
                          <TableHead className="text-xs font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posData!.sales.map((sale) => (
                          <TableRow key={sale.id} className={`hover:bg-gray-50 ${bulkSelected.has(sale.id) ? 'bg-green-50' : ''}`}>
                            <TableCell className="w-8">
                              {sale.paymentStatus !== 'COMPLETED' && sale.status !== 'CANCELLED' ? (
                                <button
                                  onClick={() => toggleBulkSelect(sale.id)}
                                  className="text-orange-500 hover:text-orange-700"
                                >
                                  {bulkSelected.has(sale.id)
                                    ? <CheckSquare className="w-4 h-4" />
                                    : <Square className="w-4 h-4" />}
                                </button>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-orange-600">
                              {sale.saleNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="font-medium">{sale.customerName}</div>
                              {sale.customerPhone && (
                                <div className="text-xs text-gray-400">{sale.customerPhone}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-right font-semibold">
                              {formatCurrency(sale.totalAmount)}
                            </TableCell>
                            <TableCell className="text-sm text-right text-green-700 font-medium">
                              {formatCurrency(sale.paidAmount)}
                              {sale.paymentStatus !== 'COMPLETED' && sale.status !== 'CANCELLED' && (
                                <div className="text-[10px] text-red-500 font-semibold">
                                  Due: {formatCurrency(sale.totalAmount - sale.paidAmount)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {sale.paymentMethods.map((pm) => (
                                  <span
                                    key={pm}
                                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    {pm.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusPill status={sale.paymentStatus || sale.status} classes={POS_STATUS_CLASSES} />
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDateTime(sale.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => handleViewItems(sale.id, `${sale.saleNumber}   ${sale.customerName}`)}
                              >
                                <Eye className="w-3 h-3" />
                                Items
                              </Button>
                              {sale.paymentStatus !== 'COMPLETED' && sale.status !== 'CANCELLED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => openPayModal({
                                    saleId: sale.id,
                                    label: `${sale.saleNumber}   ${sale.customerName}`,
                                    totalAmount: sale.totalAmount,
                                    paidAmount: sale.paidAmount,
                                  })}
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Pay
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => openInvoiceFormatModal(sale.id, sale.saleNumber, 'download')}
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                                onClick={() => openInvoiceFormatModal(sale.id, sale.saleNumber, 'print')}
                              >
                                <Printer className="w-3 h-3" />
                                Print
                              </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    currentPage={posPage}
                    totalPages={posData?.totalPages ?? 1}
                    itemsPerPage={posLimit}
                    totalItems={posData?.total ?? 0}
                    onPageChange={handlePOSPageChange}
                    onItemsPerPageChange={handlePOSLimitChange}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courier Tab */}
        <TabsContent value="courier">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold">
                  Courier Shipments
                  {unifiedData?.courier && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        Revenue: {formatCurrency(unifiedData.courier.totalCharge)}
                    </span>
                  )}
                </CardTitle>
              </div>
              {/* Courier Filters */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Select value={courierStatus || 'ALL'} onValueChange={(v) => setCourierStatus(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="w-52 text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    {COURIER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {courierLoading ? (
                <TableSkeleton rows={6} />
              ) : courierShipments.length === 0 ? (
                <div className="text-center py-14 text-gray-400 text-sm">
                  No courier shipments found for this period.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-semibold">Shipment #</TableHead>
                          <TableHead className="text-xs font-semibold">Payment Reference</TableHead>
                          <TableHead className="text-xs font-semibold">Courier</TableHead>
                          <TableHead className="text-xs font-semibold">Recipient</TableHead>
                          <TableHead className="text-xs font-semibold">City</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Charge</TableHead>
                          <TableHead className="text-xs font-semibold text-right">COD + Products </TableHead>
                          <TableHead className="text-xs font-semibold">Status</TableHead>
                          <TableHead className="text-xs font-semibold">Date</TableHead>
                          <TableHead className="text-xs font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courierShipments.map((s) => (
                          <TableRow key={s.id} className="hover:bg-gray-50">
                            <TableCell className="text-sm font-medium text-orange-600">
                              {s.shipmentNumber}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-gray-600">
                              {s.paymentReference}
                            </TableCell>
                            <TableCell className="text-sm">{s.courier?.name ?? ' '}</TableCell>
                            <TableCell className="text-sm">
                              <div className="font-medium">{s.recipientName}</div>
                              <div className="text-xs text-gray-400">{s.recipientPhone}</div>
                            </TableCell>
                            <TableCell className="text-sm">{s.recipientCity}</TableCell>
                            <TableCell className="text-sm text-right font-semibold">
                              {formatCurrency(s.totalCharge)}
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              {s.codEnabled ? (
                                <span className="font-medium text-blue-700">{formatCurrency(s.codAmount)}</span>
                              ) : (
                                <span className="text-blue-700">{formatCurrency(s.fullAmount)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusPill status={s.status} classes={COURIER_STATUS_CLASSES} />
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDateTime(s.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                              {s.saleId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleViewItems(s.saleId!, `${s.shipmentNumber}   ${s.recipientName}`)}
                                >
                                  <Eye className="w-3 h-3" />
                                  Items
                                </Button>
                              )}
                              {s.saleId &&
                                s.salePaymentStatus !== 'COMPLETED' &&
                                s.status !== 'CANCELLED' &&
                                s.status !== 'RETURNED_TO_SENDER' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                    onClick={() => openPayModal({
                                      saleId: s.saleId!,
                                      label: `${s.shipmentNumber}   ${s.recipientName}${s.codEnabled ? ' (COD)' : ''}`,
                                      totalAmount: s.saleTotal || s.codAmount,
                                      paidAmount: 0,
                                    })}
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    {s.codEnabled ? 'Collect COD' : 'Collect Payment'}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    currentPage={courierPage}
                    totalPages={courierTotalPages}
                    itemsPerPage={courierLimit}
                    totalItems={courierTotal}
                    onPageChange={handleCourierPageChange}
                    onItemsPerPageChange={handleCourierLimitChange}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- Sale Items Dialog ---- */}
      <Dialog open={!!itemsModal} onOpenChange={(o) => { if (!o) setItemsModal(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-orange-500" />
              Sale Items   {itemsModal?.label}
            </DialogTitle>
          </DialogHeader>
          {itemsModal?.loading ? (
            <TableSkeleton rows={4} />
          ) : (itemsModal?.items?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No items found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">#</TableHead>
                    <TableHead className="text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Unit Price</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Discount</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsModal!.items.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{item.product?.name || item.productName || ' '}</div>
                        {(item.product?.sku || item.sku) && (
                          <div className="text-xs text-gray-400">{item.product?.sku || item.sku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-sm text-right">
                        {item.discount > 0 ? formatCurrency(item.discount) : ' '}
                      </TableCell>
                      <TableCell className="text-sm text-right font-semibold">
                        {formatCurrency(item.totalPrice ?? (item.unitPrice * item.quantity))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemsModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Complete Payment Dialog ---- */}
      <Dialog open={!!payModal || !!payConfirm} onOpenChange={(o) => { if (!o) closePayModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4 text-green-600" />
              {payConfirm ? 'Payment Confirmed' : 'Complete Payment'}
            </DialogTitle>
          </DialogHeader>

          {payConfirm ? (
            /* Confirmation Screen */
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
              <p className="text-sm text-gray-500 truncate">{payConfirm.label}</p>
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-semibold text-green-700">{formatCurrency(payConfirm.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-900">{payConfirm.method.replace(/_/g, ' ')}</span>
                </div>
                {payConfirm.reference && (
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
                    <span className="text-gray-500">Reference #</span>
                    <span className="font-semibold text-gray-900 font-mono">{payConfirm.reference}</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={closePayModal}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : payModal && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold text-gray-700 truncate">{payModal.label}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-medium">{formatCurrency(payModal.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Already Paid:</span>
                  <span className="font-medium text-green-700">{formatCurrency(payModal.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-orange-200 pt-1 mt-1">
                  <span className="font-semibold text-gray-700">Balance Due:</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(Math.max(0, payModal.totalAmount - payModal.paidAmount))}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount" className="text-sm font-medium">Amount (LKR)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="text-sm"
                  placeholder="Enter amount"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm} value={pm}>
                        {pm.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref" className="text-sm font-medium">
                  Reference / Transaction ID <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="pay-ref"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="text-sm"
                  placeholder="e.g. bank transfer ref, cheque #"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="pay-notes" className="text-sm font-medium">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="pay-notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="text-sm"
                  placeholder="Any note about this payment"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closePayModal} disabled={paySubmitting} className="text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handlePaySubmit}
                  disabled={paySubmitting || !payAmount}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm gap-2"
                >
                  {paySubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Bulk Complete Payments Dialog ---- */}
      <Dialog open={bulkModal} onOpenChange={(o) => { if (!o) closeBulkModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-green-600" />
              {bulkResult ? 'Bulk Payment Result' : `Complete ${bulkSelected.size} Payment(s)`}
            </DialogTitle>
          </DialogHeader>

          {bulkResult ? (
            <div className="space-y-4 py-2">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{bulkResult.successCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Succeeded</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{bulkResult.failureCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Failed</p>
                </div>
              </div>
              {bulkResult.failureCount > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {bulkResult.results.filter((r) => !r.success).map((r, i) => (
                    <div key={i} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                      {r.saleId}: {r.error}
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeBulkModal} className="text-sm">Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                This will complete the outstanding balance for <strong>{bulkSelected.size}</strong> sale(s).
                Fully paid sales → <span className="font-semibold text-green-700">COMPLETED</span>. Linked shipments → <span className="font-semibold text-blue-700">DELIVERED</span>.
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Payment Method</Label>
                <Select value={bulkMethod} onValueChange={setBulkMethod}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm} value={pm}>{pm.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Reference <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  value={bulkReference}
                  onChange={(e) => setBulkReference(e.target.value)}
                  placeholder="e.g. batch transfer ref"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Any notes for this batch"
                  className="text-sm"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeBulkModal} disabled={bulkSubmitting} className="text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkSubmit}
                  disabled={bulkSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm gap-2"
                >
                  {bulkSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
                  ) : (
                    <><Layers className="w-4 h-4" />Complete {bulkSelected.size} Payment(s)</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SaleInvoiceFormatModal
        isOpen={invoiceFormatModal !== null}
        onClose={() => setInvoiceFormatModal(null)}
        action={invoiceFormatModal?.action ?? 'download'}
        invoiceLabel={invoiceFormatModal?.saleNumber}
        onConfirm={handleInvoiceFormatConfirm}
      />
    </div>
  );
}

// ---- Sub-components ----

function SummaryCard({
  label,
  value,
  icon,
  iconBg,
  sub,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`${iconBg} p-2 rounded-lg text-white shrink-0`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded" />
      ))}
    </div>
  );
}
