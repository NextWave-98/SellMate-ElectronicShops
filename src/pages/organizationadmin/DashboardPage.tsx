import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OperationsWidgets from '../../components/superadmin/OperationsWidgets';
import {
  Store,
  Users,
  Package,
  ShoppingCart,
  Wrench,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  DollarSign,
  BarChart3,
  Calendar,
  // Clock,
  // CheckCircle,
  // XCircle,
  RefreshCw,
  ArrowRight,
  UserCircle,
  Shield,
  Truck,
  FileText,
  Bell,
  // MessageSquare,
  Zap,
  // PlusCircle,
  ChevronRight,
  Award,
  ClipboardList,
  PlusCircle as Plus,
  Edit,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DashboardPeriodSelector from '../../components/common/DashboardPeriodSelector';
import toast from 'react-hot-toast';
import { useDashboard, type DashboardStats, type RecentActivity, type TopPerformer } from '../../hooks/useDashboard';
import { useTradeIn } from '../../hooks/useTradeIn';
import useSMS from '../../hooks/useSMS';
import useActivityLog, { type OrgDashboardActivity, type ActivityLogEntry } from '../../hooks/useActivityLog';
import { useBusinessContext } from '../../context/BusinessContext';
import { industryAllowsFeature } from '../../utils/industryFeatures';
import { formatCurrency } from '../../utils/currency';
import { buildPeriodFilters } from '../../utils/dashboardPeriod';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SMSBalanceData {
  success: boolean;
  message: string;
  credits?: number;
  balance?: number;
  topupUrl?: string;
  data?: {
    success?: boolean;
    message?: string;
    balance?: number;
    credits?: number;
    topupUrl?: string;
    data?: {
      status?: string;
      source?: string;
    };
  };
}

const quickActions = [
  { to: '/superadmin/shops/management', icon: Store, label: 'Shops', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100', border: 'border-blue-200' },
  { to: '/superadmin/staff/management', icon: Users, label: 'Staff', color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100', border: 'border-green-200' },
  { to: '/superadmin/stock/management', icon: Package, label: 'Stock', color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100', border: 'border-purple-200' },
  { to: '/superadmin/inventory/monitor', icon: BarChart3, label: 'Inventory', color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100', border: 'border-amber-200' },
  { to: '/superadmin/sales/monitor', icon: ShoppingCart, label: 'Sales', color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100', border: 'border-indigo-200' },
  // { to: '/superadmin/job-sheets/monitor', icon: Wrench, label: 'Job Sheets', color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100', border: 'border-red-200' },
  { to: '/superadmin/customers/management', icon: UserCircle, label: 'Customers', color: 'text-cyan-600', bg: 'bg-cyan-50 hover:bg-cyan-100', border: 'border-cyan-200' },
  { to: '/superadmin/warranty/management', icon: Shield, label: 'Warranty', color: 'text-teal-600', bg: 'bg-teal-50 hover:bg-teal-100', border: 'border-teal-200' },
  { to: '/superadmin/suppliers/management', icon: Truck, label: 'Suppliers', color: 'text-yellow-600', bg: 'bg-yellow-50 hover:bg-yellow-100', border: 'border-yellow-200' },
  { to: '/superadmin/reports', icon: FileText, label: 'Reports', color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100', border: 'border-violet-200' },
  { to: '/superadmin/notifications/dashboard', icon: Bell, label: 'Notifications', color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100', border: 'border-rose-200' },
];

export default function DashboardPage() {
  const { getDashboardStats } = useDashboard();
  const { checkSMSBalance } = useSMS();
  const { getOrgDashboardActivity } = useActivityLog();
  const { industryType } = useBusinessContext();
  const { hasCourierAccess } = usePermissions();
  const canViewCourier = hasCourierAccess();
  const showJobSheets = industryAllowsFeature(industryType, 'jobsheets');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [orgActivity, setOrgActivity] = useState<OrgDashboardActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [smsBalance, setSmsBalance] = useState<SMSBalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [topupUrl, setTopupUrl] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Electronics focus: courier details collapsed by default; trade-in pipeline stats
  const [showCourier, setShowCourier] = useState(false);
  const [tradeStats, setTradeStats] = useState<{ quoted: number; inPipeline: number; readyForSale: number; monthBuybackSpend: number } | null>(null);
  const showTradeIns = industryAllowsFeature(industryType, 'tradein');
  const { getStats: getTradeInStats } = useTradeIn();

  useEffect(() => {
    if (!showTradeIns) return;
    getTradeInStats().then((res) => {
      const data = res?.data as typeof tradeStats;
      if (data) setTradeStats(data);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTradeIns]);

  useEffect(() => {
    loadDashboardData();
    loadSMSBalance();
  }, [statsPeriod, customStartDate, customEndDate]);

  const loadDashboardData = async () => {
    try {
      if (statsPeriod === 'custom' && (!customStartDate || !customEndDate)) {
        return;
      }
      const data = await getDashboardStats(buildPeriodFilters(statsPeriod, customStartDate, customEndDate));
      if (data) {
        setStats(data);
        setRecentActivities(data.recentActivities || []);
        setTopPerformers(data.topPerformers || []);
      }
      // Load org activity independently so it doesn't block main stats
      const activity = await getOrgDashboardActivity(20);
      if (activity) setOrgActivity(activity);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale': return ShoppingCart;
      case 'jobsheet': return Wrench;
      case 'stock': return Package;
      case 'staff': return Users;
      default: return Activity;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-600';
      case 'warning': return 'bg-yellow-100 text-yellow-600';
      case 'error': return 'bg-red-100 text-red-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const getActivityDot = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  // ── Activity Log Helpers ───────────────────────────────────────────────
  const getLogActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return Plus;
      case 'UPDATE': return Edit;
      case 'DELETE': return Trash2;
      default: return Activity;
    }
  };

  const getLogActionStyle = (action: string): { bg: string; text: string; dot: string } => {
    switch (action) {
      case 'CREATE': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
      case 'UPDATE': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
      case 'DELETE': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
    }
  };

  const formatLogTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatModuleName = (module: string) =>
    module.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const loadSMSBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const result = await checkSMSBalance(true);
      const data = result as SMSBalanceData;
      setSmsBalance(data);
      const url = data?.topupUrl ?? data?.data?.topupUrl ?? null;
      if (url) setTopupUrl(url);
    } catch (err) {
      console.error('Failed to load SMS balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  }, [checkSMSBalance]);

  const handleTopUp = () => {
    if (topupUrl) {
      window.open(topupUrl, '_blank');
    }
  };

  const getSMSBalance = () =>
    smsBalance?.credits ?? smsBalance?.balance ?? smsBalance?.data?.credits ?? smsBalance?.data?.balance ?? 0;

  const now = new Date();
  const timeGreeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  const totalJobSheets = stats.pendingJobSheets + stats.inProgressJobSheets + stats.completedJobSheets;
  const jobSheetCompletionRate = totalJobSheets > 0 ? Math.round((stats.completedJobSheets / totalJobSheets) * 100) : 0;
  const periodLabel = stats.periodLabel ?? 'This Month';

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-0.5">{timeGreeting}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">Overview Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <DashboardPeriodSelector
        period={statsPeriod}
        onPeriodChange={setStatsPeriod}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        className="justify-start"
      />

      {/* ── Critical Alerts ── */}
      {stats.criticalAlerts > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm rounded-2xl p-4 text-white shadow-md border border-white/20">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
            <AlertTriangle className="w-24 h-24" />
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {stats.criticalAlerts} Critical Alert{stats.criticalAlerts > 1 ? 's' : ''} Require Attention
              </p>
              <p className="text-xs text-red-100 mt-0.5">
                {[
                  showJobSheets && stats.overdueJobSheets > 0 && `${stats.overdueJobSheets} overdue job sheets`,
                  stats.outOfStockItems > 0 && `${stats.outOfStockItems} out-of-stock items`,
                  stats.lowStockItems > 0 && `${stats.lowStockItems} low stock items`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            {showJobSheets && stats.overdueJobSheets > 0 && (
              <Link to="/superadmin/job-sheets/monitor" className="shrink-0 text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                View All
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Sales */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-md p-5 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-1 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${stats.salesGrowth >= 0 ? 'bg-green-400/30' : 'bg-red-400/30'}`}>
                {stats.salesGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(stats.salesGrowth)}%
              </span>
            </div>
            <p className="text-3xl font-bold">{stats.todaySales}</p>
            <p className="text-xs opacity-80 mt-0.5">Today's Sales</p>
            <p className="text-sm font-semibold mt-2 opacity-90">{formatCurrency(stats.todayRevenue)}</p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 rounded-2xl shadow-md p-5 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-1 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                {stats.profitMargin}% margin
              </span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(stats.monthRevenue)}</p>
            <p className="text-xs opacity-80 mt-0.5">Monthly Revenue</p>
            <p className="text-sm font-semibold mt-2 opacity-90">{stats.monthSales} transactions</p>
          </div>
        </div>

       

        {/* Inventory Value */}
        <div className="bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 rounded-2xl shadow-md p-5 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-1 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
              {stats.lowStockItems > 0 && (
                <span className="text-xs font-semibold bg-yellow-400/30 px-2 py-0.5 rounded-full">
                  {stats.lowStockItems} low
                </span>
              )}
            </div>
            <p className="text-3xl font-bold">{stats.totalStockItems}</p>
            <p className="text-xs opacity-80 mt-0.5">Total Items</p>
            <p className="text-sm font-semibold mt-2 opacity-90">{stats.totalStockItems} total items</p>
          </div>
        </div>
      </div>

      {/* ── Operations (appointments · towing · CRM) ── */}
      <OperationsWidgets />

      {/* ── Electronics Operations (repairs · warranty · trade-ins) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Repair pipeline */}
        {showJobSheets && (
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 p-2 rounded-lg"><Wrench className="w-4 h-4 text-blue-600" /></div>
                  <h3 className="text-base font-semibold text-gray-900">Repair Pipeline</h3>
                </div>
                <Link to="/superadmin/job-sheets/monitor" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats.pendingJobSheets}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Pending</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{stats.inProgressJobSheets}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">In Progress</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{stats.completedJobSheets}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Completed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${jobSheetCompletionRate}%` }} />
                </div>
                <span className="text-xs font-bold text-blue-700">{jobSheetCompletionRate}%</span>
              </div>
              {stats.overdueJobSheets > 0 && (
                <p className="text-xs text-red-600 font-semibold mt-2">⚠ {stats.overdueJobSheets} overdue repair{stats.overdueJobSheets > 1 ? 's' : ''}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trade-in / Buyback pipeline */}
        {showTradeIns && (
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 p-2 rounded-lg"><RotateCcw className="w-4 h-4 text-indigo-600" /></div>
                  <h3 className="text-base font-semibold text-gray-900">Trade-In / Buyback</h3>
                </div>
                <Link to="/superadmin/trade-ins" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{tradeStats?.quoted ?? 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Quoted</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{tradeStats?.inPipeline ?? 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Refurbishing</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{tradeStats?.readyForSale ?? 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">For Sale</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Buyback spend this month: <span className="font-semibold text-gray-800">{formatCurrency(tradeStats?.monthBuybackSpend ?? 0)}</span></p>
            </CardContent>
          </Card>
        )}

        {/* Stock health */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-sky-50 p-2 rounded-lg"><Package className="w-4 h-4 text-sky-600" /></div>
                <h3 className="text-base font-semibold text-gray-900">Stock Health</h3>
              </div>
              <Link to="/superadmin/inventory/monitor" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                Inventory <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-sky-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-sky-700">{stats.totalStockItems}</p>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Items</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{stats.lowStockItems}</p>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Low</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.outOfStockItems}</p>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Out</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/superadmin/warranty/management" className="flex-1 text-center text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg py-2 transition-colors">
                <Shield className="w-3.5 h-3.5 inline mr-1" />Warranty
              </Link>
              <Link to="/superadmin/installments" className="flex-1 text-center text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg py-2 transition-colors">
                Installments
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Courier (collapsed — secondary for electronics shops) ── */}
      {canViewCourier && (<>
      <Card className="rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-2 rounded-lg"><Truck className="w-4 h-4 text-gray-500" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Courier Shipments</p>
              <p className="text-xs text-gray-400">
                {stats.courierTotalShipments} shipments · {(stats.courierSuccessRate ?? 0).toFixed(1)}% success ({periodLabel})
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCourier(!showCourier)}>
            {showCourier ? 'Hide details' : 'Show details'}
          </Button>
        </CardContent>
      </Card>

      {showCourier && (<>
        {/* ── Courier Shipments ── */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Courier Shipments</h3>
                <p className="text-xs text-gray-400">{periodLabel}</p>
              </div>
            </div>
            <Link to="/superadmin/courier/shipments" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {(() => {
            const sr = stats.courierSuccessRate ?? 0;
            const rr = stats.courierReturnRate ?? 0;
            const dispatched = stats.courierPickedUp + stats.courierInTransit + stats.courierOutForDelivery;
            const successBg  = sr >= 80 ? 'from-green-500 to-emerald-600' : sr >= 50 ? 'from-yellow-500 to-amber-600' : 'from-red-500 to-rose-600';
            const successBar = sr >= 80 ? 'bg-green-400' : sr >= 50 ? 'bg-yellow-400' : 'bg-red-400';
            const returnBar  = rr <= 10 ? 'bg-green-400' : rr <= 25 ? 'bg-yellow-400' : 'bg-red-400';
            const countable  = stats.courierTotalShipments - stats.courierCancelled;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div className={`bg-gradient-to-br ${successBg} rounded-2xl p-5 text-white`}>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Success Rate ({periodLabel})</p>
                  <p className="text-4xl font-extrabold leading-none mb-2">{sr.toFixed(1)}%</p>
                  <div className="w-full bg-white/30 rounded-full h-1.5 mb-2">
                    <div className={`h-1.5 rounded-full ${successBar}`} style={{ width: `${Math.min(sr, 100)}%` }} />
                  </div>
                  <p className="text-xs opacity-70">{stats.courierDelivered} delivered of {countable} in period</p>
                </div>

                <div className="bg-orange-50 rounded-2xl p-5 flex flex-col justify-between">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Return Rate ({periodLabel})</p>
                  <p className="text-4xl font-extrabold text-orange-700 leading-none mb-2">{rr.toFixed(1)}%</p>
                  <div className="w-full bg-orange-100 rounded-full h-1.5 mb-2">
                    <div className={`h-1.5 rounded-full ${returnBar}`} style={{ width: `${Math.min(rr, 100)}%` }} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-semibold">
                      <RotateCcw className="w-3 h-3 inline mr-0.5" />
                      {stats.courierReturnedToSender} Returned
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-2xl p-5 flex flex-col justify-between">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Dispatched</p>
                  <p className="text-4xl font-extrabold text-blue-700 leading-none mb-2">{dispatched}</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Picked Up', val: stats.courierPickedUp },
                      { label: 'In Transit', val: stats.courierInTransit },
                      { label: 'Out for Del.', val: stats.courierOutForDelivery },
                    ].map(({ label, val }) => (
                      <span key={label} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                        {label}: {val}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 flex flex-col justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Shipments</p>
                  <p className="text-4xl font-extrabold text-gray-800 leading-none mb-2">{stats.courierTotalShipments}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ {stats.courierDelivered} Delivered</span>
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">↩ {stats.courierReturnedToSender} Returned</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">✕ {stats.courierCancelled} Cancelled</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status Breakdown</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {[
              { label: 'Pending Approval', value: stats.courierPendingApproval ?? 0, color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-400' },
              { label: 'Processing', value: stats.courierProcessing ?? 0, color: 'text-slate-700', bg: 'bg-slate-50', dot: 'bg-slate-400' },
              { label: 'Waiting Pickup', value: stats.courierWaitingPickup ?? 0, color: 'text-teal-700', bg: 'bg-teal-50', dot: 'bg-teal-400' },
              { label: 'Pending', value: stats.courierPendingShipments, color: 'text-yellow-700', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
              { label: 'Pending Pickup', value: stats.courierPendingPickup, color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400' },
              { label: 'Picked Up', value: stats.courierPickedUp, color: 'text-sky-700', bg: 'bg-sky-50', dot: 'bg-sky-400' },
              { label: 'In Transit', value: stats.courierInTransit, color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400' },
              { label: 'Out for Del.', value: stats.courierOutForDelivery, color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-400' },
              { label: 'Rescheduled', value: stats.courierRescheduled ?? 0, color: 'text-fuchsia-700', bg: 'bg-fuchsia-50', dot: 'bg-fuchsia-400' },
              { label: 'On Hold', value: stats.courierOnHold, color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-400' },
              { label: 'Failed', value: stats.courierFailedDelivery, color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-400' },
              { label: 'Returned', value: stats.courierReturnedToSender, color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-400' },
            ].map(({ label, value, color, bg, dot }) => (
              <div key={label} className={`${bg} bg-opacity-60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 border border-white/20`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                <div className="min-w-0">
                  <p className={`text-base font-bold leading-tight ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {stats.courierByBranch && stats.courierByBranch.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-indigo-50 p-2 rounded-lg">
                <Truck className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Courier Success by Branch</h3>
                <p className="text-xs text-gray-400">{periodLabel} — shipments created or updated in period</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Branch</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Total</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Dispatched</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Delivered</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Returned</th>
                    <th className="pb-2 pl-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.courierByBranch.map((b) => {
                    const sr = b.successRate;
                    const barColor = sr >= 80 ? 'bg-green-500' : sr >= 50 ? 'bg-yellow-400' : 'bg-red-500';
                    const textColor = sr >= 80 ? 'text-green-700' : sr >= 50 ? 'text-yellow-700' : 'text-red-600';
                    return (
                      <tr key={b.locationId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-gray-800 truncate max-w-[140px]">{b.name}</p>
                          <p className="text-[10px] font-mono text-gray-400">{b.code}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-gray-700">{b.total}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{b.dispatched}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{b.delivered}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">{b.returned}</span>
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(sr, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${textColor}`}>{sr.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.courierByStaff && stats.courierByStaff.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Staff Success Rate</h3>
                <p className="text-xs text-gray-400">{periodLabel} — courier shipments created or updated in period</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Staff</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Total</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Dispatched</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Delivered</th>
                    <th className="pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Returned</th>
                    <th className="pb-2 pl-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.courierByStaff!.map((s) => {
                    const sr = s.successRate;
                    const barColor = sr >= 80 ? 'bg-green-500' : sr >= 50 ? 'bg-yellow-400' : 'bg-red-500';
                    const textColor = sr >= 80 ? 'text-green-700' : sr >= 50 ? 'text-yellow-700' : 'text-red-600';
                    return (
                      <tr key={s.userId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-gray-800 truncate max-w-[160px]">{s.name}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-gray-700">{s.total}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.dispatched}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.delivered}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">{s.returned}</span>
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(sr, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${textColor}`}>{sr.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      </>)}
      </>)}

      {/* ── Job Sheets (Electronics & General only) ── */}
      {showJobSheets && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-red-50 p-2 rounded-lg">
                  <Wrench className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Job Sheets</h3>
                  <p className="text-xs text-gray-400">{jobSheetCompletionRate}% completion rate</p>
                </div>
              </div>
              <Link to="/superadmin/job-sheets/monitor" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total', value: stats.totalJobSheets, color: 'text-gray-800', bg: 'bg-gray-50' },
                { label: 'Pending', value: stats.pendingJobSheets, color: 'text-yellow-700', bg: 'bg-yellow-50' },
                { label: 'In Progress', value: stats.inProgressJobSheets, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Completed', value: stats.completedJobSheets, color: 'text-green-700', bg: 'bg-green-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} bg-opacity-60 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Overdue', value: stats.overdueJobSheets, color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-400' },
                { label: 'Recent', value: stats.recentJobSheets, color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-400' },
                { label: 'Active', value: stats.pendingJobSheets + stats.inProgressJobSheets, color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-400' },
              ].map(({ label, value, color, bg, dot }) => (
                <div key={label} className={`${bg} bg-opacity-60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 border border-white/20`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <div className="min-w-0">
                    <p className={`text-base font-bold leading-tight ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 truncate">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Secondary Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/superadmin/shops/management" className="group bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 p-5 hover:bg-white/80 hover:shadow-md hover:border-blue-200/60 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 p-2.5 rounded-xl group-hover:bg-blue-100 transition-colors">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalShops}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Total Shops</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">{stats.activeShops} active</span>
            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">{stats.inactiveShops} inactive</span>
          </div>
        </Link>

        <Link to="/superadmin/staff/management" className="group bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 p-5 hover:bg-white/80 hover:shadow-md hover:border-green-200/60 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 p-2.5 rounded-xl group-hover:bg-green-100 transition-colors">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Total Staff</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">{stats.activeStaff} active</span>
            <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded-full">{stats.onLeaveStaff} on leave</span>
          </div>
        </Link>

        <Link to="/superadmin/stock/dashboard" className="group bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 p-5 hover:bg-white/80 hover:shadow-md hover:border-purple-200/60 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-50 p-2.5 rounded-xl group-hover:bg-purple-100 transition-colors">
              <Package className="w-5 h-5 text-purple-500" />
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStockItems}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Stock Items</p>
          <div className="flex gap-2 mt-2">
            {stats.outOfStockItems > 0 && (
              <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">{stats.outOfStockItems} out of stock</span>
            )}
            {stats.outOfStockItems === 0 && (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">All in stock</span>
            )}
          </div>
        </Link>

        <Link to="/superadmin/sales/monitor" className="group bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 p-5 hover:bg-white/80 hover:shadow-md hover:border-indigo-200/60 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-indigo-50 p-2.5 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <ShoppingCart className="w-5 h-5 text-indigo-500" />
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.weekSales}</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Week's Sales</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">{formatCurrency(stats.weekRevenue)}</span>
          </div>
        </Link>
      </div>

      {/* ── Middle Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

     

        {/* Top Performing Shops */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 p-2 rounded-lg">
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Top Shops</h3>
            </div>
            <BarChart3 className="w-4 h-4 text-gray-300" />
          </div>
          <div className="space-y-3">
            {topPerformers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No data available</p>
            )}
            {topPerformers.map((performer, index) => {
              const medals = ['🥇', '🥈', '🥉'];
              const barColors = ['bg-yellow-400', 'bg-gray-300', 'bg-orange-300'];
              const maxValue = topPerformers[0]?.value || 1;
              return (
                <div key={performer.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none">{medals[index] ?? `#${index + 1}`}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{performer.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{formatCurrency(performer.value)}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${performer.change >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                        {performer.change >= 0 ? '+' : ''}{performer.change}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div
                      className={`h-full ${barColors[index] ?? 'bg-orange-300'} rounded-full transition-all duration-700`}
                      style={{ width: `${(performer.value / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            </div>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scroll">
            {recentActivities.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
            )}
            {recentActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-3 group">
                  <div className={`p-2 rounded-xl shrink-0 ${getActivityColor(activity.status)}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{activity.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`w-2 h-2 rounded-full ${getActivityDot(activity.status)} mb-1 ml-auto`} />
                    <p className="text-xs text-gray-400 whitespace-nowrap">{activity.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SMS Balance + Financial Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* SMS Balance Card */}
        {/* <div className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-2xl p-5 text-white shadow-lg">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/10 rounded-full" />
          <div className="absolute -right-2 bottom-0 w-24 h-24 bg-indigo-500/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">QuickSend.lk</p>
                <p className="text-sm font-semibold">SMS Balance</p>
              </div>
            </div>

            {balanceLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-400 text-sm">Loading...</span>
              </div>
            ) : smsBalance ? (
              <div>
                <p className="text-4xl font-bold tracking-tight">
                  {getSMSBalance()}
                  <span className="text-base font-medium text-slate-400 ml-2">LKR</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Available credit balance</p>
              </div>
            ) : (
              <p className="text-slate-400 text-sm py-2">Unable to fetch balance</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleTopUp}
                disabled={!topupUrl}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Top Up
              </button>
              <button
                onClick={loadSMSBalance}
                disabled={balanceLoading}
                className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div> */}

        {/* Financial Summary */}
        <Card className="lg:col-span-3 rounded-2xl">
          <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-emerald-50 p-2 rounded-lg">
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Financial Summary</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), sub: `${stats.todaySales} sales`, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: "Week's Revenue", value: formatCurrency(stats.weekRevenue), sub: `${stats.weekSales} sales`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: "Month's Revenue", value: formatCurrency(stats.monthRevenue), sub: `${stats.monthSales} sales`, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), sub: 'All time', color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Total Profit', value: formatCurrency(stats.totalProfit), sub: `${stats.profitMargin}% margin`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Inventory Value', value: formatCurrency(stats.totalInventoryValue), sub: `${stats.totalStockItems} items`, color: 'text-sky-600', bg: 'bg-sky-50' },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label} className={`${bg} bg-opacity-60 backdrop-blur-sm rounded-xl p-3 border border-white/20`}>
                <p className={`text-base font-bold ${color}`}>{value}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Organization Activity Log ── */}
      {orgActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recent Activity Log */}
          <Card className="lg:col-span-2 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-violet-50 p-2 rounded-lg">
                    <ClipboardList className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Organization Activity</h3>
                    <p className="text-xs text-gray-400">{orgActivity.todayCount} actions today</p>
                  </div>
                </div>
                <Link to="/superadmin/activity-logs" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scroll">
                {orgActivity.recentLogs.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No activity recorded yet</p>
                )}
                {orgActivity.recentLogs.map((log: ActivityLogEntry) => {
                  const style = getLogActionStyle(log.action);
                  const ActionIcon = getLogActionIcon(log.action);
                  return (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-b border-white/20 last:border-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${style.bg}`}>
                        <ActionIcon className={`w-3.5 h-3.5 ${style.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>{log.action}</span>
                          <span className="text-xs font-medium text-gray-800 capitalize">{formatModuleName(log.module)}</span>
                          {log.recordId && (
                            <span className="text-xs text-gray-400 font-mono truncate max-w-20">#{log.recordId.slice(0, 8)}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          by {log.userName || 'System'}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <p className="text-xs text-gray-400 whitespace-nowrap">{formatLogTime(log.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Stats Panel */}
          <div className="flex flex-col gap-4">

            {/* Action Breakdown */}
            <Card className="rounded-2xl flex-1">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-orange-50 p-2 rounded-lg">
                    <Activity className="w-4 h-4 text-orange-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">Actions (7 days)</h4>
                </div>
                <div className="space-y-2">
                  {orgActivity.actionBreakdown.map(({ action, count }) => {
                    const style = getLogActionStyle(action);
                    const maxCount = Math.max(...orgActivity.actionBreakdown.map(a => a.count), 1);
                    return (
                      <div key={action}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>{action}</span>
                          <span className="text-xs font-bold text-gray-700">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full">
                          <div
                            className={`h-full rounded-full ${style.dot}`}
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {orgActivity.actionBreakdown.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Module Breakdown */}
            <Card className="rounded-2xl flex-1">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-50 p-2 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">By Module (7 days)</h4>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {orgActivity.moduleBreakdown.slice(0, 8).map(({ module, count }) => {
                    const maxCount = Math.max(...orgActivity.moduleBreakdown.map(m => m.count), 1);
                    return (
                      <div key={module} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 truncate w-24 shrink-0 capitalize">{formatModuleName(module)}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                          <div
                            className="h-full bg-indigo-400 rounded-full"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                  {orgActivity.moduleBreakdown.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-gray-100 p-2 rounded-lg">
            <Zap className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2">
          {[
            ...quickActions,
            ...(showJobSheets
              ? [{ to: '/superadmin/job-sheets/monitor', icon: Wrench, label: 'Job Sheets', color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100', border: 'border-red-200' }]
              : []),
          ].map(({ to, icon: Icon, label, color, bg, border }) => (
            <Link
              key={to}
              to={to}
              className={`group flex flex-col items-center gap-2 p-3 rounded-xl border ${border} ${bg} transition-all hover:scale-105 hover:shadow-sm`}
            >
              <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
