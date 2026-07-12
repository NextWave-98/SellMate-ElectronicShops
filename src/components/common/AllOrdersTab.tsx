/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { todayColombo, formatDateTime } from '@/utils/dateUtils';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, ShoppingCart, Truck, Globe,
  Package, Clock, CheckCircle, XCircle, AlertCircle, Filter, Trash2,
  Eye, Download, ChevronDown, ChevronUp, DollarSign, TrendingUp, AlertTriangle,
  CreditCard, CheckSquare, Square, HandCoins, RotateCcw, Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import useCourier, { FARDAR_BULK_STATUS_OPTIONS, isStaffCourierPermissionsLimited } from '../../hooks/useCourier';
import useOrgSales from '../../hooks/useOrgSales';
import useBranchSales from '../../hooks/useBranchSales';
import useBranchScope from '../../hooks/useBranchScope';
import { useAppSelector } from '../../store/hooks';

const ORDER_STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PENDING', label: 'Pending Payment' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIAL_REFUND', label: 'Partial Refund' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'WAITING_COURIER_PICKUP', label: 'Waiting Courier Pickup' },
  { value: 'RELEASED_TO_COURIER', label: 'Released to Courier' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PENDING_PICKUP', label: 'Pending Pickup' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'FAILED_DELIVERY', label: 'Failed Delivery' },
  { value: 'DELIVERY_FAILED', label: 'Delivery Failed' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'RETURNED_TO_SENDER', label: 'Returned to Sender' },
  { value: 'RETURN_PENDING', label: 'Return Pending' },
  { value: 'RETURN_COMPLETE', label: 'Return Complete' },
  { value: 'RETURNED_TO_LOCATION', label: 'Returned to Location' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'DATE_CHANGED', label: 'Date Changed' },
  { value: 'REARRANGED', label: 'Rearranged' },
  { value: 'DAMAGED', label: 'Damaged' },
];

interface OrderItem {
  name: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface UnifiedOrder {
  id: string;
  saleId?: string | null;
  orderNumber: string;
  orderType: 'POS' | 'SHIPMENT' | 'WOOCOMMERCE';
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount?: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentMethods?: string[];
  locationName?: string;
  soldBy?: string | null;
  channel: string;
  trackingNumber?: string | null;
  items?: OrderItem[];
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
  shipmentCodAmount?: number;
  totalMismatch?: boolean;
}

interface AllOrdersSummary {
  totalOrders: number;
  posCount: number;
  shipmentCount: number;
  woocommerceCount: number;
  totalRevenue: number;
  completedRevenue?: number;
  totalPaid?: number;
  pendingAmount?: number;
  paymentMethodBreakdown?: Array<{ method: string; count: number; amount: number }>;
}

interface AllOrdersResponse {
  summary: AllOrdersSummary;
  orders: UnifiedOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AllOrdersTabProps {
  fetchOrders: (filters: {
    search?: string;
    orderType?: string;
    status?: string;
    fardarStatus?: string;
    startDate?: string;
    endDate?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
    page?: number;
    limit?: number;
    paymentMethod?: string;
    locationId?: string;
  }) => Promise<any>;
  variant?: 'admin' | 'branch';
  onDeleteOrder?: (order: any) => void;
  onViewOrder?: (order: any) => void;
}

const ORDER_TYPE_CONFIG: Record<string, any> = {
  POS: {
    label: 'POS Sale',
    icon: ShoppingCart,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
  },
  COURIER: {
    label: 'Shipment',
    icon: Truck,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    dotColor: 'bg-purple-500',
  },
  WOOCOMMERCE: {
    label: 'WooCommerce',
    icon: Globe,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
};

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_PICKUP: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
  PACKAGING: 'bg-blue-50 text-blue-700 border-blue-200',
  WAITING_COURIER_PICKUP: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
  PICKED_UP: 'bg-blue-50 text-blue-700 border-blue-200',
  RELEASED_TO_COURIER: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  OUT_FOR_DELIVERY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  REFUNDED: 'bg-red-50 text-red-700 border-red-200',
  PARTIAL_REFUND: 'bg-orange-50 text-orange-700 border-orange-200',
  FAILED_DELIVERY: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-orange-50 text-orange-700 border-orange-200',
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: 'text-green-600',
  COMPLETED: 'text-green-600',
  PENDING: 'text-yellow-600',
  PARTIAL: 'text-orange-600',
  PARTIALLY_PAID: 'text-orange-600',
  UNPAID: 'text-red-600',
  REFUNDED: 'text-orange-600',
  RETURNED: 'text-orange-600',
};

const getStatusIcon = (status: string) => {
  const upper = status?.toUpperCase() || '';
  if (['COMPLETED', 'DELIVERED', 'PAID'].includes(upper)) return <CheckCircle className="w-3 h-3" />;
  if (['PENDING', 'PENDING_PICKUP', 'PENDING_APPROVAL', 'PROCESSING', 'PACKAGING', 'WAITING_COURIER_PICKUP'].includes(upper)) return <Clock className="w-3 h-3" />;
  if (['CANCELLED', 'REFUNDED', 'FAILED_DELIVERY'].includes(upper)) return <XCircle className="w-3 h-3" />;
  if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP', 'RELEASED_TO_COURIER'].includes(upper)) return <Truck className="w-3 h-3" />;
  return <AlertCircle className="w-3 h-3" />;
};

const formatCurrency = (amount?: number | null) => {
  let value = Number(amount ?? 0);
  if (!Number.isFinite(value)) value = 0;
  return `LKR ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (iso: string) => {
  try {
    return formatDateTime(iso);
  } catch {
    return iso;
  }
};

const csvMoney = (amount?: number | null) => {
  const value = Number(amount ?? 0);
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
};

const isOrdersFetchSuccess = (res: any) =>
  !!(res && (res.success === true || res.status === true) && res.data);

const getOrderSaleId = (order: UnifiedOrder) =>
  order.saleId || (order.orderType === 'POS' ? order.id : null);

const isPendingPayment = (order: UnifiedOrder) => {
  const ps = (order.paymentStatus || '').toUpperCase();
  return ['PENDING', 'PARTIAL', 'PARTIALLY_PAID', 'UNPAID'].includes(ps);
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const getOrderBalance = (order: UnifiedOrder) => {
  const total = Number(order.totalAmount) || 0;
  const paid = Number(order.paidAmount) || 0;
  if (order.balanceAmount != null) return Math.max(0, Number(order.balanceAmount));
  return Math.max(0, total - paid);
};

/** Paid in full but sale still shows pending/partial — needs reconcile */
const isFullyPaidMismatch = (order: UnifiedOrder) => {
  const total = Number(order.totalAmount) || 0;
  const paid = Number(order.paidAmount) || 0;
  return total > 0 && paid >= total - 0.01 && isPendingPayment(order);
};

const buildPageTabs = (current: number, total: number, edgeCount = 3): Array<number | 'ellipsis'> => {
  if (total <= 1) return total === 1 ? [1] : [];
  if (total <= edgeCount * 2 + 2) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  for (let i = 1; i <= edgeCount; i++) pages.add(i);
  for (let i = total - edgeCount + 1; i <= total; i++) pages.add(i);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis');
    result.push(sorted[i]);
  }
  return result;
};

export default function AllOrdersTab({ fetchOrders, variant = 'branch', onDeleteOrder, onViewOrder }: AllOrdersTabProps) {
  const { user } = useAppSelector((state) => state.auth);
  const { courierSettings, fetchCourierSettings } = useCourier();
  const { ready: branchReady } = useBranchScope();
  const scopeReady = variant === 'admin' || branchReady;
  const staffOrderActionsBlocked =
    variant === 'branch' &&
    isStaffCourierPermissionsLimited(courierSettings, user?.role?.name);

  useEffect(() => {
    if (variant !== 'branch' || !user?.businessId) return;
    void fetchCourierSettings(user.businessId);
  }, [variant, user?.businessId, fetchCourierSettings]);
  const { getAllLocations } = useLocationHook();
  const { completeSalePayment: orgCompletePayment, bulkCompletePayments: orgBulkComplete, reconcileSalePayments: orgReconcile, syncCourierOrderTotals: orgSyncCourierTotals } = useOrgSales();
  const { completeSalePayment: branchCompletePayment, bulkCompletePayments: branchBulkComplete, reconcileSalePayments: branchReconcile } = useBranchSales();
  const completeSalePayment = variant === 'admin' ? orgCompletePayment : branchCompletePayment;
  const bulkCompletePayments = variant === 'admin' ? orgBulkComplete : branchBulkComplete;
  const reconcileSalePayments = variant === 'admin' ? orgReconcile : branchReconcile;
  const syncCourierOrderTotals = variant === 'admin' ? orgSyncCourierTotals : undefined;
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [branchFilter, setBranchFilter] = useState('');

  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [summary, setSummary] = useState<AllOrdersSummary>({
    totalOrders: 0, posCount: 0, shipmentCount: 0, woocommerceCount: 0, totalRevenue: 0,
    completedRevenue: 0, totalPaid: 0, pendingAmount: 0, paymentMethodBreakdown: [],
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  // Active tab: 'all' or 'pending'
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  // Filters — "committed" values that actually trigger API calls
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fardarStatusFilter, setFardarStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [updatedAtFrom, setUpdatedAtFrom] = useState('');
  const [updatedAtTo, setUpdatedAtTo] = useState('');

  // Expandable rows (show items)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Details modal
  const [detailsOrder, setDetailsOrder] = useState<UnifiedOrder | null>(null);

  // Pending payment actions
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkMethod, setBulkMethod] = useState('CASH');
  const [bulkReference, setBulkReference] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [syncSubmitting, setSyncSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; failureCount: number; results: any[] } | null>(null);
  const [singlePayOrder, setSinglePayOrder] = useState<UnifiedOrder | null>(null);
  const [singlePayMethod, setSinglePayMethod] = useState('CASH');
  const [singlePaySubmitting, setSinglePaySubmitting] = useState(false);

  // ─── stable ref to fetchOrders ─────────────────────────────────────────────
  const fetchOrdersRef = useRef(fetchOrders);
  useEffect(() => { fetchOrdersRef.current = fetchOrders; }, []);

  useEffect(() => {
    if (variant !== 'admin') return;
    getAllLocations().then((res: any) => {
      const list: any[] =
        res?.data?.locations ??
        res?.data?.branches ??
        (Array.isArray(res?.data) ? res.data : []);
      setBranches(
        list
          .filter((l) => l.locationType !== 'WAREHOUSE')
          .map((l) => ({
            id: l.id,
            name: l.name || l.locationCode || 'Unnamed',
          }))
      );
    });
  }, [variant]);

  // ─── core loader ─────────────────────────────────────────────────────────
  const load = async (overrideStatus?: string) => {
    setLoading(true);
    try {
      const appliedStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
      const filters: Record<string, any> = { page, limit };
      if (search) filters.search = search;
      if (orderTypeFilter) filters.orderType = orderTypeFilter;
      if (appliedStatus) filters.status = appliedStatus;
      if (fardarStatusFilter) filters.fardarStatus = fardarStatusFilter;
      if (paymentMethodFilter) filters.paymentMethod = paymentMethodFilter;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (updatedAtFrom) filters.updatedAtFrom = updatedAtFrom;
      if (updatedAtTo) filters.updatedAtTo = updatedAtTo;
      if (branchFilter) filters.locationId = branchFilter;

      const res = await fetchOrdersRef.current(filters);

      if (res?.success && res?.data) {
        const data = res.data as AllOrdersResponse;
        setOrders(data.orders ?? []);
        setSummary(data.summary ?? {
          totalOrders: 0, posCount: 0, shipmentCount: 0, woocommerceCount: 0, totalRevenue: 0,
        });
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } else {
        toast.error(res?.message || 'Failed to load orders');
      }
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scopeReady) return;
    // When switching to pending tab, force status='PENDING'
    if (activeTab === 'pending') {
      load('PENDING');
      setBulkSelected(new Set());
    } else {
      load();
    }
  }, [scopeReady, page, limit, search, orderTypeFilter, statusFilter, fardarStatusFilter, paymentMethodFilter, startDate, endDate, updatedAtFrom, updatedAtTo, activeTab, branchFilter]);

  // ─── manual refresh ────────────────────────────────────────────────────────
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    if (refreshTick === 0) return;
    load();
  }, [refreshTick]);

  // ─── handlers ─────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleFilterChange = (setter: (val: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setOrderTypeFilter('');
    setStatusFilter('');
    setFardarStatusFilter('');
    setPaymentMethodFilter('');
    setStartDate('');
    setEndDate('');
    setUpdatedAtFrom('');
    setUpdatedAtTo('');
    setBranchFilter('');
    setPage(1);
    setRefreshTick((t) => t + 1);
  };

  const setTodayFilter = () => {
    const today = todayColombo();
    setStartDate(today);
    setEndDate(today);
    setPage(1);
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleBulkSelect = (orderKey: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderKey)) next.delete(orderKey);
      else next.add(orderKey);
      return next;
    });
  };

  const getOrderKey = (order: UnifiedOrder) => `${order.orderType}-${order.id}`;

  const isSelectableOrder = (order: UnifiedOrder) => !!getOrderSaleId(order);

  const selectableOnPage = orders.filter(isSelectableOrder);

  const payableOrders = orders.filter((o) => isPendingPayment(o) && getOrderSaleId(o));

  const mismatchOrders = orders.filter((o) => isFullyPaidMismatch(o) && getOrderSaleId(o));

  const codTotalMismatchOrders = orders.filter(
    (o) => o.totalMismatch && o.shipmentCodAmount && getOrderSaleId(o),
  );

  const getSelectedOrders = () =>
    Array.from(bulkSelected)
      .map((key) => orders.find((o) => getOrderKey(o) === key))
      .filter((o): o is UnifiedOrder => !!o);

  const getSelectedSaleIds = () =>
    getSelectedOrders()
      .map((o) => getOrderSaleId(o))
      .filter((id): id is string => !!id);

  const selectAllOnPage = () => {
    const keys = selectableOnPage.map(getOrderKey);
    if (bulkSelected.size === keys.length && keys.length > 0) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(keys));
    }
  };

  const autoSelectFullyPaid = () => {
    const keys = mismatchOrders.map(getOrderKey);
    setBulkSelected(new Set(keys));
    if (keys.length === 0) {
      toast('No fully-paid orders with wrong status on this page');
    } else {
      toast.success(`Selected ${keys.length} order(s) — paid in full but status not updated`);
    }
  };

  const autoSelectPending = () => {
    const keys = payableOrders.map(getOrderKey);
    setBulkSelected(new Set(keys));
    toast.success(`Selected ${keys.length} pending/partial order(s) on this page`);
  };

  const autoSelectCodMismatch = () => {
    const keys = codTotalMismatchOrders.map(getOrderKey);
    setBulkSelected(new Set(keys));
    if (keys.length === 0) {
      toast('No COD total mismatches on this page');
    } else {
      toast.success(`Selected ${keys.length} order(s) where sale total ≠ shipment COD`);
    }
  };

  const openBulkModal = () => {
    setBulkResult(null);
    setBulkModal(true);
  };

  const closeBulkModal = () => {
    setBulkModal(false);
    setBulkResult(null);
  };

  const refreshOrders = () => setRefreshTick((t) => t + 1);

  const handleSyncPayments = async () => {
    const saleIds = getSelectedSaleIds();
    if (saleIds.length === 0) {
      toast.error('Select at least one order with a linked sale');
      return;
    }
    setSyncSubmitting(true);
    try {
      const res = await reconcileSalePayments(saleIds);
      const data = (res as any)?.data ?? res;
      const ok = data?.successCount ?? 0;
      const fail = data?.failureCount ?? 0;
      if (ok > 0) {
        toast.success(`Synced payment status for ${ok} order(s)`);
        setBulkSelected(new Set());
        refreshOrders();
      }
      if (fail > 0) toast.error(`${fail} order(s) failed to sync`);
      if (ok === 0 && fail === 0) toast.error((res as any)?.message || 'Sync failed');
    } catch {
      toast.error('Failed to sync payment status');
    } finally {
      setSyncSubmitting(false);
    }
  };

  const handleSyncCourierTotals = async () => {
    if (!syncCourierOrderTotals) return;
    const saleIds = getSelectedSaleIds();
    if (saleIds.length === 0) {
      toast.error('Select at least one order with a linked sale');
      return;
    }
    setSyncSubmitting(true);
    try {
      const res = await syncCourierOrderTotals(saleIds);
      const data = (res as any)?.data ?? res;
      const updated = data?.updatedCount ?? 0;
      const ok = data?.successCount ?? 0;
      const fail = data?.failureCount ?? 0;
      if (updated > 0) {
        toast.success(`Updated totals for ${updated} order(s) from shipment COD`);
        setBulkSelected(new Set());
        refreshOrders();
      } else if (ok > 0) {
        toast.success('Selected orders already match shipment COD totals');
        setBulkSelected(new Set());
      }
      if (fail > 0) toast.error(`${fail} order(s) failed to sync totals`);
      if (ok === 0 && fail === 0) toast.error((res as any)?.message || 'Sync totals failed');
    } catch {
      toast.error('Failed to sync order totals from shipment COD');
    } finally {
      setSyncSubmitting(false);
    }
  };

  const handleSyncAndComplete = async () => {
    const selected = getSelectedOrders();
    const saleIds = selected.map((o) => getOrderSaleId(o)!).filter(Boolean);
    if (saleIds.length === 0) {
      toast.error('Select at least one order');
      return;
    }
    setSyncSubmitting(true);
    try {
      const syncRes = await reconcileSalePayments(saleIds);
      const syncData = (syncRes as any)?.data ?? syncRes;
      const synced = syncData?.successCount ?? 0;

      const completeItems = selected
        .map((order) => {
          const saleId = getOrderSaleId(order)!;
          const balance = getOrderBalance(order);
          if (balance <= 0.01) return null;
          const paid = Number(order.paidAmount) || 0;
          return {
            saleId,
            amount: paid + balance,
            amountMode: 'total_collected' as const,
            paymentMethod: order.paymentMethod || bulkMethod || 'CASH',
            notes: 'Auto complete after payment sync from orders table',
          };
        })
        .filter((item): item is NonNullable<typeof item> => !!item);

      let completed = 0;
      if (completeItems.length > 0) {
        const payRes = await bulkCompletePayments(completeItems);
        const payData = (payRes as any)?.data ?? payRes;
        completed = payData?.successCount ?? 0;
      }

      toast.success(
        `Synced ${synced} · Completed ${completed} · Skipped ${selected.length - completeItems.length} already paid`,
      );
      setBulkSelected(new Set());
      refreshOrders();
    } catch {
      toast.error('Sync & complete failed');
    } finally {
      setSyncSubmitting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkSelected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const items = Array.from(bulkSelected)
        .map((key) => orders.find((o) => getOrderKey(o) === key))
        .filter((o): o is UnifiedOrder => !!o)
        .map((order) => {
          const saleId = getOrderSaleId(order)!;
          const balance = order.balanceAmount ?? (order.totalAmount - order.paidAmount);
          return {
            saleId,
            amount: balance > 0 ? balance : order.totalAmount,
            paymentMethod: bulkMethod,
            referenceNumber: bulkReference || undefined,
            notes: bulkNotes || undefined,
          };
        })
        .filter((item) => item.amount > 0);

      const res = await bulkCompletePayments(items);
      if (res?.success || (res as any)?.data) {
        const data = (res as any)?.data ?? res;
        setBulkResult(data);
        setBulkSelected(new Set());
        refreshOrders();
      } else {
        toast.error((res as any)?.message ?? 'Bulk payment failed');
      }
    } catch {
      toast.error('Bulk payment failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSinglePayment = async () => {
    if (!singlePayOrder) return;
    const saleId = getOrderSaleId(singlePayOrder);
    if (!saleId) {
      toast.error('No linked sale found for this order');
      return;
    }
    const balance = singlePayOrder.balanceAmount ?? (singlePayOrder.totalAmount - singlePayOrder.paidAmount);
    const amount = balance > 0 ? balance : singlePayOrder.totalAmount;
    setSinglePaySubmitting(true);
    try {
      const res = await completeSalePayment(saleId, {
        amount,
        paymentMethod: singlePayMethod,
        notes: 'Payment marked complete from pending orders',
      });
      if (res?.success) {
        toast.success('Payment recorded — sale marked complete');
        setSinglePayOrder(null);
        refreshOrders();
      } else {
        toast.error((res as any)?.message || 'Failed to record payment');
      }
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSinglePaySubmitting(false);
    }
  };

  // ─── Export CSV (all matching orders in date range) ───────────────────────
  const exportCSV = async () => {
    setExporting(true);
    try {
      const appliedStatus = activeTab === 'pending' ? 'PENDING' : statusFilter;
      const baseFilters: Record<string, any> = {};
      if (search) baseFilters.search = search;
      if (orderTypeFilter) baseFilters.orderType = orderTypeFilter;
      if (appliedStatus) baseFilters.status = appliedStatus;
      if (fardarStatusFilter) baseFilters.fardarStatus = fardarStatusFilter;
      if (paymentMethodFilter) baseFilters.paymentMethod = paymentMethodFilter;
      if (startDate) baseFilters.startDate = startDate;
      if (endDate) baseFilters.endDate = endDate;
      if (updatedAtFrom) baseFilters.updatedAtFrom = updatedAtFrom;
      if (updatedAtTo) baseFilters.updatedAtTo = updatedAtTo;
      if (branchFilter) baseFilters.locationId = branchFilter;

      const EXPORT_PAGE_SIZE = 1000;
      const allRows: UnifiedOrder[] = [];
      let exportPage = 1;
      let exportTotalPages = 1;
      let expectedTotal = 0;

      do {
        const res = await fetchOrdersRef.current({
          ...baseFilters,
          page: exportPage,
          limit: EXPORT_PAGE_SIZE,
        });
        if (!isOrdersFetchSuccess(res)) {
          toast.error(res?.message || 'Failed to export orders');
          return;
        }
        const data = res.data as AllOrdersResponse;
        const batch = data.orders ?? [];
        allRows.push(...batch);
        expectedTotal = Number(data.total ?? expectedTotal ?? 0);
        exportTotalPages = Number(data.totalPages ?? 1);
        if (batch.length === 0) break;
        exportPage += 1;
      } while (
        exportPage <= exportTotalPages &&
        (expectedTotal === 0 || allRows.length < expectedTotal)
      );

      if (allRows.length === 0) {
        toast.error('No orders to export');
        return;
      }

      const headers = [
        'Order #', 'Type', 'Channel', 'Tracking #', 'Customer', 'Phone', 'Product', 'SKU', 'Item Qty',
        'Item Unit Price (LKR)', 'Item Subtotal (LKR)',
        'Order Total (LKR)', 'Paid (LKR)', 'Balance (LKR)', 'Status',
        'Payment Status', 'Payment Method', 'Location', 'Sold By', 'Created Date', 'Updated Date',
      ];

      const rows: string[][] = [];
      for (const o of allRows) {
        const orderTotal = Number(o.totalAmount ?? 0);
        const paid = Number(o.paidAmount ?? 0);
        const balance =
          o.balanceAmount != null
            ? Number(o.balanceAmount)
            : orderTotal - paid;
        const lineItems = o.items?.length
          ? o.items
          : [{ name: '—', sku: '', quantity: o.itemCount ?? 0, unitPrice: 0, subtotal: 0 }];
        for (const item of lineItems) {
          rows.push([
            o.orderNumber,
            o.orderType,
            o.channel || '',
            o.trackingNumber || '',
            o.customerName,
            o.customerPhone || '',
            item.name,
            item.sku || '',
            String(item.quantity ?? 0),
            csvMoney(item.unitPrice),
            csvMoney(item.subtotal),
            csvMoney(orderTotal),
            csvMoney(paid),
            csvMoney(balance),
            o.status,
            o.paymentStatus,
            (o.paymentMethods?.join('/') || o.paymentMethod || ''),
            o.locationName || '',
            o.soldBy || '',
            formatDate(o.createdAt),
            formatDate(o.updatedAt),
          ]);
        }
      }

      const csv = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = startDate && endDate ? `${startDate}_to_${endDate}` : todayColombo();
      a.download = `orders_${activeTab}_${paymentMethodFilter || 'all'}_${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allRows.length} orders (${rows.length} line items)`);
    } catch (err) {
      console.error('Order export failed:', err);
      toast.error('Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  // ─── computed stats for pending tab ───────────────────────────────────────
  const pendingOrders = activeTab === 'pending' ? orders : [];
  const pendingTotal = pendingOrders.reduce((s, o) => s + (o.balanceAmount ?? (o.totalAmount - o.paidAmount)), 0);
  const pendingMethodMap: Record<string, { count: number; balance: number; total: number }> = {};
  for (const o of pendingOrders) {
    const methods = o.paymentMethods?.length ? o.paymentMethods : (o.paymentMethod ? [o.paymentMethod] : ['Unknown']);
    for (const m of methods) {
      if (!pendingMethodMap[m]) pendingMethodMap[m] = { count: 0, balance: 0, total: 0 };
      pendingMethodMap[m].count += 1;
      pendingMethodMap[m].balance += o.balanceAmount ?? (o.totalAmount - o.paidAmount);
      pendingMethodMap[m].total += o.totalAmount;
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-200/60"><Package className="w-5 h-5 text-slate-600" /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Orders</p>
                <p className="text-xl font-bold text-slate-800">{summary.totalOrders.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">{summary.posCount} POS · {summary.shipmentCount} Shipments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-200/60"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Total Revenue</p>
                <p className="text-lg font-bold text-emerald-800">{formatCurrency(summary.totalRevenue)}</p>
                {summary.completedRevenue !== undefined && (
                  <p className="text-[10px] text-emerald-500">Completed: {formatCurrency(summary.completedRevenue)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-200/60"><DollarSign className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Received Payments</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(summary.totalPaid ?? 0)}</p>
                <p className="text-[10px] text-blue-400">Of {formatCurrency(summary.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-200/60"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-orange-600 font-medium">Pending Payments</p>
                <p className="text-lg font-bold text-orange-800">{formatCurrency(summary.pendingAmount ?? 0)}</p>
                <p className="text-[10px] text-orange-400">Across {total} orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Payment Method Breakdown ──────────────────────────────────────── */}
      {summary.paymentMethodBreakdown && summary.paymentMethodBreakdown.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment Methods (received)</p>
            <div className="flex flex-wrap gap-2">
              {summary.paymentMethodBreakdown.map((pm) => (
                <button
                  key={pm.method}
                  onClick={() => handleFilterChange(setPaymentMethodFilter)(paymentMethodFilter === pm.method ? '' : pm.method)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    paymentMethodFilter === pm.method
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{pm.method}</span>
                  <span className="opacity-70">{pm.count}</span>
                  <span className="font-semibold">{formatCurrency(pm.amount)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs: All / Pending ───────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['all', 'pending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-slate-700 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'pending' ? 'Pending Payments' : 'All Orders'}
          </button>
        ))}
      </div>

      {/* ── Pending Payments: method-wise breakdown ───────────────────────── */}
      {activeTab === 'pending' && Object.keys(pendingMethodMap).length > 0 && (
        <Card className="border-0 shadow-sm bg-orange-50/40">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-orange-700 mb-3">Pending Balance by Payment Method</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(pendingMethodMap).map(([method, data]) => (
                <div key={method} className="bg-white rounded-lg p-3 border border-orange-100 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 mb-1">{method}</p>
                  <p className="text-sm font-bold text-orange-700">{formatCurrency(data.balance)}</p>
                  <p className="text-[10px] text-slate-400">{data.count} orders · Total: {formatCurrency(data.total)}</p>
                </div>
              ))}
              <div className="bg-orange-100 rounded-lg p-3 border border-orange-200 shadow-sm">
                <p className="text-xs font-semibold text-orange-600 mb-1">Grand Total Pending</p>
                <p className="text-sm font-bold text-orange-800">{formatCurrency(pendingTotal)}</p>
                <p className="text-[10px] text-orange-500">{pendingOrders.length} orders on this page</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mismatchOrders.length > 0 && !staffOrderActionsBlocked && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {mismatchOrders.length} order(s) on this page are fully paid but still show pending/partial — use <strong>Auto: Fully Paid</strong> then <strong>Sync Status</strong>.
        </div>
      )}

      {variant === 'admin' && codTotalMismatchOrders.length > 0 && (
        <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          {codTotalMismatchOrders.length} COD order(s) have sale totals that do not match shipment COD — use <strong>Auto: COD Mismatch</strong> then <strong>Sync Totals</strong>.
        </div>
      )}

      {!staffOrderActionsBlocked && (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
        <p className="text-xs text-slate-600">
          Bulk select · <strong>Sync Status</strong> recalculates from payment records · <strong>Sync &amp; Complete</strong> fixes status and finishes balance
          {variant === 'admin' ? (
            <> · <strong>Sync Totals</strong> fixes sale amount from shipment COD</>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={autoSelectPending} className="gap-1 h-8 text-xs">Select Pending</Button>
          <Button size="sm" variant="outline" onClick={autoSelectFullyPaid} className="gap-1 h-8 text-xs text-amber-700 border-amber-200">
            <Zap className="w-3.5 h-3.5" /> Auto: Fully Paid
          </Button>
          {variant === 'admin' && (
            <Button size="sm" variant="outline" onClick={autoSelectCodMismatch} className="gap-1 h-8 text-xs text-orange-700 border-orange-200">
              <Zap className="w-3.5 h-3.5" /> Auto: COD Mismatch
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={selectAllOnPage} className="h-8 text-xs">
            {bulkSelected.size === selectableOnPage.length && selectableOnPage.length > 0 ? 'Deselect Page' : `All Page (${selectableOnPage.length})`}
          </Button>
          {bulkSelected.size > 0 && (
            <>
              <span className="text-xs text-slate-500">{bulkSelected.size} selected</span>
              <Button size="sm" variant="outline" onClick={handleSyncPayments} disabled={syncSubmitting || bulkSubmitting} className="gap-1 h-8 text-blue-700 border-blue-200">
                <RotateCcw className={`w-3.5 h-3.5 ${syncSubmitting ? 'animate-spin' : ''}`} /> Sync Status
              </Button>
              {variant === 'admin' && (
                <Button size="sm" variant="outline" onClick={handleSyncCourierTotals} disabled={syncSubmitting || bulkSubmitting} className="gap-1 h-8 text-orange-700 border-orange-200">
                  <RotateCcw className={`w-3.5 h-3.5 ${syncSubmitting ? 'animate-spin' : ''}`} /> Sync Totals
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleSyncAndComplete} disabled={syncSubmitting || bulkSubmitting} className="gap-1 h-8 text-indigo-700 border-indigo-200">
                <Zap className="w-3.5 h-3.5" /> Sync &amp; Complete
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 h-8" onClick={openBulkModal} disabled={syncSubmitting}>
                <HandCoins className="w-3.5 h-3.5" /> Complete Balance
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkSelected(new Set())} className="h-8 text-xs">Clear</Button>
            </>
          )}
        </div>
      </div>
      )}

      {staffOrderActionsBlocked && (
        <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          Order payment updates, bulk upload, and marking delivered/complete are restricted for staff on this branch. You can still view and filter orders.
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex flex-1 gap-2 min-w-[200px]">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search order #, customer name, phone..."
                className="flex-1"
              />
              <Button onClick={handleSearch} size="icon" className="bg-slate-700 hover:bg-slate-800 shrink-0">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Branch Filter (org admin only) */}
            {variant === 'admin' && (
              <select
                value={branchFilter}
                onChange={(e) => handleFilterChange(setBranchFilter)(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white min-w-[150px]"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            {/* Order Type Filter */}
            <select
              value={orderTypeFilter}
              onChange={(e) => handleFilterChange(setOrderTypeFilter)(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white min-w-[130px]"
            >
              <option value="">All Types</option>
              <option value="POS">POS Sales</option>
              <option value="SHIPMENT">Shipments</option>
            </select>

            {/* Status Filter (hidden in pending tab since forced) */}
            {activeTab === 'all' && (
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white min-w-[140px]"
              >
                <option value="">All Statuses</option>
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {activeTab === 'all' && (
              <select
                value={fardarStatusFilter}
                onChange={(e) => handleFilterChange(setFardarStatusFilter)(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white min-w-[150px]"
              >
                <option value="">All Fardar Statuses</option>
                {FARDAR_BULK_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {/* Payment Method Filter */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => handleFilterChange(setPaymentMethodFilter)(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white min-w-[140px]"
            >
              <option value="">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="MINTPAY">Mintpay</option>
              <option value="KOKO">Koko</option>
              <option value="COD">COD</option>
              <option value="PAYZY">Payzy</option>
              <option value="CHEQUE">Cheque</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>

            {/* Created date range */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 shrink-0">Created</span>
              <input type="date" value={startDate} title="Created from"
                onChange={(e) => handleFilterChange(setStartDate)(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={endDate} title="Created to"
                onChange={(e) => handleFilterChange(setEndDate)(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              />
              <Button type="button" onClick={setTodayFilter} variant="outline" size="sm" className="shrink-0 text-xs">
                Today
              </Button>
            </div>

            {/* Updated date range */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 shrink-0">Updated</span>
              <input type="date" value={updatedAtFrom} title="Updated from"
                onChange={(e) => handleFilterChange(setUpdatedAtFrom)(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={updatedAtTo} title="Updated to"
                onChange={(e) => handleFilterChange(setUpdatedAtTo)(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              />
            </div>

            {/* Clear / Export */}
            <div className="flex gap-2">
              {(search || orderTypeFilter || statusFilter || fardarStatusFilter || paymentMethodFilter || startDate || endDate || updatedAtFrom || updatedAtTo || branchFilter) && (
                <Button onClick={handleResetFilters} variant="ghost" size="sm" className="text-gray-500 shrink-0">
                  <Filter className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
              <Button onClick={exportCSV} variant="outline" size="sm" disabled={exporting} className="border-slate-300 text-slate-600 shrink-0">
                <Download className={`w-3 h-3 mr-1 ${exporting ? 'animate-pulse' : ''}`} /> {exporting ? 'Exporting…' : 'Export'}
              </Button>
              <Button onClick={() => setRefreshTick((t) => t + 1)} variant="outline" size="sm" disabled={loading} className="border-slate-300 text-slate-600 shrink-0">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Orders Table ──────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No orders found</p>
            <p className="text-xs mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 w-8">
                    {!staffOrderActionsBlocked && (
                    <button type="button" onClick={selectAllOnPage} className="text-gray-400 hover:text-green-600" title="Select all on page">
                      {bulkSelected.size === selectableOnPage.length && selectableOnPage.length > 0
                        ? <CheckSquare className="w-4 h-4 text-green-600" />
                        : <Square className="w-4 h-4" />}
                    </button>
                    )}
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 w-6"></th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Order #</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Customer</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Items</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Amount</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Payment</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Location</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const typeConfig = ORDER_TYPE_CONFIG[order.channel?.toUpperCase()] || ORDER_TYPE_CONFIG.POS;
                  const TypeIcon = typeConfig.icon;
                  const statusStyle = STATUS_STYLES[order.status?.toUpperCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
                  const paymentStyle = PAYMENT_STATUS_STYLES[order.paymentStatus?.toUpperCase()] || 'text-gray-500';
                  const balance = order.balanceAmount ?? (order.totalAmount - order.paidAmount);
                  const isExpanded = expandedRows.has(order.id);
                  const hasItems = order.items && order.items.length > 0;
                  const orderKey = getOrderKey(order);
                  const saleId = getOrderSaleId(order);
                  const canSelect = isSelectableOrder(order);
                  const canPay = isPendingPayment(order) && !!saleId;
                  const paidMismatch = isFullyPaidMismatch(order);

                  return (
                    <React.Fragment key={`${order.orderType}-${order.id}`}>
                      <tr className={`hover:bg-slate-50/60 transition-colors ${bulkSelected.has(orderKey) ? 'bg-green-50/50' : ''}`}>
                        <td className="px-3 py-3">
                          {!staffOrderActionsBlocked && canSelect ? (
                            <button type="button" onClick={() => toggleBulkSelect(orderKey)} className="text-gray-400 hover:text-green-600">
                              {bulkSelected.has(orderKey)
                                ? <CheckSquare className="w-4 h-4 text-green-600" />
                                : <Square className="w-4 h-4" />}
                            </button>
                          ) : null}
                        </td>
                        {/* Expand toggle */}
                        <td className="px-3 py-3">
                          {hasItems && (
                            <button onClick={() => toggleExpand(order.id)} className="text-slate-400 hover:text-slate-600">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </td>

                        {/* Order Number */}
                        <td className="px-3 py-3">
                          <span className="font-mono text-slate-700 font-medium text-xs">{order.orderNumber}</span>
                          {order.trackingNumber && (
                            <div className="text-[10px] text-gray-400 mt-0.5 font-mono">TRK: {order.trackingNumber}</div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${typeConfig.bgColor} ${typeConfig.textColor} ${typeConfig.borderColor}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-700 text-sm">{order.customerName}</div>
                          {order.customerPhone && (
                            <div className="text-xs text-slate-400">{order.customerPhone}</div>
                          )}
                        </td>

                        {/* Items */}
                        <td className="px-3 py-3">
                          {hasItems ? (
                            <button onClick={() => toggleExpand(order.id)} className="text-left group">
                              <div className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate max-w-[140px]">
                                {order.items![0].name}
                              </div>
                              {order.items!.length > 1 && (
                                <div className="text-[10px] text-blue-500 group-hover:underline">
                                  +{order.items!.length - 1} more
                                </div>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-800 text-sm">{formatCurrency(order.totalAmount)}</div>
                          {order.totalMismatch && order.shipmentCodAmount && (
                            <div className="text-[10px] text-orange-600 font-semibold mt-0.5">
                              COD: {formatCurrency(order.shipmentCodAmount)} — mismatch
                            </div>
                          )}
                          {balance > 0.01 && (
                            <div className="text-xs text-orange-500 font-medium">Balance: {formatCurrency(balance)}</div>
                          )}
                          {balance <= 0.01 && order.paidAmount > 0 && (
                            <div className="text-xs text-green-500">Paid</div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusStyle}`}>
                            {getStatusIcon(order.status)}
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-3 py-3">
                          <span className={`text-xs font-medium ${paymentStyle}`}>
                            {order.paymentStatus?.replace(/_/g, ' ') || '—'}
                          </span>
                          {paidMismatch && (
                            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Paid {formatCurrency(order.paidAmount)} — needs sync</div>
                          )}
                          {!paidMismatch && order.paidAmount > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Received: {formatCurrency(order.paidAmount)}</div>
                          )}
                          {(order.paymentMethods?.length ? order.paymentMethods : order.paymentMethod ? [order.paymentMethod] : []).length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {(order.paymentMethods?.length ? order.paymentMethods : [order.paymentMethod!]).join(' / ')}
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-3 py-3 text-xs text-slate-500">
                          <div>{order.locationName || '—'}</div>
                          {order.soldBy && <div className="text-[10px] text-slate-400">{order.soldBy}</div>}
                        </td>

                        {/* Date */}
                        <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(order.createdAt)}</td>

                        {/* Actions */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {!staffOrderActionsBlocked && saleId && (paidMismatch || canPay) && (
                              <button
                                onClick={async () => {
                                  setSyncSubmitting(true);
                                  try {
                                    const res = await reconcileSalePayments([saleId]);
                                    const ok = (res as any)?.data?.successCount ?? 0;
                                    if (ok > 0) {
                                      toast.success('Payment status synced');
                                      refreshOrders();
                                    } else {
                                      toast.error('Sync failed');
                                    }
                                  } catch {
                                    toast.error('Sync failed');
                                  } finally {
                                    setSyncSubmitting(false);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors"
                                title="Sync payment status from records"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                            {!staffOrderActionsBlocked && canPay && (
                              <button
                                onClick={() => { setSinglePayOrder(order); setSinglePayMethod(order.paymentMethod || 'CASH'); }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 hover:bg-green-50 border border-green-200 hover:border-green-300 transition-colors"
                                title="Mark payment complete"
                              >
                                <HandCoins className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => setDetailsOrder(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            {onViewOrder && (
                              <button
                                onClick={() => onViewOrder(order)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors"
                                title="Open full details"
                              >
                                <Globe className="w-3 h-3" />
                              </button>
                            )}
                            {order.orderType === 'POS' && onDeleteOrder && (
                              <button
                                onClick={() => onDeleteOrder(order)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 transition-colors"
                                title="Delete sale"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded items row */}
                      {isExpanded && hasItems && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={12} className="px-8 py-3">
                            <div className="text-xs font-semibold text-slate-500 mb-2">Items in this order:</div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-200">
                                  <th className="text-left pb-1 font-medium">Product</th>
                                  <th className="text-left pb-1 font-medium">SKU</th>
                                  <th className="text-right pb-1 font-medium">Qty</th>
                                  <th className="text-right pb-1 font-medium">Unit Price</th>
                                  <th className="text-right pb-1 font-medium">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items!.map((item, idx) => (
                                  <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-1 font-medium text-slate-700">{item.name}</td>
                                    <td className="py-1 text-slate-400 font-mono">{item.sku || '—'}</td>
                                    <td className="py-1 text-right">{item.quantity}</td>
                                    <td className="py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-1 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/60">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>
                {total.toLocaleString()} order{total !== 1 ? 's' : ''} · page {page} of {totalPages}
              </span>
              <label className="inline-flex items-center gap-2">
                <span className="text-xs">Per page</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Button onClick={() => setPage(1)} disabled={page === 1} variant="outline" size="sm" className="h-8 px-2 text-xs">
                First
              </Button>
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {buildPageTabs(page, totalPages).map((tab, idx) =>
                tab === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-sm">…</span>
                ) : (
                  <Button
                    key={tab}
                    onClick={() => setPage(tab)}
                    variant={page === tab ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 min-w-8 px-2 text-xs ${page === tab ? 'bg-slate-700' : ''}`}
                  >
                    {tab}
                  </Button>
                ),
              )}
              <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button onClick={() => setPage(totalPages)} disabled={page === totalPages} variant="outline" size="sm" className="h-8 px-2 text-xs">
                Last
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Details Modal ─────────────────────────────────────────────────── */}
      {detailsOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailsOrder(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Order Details</h2>
                <p className="text-sm text-slate-500 font-mono">{detailsOrder.orderNumber}</p>
              </div>
              <button onClick={() => setDetailsOrder(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">Customer</p><p className="font-medium">{detailsOrder.customerName}</p>{detailsOrder.customerPhone && <p className="text-xs text-slate-500">{detailsOrder.customerPhone}</p>}</div>
                <div><p className="text-xs text-slate-400">Location</p><p className="font-medium">{detailsOrder.locationName || '—'}</p>{detailsOrder.soldBy && <p className="text-xs text-slate-500">By: {detailsOrder.soldBy}</p>}</div>
                <div><p className="text-xs text-slate-400">Status</p><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[detailsOrder.status?.toUpperCase()] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{getStatusIcon(detailsOrder.status)}{detailsOrder.status?.replace(/_/g, ' ')}</span></div>
                <div><p className="text-xs text-slate-400">Payment Status</p><span className={`text-sm font-medium ${PAYMENT_STATUS_STYLES[detailsOrder.paymentStatus?.toUpperCase()] || 'text-gray-500'}`}>{detailsOrder.paymentStatus?.replace(/_/g, ' ')}</span></div>
                <div><p className="text-xs text-slate-400">Payment Method</p><p className="font-medium">{(detailsOrder.paymentMethods?.length ? detailsOrder.paymentMethods : detailsOrder.paymentMethod ? [detailsOrder.paymentMethod] : ['—']).join(' / ')}</p></div>
                <div><p className="text-xs text-slate-400">Date</p><p className="font-medium text-xs">{formatDate(detailsOrder.createdAt)}</p></div>
              </div>

              {detailsOrder.trackingNumber && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-purple-500 font-medium">Tracking Number</p>
                  <p className="font-mono text-sm text-purple-700 font-semibold">{detailsOrder.trackingNumber}</p>
                </div>
              )}

              {/* Items */}
              {detailsOrder.items && detailsOrder.items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Items</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50"><tr><th className="text-left px-3 py-2 text-slate-500 font-medium">Product</th><th className="text-right px-3 py-2 text-slate-500 font-medium">Qty</th><th className="text-right px-3 py-2 text-slate-500 font-medium">Unit</th><th className="text-right px-3 py-2 text-slate-500 font-medium">Total</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailsOrder.items.map((item, i) => (
                          <tr key={i}><td className="px-3 py-2 font-medium text-slate-700">{item.name}{item.sku && <span className="text-slate-400 ml-1">({item.sku})</span>}</td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td><td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Total Amount</span><span className="font-bold text-slate-800">{formatCurrency(detailsOrder.totalAmount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Paid Amount</span><span className="font-semibold text-green-600">{formatCurrency(detailsOrder.paidAmount)}</span></div>
                {(detailsOrder.balanceAmount ?? (detailsOrder.totalAmount - detailsOrder.paidAmount)) > 0.01 && (
                  <div className="flex justify-between text-sm border-t pt-2"><span className="text-orange-600 font-medium">Outstanding Balance</span><span className="font-bold text-orange-600">{formatCurrency(detailsOrder.balanceAmount ?? (detailsOrder.totalAmount - detailsOrder.paidAmount))}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={bulkModal} onOpenChange={(open) => { if (!open) closeBulkModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
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
              <DialogFooter>
                <Button variant="outline" onClick={closeBulkModal}>Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Complete outstanding balance for <strong>{bulkSelected.size}</strong> order(s). Fully paid sales will be marked <span className="font-semibold text-green-700">COMPLETED</span>.
              </p>
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={bulkMethod}
                  onChange={(e) => setBulkMethod(e.target.value)}
                  className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'KOKO', 'MINTPAY', 'PAYZY'].map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Reference <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={bulkReference}
                  onChange={(e) => setBulkReference(e.target.value)}
                  className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. batch transfer ref"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeBulkModal} disabled={bulkSubmitting}>Cancel</Button>
                <Button onClick={handleBulkSubmit} disabled={bulkSubmitting} className="bg-green-600 hover:bg-green-700">
                  {bulkSubmitting ? 'Processing…' : `Complete ${bulkSelected.size} Payment(s)`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!singlePayOrder} onOpenChange={(open) => { if (!open) setSinglePayOrder(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-green-600" />
              Mark Payment Complete
            </DialogTitle>
          </DialogHeader>
          {singlePayOrder && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-gray-50 border p-3 text-sm space-y-1">
                <div><span className="text-gray-500">Order:</span> <span className="font-medium">{singlePayOrder.orderNumber}</span></div>
                <div><span className="text-gray-500">Balance:</span> <span className="font-bold text-orange-700">{formatCurrency(singlePayOrder.balanceAmount ?? (singlePayOrder.totalAmount - singlePayOrder.paidAmount))}</span></div>
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={singlePayMethod}
                  onChange={(e) => setSinglePayMethod(e.target.value)}
                  className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'KOKO', 'MINTPAY', 'PAYZY', 'COD'].map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSinglePayOrder(null)} disabled={singlePaySubmitting}>Cancel</Button>
                <Button onClick={handleSinglePayment} disabled={singlePaySubmitting} className="bg-green-600 hover:bg-green-700">
                  {singlePaySubmitting ? 'Saving…' : 'Confirm Payment'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}