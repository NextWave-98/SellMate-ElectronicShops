import { useCallback } from 'react';
import useFetch from './useFetch';
import type { DashboardPeriodFilters } from '../utils/dashboardPeriod';

export interface DashboardStats {
  // Shops
  totalShops: number;
  activeShops: number;
  inactiveShops: number;

  // Staff
  totalStaff: number;
  activeStaff: number;
  onLeaveStaff: number;

  // Stock & Inventory
  totalStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;

  // Sales
  todaySales: number;
  todayRevenue: number;
  weekSales: number;
  weekRevenue: number;
  monthSales: number;
  monthRevenue: number;
  salesGrowth: number;

  // Selected period
  selectedPeriod?: string;
  periodLabel?: string;

  // Job Sheets
  totalJobSheets: number;
  pendingJobSheets: number;
  inProgressJobSheets: number;
  completedJobSheets: number;
  overdueJobSheets: number;

  // Financial Overview
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;

  // Recent Activity
  recentSales: number;
  recentJobSheets: number;
  criticalAlerts: number;

  // Detailed data
  recentActivities: RecentActivity[];
  topPerformers: TopPerformer[];

  // Courier Shipments
  courierTotalShipments: number;
  courierPendingShipments: number;
  courierPendingPickup: number;
  courierPickedUp: number;
  courierInTransit: number;
  courierOutForDelivery: number;
  courierDelivered: number;
  courierFailedDelivery: number;
  courierReturnedToSender: number;
  courierCancelled: number;
  courierOnHold: number;
  courierPendingApproval?: number;
  courierProcessing?: number;
  courierWaitingPickup?: number;
  courierRescheduled?: number;
  courierSuccessRate?: number;
  courierReturnRate?: number;
  courierByBranch?: Array<{
    locationId: string;
    name: string;
    code: string;
    total: number;
    delivered: number;
    returned: number;
    cancelled: number;
    dispatched: number;
    successRate: number;
  }>;
  courierByStaff?: Array<{
    userId: string;
    name: string;
    total: number;
    delivered: number;
    returned: number;
    cancelled: number;
    dispatched: number;
    successRate: number;
  }>;
}

export interface RecentActivity {
  id: string;
  type: 'sale' | 'jobsheet' | 'stock' | 'staff';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export interface TopPerformer {
  id: string;
  name: string;
  value: number;
  change: number;
  type: 'shop' | 'staff' | 'product';
}

export const useDashboard = () => {
  const { fetchData, loading, error } = useFetch<DashboardStats>('/admin/superadmin-dashboard', {
    method: 'GET',
  });

  const getDashboardStats = useCallback(async (
    filters?: DashboardPeriodFilters,
  ): Promise<DashboardStats | null> => {
    const queryParams = new URLSearchParams();
    if (filters?.period) queryParams.append('period', filters.period);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    const query = queryParams.toString();
    const endpoint = query ? `/admin/superadmin-dashboard?${query}` : '/admin/superadmin-dashboard?period=month';

    const response = await fetchData({ endpoint, silent: true, showToastOnError: true });

    if (response?.success && response.data) {
      return response.data;
    }

    return null;
  }, [fetchData]);

  return {
    getDashboardStats,
    loading,
    error,
  };
};
