import { useEffect, useState } from 'react';
import useSales from '../../../../hooks/useSales';
import type { SalesDashboardData } from '../../../../hooks/useSales';
import SalesOverview from './SalesOverview';
import RevenueChart from './RevenueChart';
import BranchPerformanceCard from './BranchPerformanceCard';
import StaffPerformanceCard from './StaffPerformanceCard';
import TopProductsCard from './TopProductsCard';
import PaymentMethodChart from './PaymentMethodChart';
import RecentSalesTable from './RecentSalesTable';
import SaleDetailsModal from './SaleDetailsModal';
import PeriodSelector from './PeriodSelector';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalesDashboard() {
  const { getDashboardData, getSaleById, loading } = useSales();
  const [dashboardData, setDashboardData] = useState<SalesDashboardData | null>(null);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customDateRange]);

  const loadDashboard = async () => {
    try {
      const filters = period === 'custom' 
        ? { startDate: customDateRange.start, endDate: customDateRange.end }
        : { period };

      const response = await getDashboardData(filters);
      if (response?.success) {
        setDashboardData(response.data as SalesDashboardData);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleViewSaleDetails = async (saleId: string) => {
    try {
      setLoadingDetails(true);
      setIsDetailsModalOpen(true);
      setSelectedSaleDetails(null);
      
      const response = await getSaleById(saleId);
      if (response?.success && response?.data) {
        setSelectedSaleDetails(response.data);
      } else {
        toast.error('Failed to load sale details');
        setIsDetailsModalOpen(false);
      }
    } catch (error) {
      console.error('Error loading sale details:', error);
      toast.error('Failed to load sale details');
      setIsDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedSaleDetails(null);
  };

  if (loading.dashboard && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
        <div className="flex gap-4">
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            customDateRange={customDateRange}
            onCustomDateChange={setCustomDateRange}
          />
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

      {/* Overview Cards */}
      <SalesOverview summary={dashboardData?.summary} growth={dashboardData?.growth} />
        {/* Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BranchPerformanceCard branches={dashboardData?.topLocations} />
        <StaffPerformanceCard staff={dashboardData?.topStaff} />
        <TopProductsCard products={dashboardData?.topProducts} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart trends={dashboardData?.trends} />
        <PaymentMethodChart data={dashboardData?.paymentMethodBreakdown} />
      </div>

      {/* Recent Sales Table */}
      <RecentSalesTable sales={dashboardData?.recentSales} onViewDetails={handleViewSaleDetails} />

      {/* Sale Details Modal */}
      <SaleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModal}
        saleDetails={selectedSaleDetails}
        loading={loadingDetails}
      />
    
    </div>
  );
}
