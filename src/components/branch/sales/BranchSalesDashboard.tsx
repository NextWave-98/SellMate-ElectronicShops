/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,  Eye, Download, Printer, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import useBranchSales from '../../../hooks/useBranchSales';
import useSales from '../../../hooks/useSales';
import useJobSheet from '../../../hooks/useJobSheet';
import { DashboardSkeleton, CardSkeleton, TableSkeleton } from '../../common/SkeletonLoader';
import { EmptyTableState } from '../../common/EmptyState';
import type { SalesDashboardData } from '../../../hooks/useSales';
import Pagination from '../../common/Pagination';
import { formatDateTime } from '../../../utils/dateUtils';
import { formatCurrency } from '../../../utils/currency';
import BillModal from '../pos/BillModal';
import ViewJobSheetModal from '../../branch/jobsheets/ViewJobSheetModal';
import type { OrderData } from '../pos/PaymentModal';

interface SaleDetail {
  id: string;
  jobSheetId?: string;
  jobNumber?: string;
  saleNumber?: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  type?: 'JobSheet' | 'POS';
}

interface SalesDetailsResponse {
  sales: SaleDetail[];
  total: number;
}

interface POSSale {
  id: string;
  saleNumber: string;
  customerName: string | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentStatus?: string;
  createdAt: string;
}

type CombinedSale = (SaleDetail & { saleType: 'JOBSHEET' }) | (POSSale & { saleType: 'POS' });

interface CourierSaleItem {
  id: string;
  shipmentNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  totalCharge: number;
  codAmount?: number;
  codEnabled: boolean;
  status: string;
  trackingNumber?: string;
  createdAt: string;
  courier?: { name: string };
}

export default function BranchSalesDashboard() {
  const { getBranchDashboard, getBranchSalesDetails, getBranchCourierShipments } = useBranchSales();
  const { getSaleById, downloadInvoice, printInvoice } = useSales();
  const { createPayment, getJobSheetById, downloadJobsheetCard, printJobSheet } = useJobSheet();
  const [dashboardData, setDashboardData] = useState<SalesDashboardData | null>(null);
  const [salesDetails, setSalesDetails] = useState<SaleDetail[]>([]);
  const [posSales, setPOSSales] = useState<POSSale[]>([]);
  const [courierSales, setCourierSales] = useState<CourierSaleItem[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'jobsheet' | 'pos' | 'courier'>('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [jobSheetModalOpen, setJobSheetModalOpen] = useState(false);
  const [selectedOrderData, setSelectedOrderData] = useState<OrderData | null>(null);
  const [selectedResponseData, setSelectedResponseData] = useState<unknown>(null);
  const [selectedJobSheetId, setSelectedJobSheetId] = useState<string | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());

  // Compute filtered sales for handlers (not used in courier view)
  const filteredSalesData = useMemo(() => {
    if (!dashboardData?.recentSales) return [];
    if (viewMode === 'courier') return [];
    
    return viewMode === 'all' 
      ? dashboardData.recentSales
      : dashboardData.recentSales.filter(sale => {
          const isJobSheet = sale.invoiceNumber.startsWith('JS-');
          const isPOS = sale.invoiceNumber.startsWith('SALE-');
          if (viewMode === 'jobsheet') return isJobSheet;
          if (viewMode === 'pos') return isPOS;
          return true;
        });
  }, [dashboardData?.recentSales, viewMode]);

  const loadAllData = async (page = currentPage, limit = itemsPerPage) => {
    try {
      setLoading(true);
      const [dashboardResponse, detailsResponse, courierResponse] = await Promise.all([
        getBranchDashboard({ period }),
        getBranchSalesDetails({ page, limit }),
        getBranchCourierShipments(),
      ]);

      if (dashboardResponse?.success && dashboardResponse?.data) {
        setDashboardData(dashboardResponse.data as SalesDashboardData);
      }

      // Load sales details (contains both JobSheet and POS sales from backend)
      if (detailsResponse?.success && detailsResponse?.data) {
        const responseData = detailsResponse.data as SalesDetailsResponse;
        const allSales = responseData.sales || [];
        const total = responseData.total || 0;
        
        // Separate JobSheet and POS sales based on the 'type' field from backend
        const jobSheetSales = allSales.filter(sale => sale.type === 'JobSheet' || !sale.type);
        const posSalesData = allSales.filter(sale => sale.type === 'POS');
        
        setSalesDetails(jobSheetSales.map(sale => ({ ...sale, saleType: 'JOBSHEET' as const })));
        setPOSSales(posSalesData.map(sale => ({
          id: (sale.jobSheetId || sale.jobNumber) as string,
          saleNumber: sale.jobNumber || '',
          customerName: sale.customerName,
          totalAmount: sale.totalAmount,
          paidAmount: sale.paidAmount,
          status: sale.status,
          paymentStatus: '', // Not available in this response
          createdAt: sale.createdAt,
        })));
        
        // Set pagination
        setTotalItems(total);
        setTotalPages(Math.ceil(total / limit));
      }

      // Load courier shipments for this branch
      if (courierResponse?.success && courierResponse?.data) {
        const shipments = ((courierResponse.data as any).shipments || []).map((s: any) => ({
          id: s.id,
          shipmentNumber: s.shipment_number || s.shipmentNumber,
          recipientName: s.recipient_name || s.recipientName,
          recipientPhone: s.recipient_phone || s.recipientPhone,
          recipientAddress: s.recipient_address || s.recipientAddress,
          recipientCity: s.recipient_city || s.recipientCity,
          totalCharge: parseFloat(s.total_charge || s.totalCharge) || 0,
          codAmount: parseFloat(s.cod_amount || s.codAmount) || 0,
          codEnabled: s.cod_enabled ?? s.codEnabled ?? false,
          status: s.status,
          trackingNumber: s.tracking_number || s.trackingNumber,
          createdAt: s.created_at || s.createdAt,
          courier: s.courier,
        }));
        setCourierSales(shipments);
      }
    } catch (error) {
      toast.error('Failed to load branch sales data');
      console.error('Error loading branch sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, currentPage, itemsPerPage]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadAllData();
      setLastRefreshTime(new Date());
    }, 10800000); // 3 hours

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshEnabled, period]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
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

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const transformToOrderData = (data: any): OrderData => {
    return {
      customer: {
        id: data.customerId,
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
      },
      devices: [], // Not applicable for POS sales
      items: (data.items || []).map((item: any) => ({
        id: item.productId,
        name: item.productName,
        price: parseFloat(item.unitPrice || 0),
        quantity: item.quantity,
      })),
      payment: {
        method: (data.paymentMethod || 'CASH').toLowerCase() as 'cash' | 'card',
        totalAmount: parseFloat(data.totalAmount || 0),
        cashReceived: (data.paymentMethod || 'CASH') === 'CASH' ? parseFloat(data.paidAmount || 0) : undefined,
      },
      paymentMethod: data.paymentMethod || 'CASH',
      discount: parseFloat(data.discount || 0),
      discountType: data.discountType,
      discountReason: data.discountReason,
      notes: data.notes,
      timestamp: data.createdAt,
    };
  };

  const handleViewBill = async (sale: any) => {
    const isJobSheet = sale.invoiceNumber.startsWith('JS-');
    const saleId = isJobSheet ? sale.id : sale.id; // For JobSheets, id should be jobSheetId

    if (isJobSheet) {
      try {
        const response = await getJobSheetById(saleId);
        if (response?.success && response?.data) {
          setSelectedJobSheetId(saleId);
          setJobSheetModalOpen(true);
        } else {
          toast.error('Failed to load JobSheet details');
        }
      } catch (error) {
        toast.error('Failed to load JobSheet details');
        console.error('Error loading JobSheet:', error);
      }
    } else {
      try {
        const response = await getSaleById(saleId);
        if (response?.success && response?.data) {
          const orderData = transformToOrderData(response.data);
          setSelectedOrderData(orderData);
          setSelectedResponseData(response.data);
          setBillModalOpen(true);
        } else {
          toast.error('Failed to load bill details');
        }
      } catch (error) {
        toast.error('Failed to load bill details');
        console.error('Error loading bill:', error);
      }
    }
  };

  const handlePostPayment = async (sale: CombinedSale) => {
    if (sale.saleType !== 'JOBSHEET' || !sale.id) {
      toast.error('Invalid sale for payment');
      return;
    }

    // Calculate remaining amount
    const remainingAmount = sale.totalAmount - sale.paidAmount;
    if (remainingAmount <= 0) {
      toast.error('Payment is already completed');
      return;
    }

    try {
      // First, get the JobSheet details to get customerId
      const jobSheetResponse = await getJobSheetById(sale.id);
      if (!jobSheetResponse?.success || !jobSheetResponse?.data) {
        toast.error('Failed to load JobSheet details');
        return;
      }

      const jobSheet = jobSheetResponse.data;
      const customerId = jobSheet.customer?.id || jobSheet.customerId;

      if (!customerId) {
        toast.error('Customer information not found');
        return;
      }

      const paymentData = {
        jobSheetId: sale.id,
        customerId: customerId,
        amount: remainingAmount,
        paymentMethod: 'CASH' as const,
        notes: `Payment for ${sale.jobNumber || sale.saleNumber}`,
      };

      const response = await createPayment(paymentData);
      if (response?.success) {
        toast.success('Payment posted successfully!');
        // Refresh the data
        loadAllData();
      } else {
        toast.error('Failed to post payment');
      }
    } catch (error) {
      toast.error('Failed to post payment');
      console.error('Error posting payment:', error);
    }
  };

  const handleDownloadBill = async (sale: any) => {
    try {
      const isJobSheet = sale.invoiceNumber.startsWith('JS-');
      if (isJobSheet) {
        // For JobSheets, we need the jobSheet ID, which might be different from sale.id
        // Let's assume the sale.id is the jobSheetId for JobSheets
        await downloadJobsheetCard(sale.id, { includeTerms: true, includeConditions: true });
      } else {
        // For POS sales
        await downloadInvoice(sale.id);
      }
      toast.success('Bill download started');
    } catch (error) {
      toast.error('Failed to download bill');
      console.error('Download error:', error);
    }
  };

  const handlePrintBill = async (sale: any) => {
    try {
      const isJobSheet = sale.invoiceNumber.startsWith('JS-');
      if (isJobSheet) {
        // For JobSheets
        await printJobSheet(sale.id, { copies: 1, includeTerms: true, includeConditions: true });
      } else {
        // For POS sales
        await printInvoice(sale.id);
      }
      toast.success('Bill sent to printer');
    } catch (error) {
      toast.error('Failed to print bill');
      console.error('Print error:', error);
    }
  };

  const handleSelectAllSales = (checked: boolean) => {
    if (checked) {
      const allSaleIds = filteredSalesData.map(sale => sale.id);
      setSelectedSales(new Set(allSaleIds));
    } else {
      setSelectedSales(new Set());
    }
  };

  const handleSelectSale = (saleId: string, checked: boolean) => {
    const newSelectedSales = new Set(selectedSales);
    if (checked) {
      newSelectedSales.add(saleId);
    } else {
      newSelectedSales.delete(saleId);
    }
    setSelectedSales(newSelectedSales);
  };

  const handleViewSelectedSale = () => {
    const selectedSaleIds = Array.from(selectedSales);
    if (selectedSaleIds.length === 1) {
      const selectedSale = filteredSalesData.find(sale => sale.id === selectedSaleIds[0]);
      if (selectedSale) {
        handleViewBill(selectedSale);
        setSelectedSales(new Set()); // Clear selection after action
      }
    }
  };

  const handleDownloadSelectedSale = () => {
    const selectedSaleIds = Array.from(selectedSales);
    if (selectedSaleIds.length === 1) {
      const selectedSale = filteredSalesData.find(sale => sale.id === selectedSaleIds[0]);
      if (selectedSale) {
        handleDownloadBill(selectedSale);
        setSelectedSales(new Set()); // Clear selection after action
      }
    }
  };

  const handlePrintSelectedSale = () => {
    const selectedSaleIds = Array.from(selectedSales);
    if (selectedSaleIds.length === 1) {
      const selectedSale = filteredSalesData.find(sale => sale.id === selectedSaleIds[0]);
      if (selectedSale) {
        handlePrintBill(selectedSale);
        setSelectedSales(new Set()); // Clear selection after action
      }
    }
  };

  const clearSelection = () => {
    setSelectedSales(new Set());
  };

  if (loading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Branch Sales</h1>
          <p className="text-sm text-gray-500 mt-1">View your branch performance and sales data</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last updated: {formatLastRefreshTime()}
          </span>
          <button
            onClick={toggleAutoRefresh}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              autoRefreshEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* View Mode Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'jobsheet', 'pos', 'courier'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mode === 'all' ? 'All Sales' : mode === 'jobsheet' ? 'Repairs (JobSheet)' : mode === 'pos' ? 'Direct Sales (POS)' : 'Courier Sales'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {refreshing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Total Sales */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {(() => {
                    if (viewMode === 'all') return dashboardData?.summary?.totalSales || 0;
                    const filteredSales = dashboardData?.recentSales?.filter(sale => {
                      if (viewMode === 'jobsheet') return sale.invoiceNumber.startsWith('JS-');
                      if (viewMode === 'pos') return sale.invoiceNumber.startsWith('SALE-');
                      return true;
                    }) || [];
                    return filteredSales.length;
                  })()}
                </p>
                {dashboardData?.growth?.salesGrowth !== undefined && (
                  <div className="flex items-center gap-1">
                    {dashboardData.growth.salesGrowth > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          +{dashboardData.growth.salesGrowth.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">
                          {dashboardData.growth.salesGrowth.toFixed(1)}%
                        </span>
                      </>
                    )}
                    <span className="text-xs text-gray-500 ml-1">vs last period</span>
                  </div>
                )}
              </div>
              <div className="bg-orange-400 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency((() => {
                    if (viewMode === 'all') return dashboardData?.summary?.totalRevenue || 0;
                    const filteredSales = dashboardData?.recentSales?.filter(sale => {
                      if (viewMode === 'jobsheet') return sale.invoiceNumber.startsWith('JS-');
                      if (viewMode === 'pos') return sale.invoiceNumber.startsWith('SALE-');
                      return true;
                    }) || [];
                    return filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
                  })())}
                </p>
                {dashboardData?.growth?.revenueGrowth !== undefined && (
                  <div className="flex items-center gap-1">
                    {dashboardData.growth.revenueGrowth > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          +{dashboardData.growth.revenueGrowth.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">
                          {dashboardData.growth.revenueGrowth.toFixed(1)}%
                        </span>
                      </>
                    )}
                    <span className="text-xs text-gray-500 ml-1">vs last period</span>
                  </div>
                )}
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Avg Order Value */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(dashboardData?.summary?.avgOrderValue || 0)}
                </p>
                {dashboardData?.growth?.aovGrowth !== undefined && (
                  <div className="flex items-center gap-1">
                    {dashboardData.growth.aovGrowth > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          +{dashboardData.growth.aovGrowth.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600">
                          {dashboardData.growth.aovGrowth.toFixed(1)}%
                        </span>
                      </>
                    )}
                    <span className="text-xs text-gray-500 ml-1">vs last period</span>
                  </div>
                )}
              </div>
              <div className="bg-purple-500 p-3 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Top Staff */}
          {/* <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Top Performer</p>
                <p className="text-xl font-bold text-gray-900 mb-1">
                  {dashboardData?.topStaff?.[0]?.staffName || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {dashboardData?.topStaff?.[0]?.salesCount || 0} sales
                </p>
              </div>
              <div className="bg-orange-400 p-3 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div> */}
        </div>
      )}

      {/* Top Products Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
        {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.topProducts.slice(0, 5).map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{product.productName}</p>
                    <p className="text-sm text-gray-600">{product.quantitySold} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                  <p className="text-sm text-green-600">+{formatCurrency(product.profit)} profit</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyTableState />
        )}
      </div>

      {/* Recent Sales / Courier Sales */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">
          {viewMode === 'courier'
            ? 'Courier Sales'
            : `Recent Sales${viewMode !== 'all' ? ` - ${viewMode === 'jobsheet' ? 'Repairs' : 'Direct Sales'}` : ''}`}
        </h3>

        {/* Courier Sales Table */}
        {viewMode === 'courier' ? (
          refreshing ? (
            <TableSkeleton rows={5} />
          ) : courierSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipment #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charge</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COD</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courierSales.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>{shipment.shipmentNumber}</div>
                        {shipment.trackingNumber && (
                          <div className="text-xs text-gray-500">{shipment.trackingNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {shipment.courier?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div>{shipment.recipientName}</div>
                        <div className="text-xs text-gray-500">{shipment.recipientPhone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {shipment.recipientCity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(shipment.totalCharge)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {shipment.codEnabled ? formatCurrency(shipment.codAmount || 0) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          shipment.status === 'DELIVERED'
                            ? 'bg-green-100 text-green-800'
                            : shipment.status === 'IN_TRANSIT' || shipment.status === 'OUT_FOR_DELIVERY'
                            ? 'bg-blue-100 text-blue-800'
                            : shipment.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {shipment.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(shipment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyTableState />
          )
        ) : (
          refreshing ? (
            <TableSkeleton rows={5} />
          ) : dashboardData?.recentSales && dashboardData.recentSales.length > 0 ? (() => {
            const hasSelection = selectedSales.size > 0;
            const isAllSelected = filteredSalesData.length > 0 && selectedSales.size === filteredSalesData.length;

            return filteredSalesData.length > 0 ? (
              <div className="overflow-x-auto">
                {/* Action Menu - Shows when rows are selected */}
                {hasSelection && (
                  <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-orange-900">
                          {selectedSales.size} {selectedSales.size === 1 ? 'sale' : 'sales'} selected
                        </span>
                        <button
                          onClick={clearSelection}
                          className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Clear selection
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedSales.size === 1 && (
                          <button
                            onClick={handleViewSelectedSale}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        )}
                        {selectedSales.size === 1 && (
                          <button
                            onClick={handleDownloadSelectedSale}
                            className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                          >
                            <Download className="w-4 h-4 mr-1.5" />
                            Download
                          </button>
                        )}
                        {selectedSales.size === 1 && (
                          <button
                            onClick={handlePrintSelectedSale}
                            className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                          >
                            <Printer className="w-4 h-4 mr-1.5" />
                            Print
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => handleSelectAllSales(e.target.checked)}
                          className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-400"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSalesData.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSales.has(sale.id)}
                            onChange={(e) => handleSelectSale(sale.id, e.target.checked)}
                            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-400"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {sale.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {sale.locationName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            sale.paymentStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDateTime(sale.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyTableState />
            );
          })() : (
            <EmptyTableState />
          )
        )}
      </div>

   
      <BillModal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        orderData={selectedOrderData}
        responseData={selectedResponseData}
      />

      {jobSheetModalOpen && selectedJobSheetId && (
        <ViewJobSheetModal
          isOpen={jobSheetModalOpen}
          onClose={() => {
            setJobSheetModalOpen(false);
            setSelectedJobSheetId(null);
          }}
          jobSheetId={selectedJobSheetId}
        />
      )}
    </div>
  );
}
