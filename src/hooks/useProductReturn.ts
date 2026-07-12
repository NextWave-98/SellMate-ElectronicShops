import { useCallback } from 'react';
import useFetch from './useFetch';

// Product Return Types based on backend DTOs
export interface ProductReturn {
  id: string;
  returnNumber: string;
  locationId: string;
  customerId?: string | null;
  productId: string;
  sourceType: 'SALE' | 'WARRANTY_CLAIM' | 'JOB_SHEET' | 'STOCK_CHECK' | 'DIRECT' | 'GOODS_RECEIPT';
  sourceId?: string | null;
  returnCategory: 'CUSTOMER_RETURN' | 'WARRANTY_RETURN' | 'DEFECTIVE' | 'EXCESS_STOCK' | 'QUALITY_FAILURE' | 'DAMAGED' | 'INTERNAL_TRANSFER';
  returnReason: string; // Enum values from backend
  productCondition: 'NEW_SEALED' | 'NEW_OPEN_BOX' | 'USED_EXCELLENT' | 'USED_GOOD' | 'USED_FAIR' | 'DEFECTIVE' | 'DAMAGED' | 'PARTS_MISSING' | 'DESTROYED';
  quantity: number;
  productValue: number;
  refundAmount?: number | null;
  status: 'RECEIVED' | 'INSPECTING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REPLACEMENT_SENT';
  resolutionType?: string | null; // Enum values
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  productName: string;
  productCode: string;
  productSerialNumber?: string | null;
  productBatchNumber?: string | null;
  productBrand?: string | null;
  productModel?: string | null;
  inspectionNotes?: string | null;
  recommendedAction?: 'APPROVE' | 'REJECT' | null;
  approvedById?: string | null;
  rejectedById?: string | null;
  processedById?: string | null;
  cancelledById?: string | null;
  inspectedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  processedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  location?: {
    id: string;
    name: string;
    locationCode: string;
  };
  customer?: {
    id: string;
    customerId?: string;
    name: string;
    phone: string;
    email?: string;
  };
  product?: {
    id: string;
    name: string;
    code: string;
    brand?: string;
    model?: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  inspectedBy?: {
    id: string;
    name: string;
  };
  approvedBy?: {
    id: string;
    name: string;
  };
  rejectedBy?: {
    id: string;
    name: string;
  };
  processedBy?: {
    id: string;
    name: string;
  };
  cancelledBy?: {
    id: string;
    name: string;
  };
}

export interface CreateProductReturnData {
  locationId: string;
  customerId?: string | null;
  productId: string;
  sourceType: 'SALE' | 'WARRANTY_CLAIM' | 'JOB_SHEET' | 'STOCK_CHECK' | 'DIRECT' | 'GOODS_RECEIPT';
  sourceId?: string | null;
  returnCategory: 'CUSTOMER_RETURN' | 'WARRANTY_RETURN' | 'DEFECTIVE' | 'EXCESS_STOCK' | 'QUALITY_FAILURE' | 'DAMAGED' | 'INTERNAL_TRANSFER';
  returnReason: string;
  quantity: number;
  productValue: number;
  refundAmount?: number | null;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  productSerialNumber?: string | null;
  productBatchNumber?: string | null;
  createdById: string;
  courierTrackingNumber?: string | null;
}

export interface InspectReturnData {
  condition: 'NEW_SEALED' | 'NEW_OPEN_BOX' | 'USED_EXCELLENT' | 'USED_GOOD' | 'USED_FAIR' | 'DEFECTIVE' | 'DAMAGED' | 'PARTS_MISSING' | 'DESTROYED';
  inspectionNotes?: string | null;
  recommendedAction?: 'APPROVE' | 'REJECT' | null;
}

export interface ApproveReturnData {
  resolutionType: 'REFUND_PROCESSED' | 'RESTOCKED_BRANCH' | 'RETURNED_SUPPLIER' | 'TRANSFERRED_WAREHOUSE' | 'SCRAPPED' | 'STORE_CREDIT' | 'EXCHANGE_PROCESSED' | 'WARRANTY_REPLACEMENT' | 'DONATION' | 'RECYCLING' | 'OTHER';
  notes?: string | null;
}

export interface RejectReturnData {
  rejectionReason: string;
  notes?: string | null;
}

export interface ProcessReturnData {
  resolutionType: 'RESTOCKED_BRANCH' | 'REFUND_PROCESSED' | 'RETURNED_SUPPLIER' | 'TRANSFERRED_WAREHOUSE' | 'SCRAPPED';
  resolutionDetails?: string | null;
  // For REFUND_PROCESSED
  refundAmount?: number;
  refundMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'CHECK' | 'OTHER';
  // For RETURNED_SUPPLIER
  supplierReturnData?: {
    supplierId: string;
    purchaseOrderId?: string;
    reason: string;
    reasonDescription?: string;
  };
  // For TRANSFERRED_WAREHOUSE
  transferToLocationId?: string;
  transferNotes?: string;
  notes?: string | null;
}

export interface CancelReturnData {
  cancellationReason: string;
  notes?: string | null;
}

export interface QueryProductReturnsParams {
  page?: number;
  limit?: number;
  locationId?: string;
  status?: string;
  returnCategory?: string;
  returnReason?: string;
  customerId?: string;
  productId?: string;
  sourceType?: string;
  sourceId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductReturnStats {
  totalReturns: number;
  pendingReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  completedReturns: number;
  totalValue: number;
  totalRefunded: number;
  averageProcessingTime: number;
  returnsByCategory: Record<string, number>;
  returnsByReason: Record<string, number>;
  returnsByStatus: Record<string, number>;
}

export interface ProductReturnAnalytics {
  period: string;
  totalReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  completedReturns: number;
  totalValue: number;
  totalRefunded: number;
  averageProcessingTime: number;
  returnsByCategory: Record<string, number>;
  returnsByReason: Record<string, number>;
  trendData: Array<{
    date: string;
    returns: number;
    value: number;
  }>;
}

const useProductReturn = () => {
  const getReturnsFetch = useFetch();
  const getReturnByIdFetch = useFetch();
  const getReturnByNumberFetch = useFetch();
  const createReturnFetch = useFetch();
  const inspectReturnFetch = useFetch();
  const approveReturnFetch = useFetch();
  const rejectReturnFetch = useFetch();
  const processReturnFetch = useFetch();
  const cancelReturnFetch = useFetch();
  const getReturnStatsFetch = useFetch();
  const getReturnAnalyticsFetch = useFetch();

  // Get all returns with pagination and filters
  const getReturns = useCallback(
    async (params?: QueryProductReturnsParams) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.locationId) queryParams.append('locationId', params.locationId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.returnCategory) queryParams.append('returnCategory', params.returnCategory);
      if (params?.returnReason) queryParams.append('returnReason', params.returnReason);
      if (params?.customerId) queryParams.append('customerId', params.customerId);
      if (params?.productId) queryParams.append('productId', params.productId);
      if (params?.sourceType) queryParams.append('sourceType', params.sourceType);
      if (params?.sourceId) queryParams.append('sourceId', params.sourceId);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      return getReturnsFetch.fetchData({
        endpoint: `/returns?${queryParams.toString()}`,
        method: 'GET',
        silent: true,
      });
    },
    [getReturnsFetch]
  );

  // Get return by ID
  const getReturnById = useCallback(
    async (id: string) => {
      return getReturnByIdFetch.fetchData({
        endpoint: `/returns/${id}`,
        method: 'GET',
        silent: true,
      });
    },
    [getReturnByIdFetch]
  );

  // Get return by number
  const getReturnByNumber = useCallback(
    async (returnNumber: string) => {
      return getReturnByNumberFetch.fetchData({
        endpoint: `/returns/number/${returnNumber}`,
        method: 'GET',
        silent: true,
      });
    },
    [getReturnByNumberFetch]
  );

  // Create new return
  const createReturn = useCallback(
    async (data: CreateProductReturnData) => {
      return createReturnFetch.fetchData({
        endpoint: '/returns',
        method: 'POST',
        data,
      });
    },
    [createReturnFetch]
  );

  // Inspect return
  const inspectReturn = useCallback(
    async (id: string, data: InspectReturnData) => {
      return inspectReturnFetch.fetchData({
        endpoint: `/returns/${id}/inspect`,
        method: 'PATCH',
        data,
      });
    },
    [inspectReturnFetch]
  );

  // Approve return
  const approveReturn = useCallback(
    async (id: string, data: ApproveReturnData) => {
      return approveReturnFetch.fetchData({
        endpoint: `/returns/${id}/approve`,
        method: 'PATCH',
        data,
      });
    },
    [approveReturnFetch]
  );

  // Reject return
  const rejectReturn = useCallback(
    async (id: string, data: RejectReturnData) => {
      return rejectReturnFetch.fetchData({
        endpoint: `/returns/${id}/reject`,
        method: 'PATCH',
        data,
      });
    },
    [rejectReturnFetch]
  );

  // Process return
  const processReturn = useCallback(
    async (id: string, data?: ProcessReturnData) => {
      return processReturnFetch.fetchData({
        endpoint: `/returns/${id}/process`,
        method: 'PATCH',
        data,
      });
    },
    [processReturnFetch]
  );

  // Cancel return
  const cancelReturn = useCallback(
    async (id: string, data: CancelReturnData) => {
      return cancelReturnFetch.fetchData({
        endpoint: `/returns/${id}`,
        method: 'DELETE',
        data,
      });
    },
    [cancelReturnFetch]
  );

  // Get return statistics
  const getReturnStats = useCallback(
    async (locationId?: string) => {
      const queryParams = new URLSearchParams();
      if (locationId) queryParams.append('locationId', locationId);
      return getReturnStatsFetch.fetchData({
        endpoint: `/returns/stats?${queryParams.toString()}`,
        method: 'GET',
        silent: true,
      });
    },
    [getReturnStatsFetch]
  );

  // Get return analytics
  const getReturnAnalytics = useCallback(
    async (params?: { startDate?: string; endDate?: string; locationId?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.locationId) queryParams.append('locationId', params.locationId);
      return getReturnAnalyticsFetch.fetchData({
        endpoint: `/returns/analytics?${queryParams.toString()}`,
        method: 'GET',
        silent: true,
      });
    },
    [getReturnAnalyticsFetch]
  );

  return {
    getReturns,
    getReturnById,
    getReturnByNumber,
    createReturn,
    inspectReturn,
    approveReturn,
    rejectReturn,
    processReturn,
    cancelReturn,
    getReturnStats,
    getReturnAnalytics,
    loading: {
      getReturns: getReturnsFetch.loading,
      getReturnById: getReturnByIdFetch.loading,
      getReturnByNumber: getReturnByNumberFetch.loading,
      createReturn: createReturnFetch.loading,
      inspectReturn: inspectReturnFetch.loading,
      approveReturn: approveReturnFetch.loading,
      rejectReturn: rejectReturnFetch.loading,
      processReturn: processReturnFetch.loading,
      cancelReturn: cancelReturnFetch.loading,
      getReturnStats: getReturnStatsFetch.loading,
      getReturnAnalytics: getReturnAnalyticsFetch.loading,
    },
  };
};

export default useProductReturn;