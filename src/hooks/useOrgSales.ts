import { useCallback } from 'react';
import useFetch from './useFetch';

export interface OrgSalesFilters {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
  locationId?: string;
}

export interface OrgPOSAnalyticsFilters extends OrgSalesFilters {
  status?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrgCourierShipmentsFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  period?: string;
  page?: number;
  limit?: number;
  locationId?: string;
}

const useOrgSales = () => {
  const { fetchData: baseFetchData } = useFetch();

  /**
   * Get paginated POS analytics across all org locations
   * Uses /sales/org/pos-analytics
   */
  const getOrgPOSAnalytics = useCallback(
    async (filters?: OrgPOSAnalyticsFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.period) queryParams.append('period', filters.period);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.locationId) queryParams.append('locationId', filters.locationId);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      const qs = queryParams.toString();
      return await baseFetchData({
        endpoint: qs ? `/sales/org/pos-analytics?${qs}` : '/sales/org/pos-analytics',
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  /**
   * Get unified POS + Courier summary analytics across all org locations
   * Uses /sales/org/unified-analytics
   */
  const getOrgUnifiedAnalytics = useCallback(
    async (filters?: Pick<OrgSalesFilters, 'period' | 'startDate' | 'endDate' | 'locationId'>) => {
      const queryParams = new URLSearchParams();
      if (filters?.period) queryParams.append('period', filters.period);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.locationId) queryParams.append('locationId', filters.locationId);
      const qs = queryParams.toString();
      return await baseFetchData({
        endpoint: qs ? `/sales/org/unified-analytics?${qs}` : '/sales/org/unified-analytics',
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  /**
   * Get courier shipments across all org locations
   * Uses /courier/shipments/org
   */
  const getOrgCourierShipments = useCallback(
    async (filters?: OrgCourierShipmentsFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.period) queryParams.append('period', filters.period);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.locationId) queryParams.append('locationId', filters.locationId);
      const qs = queryParams.toString();
      return await baseFetchData({
        endpoint: qs ? `/courier/shipments/org?${qs}` : '/courier/shipments/org',
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  /**
   * Complete a pending/partial payment on a sale (shared with branch managers)
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

  const syncCourierOrderTotals = useCallback(
    async (saleIds: string[]) => {
      return await baseFetchData({
        endpoint: '/sales/pos/sync-courier-totals',
        method: 'POST',
        data: { saleIds },
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

  /**
   * Get all orders (POS + Shipments + WooCommerce) for org admin
   * Uses GET /sales/all-orders
   */
  const getOrgAllOrders = useCallback(
    async (filters?: {
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
      locationId?: string;
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
      if (filters?.locationId) queryParams.append('locationId', filters.locationId);
      if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
      const qs = queryParams.toString();
      return await baseFetchData({
        endpoint: qs ? `/sales/all-orders?${qs}` : '/sales/all-orders',
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  const getOrgAllOrdersSummary = useCallback(
    async (filters?: {
      search?: string;
      orderType?: string;
      startDate?: string;
      endDate?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      updatedAtFrom?: string;
      updatedAtTo?: string;
      locationId?: string;
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
      if (filters?.locationId) queryParams.append('locationId', filters.locationId);
      if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
      const qs = queryParams.toString();
      return await baseFetchData({
        endpoint: qs ? `/sales/all-orders/summary?${qs}` : '/sales/all-orders/summary',
        method: 'GET',
        silent: true,
      });
    },
    [baseFetchData]
  );

  const deleteSale = useCallback(
    async (saleId: string) => {
      return await baseFetchData({
        endpoint: `/sales/pos/${saleId}`,
        method: 'DELETE',
      });
    },
    [baseFetchData]
  );

  return {
    getOrgPOSAnalytics,
    getOrgUnifiedAnalytics,
    getOrgCourierShipments,
    completeSalePayment,
    bulkCompletePayments,
    reconcileSalePayments,
    syncCourierOrderTotals,
    getSaleById,
    getOrgAllOrders,
    getOrgAllOrdersSummary,
    deleteSale,
  };
};

export default useOrgSales;

