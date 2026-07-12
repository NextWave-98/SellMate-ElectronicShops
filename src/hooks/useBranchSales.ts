import { useCallback } from 'react';
import useFetch from './useFetch';

export interface BranchSalesFilters {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
  status?: string;
  page?: number;
  limit?: number;
}

export interface POSAnalyticsFilters extends BranchSalesFilters {
  paymentMethod?: string;
  search?: string;
}

export interface CourierShipmentsFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  period?: string;
  page?: number;
  limit?: number;
  search?: string;
}

const useBranchSales = () => {
  const { fetchData: baseFetchData } = useFetch();

  const getBranchDashboard = useCallback(
    async (filters?: BranchSalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.period) queryParams.append('period', filters.period);
      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/sales/branch/dashboard?${queryString}`
        : '/sales/branch/dashboard';
      return await baseFetchData({ endpoint, method: 'GET', silent: true });
    },
    [baseFetchData]
  );

  const getBranchSalesDetails = useCallback(
    async (filters?: BranchSalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/sales/branch/details?${queryString}`
        : '/sales/branch/details';
      return await baseFetchData({ endpoint, method: 'GET', silent: true });
    },
    [baseFetchData]
  );

  const getBranchCourierShipments = useCallback(
    async (filters?: CourierShipmentsFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.period) queryParams.append('period', filters.period);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.search) queryParams.append('search', filters.search);
      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/courier/shipments/branch?${queryString}`
        : '/courier/shipments/branch';
      return await baseFetchData({ endpoint, method: 'GET', silent: true });
    },
    [baseFetchData]
  );

  const getBranchCourierStats = useCallback(
    async (filters?: { startDate?: string; endDate?: string; period?: string }) => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.period) params.append('period', filters.period);
      const qs = params.toString();
      return await baseFetchData({
        endpoint: `/courier/shipments/branch/stats${qs ? '?' + qs : ''}`,
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  /**
   * Get paginated POS analytics with payment method breakdown
   * Uses /sales/branch/pos-analytics
   */
  const getBranchPOSAnalytics = useCallback(
    async (filters?: POSAnalyticsFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.period) queryParams.append('period', filters.period);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/sales/branch/pos-analytics?${queryString}`
        : '/sales/branch/pos-analytics';
      return await baseFetchData({ endpoint, method: 'GET', silent: true });
    },
    [baseFetchData]
  );

  /**
   * Get unified POS + Courier summary analytics
   * Uses /sales/branch/unified-analytics
   */
  const getBranchUnifiedAnalytics = useCallback(
    async (filters?: Pick<BranchSalesFilters, 'period' | 'startDate' | 'endDate'>) => {
      const queryParams = new URLSearchParams();
      if (filters?.period) queryParams.append('period', filters.period);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `/sales/branch/unified-analytics?${queryString}`
        : '/sales/branch/unified-analytics';
      return await baseFetchData({ endpoint, method: 'GET', silent: true });
    },
    [baseFetchData]
  );

  /**
   * Complete a pending/partial payment on a sale
   * Uses POST /sales/pos/:saleId/complete-payment
   */
  const completeSalePayment = useCallback(
    async (saleId: string, data: {
      amount: number;
      paymentMethod?: string;
      referenceNumber?: string;
      notes?: string;
    }) => {
      return await baseFetchData({
        endpoint: `/sales/pos/${saleId}/complete-payment`,
        method: 'POST',
        data,
      });
    },
    [baseFetchData]
  );

  const getSaleById = useCallback(
    async (id: string) => {
      return await baseFetchData({
        endpoint: `/sales/${id}`,
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  const updateShipmentTrackingNumber = useCallback(
    async (shipmentId: string, trackingNumber: string) => {
      return await baseFetchData({
        endpoint: `/courier/shipments/${shipmentId}/tracking-number`,
        method: 'PATCH',
        data: { trackingNumber },
      });
    },
    [baseFetchData]
  );

  const getBranchAllOrders = useCallback(async (filters?: {
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
    }) => {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.orderType) queryParams.append('orderType', filters.orderType);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.fardarStatus) queryParams.append('fardarStatus', filters.fardarStatus);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.createdAtFrom) queryParams.append('createdAtFrom', filters.createdAtFrom);
      if (filters?.createdAtTo) queryParams.append('createdAtTo', filters.createdAtTo);
      if (filters?.updatedAtFrom) queryParams.append('updatedAtFrom', filters.updatedAtFrom);
      if (filters?.updatedAtTo) queryParams.append('updatedAtTo', filters.updatedAtTo);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
      const qs = queryParams.toString();
      return await baseFetchData({
        endpoint: qs ? `/sales/branch/all-orders?${qs}` : '/sales/branch/all-orders',
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  const getBranchAllOrdersSummary = useCallback(
    async (filters?: {
      search?: string;
      orderType?: string;
      startDate?: string;
      endDate?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      updatedAtFrom?: string;
      updatedAtTo?: string;
      paymentMethod?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.orderType) queryParams.append('orderType', filters.orderType);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.createdAtFrom) queryParams.append('createdAtFrom', filters.createdAtFrom);
      if (filters?.createdAtTo) queryParams.append('createdAtTo', filters.createdAtTo);
      if (filters?.updatedAtFrom) queryParams.append('updatedAtFrom', filters.updatedAtFrom);
      if (filters?.updatedAtTo) queryParams.append('updatedAtTo', filters.updatedAtTo);
      if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
      const qs = queryParams.toString();
      return await baseFetchData({
        endpoint: qs ? `/sales/branch/all-orders/summary?${qs}` : '/sales/branch/all-orders/summary',
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  /**
   * Bulk complete payments for multiple sales.
   * POST /sales/pos/bulk-complete-payments
   */
  const bulkCompletePayments = useCallback(
    async (
      items: Array<{
        saleId: string;
        amount: number;
        paymentMethod?: string;
        referenceNumber?: string;
        notes?: string;
      }>
    ) => {
      return await baseFetchData({
        endpoint: '/sales/pos/bulk-complete-payments',
        method: 'POST',
        data: { items },
      });
    },
    [baseFetchData]
  );

  const reconcileSalePayments = useCallback(
    async (saleIds: string[]) => {
      return await baseFetchData({
        endpoint: '/sales/pos/reconcile-payments',
        method: 'POST',
        data: { saleIds },
      });
    },
    [baseFetchData]
  );

  return {
    getBranchDashboard,
    getBranchSalesDetails,
    getBranchCourierShipments,
    getBranchCourierStats,
    getBranchPOSAnalytics,
    getBranchUnifiedAnalytics,
    completeSalePayment,
    bulkCompletePayments,
    reconcileSalePayments,
    getSaleById,
    updateShipmentTrackingNumber,
    getBranchAllOrders,
    getBranchAllOrdersSummary,
  };
};

export default useBranchSales;

