/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
// import useJobSheet, { type JobSheet } from '../../hooks/useJobSheet';
import useCustomer from '../../hooks/useCustomer';
import useSales from '../../hooks/useSales';
import useBranchSales from '../../hooks/useBranchSales';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Truck,
  RotateCcw,
  Download,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { buildPeriodFilters, getDashboardPeriodLabel, getSalesPeriodLabel } from '../../utils/dashboardPeriod';
import DashboardPeriodSelector from '../../components/common/DashboardPeriodSelector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useReports } from '../../hooks/useReports';
import { ReportPeriod } from '../../types/reports.types';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

interface DashboardStats {
  sales: { total: number; change: string };
  orders: { total: number; change: string };
  customers: { total: number; change: string };
  products: { total: number; change: string };
  todaySales: number;
  monthSales: number;
  avgOrderValue: number;
  totalTransactions: number;
}

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  category: string;
  productId: string;
}

const BranchDashboardPage = () => {
  const { branchCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasCourierAccess } = usePermissions();
  const canViewCourier = hasCourierAccess();

  // Hooks
  const { getDashboardStats, getLowStockItems } = useInventory();
  // const { getJobSheets, getJobSheetStats } = useJobSheet();
  const { getCustomerStats } = useCustomer();
  const { getBranchDashboard, getBranchEnhancedDashboard } = useSales();
  const { getBranchCourierStats } = useBranchSales();
  const { downloadBranchStaffReport } = useReports();

  const [statsPeriod, setStatsPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);
  // Electronics focus: courier details collapsed by default
  const [showCourierDetails, setShowCourierDetails] = useState(false);

  // State
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats>({
    sales: { total: 0, change: '+0%' },
    orders: { total: 0, change: '+0%' },
    customers: { total: 0, change: '+0%' },
    products: { total: 0, change: '+0%' },
    todaySales: 0,
    monthSales: 0,
    avgOrderValue: 0,
    totalTransactions: 0,
  });
  // const [recentOrders, setRecentOrders] = useState<JobSheet[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [enhancedDashboardData, setEnhancedDashboardData] = useState<{
    todaySales: {
      jobsheetSales: number;
      posSales: number;
      totalSales: number;
      jobsheetCount: number;
      posCount: number;
    };
    productsCount: number;
    recentJobsheets: Array<{
      id: string;
      jobNumber: string;
      customerName: string;
      amount: number;
      status: string;
      createdAt: string;
    }>;
    recentPosSales: Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      totalAmount: number;
      paymentStatus: string;
      createdAt: string;
    }>;
  } | null>(null);
  const [courierStats, setCourierStats] = useState<{
    total: number;
    pending: number;
    pendingPickup: number;
    pickedUp: number;
    inTransit: number;
    outForDelivery: number;
    delivered: number;
    returned?: number;
    failedDelivery: number;
    returnedToSender: number;
    cancelled: number;
    onHold: number;
    successRate: number;
    returnRate: number;
    cod?: {
      totalShipments: number;
      totalAmount: number;
      collectedAmount: number;
      pendingAmount: number;
    };
    staffPerformance: Array<{
      userId: string;
      userName: string;
      total: number;
      delivered: number;
      returned: number;
      cancelled: number;
      successRate: number;
      codAmount: number;
    }>;
    recentShipments: Array<{
      id: string;
      shipment_number: string;
      recipient_name: string;
      tracking_number: string;
      declared_value: string;
      status: string;
      created_at: string;
      notes?: string;
      createdAt: string;
    }>;
  } | null>(null);

  useEffect(() => {
    if (user?.locationId || user?.branchId) {
      loadDashboardData();
    }
  }, [user?.locationId, user?.branchId, statsPeriod, customStartDate, customEndDate]);

  const loadDashboardData = async () => {
    if (statsPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const userLocationId = user?.locationId || user?.branchId;
      const periodFilters = buildPeriodFilters(statsPeriod, customStartDate, customEndDate);
      const salesPeriodFilters = periodFilters as {
        period?: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
        startDate?: string;
        endDate?: string;
      };

      const [
        inventoryStatsRes,
        customerStatsRes,
        posPeriodRes,
        enhancedRes,
        courierRes,
        lowStockRes,
      ] = await Promise.all([
        getDashboardStats(userLocationId || undefined),
        getCustomerStats(userLocationId || undefined),
        getBranchDashboard(salesPeriodFilters),
        getBranchEnhancedDashboard(salesPeriodFilters),
        getBranchCourierStats(periodFilters),
        getLowStockItems(),
      ]);

      if (enhancedRes?.data) {
        setEnhancedDashboardData(enhancedRes.data as typeof enhancedDashboardData);
      }

      const courierData = (courierRes?.data as typeof courierStats) || null;
      if (courierData) {
        setCourierStats(courierData);
      }

      const inventoryStats = (inventoryStatsRes?.data as any) || {};
      const customerStats = (customerStatsRes?.data as any) || {};
      const posPeriodStats = (posPeriodRes?.data as any) || {};

      const posSales = posPeriodStats.summary?.totalRevenue || 0;
      const posOrders = posPeriodStats.summary?.totalSales || 0;
      // Electronics shop focus: POS figures are primary; courier COD is only a fallback
      const totalOrders = posOrders || (courierData?.total ?? 0);
      const totalSales = posSales || ((courierData as any)?.cod?.totalAmount ?? 0);

      setDashboardData({
        sales: { total: totalSales, change: '+0%' },
        orders: { total: totalOrders, change: '+0%' },
        customers: { total: customerStats.total || 0, change: `+${customerStats.active || 0}` },
        products: { total: inventoryStats.totalItems || 0, change: `${inventoryStats.totalItems || 0}` },
        todaySales: totalSales,
        monthSales: totalSales,
        avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
        totalTransactions: totalOrders,
      });

      if (lowStockRes?.data) {
        const items = Array.isArray(lowStockRes.data) ? lowStockRes.data : (lowStockRes.data as any).items || [];
        const branchItems = items
          .filter((item: any) => (item.locationId || item.branchId) === userLocationId)
          .map((item: any) => ({
            id: item.id,
            name: item.product?.name || 'Unknown Product',
            stock: item.quantity || 0,
            category: item.product?.category?.name || 'Uncategorized',
            productId: item.productId,
          }))
          .slice(0, 4);
        setLowStockItems(branchItems);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'COMPLETED':
  //     case 'DELIVERED':
  //       return 'bg-green-100 text-green-800';
  //     case 'IN_PROGRESS':
  //     case 'QUALITY_CHECK':
  //       return 'bg-orange-100 text-orange-800';
  //     case 'PENDING':
  //       return 'bg-yellow-100 text-yellow-800';
  //     case 'CANCELLED':
  //       return 'bg-red-100 text-red-800';
  //     default:
  //       return 'bg-gray-100 text-gray-800';
  //   }
  // };

  const periodLabel = getDashboardPeriodLabel(statsPeriod);
  const salesPeriodLabel = getSalesPeriodLabel(statsPeriod);

  const handleDownloadStaffReport = async () => {
    if (statsPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Select start and end dates for custom report');
      return;
    }
    setDownloadingReport(true);
    try {
      const periodMap: Record<string, string> = {
        today: ReportPeriod.TODAY,
        month: ReportPeriod.MONTH,
        custom: ReportPeriod.CUSTOM,
      };
      await downloadBranchStaffReport({
        period: (periodMap[statsPeriod] || ReportPeriod.MONTH) as typeof ReportPeriod[keyof typeof ReportPeriod],
        format: 'excel',
        startDate: statsPeriod === 'custom' ? customStartDate : undefined,
        endDate: statsPeriod === 'custom' ? customEndDate : undefined,
      });
      toast.success('Staff report downloaded');
    } catch {
      toast.error('Failed to download staff report');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Electronics shop focus: POS / total sales first, courier COD as fallback
  const periodSalesTotal =
    enhancedDashboardData?.todaySales?.totalSales ??
    (dashboardData.todaySales || (courierStats as any)?.cod?.totalAmount || 0);

  const stats = [
    {
      name: `${salesPeriodLabel} Sales`,
      value: formatCurrency(periodSalesTotal),
      change: dashboardData.sales.change,
      trend: dashboardData.sales.change.startsWith('+') ? 'up' : 'down',
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      changeColor: dashboardData.sales.change.startsWith('+') ? 'text-green-600' : 'text-red-600',
    },
    {
      name: `${periodLabel} Orders`,
      value: dashboardData.orders.total.toString(),
      change: dashboardData.orders.change,
      trend: dashboardData.orders.change.startsWith('+') ? 'up' : 'down',
      icon: ShoppingBag,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      changeColor: dashboardData.orders.change.startsWith('+') ? 'text-blue-600' : 'text-red-600',
    },
    {
      name: 'Customers',
      value: dashboardData.customers.total.toString(),
      change: dashboardData.customers.change,
      trend: 'up',
      icon: Users,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      changeColor: 'text-purple-600',
    },
    // {
    //   name: 'Products',
    //   value: dashboardData.products.total.toString(),
    //   change: dashboardData.products.change,
    //   trend: 'up',
    //   icon: Package,
    //   bgColor: 'bg-orange-50',
    //   iconColor: 'text-orange-600',
    //   changeColor: 'text-orange-600',
    // },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1e3a8a] mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Managing Branch <span className="font-semibold text-[#1e3a8a]">{user?.branch?.name || branchCode}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <DashboardPeriodSelector
              period={statsPeriod}
              onPeriodChange={setStatsPeriod}
              customStartDate={customStartDate}
              onCustomStartDateChange={setCustomStartDate}
              customEndDate={customEndDate}
              onCustomEndDateChange={setCustomEndDate}
            />
            <div className="hidden md:block">
              <div className="bg-[#1e3a8a] text-white px-6 py-3 rounded-lg">
                <p className="text-sm opacity-90">{salesPeriodLabel} Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(periodSalesTotal)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;

          return (
            <Card
              key={stat.name}
              className="p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div className={`flex items-center space-x-1 ${stat.changeColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{stat.change}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </Card>
          );
        })}
      </div>

       {/* Courier summary (collapsed by default — electronics shop focus) */}
      {canViewCourier && courierStats && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 p-2 rounded-lg"><Truck className="w-4 h-4 text-gray-500" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Courier Shipments</p>
                <p className="text-xs text-gray-400">
                  {courierStats.total} shipments · {(courierStats.successRate ?? 0).toFixed(1)}% success ({periodLabel})
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowCourierDetails(!showCourierDetails)}>
              {showCourierDetails ? 'Hide details' : 'Show details'}
            </Button>
          </div>
        </Card>
      )}

      {canViewCourier && courierStats && showCourierDetails && (
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Courier Shipments</h2>
                <p className="text-xs text-gray-500">{periodLabel} — success rate & parcel metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadStaffReport}
                disabled={downloadingReport}
                className="text-xs gap-1"
              >
                <Download className={`w-3.5 h-3.5 ${downloadingReport ? 'animate-pulse' : ''}`} />
                {downloadingReport ? 'Downloading…' : 'Download Report'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/${branchCode}/courier/performance`)}
                className="text-xs"
              >
                Full Report
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate(`/${branchCode}/courier`)}
                className="text-sm text-[#1e3a8a] hover:underline p-0 h-auto"
              >
                <span>View All</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {courierStats.total === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No shipments yet</p>
              <p className="text-xs mt-1">Create your first shipment from the Courier section</p>
            </div>
          ) : (
            <>
              {(() => {
                const dispatched = courierStats.pickedUp + courierStats.inTransit + courierStats.outForDelivery;
                const countable = courierStats.total - courierStats.cancelled;
                const successRate = courierStats.successRate ?? 0;
                const returnRate = courierStats.returnRate ?? 0;
                const successBg = successRate >= 80 ? 'from-green-500 to-emerald-600' : successRate >= 50 ? 'from-yellow-500 to-amber-600' : 'from-red-500 to-rose-600';
                const successBar = successRate >= 80 ? 'bg-green-400' : successRate >= 50 ? 'bg-yellow-400' : 'bg-red-400';
                const returnedCount = courierStats.returned ?? courierStats.returnedToSender ?? 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <div className={`bg-gradient-to-br ${successBg} rounded-2xl p-5 text-white col-span-1`}>
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                        Success Rate ({periodLabel})
                      </p>
                      <p className="text-4xl font-extrabold leading-none mb-2">{successRate.toFixed(1)}%</p>
                      <div className="w-full bg-white/30 rounded-full h-1.5 mb-2">
                        <div className={`h-1.5 rounded-full ${successBar}`} style={{ width: `${Math.min(successRate, 100)}%` }} />
                      </div>
                      <p className="text-xs opacity-70">{courierStats.delivered} delivered of {countable} in period</p>
                    </div>

                    <div className="bg-orange-50 rounded-2xl p-5 flex flex-col justify-between">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Return Rate ({periodLabel})</p>
                      <p className="text-4xl font-extrabold text-orange-700 leading-none mb-2">{returnRate.toFixed(1)}%</p>
                      <div className="w-full bg-orange-100 rounded-full h-1.5 mb-2">
                        <div
                          className={`h-1.5 rounded-full ${
                            returnRate <= 10 ? 'bg-green-500' :
                            returnRate <= 25 ? 'bg-yellow-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(returnRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-semibold w-fit">
                        <RotateCcw className="w-3 h-3 inline mr-0.5" />
                        {returnedCount} Returned
                      </span>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-5 flex flex-col justify-between">
                      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Dispatched</p>
                      <p className="text-4xl font-extrabold text-blue-700 leading-none mb-2">{dispatched}</p>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { label: 'Picked Up', val: courierStats.pickedUp },
                          { label: 'In Transit', val: courierStats.inTransit },
                          { label: 'Out for Del.', val: courierStats.outForDelivery },
                        ].map(({ label, val }) => (
                          <span key={label} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                            {label}: {val}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 flex flex-col justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Shipments</p>
                      <p className="text-4xl font-extrabold text-gray-800 leading-none mb-2">{courierStats.total}</p>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ {courierStats.delivered} Delivered</span>
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">↩ {returnedCount} Returned</span>
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">✕ {courierStats.cancelled} Cancelled</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 mb-3 pt-1 border-t border-gray-100">
                <div className="bg-indigo-50 p-1.5 rounded-lg mt-3">
                  <Truck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-gray-800 leading-tight">Forwarder Status</p>
                  <p className="text-[11px] text-gray-400">Shipment count by status</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
                {[
                  { label: 'Pending', value: courierStats.pending, color: 'text-yellow-700', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
                  { label: 'Pending Pickup', value: courierStats.pendingPickup, color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400' },
                  { label: 'Picked Up', value: courierStats.pickedUp, color: 'text-sky-700', bg: 'bg-sky-50', dot: 'bg-sky-400' },
                  { label: 'In Transit', value: courierStats.inTransit, color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400' },
                  { label: 'Out for Del.', value: courierStats.outForDelivery, color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-400' },
                  { label: 'On Hold', value: courierStats.onHold, color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-400' },
                  { label: 'Failed', value: courierStats.failedDelivery, color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-400' },
                ].map(({ label, value, color, bg, dot }) => (
                  <div key={label} className={`${bg} rounded-xl px-3 py-2 flex items-center gap-2`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <div className="min-w-0">
                      <p className={`text-base font-bold leading-tight ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 truncate">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {courierStats.staffPerformance && courierStats.staffPerformance.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-emerald-50 p-1.5 rounded-lg">
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 leading-tight">Success Rate by Staff</p>
                      <p className="text-[11px] text-gray-400">Delivery performance per staff member</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {courierStats.staffPerformance.map((staff) => {
                      const sr = staff.successRate;
                      const srColor = sr >= 80 ? 'text-green-700' : sr >= 50 ? 'text-yellow-700' : 'text-red-600';
                      const srBar = sr >= 80 ? 'bg-green-500' : sr >= 50 ? 'bg-yellow-400' : 'bg-red-500';
                      const ring = sr >= 80 ? 'border-green-100' : sr >= 50 ? 'border-yellow-100' : 'border-red-100';
                      return (
                        <div key={staff.userId} className={`rounded-2xl border ${ring} bg-white p-4 shadow-sm`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{staff.userName}</p>
                              <p className="text-[11px] text-gray-400">{staff.total} shipments</p>
                            </div>
                            <p className={`text-2xl font-extrabold leading-none shrink-0 ${srColor}`}>{sr.toFixed(1)}%</p>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2.5">
                            <div className={`h-1.5 rounded-full ${srBar}`} style={{ width: `${Math.min(sr, 100)}%` }} />
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ {staff.delivered} Delivered</span>
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">↩ {staff.returned} Returned</span>
                            {staff.cancelled > 0 && (
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">✕ {staff.cancelled} Cancelled</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {courierStats.recentShipments.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Recent Shipments</p>
                  <div className="space-y-2">
                    {courierStats.recentShipments.map((shipment) => (
                      <div key={shipment.id} className="grid grid-cols-3 items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{shipment.shipment_number}</p>
                          <p className="text-xs text-gray-500 truncate">{shipment.recipient_name}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-sm text-green-600 font-semibold whitespace-nowrap">LKR {shipment.declared_value}</p>
                          <p className="text-xs text-gray-400 whitespace-nowrap">{formatTime(shipment.createdAt || shipment.created_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                            shipment.status === 'IN_TRANSIT' || shipment.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-800' :
                            shipment.status === 'PENDING' || shipment.status === 'PENDING_PICKUP' ? 'bg-yellow-100 text-yellow-800' :
                            shipment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {shipment.status.replace(/_/g, ' ')}
                          </span>
                          {shipment.tracking_number && (
                            <p className="text-xs text-gray-400 mt-0.5">{shipment.tracking_number}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

  

      {/* Enhanced Dashboard Sections */}
      {enhancedDashboardData && enhancedDashboardData.todaySales && enhancedDashboardData.recentJobsheets && enhancedDashboardData.recentPosSales && (
        <>
          {/* Today's Sales Breakdown */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{salesPeriodLabel} Sales Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-semibold">POS Sales</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(enhancedDashboardData.todaySales.posSales)}</p>
                <p className="text-xs text-green-600">{enhancedDashboardData.todaySales.posCount} transactions</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-semibold">Total {periodLabel}</p>
                <p className="text-2xl font-bold text-purple-800">{formatCurrency(enhancedDashboardData.todaySales.totalSales)}</p>
                <p className="text-xs text-purple-600">{enhancedDashboardData.todaySales.jobsheetCount + enhancedDashboardData.todaySales.posCount} total</p>
              </div>
            </div>
          </Card>

       

          {/* Recent Jobsheets and POS Sales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Low Stock Alerts - Takes 1 column */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-bold text-gray-900">Low Stock Alerts</h2>
              {lowStockItems.length > 0 && (
                <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded-full">
                  {lowStockItems.length}
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No low stock items</p>
                <p className="text-xs mt-1">All products are well stocked</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-600">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">{item.stock} units</p>
                        <Button 
                          variant="ghost"
                          onClick={() => navigate(`/${branchCode}/products`)}
                          className="text-xs text-[#1e3a8a] hover:underline p-0 h-auto"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/${branchCode}/products`)}
                  className="w-full mt-4 text-[#1e3a8a] border-[#1e3a8a] hover:bg-blue-50"
                >
                  View All Inventory
                </Button>
              </>
            )}
          </div>
        </Card>

            {/* Recent POS Sales */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Recent POS Sales</h2>
                  <Button 
                    variant="ghost"
                    onClick={() => navigate(`/${branchCode}/sales`)}
                    className="text-sm text-[#1e3a8a] hover:underline p-0 h-auto"
                  >
                    <span>View All</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {enhancedDashboardData.recentPosSales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent POS sales</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enhancedDashboardData.recentPosSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{sale.invoiceNumber}</p>
                          <p className="text-xs text-gray-600">{sale.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                            sale.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {sale.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Branch Performance */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-700 rounded-lg shadow-sm border border-gray-200 p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Branch Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-blue-200 text-sm mb-1">{periodLabel}</p>
            <p className="text-2xl font-bold">{formatCurrency(periodSalesTotal)}</p>
            <p className="text-sm text-green-300 mt-1">{dashboardData.sales.change} from last month</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm mb-1">Average Order Value</p>
            <p className="text-2xl font-bold">{formatCurrency(dashboardData.avgOrderValue)}</p>
            <p className="text-sm text-green-300 mt-1">Per transaction</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm mb-1">Total Transactions</p>
            <p className="text-2xl font-bold">{dashboardData.totalTransactions}</p>
            <p className="text-sm text-green-300 mt-1">{dashboardData.orders.change} from last month</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm mb-1">Active Customers</p>
            <p className="text-2xl font-bold">{dashboardData.customers.total}</p>
            <p className="text-sm text-green-300 mt-1">{dashboardData.customers.change} active</p>
          </div>
        </div>
      </div>

     
    </div>
  );
};

export default BranchDashboardPage;
