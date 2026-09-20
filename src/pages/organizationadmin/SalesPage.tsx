/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import type { Sale } from '../../types/sales.types';
import { SaleStatus, PaymentMethod, PaymentStatus } from '../../types/sales.types';
import SalesTable from '../../components/superadmin/sales/SalesTable';
import SalesFilters, { type DateFilterType } from '../../components/superadmin/sales/SalesFilters';
import SalesDashboard from '../../components/superadmin/sales/dashboard/SalesDashboard';
import { DashboardSkeleton, TableSkeleton, CardSkeleton } from '../../components/common/SkeletonLoader';
import { EmptySearchState, EmptyTableState } from '../../components/common/EmptyState';
import { RefreshCw, BarChart3, List, TrendingUp, TrendingDown, Clock, Globe, ChevronLeft, ChevronRight, Package, Eye, CreditCard } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import useFetch from '../../hooks/useFetch';
import toast from 'react-hot-toast';
import DataRawModal from '../../components/common/DataRawModal';
import BillModal from '../../components/branch/pos/BillModal';
import type { OrderData } from '../../components/branch/pos/PaymentModal';
import useSales from '../../hooks/useSales';
import { Button } from '@base-ui/react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import CancelSaleModal from '../../components/sales/CancelSaleModal';
import RefundSaleModal from '../../components/sales/RefundSaleModal';
import OrgUnifiedSalesAnalyticsDashboard from '../../components/organizationadmin/sales/OrgUnifiedSalesAnalyticsDashboard';

interface WooSaleItem {
  id: string; productId: string; productName: string;
  quantity: number; unitPrice: number; subtotal: number;
}
interface WooSale {
  id: string; saleNumber: string; customerName: string | null;
  customerEmail: string | null; totalAmount: number;
  paidAmount: number; balanceAmount: number;
  paymentStatus: string; paymentMethod: string | null;
  status: string; createdAt: string; saleItems?: WooSaleItem[];
}

export default function SalesPage() {
  const { getDashboardData, getSales, getSaleById, downloadInvoice, printInvoice, cancelSale, deleteSale, createRefund, addPaymentToSale, completePendingPayment, bulkCompletePayments, getPendingSales } = useSales();
  const { user } = useAuth();
  const { fetchData: wooFetch } = useFetch();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'pending' | 'analytics' | 'woocommerce'>('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<{
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalDiscount: number;
    totalTax: number;
    paymentMethodBreakdown: {
      cash: number;
      card: number;
      bankTransfer: number;
      mobilePayment: number;
      credit: number;
    };
    statusBreakdown: {
      completed: number;
      pending: number;
      cancelled: number;
      refunded: number;
    };
    topShops: Array<{
      shopId: number;
      shopName: string;
      totalSales: number;
      revenue: number;
    }>;
    topProducts: Array<{
      productId: number;
      productName: string;
      quantitySold: number;
      revenue: number;
    }>;
    topSellers: Array<{
      staffId: number;
      staffName: string;
      totalSales: number;
      revenue: number;
    }>;
    dailySales: Array<{
      date: string;
      sales: number;
      revenue: number;
    }>;
  }>({
    totalSales: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalDiscount: 0,
    totalTax: 0,
    paymentMethodBreakdown: {
      cash: 0,
      card: 0,
      bankTransfer: 0,
      mobilePayment: 0,
      credit: 0,
    },
    statusBreakdown: {
      completed: 0,
      pending: 0,
      cancelled: 0,
      refunded: 0,
    },
    topShops: [],
    topProducts: [],
    topSellers: [],
    dailySales: [],
  });
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayRevenue: 0,
    yesterdaySales: 0,
    yesterdayRevenue: 0,
    weekSales: 0,
    weekRevenue: 0,
    monthSales: 0,
    monthRevenue: 0,
    growthRate: 0,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [rawData, setRawData] = useState<unknown | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedOrderData, setSelectedOrderData] = useState<OrderData | null>(null);
  const [selectedResponseData, setSelectedResponseData] = useState<unknown>(null);
  // const [billModalOpen, setBillModalOpen] = useState(false);
  // const [selectedOrderData, setSelectedOrderData] = useState<OrderData | null>(null);
  // const [selectedResponseData, setSelectedResponseData] = useState<unknown>(null);
  const [pendingItemsModal, setPendingItemsModal] = useState<{ label: string; loading: boolean; items: any[] } | null>(null);
  const [saleDetailsModal, setSaleDetailsModal] = useState<{ loading: boolean; data: any | null } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // Cancel/Refund modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedSaleForAction, setSelectedSaleForAction] = useState<Sale | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSaleForDelete, setSelectedSaleForDelete] = useState<Sale | null>(null);

  // Pending payments state
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [completePaymentModalOpen, setCompletePaymentModalOpen] = useState(false);
  const [selectedPendingSale, setSelectedPendingSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'KOKO' | 'MINTPAY' | 'PAYZY'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentConfirmedData, setPaymentConfirmedData] = useState<{ invoiceNumber: string; amount: number; method: string; reference: string } | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SaleStatus | ''>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | ''>('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  // Pending payments pagination
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLimit, setPendingLimit] = useState(10);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);

  // WooCommerce sales state
  const [wooSales, setWooSales] = useState<WooSale[]>([]);
  const [wooLoading, setWooLoading] = useState(false);
  const [wooPage, setWooPage] = useState(1);
  const [wooTotalPages, setWooTotalPages] = useState(1);
  const [wooTotal, setWooTotal] = useState(0);
  const [wooStatusFilter, setWooStatusFilter] = useState('');
  const [wooDateFrom, setWooDateFrom] = useState('');
  const [wooDateTo, setWooDateTo] = useState('');

  // WooCommerce payment modal state
  const [wooPayModalOpen, setWooPayModalOpen] = useState(false);
  const [wooPaySale, setWooPaySale] = useState<WooSale | null>(null);
  const [wooPayAmount, setWooPayAmount] = useState('');
  const [wooPayMethod, setWooPayMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'KOKO' | 'MINTPAY' | 'PAYZY'>('CASH');
  const [wooPayReference, setWooPayReference] = useState('');
  const [wooPayLoading, setWooPayLoading] = useState(false);

  // Bulk payment state
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkMethod, setBulkMethod] = useState<string>('CASH');
  const [bulkReference, setBulkReference] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; failureCount: number; results: any[] } | null>(null);

  const getDateRangeFromFilter = (): { startDate?: string; endDate?: string; period?: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return {
          startDate: today.toLocaleDateString('en-CA'),
          endDate: today.toLocaleDateString('en-CA'),
          period: 'today'
        };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday.toLocaleDateString('en-CA'),
          endDate: yesterday.toLocaleDateString('en-CA'),
          period: 'yesterday'
        };
      }
      case 'thisMonth': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: firstDay.toLocaleDateString('en-CA'),
          endDate: lastDay.toLocaleDateString('en-CA'),
          period: 'month'
        };
      }
      case 'thisYear': {
        const firstDay = new Date(now.getFullYear(), 0, 1);
        const lastDay = new Date(now.getFullYear(), 11, 31);
        return {
          startDate: firstDay.toLocaleDateString('en-CA'),
          endDate: lastDay.toLocaleDateString('en-CA'),
          period: 'year'
        };
      }
      case 'custom':
        return {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          period: 'custom'
        };
      default:
        return { period };
    }
  };

  const loadAllData = async () => {
    try {
      setInitialLoading(true);
      const dateRange = getDateRangeFromFilter();
      const response = await getDashboardData(dateRange);

      if (response?.success && response?.data) {
        const data = response.data as SalesDashboardData;

        // Update summary
        setSummary({
          todaySales: data.summary?.totalSales || 0,
          todayRevenue: data.summary?.totalRevenue || 0,
          yesterdaySales: 0,
          yesterdayRevenue: 0,
          weekSales: data.summary?.totalSales || 0,
          weekRevenue: data.summary?.totalRevenue || 0,
          monthSales: data.summary?.totalSales || 0,
          monthRevenue: data.summary?.totalRevenue || 0,
          growthRate: data.growth?.revenueGrowth || 0,
        });

        // Update stats
        setStats(prevStats => ({
          ...prevStats,
          totalSales: data.summary?.totalSales || 0,
          totalRevenue: data.summary?.totalRevenue || 0,
          averageOrderValue: data.summary?.avgOrderValue || 0,
          totalDiscount: 0,
          totalTax: 0,
        }));

        // Update payment method breakdown
        if (data.paymentMethodBreakdown && data.paymentMethodBreakdown.length > 0) {
          const paymentBreakdown = {
            cash: 0,
            card: 0,
            bankTransfer: 0,
            mobilePayment: 0,
            credit: 0,
          };

          data.paymentMethodBreakdown.forEach((pm) => {
            const method = pm.method?.toLowerCase();
            if (method === 'cash') paymentBreakdown.cash = pm.count;
            else if (method === 'card') paymentBreakdown.card = pm.count;
            else if (method === 'bank_transfer') paymentBreakdown.bankTransfer = pm.count;
            else if (method === 'mobile_payment') paymentBreakdown.mobilePayment = pm.count;
            else if (method === 'credit') paymentBreakdown.credit = pm.count;
          });

          setStats(prevStats => ({
            ...prevStats,
            paymentMethodBreakdown: paymentBreakdown,
          }));
        }

        // Set recent sales as sales list
        if (data.recentSales && data.recentSales.length > 0) {
          const mappedSales: Sale[] = data.recentSales.map((sale) => ({
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            locationId: '0',
            location: { id: '0', name: sale.locationName || 'Unknown', locationCode: '', locationType: 'BRANCH' },
            customerName: sale.customerName,
            customerPhone: '',
            items: [],
            subtotal: sale.totalAmount,
            discount: 0,
            tax: 0,
            totalAmount: sale.totalAmount,
            paymentMethod: (sale.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
            paymentStatus: sale.paymentStatus as PaymentStatus,
            soldBy: '',
            soldByStaffId: 0,
            status: SaleStatus.COMPLETED,
            saleDate: sale.date,
            createdAt: sale.date,
            updatedAt: sale.date,
          }));
          setSales(mappedSales);
        }
      }
    } catch {
      toast.error('Failed to load sales data');
      // console.error('Error loading sales data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadTransactions = async (page = 1, limit = itemsPerPage, search = searchQuery) => {
    setTransactionsLoading(true);
    try {
      const dateRange = getDateRangeFromFilter();
      const response = await getSales({
        status: selectedStatus ? (selectedStatus as 'PENDING' | 'COMPLETED' | 'PARTIAL_REFUND' | 'REFUNDED' | 'CANCELLED') : undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        page,
        limit,
        ...(search?.trim() ? { search: search.trim() } : {}),
      });
      if (response?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = response.data as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: Sale[] = (data.data || []).map((s: any) => ({
          id: s.id,
          invoiceNumber: s.saleNumber || s.invoiceNumber || '',
          locationId: s.locationId || '',
          location: s.location ? {
            id: s.location.id,
            name: s.location.name,
            locationCode: s.location.location_code || s.location.locationCode || '',
            locationType: 'BRANCH' as const,
          } : undefined,
          customerName: s.customerName || 'Walk-in',
          customerPhone: s.customerPhone || '',
          items: s.saleItems || [],
          subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount || 0),
          tax: Number(s.tax || 0),
          totalAmount: Number(s.totalAmount || 0),
          paymentMethod: (s.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          paymentStatus: s.paymentStatus as PaymentStatus,
          soldBy: s.soldBy?.name || '',
          soldByStaffId: 0,
          status: s.status as SaleStatus,
          saleDate: s.createdAt || '',
          createdAt: s.createdAt || '',
          updatedAt: s.updatedAt || '',
        }));
        setSales(items);
        setSalesTotal(data.pagination?.total ?? 0);
        setSalesTotalPages(data.pagination?.pages ?? 1);
      }
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleTransactionPageChange = (page: number) => {
    setCurrentPage(page);
    loadTransactions(page, itemsPerPage);
  };

  const handleTransactionLimitChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
    loadTransactions(1, limit);
  };

  // Fetch initial data
  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load transactions when switching to or filtering within the transactions tab
  useEffect(() => {
    if (activeTab === 'transactions') {
      setCurrentPage(1);
      loadTransactions(1, itemsPerPage, searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedStatus, dateFilter, startDate, endDate, searchQuery]);

  // Load pending when switching to pending tab or when relevant filters change
  useEffect(() => {
    if (activeTab === 'pending') {
      setPendingPage(1);
      loadPendingSales(1, pendingLimit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery, selectedPaymentMethod, selectedStatus, dateFilter, startDate, endDate]);

  // Load WooCommerce sales when switching to that tab or filters change
  useEffect(() => {
    if (activeTab === 'woocommerce') {
      setWooPage(1);
      loadWooSales(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, wooStatusFilter, wooDateFrom, wooDateTo]);

  // Apply local filters (search + payment method) on current page data
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, searchQuery, selectedPaymentMethod]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled || activeTab !== 'dashboard') return;

    const interval = setInterval(() => {
      loadAllData();
      setLastRefreshTime(new Date());
    }, 108000000); // 3 hours

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshEnabled, activeTab]);

  // Reload data when period or dateFilter changes
  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateFilter, startDate, endDate]);

  const applyFilters = () => {
    let filtered = [...sales];

    // Payment method filter (client-side on current page data)
    if (selectedPaymentMethod) {
      filtered = filtered.filter((sale) => sale.paymentMethod === selectedPaymentMethod);
    }

    setFilteredSales(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'transactions') {
        await loadTransactions(currentPage, itemsPerPage);
      } else {
        await loadAllData();
      }
      setLastRefreshTime(new Date());
      toast.success('Data refreshed successfully');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
    toast.success(`Auto-refresh ${!autoRefreshEnabled ? 'enabled' : 'disabled'}`);
  };

  const formatLastRefreshTime = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastRefreshTime.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastRefreshTime.toLocaleTimeString();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedPaymentMethod('');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const transformToOrderData = (data: any): OrderData => {
    return {
      customer: {
        id: data.customerId || 0,
        name: data.customerName || 'Walk-in Customer',
        phone: data.customerPhone || '',
        email: data.customerEmail || '',
      },
      devices: [], // Not applicable for POS sales
      items: (data.items || []).map((item: any) => ({
        id: item.productId,
        name: item.productName,
        price: parseFloat(item.unitPrice || item.price || 0),
        quantity: item.quantity,
      })),
      payment: {
        method: (data.paymentMethod || 'CASH').toLowerCase() as 'cash' | 'card',
        totalAmount: parseFloat(data.totalAmount || 0),
        cashReceived: (data.paymentMethod || 'CASH') === 'CASH' ? parseFloat(data.totalAmount || 0) : undefined,
      },
      paymentMethod: data.paymentMethod || 'CASH',
      discount: parseFloat(data.discount || 0),
      discountType: data.discountType,
      discountReason: data.discountReason,
      notes: data.notes,
      timestamp: data.createdAt || data.saleDate,
    };
  };

  const handleView = async (sale: Sale) => {
    setSaleDetailsModal({ loading: true, data: null });
    try {
      const response = await getSaleById(sale.id);
      if (response?.success && response?.data) {
        const raw = response.data as any;
        // Backend may nest customer / use items|transactions aliases   normalize for the modal.
        const customer =
          raw.customer && typeof raw.customer === 'object' ? raw.customer : null;
        setSaleDetailsModal({
          loading: false,
          data: {
            ...raw,
            invoiceNumber: raw.invoiceNumber || raw.saleNumber || sale.id,
            saleNumber: raw.saleNumber || raw.invoiceNumber || null,
            customerName:
              raw.customerName || customer?.name || (sale as any).customerName || null,
            customerPhone: raw.customerPhone || customer?.phone || null,
            customerEmail: raw.customerEmail || customer?.email || null,
            saleItems: Array.isArray(raw.saleItems)
              ? raw.saleItems
              : Array.isArray(raw.items)
                ? raw.items
                : [],
            salePayments: Array.isArray(raw.salePayments)
              ? raw.salePayments
              : Array.isArray(raw.payments)
                ? raw.payments
                : Array.isArray(raw.transactions)
                  ? raw.transactions
                  : [],
          },
        });
      } else {
        toast.error('Failed to load sale details');
        setSaleDetailsModal(null);
      }
    } catch (error) {
      toast.error('Failed to load sale details');
      console.error('Error loading sale:', error);
      setSaleDetailsModal(null);
    }
  };

  const handleViewPendingItems = async (sale: Sale) => {
    const label = `${(sale as any).invoiceNumber || ''}   ${(sale as any).customerName || 'Walk-in'}`;
    setPendingItemsModal({ label, loading: true, items: [] });
    try {
      const res = await getSaleById(sale.id);
      if (res?.success && res?.data) {
        const data = res.data as any;
        const items = data.saleItems || data.items || [];
        setPendingItemsModal({ label, loading: false, items });
      } else {
        toast.error('Failed to load sale items');
        setPendingItemsModal(null);
      }
    } catch {
      toast.error('Failed to load sale items');
      setPendingItemsModal(null);
    }
  };

  const handleDownload = async (sale: Sale, format: 'a4' | '80mm' | '58mm') => {
    try {
      await downloadInvoice(sale.id.toString(), { format });
      toast.success(`Invoice downloaded (${format})`);
    } catch (error) {
      toast.error('Failed to download invoice');
      console.error('Download error:', error);
    }
  };

  const handlePrint = async (sale: Sale, format: 'a4' | '80mm' | '58mm') => {
    try {
      await printInvoice(sale.id.toString(), { format });
      toast.success(`Invoice sent to printer (${format})`);
    } catch (error) {
      toast.error('Failed to print invoice');
      console.error('Print error:', error);
    }
  };

  const handleCancel = (sale: Sale) => {
    setSelectedSaleForAction(sale);
    setCancelModalOpen(true);
  };

  const handleDelete = (sale: Sale) => {
    setSelectedSaleForDelete(sale);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSaleForDelete) return;
    const response = await deleteSale(selectedSaleForDelete.id);
    if (response?.success) {
      toast.success('Sale deleted successfully');
      setDeleteModalOpen(false);
      setSelectedSaleForDelete(null);
      await loadAllData();
    }
  };

  const handleRefund = (sale: Sale) => {
    setSelectedSaleForAction(sale);
    setRefundModalOpen(true);
  };

  const handleCancelConfirm = async (saleId: string, reason: string) => {
    const response = await cancelSale(saleId, reason);
    if (response?.success) {
      toast.success('Sale cancelled successfully');
      setCancelModalOpen(false);
      setSelectedSaleForAction(null);
      await loadAllData();
    }
  };

  const handleRefundConfirm = async (saleId: string, refundData: Parameters<typeof createRefund>[1]) => {
    const payload = {
      ...refundData,
      processedById: (refundData as any).processedById || user?.id,
    } as any;
    const response = await createRefund(saleId, payload);
    if (response?.success) {
      toast.success('Refund processed successfully');
      setRefundModalOpen(false);
      setSelectedSaleForAction(null);
      await loadAllData();
    }
  };

  const loadWooSales = async (page = 1) => {
    setWooLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '15');
      if (wooStatusFilter) params.set('status', wooStatusFilter);
      if (wooDateFrom) params.set('startDate', wooDateFrom);
      if (wooDateTo) params.set('endDate', wooDateTo);
      const res = await wooFetch({
        method: 'GET',
        endpoint: `/woocommerce/sales?${params.toString()}`,
        silent: true,
      });
      if (res?.success) {
        setWooSales((res.data as WooSale[]) ?? []);
        setWooPage(res.pagination?.page ?? page);
        setWooTotalPages(res.pagination?.totalPages ?? 1);
        setWooTotal(res.pagination?.total ?? 0);
      }
    } catch {
      toast.error('Failed to load WooCommerce sales');
    } finally {
      setWooLoading(false);
    }
  };

  const openWooPayModal = (sale: WooSale) => {
    setWooPaySale(sale);
    const remaining = Number(sale.balanceAmount ?? sale.totalAmount) || 0;
    setWooPayAmount(remaining > 0 ? String(remaining) : '');
    setWooPayMethod('CASH');
    setWooPayReference('');
    setWooPayModalOpen(true);
  };

  const handleWooPayment = async () => {
    if (!wooPaySale) return;
    const amount = Number(wooPayAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setWooPayLoading(true);
    try {
      const res = await completePendingPayment(wooPaySale.id, {
        paymentMethod: wooPayMethod,
        amount,
        reference: wooPayReference || undefined,
      });
      if (res?.success) {
        toast.success('Payment recorded successfully');
        setWooPayModalOpen(false);
        loadWooSales(wooPage);
      } else {
        toast.error((res as any)?.message ?? 'Failed to record payment');
      }
    } finally {
      setWooPayLoading(false);
    }
  };

  // Bulk payment handlers
  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    const ids = pendingSales.map((s: any) => s.id);
    if (bulkSelected.size === ids.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(ids));
    }
  };

  const openBulkModal = () => { setBulkResult(null); setBulkModal(true); };
  const closeBulkModal = () => { setBulkModal(false); setBulkResult(null); };

  const handleBulkSubmit = async () => {
    if (bulkSelected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const items = Array.from(bulkSelected).map((saleId) => {
        const sale: any = pendingSales.find((s: any) => s.id === saleId);
        const amount = sale ? Number(sale.totalAmount) - Number(sale.paidAmount ?? 0) : 0;
        return { saleId, amount: amount > 0 ? amount : 0, paymentMethod: bulkMethod, referenceNumber: bulkReference || undefined, notes: bulkNotes || undefined };
      });
      const res = await bulkCompletePayments(items);
      if (res?.success || (res as any)?.data) {
        const data = (res as any)?.data ?? res;
        setBulkResult(data);
        setBulkSelected(new Set());
        loadPendingSales();
      } else {
        toast.error((res as any)?.message ?? 'Bulk payment failed');
      }
    } finally {
      setBulkSubmitting(false);
    }
  };

  const loadPendingSales = async (page = pendingPage, limit = pendingLimit) => {
    setPendingLoading(true);
    try {
      const dateRange = getDateRangeFromFilter();
      const response = await getPendingSales({ page, limit, search: searchQuery, paymentMethod: selectedPaymentMethod || undefined, status: selectedStatus || undefined, startDate: dateRange.startDate, endDate: dateRange.endDate });
      if (response?.success && response?.data) {
        // response.data is the service result; rows are in response.data.data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = response.data as any;
        const rows = data.data || [];
        const items: Sale[] = rows.map((s: any) => ({
          id: s.id,
          invoiceNumber: s.saleNumber || s.invoiceNumber || '',
          locationId: s.locationId || '',
          customerName: s.customerName || 'Walk-in',
          customerPhone: s.customerPhone || '',
          items: s.saleItems || s.items || [],
          subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount || 0),
          tax: Number(s.tax || 0),
          totalAmount: Number(s.totalAmount || 0),
          paymentMethod: (s.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          paymentStatus: s.paymentStatus as PaymentStatus,
          soldBy: s.soldBy || '',
          soldByStaffId: s.soldByStaffId || 0,
          status: s.status as SaleStatus,
          saleDate: s.createdAt || s.saleDate || '',
          createdAt: s.createdAt || '',
          updatedAt: s.updatedAt || '',
          paidAmount: Number(s.paidAmount || 0),
          paymentReference: s.paymentReference || '',
          saleChannel: s.saleChannel || 'POS',
        } as Sale & { paidAmount: number }));
        setPendingSales(items);

        // pagination may be returned in response.data.pagination or response.pagination
        const pagination = data.pagination || response.pagination || {};
        setPendingPage(pagination.page || page);
        setPendingLimit(pagination.limit || limit);
        setPendingTotal(pagination.total || 0);
        setPendingTotalPages(pagination.pages || Math.ceil((pagination.total || 0) / (pagination.limit || limit) || 1));
      }
    } catch (err) {
      console.error('Pending load error', err);
      toast.error('Failed to load pending payments');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedPendingSale) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const response = await completePendingPayment(selectedPendingSale.id, {
      paymentMethod: paymentMethodInput as 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'KOKO' | 'MINTPAY' | 'PAYZY',
      amount: Number(paymentAmount),
      reference: paymentReference || undefined,
    });
    if (response?.success) {
      toast.success('Payment recorded successfully');
      setPaymentConfirmedData({
        invoiceNumber: selectedPendingSale.invoiceNumber,
        amount: Number(paymentAmount),
        method: paymentMethodInput,
        reference: (response.data as any)?.referenceNumber ?? paymentReference,
      });
      setPaymentAmount('');
      setPaymentReference('');
      await loadPendingSales();
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  if (initialLoading) {
    return (
      <div className="space-y-6 mx-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-white/30 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-white/30 rounded w-96 animate-pulse"></div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-white/20">
          <div className="flex gap-8 py-4">
            <div className="h-4 bg-white/30 rounded w-24 animate-pulse"></div>
            <div className="h-4 bg-white/30 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        {/* Dashboard Skeleton */}
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2 pb-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Track and analyze sales performance across all branches
          </p>
        </div>

        {/* Auto-refresh controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-gray-500">
            Last updated: {formatLastRefreshTime()}
          </div>
          <button
            onClick={toggleAutoRefresh}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${autoRefreshEnabled
                ? 'bg-green-100/60 text-green-700 hover:bg-green-100/80 backdrop-blur-sm'
                : 'bg-white/30 backdrop-blur-sm text-gray-600 hover:bg-white/50'
              }`}
          >
            Auto-refresh {autoRefreshEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/20 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max" aria-label="Tabs" role="tablist">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`${activeTab === 'dashboard'
                ? 'border-orange-400 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-white/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`${activeTab === 'transactions'
                ? 'border-orange-400 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-white/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <List className="w-4 h-4" />
            Transactions
          </button>
          <button
            onClick={() => { setActiveTab('pending'); loadPendingSales(); }}
            className={`${activeTab === 'pending'
                ? 'border-orange-400 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-white/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Clock className="w-4 h-4" />
            Pending Payments
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${activeTab === 'analytics'
                ? 'border-orange-400 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-white/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('woocommerce')}
            className={`${activeTab === 'woocommerce'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-white/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Globe className="w-4 h-4" />
            WooCommerce
            {wooTotal > 0 && (
              <span className="ml-1 bg-green-100/60 text-green-700 text-xs font-medium px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {wooTotal}
              </span>
            )}
          </button>
        </nav>
      </div>


      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="animate-fadeIn">
          <SalesDashboard />
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Period Selector for Transactions */}
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-orange-600 text-white'
                    : 'bg-white/30 backdrop-blur-sm text-gray-700 hover:bg-white/50 border border-white/40'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Sales Transactions</h2>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Quick Stats Summary */}
          {refreshing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Today's Sales</h3>
                    {summary.growthRate > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{summary.todaySales}</p>
                  <p className="text-sm text-gray-600 mt-1">{formatCurrency(summary.todayRevenue)}</p>
                  <p className={`text-xs mt-2 ${summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.growthRate >= 0 ? '+' : ''}{summary.growthRate.toFixed(1)}% from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-4">This Week</h3>
                  <p className="text-2xl font-bold text-gray-900">{summary.weekSales}</p>
                  <p className="text-sm text-gray-600 mt-1">{formatCurrency(summary.weekRevenue)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-4">This Month</h3>
                  <p className="text-2xl font-bold text-gray-900">{summary.monthSales}</p>
                  <p className="text-sm text-gray-600 mt-1">{formatCurrency(summary.monthRevenue)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-4">Avg Order Value</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Math.round(stats.averageOrderValue))}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Per transaction</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <SalesFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            onReset={handleResetFilters}
          />

          {/* Sales Table */}
          {(refreshing || transactionsLoading) ? (
            <TableSkeleton rows={8} />
          ) : filteredSales.length === 0 && (searchQuery || selectedPaymentMethod) ? (
            <EmptySearchState onReset={handleResetFilters} />
          ) : filteredSales.length === 0 ? (
            <EmptyTableState message="No sales transactions found. Start recording sales to see them here." />
          ) : (
            <SalesTable
              sales={filteredSales}
              onView={handleView}
              onCancel={handleCancel}
              onRefund={handleRefund}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPrint={handlePrint}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={salesTotal}
              totalPages={salesTotalPages}
              onPageChange={handleTransactionPageChange}
              onItemsPerPageChange={handleTransactionLimitChange}
            />
          )}

          {/* Results count */}
          {salesTotal > 0 && (
            <div className="text-sm text-gray-600 text-center">
              Showing {filteredSales.length} of {salesTotal} sales
              <span className="ml-2 text-gray-500">
                | Total Revenue: {formatCurrency(filteredSales.filter(s => s.status === SaleStatus.COMPLETED).reduce((sum, sale) => sum + sale.totalAmount, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Pending Payments</h2>
            <div className="flex items-center gap-2">
              {bulkSelected.size > 0 && (
                <>
                  <span className="text-sm text-gray-600">{bulkSelected.size} selected</span>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-1 h-8 text-xs"
                    onClick={openBulkModal}
                  >
                    Complete All Payments
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkSelected(new Set())}>
                    Clear
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={selectAllPending}>
                {bulkSelected.size === pendingSales.length && pendingSales.length > 0 ? 'Deselect All' : `Select All (${pendingSales.length})`}
              </Button>
              <Button variant="outline" onClick={loadPendingSales} disabled={pendingLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${pendingLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {pendingLoading ? (
            <TableSkeleton rows={5} />
          ) : pendingSales.length === 0 ? (
            <EmptyTableState message="No pending or partial payments found." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/30 backdrop-blur-sm border-b border-white/20">
                      <tr>
                        <th className="px-4 py-3 w-8"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Channel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {pendingSales.map((sale) => (
                        <tr key={sale.id} className={`hover:bg-white/30 transition-colors ${bulkSelected.has(sale.id) ? 'bg-green-100/30 backdrop-blur-sm' : ''}`}>
                          <td className="px-4 py-4 w-8">
                            <button
                              className="text-orange-500 hover:text-orange-700"
                              onClick={() => toggleBulkSelect(sale.id)}
                              title="Select for bulk payment"
                            >
                              {bulkSelected.has(sale.id)
                                ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><polyline points="9 11 12 14 22 4" /></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                              }
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{sale.invoiceNumber}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{sale.paymentReference || ''}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{sale.customerName || 'Walk-in'}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{sale.saleChannel}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/60 text-blue-800 backdrop-blur-sm">
                              {sale.paymentMethod === "CASH" && sale.saleChannel === "COURIER" ? "COD" : sale.paymentMethod}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(sale.totalAmount)}</td>
                          <td className="px-6 py-4 text-sm text-green-700">{formatCurrency(sale.paidAmount ?? 0)}</td>
                          <td className="px-6 py-4 text-sm text-red-600 font-medium">{formatCurrency(sale.totalAmount - (sale.paidAmount ?? 0))}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sale.paymentStatus === 'partial' ? 'bg-yellow-100/60 text-yellow-800 backdrop-blur-sm' : 'bg-red-100/60 text-red-800 backdrop-blur-sm'
                              }`}>
                              {sale.paymentStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Button
                              
                           
                                className="text-gray-600 border-white/40 hover:bg-white/30"
                                onClick={() => handleViewPendingItems(sale)}
                              >
                             <Eye className="w-4 h-4 mr-1" />
                              </Button>
                              <Button
                              
                               
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                onClick={() => { setSelectedPendingSale(sale); setCompletePaymentModalOpen(true); }}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                  {pendingTotal > 0 && (
                    <div className="flex items-center justify-between py shadow-2xl rounded-lg bg-white/30 backdrop-blur-sm py-6 px-4 border border-white/20">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>Rows:</span>
                        <select
                          value={pendingLimit}
                          onChange={(e) => {
                            const newLimit = parseInt(e.target.value, 10);
                            setPendingLimit(newLimit);
                            setPendingPage(1);
                            loadPendingSales(1, newLimit);
                          }}
                          className="border border-white/40 rounded px-2 py-1 bg-white/30 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={30}>30</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>

                        <span className="ml-2">
                          Showing {Math.min((pendingPage - 1) * pendingLimit + 1, pendingTotal)} - {Math.min(pendingPage * pendingLimit, pendingTotal)} of {pendingTotal}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (pendingPage > 1) {
                              const prev = pendingPage - 1;
                              setPendingPage(prev);
                              loadPendingSales(prev, pendingLimit);
                            }
                          }}
                          disabled={pendingPage <= 1}
                          className="px-3 py-1 bg-white/40 backdrop-blur-sm border border-white/40 rounded text-sm disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <span className="text-sm text-gray-700 px-2">Page {pendingPage} / {pendingTotalPages}</span>
                        <button
                          onClick={() => {
                            if (pendingPage < pendingTotalPages) {
                              const next = pendingPage + 1;
                              setPendingPage(next);
                              loadPendingSales(next, pendingLimit);
                            }
                          }}
                          disabled={pendingPage >= pendingTotalPages}
                          className="px-3 py-1 bg-white/40 backdrop-blur-sm border border-white/40 rounded text-sm disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}



          {/* Complete Payment Modal */}
          {completePaymentModalOpen && selectedPendingSale && (
            <div
              className="glass-modal-overlay"
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                setCompletePaymentModalOpen(false);
                setPaymentConfirmedData(null);
                setSelectedPendingSale(null);
              }}
            >
              <div
                className="glass-modal-panel w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {paymentConfirmedData ? (
                  /* Confirmation Screen */
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="bg-green-100/60 backdrop-blur-sm rounded-full p-4">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Payment Confirmed!</h3>
                    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 text-left space-y-3 border border-white/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Invoice</span>
                        <span className="font-semibold text-gray-900">{paymentConfirmedData.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount Paid</span>
                        <span className="font-semibold text-green-700">{formatCurrency(paymentConfirmedData.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Payment Method</span>
                        <span className="font-medium text-gray-900">{paymentConfirmedData.method.replace(/_/g, ' ')}</span>
                      </div>
                      {paymentConfirmedData.reference && (
                        <div className="flex justify-between text-sm border-t border-white/20 pt-3">
                          <span className="text-gray-500">Reference #</span>
                          <span className="font-semibold text-gray-900 font-mono">{paymentConfirmedData.reference}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => {
                        setCompletePaymentModalOpen(false);
                        setSelectedPendingSale(null);
                        setPaymentConfirmedData(null);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  /* Payment Form */
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Invoice: <span className="font-medium">{selectedPendingSale.invoiceNumber}</span></p>
                        <p className="text-sm text-gray-600">Balance Due: <span className="font-semibold text-red-600">{formatCurrency(selectedPendingSale.totalAmount - (selectedPendingSale.paidAmount ?? 0))}</span></p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          placeholder="Enter payment amount"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <select
                          value={paymentMethodInput}
                          onChange={(e) => setPaymentMethodInput(e.target.value as typeof paymentMethodInput)}
                          className="w-full border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="KOKO">Koko</option>
                          <option value="MINTPAY">MintPay</option>
                          <option value="PAYZY">Payzy</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="w-full border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          placeholder="Bank ref, cheque #, transaction ID..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setCompletePaymentModalOpen(false);
                          setSelectedPendingSale(null);
                          setPaymentAmount('');
                          setPaymentReference('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={handleCompletePayment}
                        disabled={!paymentAmount || Number(paymentAmount) <= 0}
                      >
                        Confirm Payment
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="animate-fadeIn">
          <OrgUnifiedSalesAnalyticsDashboard />
        </div>
      )}

      {/* WooCommerce Sales Tab */}
      {activeTab === 'woocommerce' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                WooCommerce Sales
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Orders from your WooCommerce store captured automatically via webhook
              </p>
            </div>
            <button
              onClick={() => loadWooSales(wooPage)}
              disabled={wooLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/40 text-sm text-gray-600 hover:bg-white/30 backdrop-blur-sm disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${wooLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Status</label>
              <select
                value={wooStatusFilter}
                onChange={(e) => setWooStatusFilter(e.target.value)}
                className="border border-white/40 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">From</label>
              <input type="date" value={wooDateFrom} onChange={(e) => setWooDateFrom(e.target.value)}
                className="border border-white/40 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">To</label>
              <input type="date" value={wooDateTo} onChange={(e) => setWooDateTo(e.target.value)}
                className="border border-white/40 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            {(wooStatusFilter || wooDateFrom || wooDateTo) && (
              <button
                onClick={() => { setWooStatusFilter(''); setWooDateFrom(''); setWooDateTo(''); }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-white/40 rounded-lg hover:bg-white/30 backdrop-blur-sm transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Summary stats bar */}
          {!wooLoading && wooTotal > 0 && (
            <div className="flex items-center gap-4 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm">
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{wooTotal}</span> total orders
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">
                Revenue this page:{' '}
                <span className="font-semibold text-green-700">
                  {wooSales.filter(s => s.status === 'COMPLETED').reduce((sum, s) => sum + Number(s.totalAmount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          )}

          {/* Table */}
          {wooLoading ? (
            <TableSkeleton rows={8} />
          ) : wooSales.length === 0 ? (
            <EmptyTableState message="No WooCommerce sales found. Orders will appear here once they are processed via webhook or manual import." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/30 backdrop-blur-sm border-b border-white/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {wooSales.map((sale) => {
                        const payColors: Record<string, string> = {
                          COMPLETED: 'bg-green-100/60 text-green-700 backdrop-blur-sm',
                          PENDING: 'bg-yellow-100/60 text-yellow-700 backdrop-blur-sm',
                          PARTIAL: 'bg-blue-100/60 text-blue-700 backdrop-blur-sm',
                          REFUNDED: 'bg-orange-100/60 text-orange-700 backdrop-blur-sm',
                        };
                        const statusColors: Record<string, string> = {
                          COMPLETED: 'bg-emerald-100/60 text-emerald-700 backdrop-blur-sm',
                          CANCELLED: 'bg-red-100/60 text-red-700 backdrop-blur-sm',
                          REFUNDED: 'bg-orange-100/60 text-orange-700 backdrop-blur-sm',
                          DRAFT: 'bg-yellow-100/60 text-yellow-700 backdrop-blur-sm',
                          PENDING: 'bg-yellow-100/60 text-yellow-700 backdrop-blur-sm',
                        };
                        return (
                          <tr key={sale.id} className="hover:bg-white/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-semibold text-gray-800">{sale.saleNumber}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-gray-800 font-medium text-xs truncate max-w-35">
                                {sale.customerName || <span className="text-gray-400 italic">Guest</span>}
                              </p>
                              {sale.customerEmail && (
                                <p className="text-gray-400 text-xs truncate max-w-35">{sale.customerEmail}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {sale.saleItems?.length ?? 0} item{(sale.saleItems?.length ?? 0) !== 1 ? 's' : ''}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-900 text-sm">
                                {Number(sale.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                payColors[(sale.paymentStatus || '').toUpperCase()] ?? 'bg-white/30 backdrop-blur-sm text-gray-600'
                              }`}>
                                {(sale.paymentStatus || '').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[(sale.status || '').toUpperCase()] ?? 'bg-white/30 backdrop-blur-sm text-gray-600'
                              }`}>
                                {(sale.status || '').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(sale.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {['PENDING', 'PARTIAL'].includes((sale.paymentStatus || '').toUpperCase()) && !['CANCELLED', 'REFUNDED'].includes((sale.status || '').toUpperCase()) && (
                                <button
                                  onClick={() => openWooPayModal(sale)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                  Add Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {wooTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/20 bg-white/20 backdrop-blur-sm">
                    <span className="text-xs text-gray-500">
                      Page {wooPage} of {wooTotalPages} · {wooTotal} orders
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { const p = wooPage - 1; setWooPage(p); loadWooSales(p); }}
                        disabled={wooPage <= 1 || wooLoading}
                        className="p-1.5 rounded border border-white/40 hover:bg-white/30 disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => { const p = wooPage + 1; setWooPage(p); loadWooSales(p); }}
                        disabled={wooPage >= wooTotalPages || wooLoading}
                        className="p-1.5 rounded border border-white/40 hover:bg-white/30 disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bulk Complete Payments Dialog */}
      <Dialog open={bulkModal} onOpenChange={(o) => { if (!o) closeBulkModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
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
                Complete the outstanding balance for <strong>{bulkSelected.size}</strong> pending sale(s).
                Fully paid sales will be marked <span className="font-semibold text-green-700">COMPLETED</span>.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={bulkMethod}
                  onChange={(e) => setBulkMethod(e.target.value)}
                  className="w-full rounded-md border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'KOKO', 'MINTPAY', 'PAYZY'].map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reference <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={bulkReference}
                  onChange={(e) => setBulkReference(e.target.value)}
                  placeholder="e.g. batch transfer ref"
                  className="w-full rounded-md border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Any notes for this batch"
                  className="w-full rounded-md border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Processing…</>
                  ) : (
                    <>Complete {bulkSelected.size} Payment(s)</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WooCommerce Add Payment Modal */}
      <Dialog open={wooPayModalOpen} onOpenChange={(o) => { if (!o && !wooPayLoading) setWooPayModalOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              Add Payment   {wooPaySale?.saleNumber}
            </DialogTitle>
          </DialogHeader>
          {wooPaySale && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 bg-white/40 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <span>Order Total</span>
                <span className="text-right font-semibold text-gray-900">
                  {Number(wooPaySale.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span>Paid</span>
                <span className="text-right font-semibold text-green-700">
                  {Number(wooPaySale.paidAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span>Balance Due</span>
                <span className="text-right font-semibold text-red-600">
                  {Number(wooPaySale.balanceAmount ?? wooPaySale.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Payment Method</label>
                <select
                  value={wooPayMethod}
                  onChange={(e) => setWooPayMethod(e.target.value as typeof wooPayMethod)}
                  className="w-full border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MINTPAY">MintPay</option>
                  <option value="PAYZY">Payzy</option>
                  <option value="KOKO">Koko</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={wooPayAmount}
                  onChange={(e) => setWooPayAmount(e.target.value)}
                  className="w-full border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  placeholder="Enter amount"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Reference <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={wooPayReference}
                  onChange={(e) => setWooPayReference(e.target.value)}
                  className="w-full border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  placeholder="Transaction ID / Cheque no."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setWooPayModalOpen(false)}
                  disabled={wooPayLoading}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm text-sm text-gray-700 hover:bg-white/50 disabled:opacity-40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWooPayment}
                  disabled={wooPayLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {wooPayLoading ? 'Processing…' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Raw Data Modal */}
      <DataRawModal
        isOpen={isRawModalOpen}
        onClose={() => {
          setIsRawModalOpen(false);
          setRawData(null);
        }}
        data={rawData}
        title="Sale Raw Data"
      />

      {/* Pending Sale Items Dialog */}
      <Dialog open={!!pendingItemsModal} onOpenChange={(o) => { if (!o) setPendingItemsModal(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-orange-500" />
              Sale Items   {pendingItemsModal?.label}
            </DialogTitle>
          </DialogHeader>
          {pendingItemsModal?.loading ? (
            <TableSkeleton rows={4} />
          ) : (pendingItemsModal?.items?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No items found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/20 backdrop-blur-sm">
                    <TableHead className="text-xs font-semibold">#</TableHead>
                    <TableHead className="text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Unit Price</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Discount</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItemsModal!.items.map((item: any, i: number) => (
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
            <button
              className="px-4 py-2 text-sm border border-white/40 rounded-md hover:bg-white/30 backdrop-blur-sm transition-colors"
              onClick={() => setPendingItemsModal(null)}
            >Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Details Modal */}
      <Dialog open={!!saleDetailsModal} onOpenChange={(o) => { if (!o) setSaleDetailsModal(null); }}>
        <DialogContent className="z-[110] w-[95vw] sm:max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-orange-500" />
              Sale Details
              {saleDetailsModal?.data && (
                <span className="text-gray-500 font-normal text-sm ml-1">
                    {String(saleDetailsModal.data.invoiceNumber || saleDetailsModal.data.saleNumber || saleDetailsModal.data.id || '')}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            {saleDetailsModal?.loading ? (
              <TableSkeleton rows={5} />
            ) : saleDetailsModal?.data ? (() => {
              try {
                const d = saleDetailsModal.data;
                const items: any[] = Array.isArray(d.saleItems)
                  ? d.saleItems
                  : Array.isArray(d.items)
                    ? d.items
                    : [];
                const payments: any[] = Array.isArray(d.salePayments)
                  ? d.salePayments
                  : Array.isArray(d.payments)
                    ? d.payments
                    : Array.isArray(d.transactions)
                      ? d.transactions
                      : [];
                const courier = d.courierShipment || d.shipment || null;
                const subtotal = Number(d.subtotal || 0);
                const discount = Number(d.discount || 0);
                const tax = Number(d.tax || 0);
                const total = Number(d.totalAmount || 0);
                const paid = Number(d.paidAmount || 0);
                const balance = total - paid;
                const customerName =
                  d.customerName ||
                  (typeof d.customer === 'object' ? d.customer?.name : null) ||
                  null;
                const customerPhone =
                  d.customerPhone ||
                  (typeof d.customer === 'object' ? d.customer?.phone : null) ||
                  null;
                const customerEmail =
                  d.customerEmail ||
                  (typeof d.customer === 'object' ? d.customer?.email : null) ||
                  null;
                const soldByName =
                  (typeof d.soldBy === 'object' ? d.soldBy?.name : d.soldBy) ||
                  d.soldByName ||
                  null;
                const paymentMethodLabel =
                  typeof d.paymentMethod === 'string' ? d.paymentMethod : ' ';

                const badge = (text: string, color: string) => (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{text}</span>
                );

                const statusColor = (s: string) => {
                  const v = String(s || '').toUpperCase();
                  if (v === 'COMPLETED') return 'bg-green-100/60 text-green-700 backdrop-blur-sm';
                  if (v === 'PENDING' || v === 'PARTIAL') return 'bg-yellow-100/60 text-yellow-700 backdrop-blur-sm';
                  if (v === 'CANCELLED' || v === 'REFUNDED') return 'bg-red-100/60 text-red-700 backdrop-blur-sm';
                  return 'bg-white/30 backdrop-blur-sm text-gray-600';
                };

                const textOrDash = (value: unknown) => {
                  if (value == null || value === '') return ' ';
                  if (typeof value === 'object') return ' ';
                  return String(value);
                };

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Invoice #</p>
                        <p className="font-semibold">{textOrDash(d.invoiceNumber || d.saleNumber)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Date</p>
                        <p className="font-medium">{d.createdAt ? new Date(d.createdAt).toLocaleString() : ' '}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Status</p>
                        {badge(textOrDash(d.status), statusColor(d.status))}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Payment Method</p>
                        <p className="font-medium">{paymentMethodLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Payment Status</p>
                        {badge(textOrDash(d.paymentStatus), statusColor(d.paymentStatus))}
                      </div>
                      {d.paymentReference && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Reference</p>
                          <p className="font-medium">{textOrDash(d.paymentReference)}</p>
                        </div>
                      )}
                      {soldByName && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Sold By</p>
                          <p className="font-medium">{String(soldByName)}</p>
                        </div>
                      )}
                      {d.location?.name && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Location</p>
                          <p className="font-medium">{String(d.location.name)}</p>
                        </div>
                      )}
                    </div>

                    {(customerName || customerPhone || customerEmail) && (
                      <div className="p-4 border border-white/20 bg-white/30 backdrop-blur-sm rounded-lg text-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
                        <p className="font-semibold">{String(customerName || 'Walk-in')}</p>
                        {customerPhone && <p className="text-gray-600">{String(customerPhone)}</p>}
                        {customerEmail && <p className="text-gray-600">{String(customerEmail)}</p>}
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items ({items.length})</p>
                      {items.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 text-center">No items found</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-white/20 bg-white/20 backdrop-blur-sm">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-white/20 backdrop-blur-sm">
                                <TableHead className="text-xs">#</TableHead>
                                <TableHead className="text-xs">Product</TableHead>
                                <TableHead className="text-xs text-right">Qty</TableHead>
                                <TableHead className="text-xs text-right">Unit Price</TableHead>
                                <TableHead className="text-xs text-right">Discount</TableHead>
                                <TableHead className="text-xs text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item: any, i: number) => {
                                const productName =
                                  item.productName ||
                                  item.product?.name ||
                                  ' ';
                                const sku =
                                  typeof item.product?.sku === 'string'
                                    ? item.product.sku
                                    : typeof item.sku === 'string'
                                      ? item.sku
                                      : null;
                                const categoryName =
                                  typeof item.product?.category?.name === 'string'
                                    ? item.product.category.name
                                    : typeof item.category === 'string'
                                      ? item.category
                                      : null;
                                const lineTotal = Number(
                                  item.totalPrice ??
                                    item.subtotal ??
                                    Number(item.unitPrice || 0) * Number(item.quantity || 0),
                                );
                                return (
                                  <TableRow key={item.id || i}>
                                    <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                                    <TableCell className="text-sm">
                                      <div className="font-medium">{String(productName)}</div>
                                      {item.reloadPhone && (
                                        <div className="text-xs text-emerald-700">
                                          Reload · {String(item.reloadPhone)}
                                        </div>
                                      )}
                                      {sku && <div className="text-xs text-gray-400">{sku}</div>}
                                      {categoryName && (
                                        <div className="text-xs text-gray-400">{categoryName}</div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-right">
                                      {Number(item.quantity || 0)}
                                    </TableCell>
                                    <TableCell className="text-sm text-right">
                                      {formatCurrency(Number(item.unitPrice || 0))}
                                    </TableCell>
                                    <TableCell className="text-sm text-right">
                                      {Number(item.discount || item.discountAmount || 0) > 0
                                        ? formatCurrency(Number(item.discount || item.discountAmount || 0))
                                        : ' '}
                                    </TableCell>
                                    <TableCell className="text-sm text-right font-semibold">
                                      {formatCurrency(lineTotal)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <div className="w-64 space-y-1 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span>Discount</span><span>- {formatCurrency(discount)}</span>
                          </div>
                        )}
                        {tax > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Tax</span><span>{formatCurrency(tax)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-1">
                          <span>Total</span><span>{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between text-green-700">
                          <span>Paid</span><span>{formatCurrency(paid)}</span>
                        </div>
                        {balance > 0.01 && (
                          <div className="flex justify-between text-red-600 font-semibold">
                            <span>Balance Due</span><span>{formatCurrency(balance)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {payments.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment History</p>
                        <div className="overflow-x-auto rounded-lg border border-white/20 bg-white/20 backdrop-blur-sm">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-white/20 backdrop-blur-sm">
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Method</TableHead>
                                <TableHead className="text-xs">Reference</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payments.map((p: any, i: number) => (
                                <TableRow key={p.id || i}>
                                  <TableCell className="text-xs">
                                    {(p.createdAt || p.date)
                                      ? new Date(p.createdAt || p.date).toLocaleString()
                                      : ' '}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {textOrDash(p.paymentMethod || p.method)}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-500">
                                    {textOrDash(p.reference || p.referenceNumber || p.transactionId)}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {badge(textOrDash(p.status || 'COMPLETED'), statusColor(p.status || 'COMPLETED'))}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-semibold">
                                    {formatCurrency(Number(p.amount || 0))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {courier && (
                      <div className="p-4 border border-blue-100 bg-blue-50 rounded-lg text-sm">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Courier / Shipment</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(courier.shipmentNumber || courier.shipment_number) && (
                            <div>
                              <p className="text-xs text-gray-400">Shipment #</p>
                              <p className="font-medium">{String(courier.shipmentNumber || courier.shipment_number)}</p>
                            </div>
                          )}
                          {courier.courier?.name && (
                            <div>
                              <p className="text-xs text-gray-400">Courier</p>
                              <p className="font-medium">{String(courier.courier.name)}</p>
                            </div>
                          )}
                          {(courier.recipientName || courier.recipient_name) && (
                            <div>
                              <p className="text-xs text-gray-400">Recipient</p>
                              <p className="font-medium">{String(courier.recipientName || courier.recipient_name)}</p>
                            </div>
                          )}
                          {(courier.recipientPhone || courier.recipient_phone) && (
                            <div>
                              <p className="text-xs text-gray-400">Phone</p>
                              <p className="font-medium">{String(courier.recipientPhone || courier.recipient_phone)}</p>
                            </div>
                          )}
                          {(courier.deliveryAddress || courier.recipient_address) && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-400">Address</p>
                              <p className="font-medium">{String(courier.deliveryAddress || courier.recipient_address)}</p>
                            </div>
                          )}
                          {(courier.trackingNumber || courier.tracking_number) && (
                            <div>
                              <p className="text-xs text-gray-400">Tracking #</p>
                              <p className="font-medium">{String(courier.trackingNumber || courier.tracking_number)}</p>
                            </div>
                          )}
                          {courier.status && (
                            <div>
                              <p className="text-xs text-gray-400">Courier Status</p>
                              {badge(String(courier.status), statusColor(courier.status))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {d.notes && typeof d.notes === 'string' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">Notes</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{d.notes}</p>
                      </div>
                    )}
                  </div>
                );
              } catch (err) {
                console.error('Sale details render error:', err);
                return (
                  <div className="p-6 text-center text-sm text-red-600">
                    Could not display sale details. Please try again or refresh the page.
                  </div>
                );
              }
            })() : null}
          </DialogBody>

          <DialogFooter>
            <button
              className="px-4 py-2 text-sm border border-white/40 rounded-md hover:bg-white/30 backdrop-blur-sm transition-colors"
              onClick={() => setSaleDetailsModal(null)}
            >Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Modal */}
      <BillModal
        isOpen={billModalOpen}
        onClose={() => {
          setBillModalOpen(false);
          setSelectedOrderData(null);
          setSelectedResponseData(null);
        }}
        orderData={selectedOrderData}
        responseData={selectedResponseData}
      />
      <CancelSaleModal
        isOpen={cancelModalOpen}
        onClose={() => { setCancelModalOpen(false); setSelectedSaleForAction(null); }}
        sale={selectedSaleForAction}
        onConfirm={handleCancelConfirm}
      />

      <RefundSaleModal
        isOpen={refundModalOpen}
        onClose={() => { setRefundModalOpen(false); setSelectedSaleForAction(null); }}
        sale={selectedSaleForAction}
        onConfirm={handleRefundConfirm}
      />

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete sale{' '}
            <strong>{(selectedSaleForDelete as any)?.invoiceNumber || selectedSaleForDelete?.id}</strong>?{' '}
            This will also delete all payments, refunds, warranty cards, and shipments. This action cannot be undone.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/40 text-sm font-medium text-gray-700 hover:bg-white/30 backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Delete Permanently
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
