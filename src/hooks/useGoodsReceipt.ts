import { useCallback } from 'react';
import useFetch from './useFetch';

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    productCode: string;
    sku: string;
    brand?: string;
    warrantyMonths?: number;
  };
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DAMAGED' | 'PARTIAL';
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: {
    id: string;
    poNumber: string;
    supplierId: string;
    supplier?: {
      id: string;
      name: string;
      supplierCode: string;
      email?: string;
      phone?: string;
    };
  };
  receiptDate: string;
  receivedBy?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  notes?: string;
  attachments?: Record<string, unknown>;
  status: 'PENDING_QC' | 'QC_PASSED' | 'QC_FAILED' | 'PARTIALLY_ACCEPTED' | 'COMPLETED';
  qualityCheckBy?: string;
  qualityCheckDate?: string;
  qualityCheckNotes?: string;
  items: GoodsReceiptItem[];
  createdAt: string;
  updatedAt: string;
}

interface GoodsReceiptFilters {
  page?: number;
  limit?: number;
  search?: string;
  purchaseOrderId?: string;
  status?: 'PENDING_QC' | 'QC_PASSED' | 'QC_FAILED' | 'PARTIALLY_ACCEPTED' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateGoodsReceiptData {
  purchaseOrderId: string;
  destinationLocationId?: string;
  receiptDate?: string;
  receivedBy?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  notes?: string;
  attachments?: Record<string, unknown>;
  items: {
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity?: number;
    batchNumber?: string;
    expiryDate?: string;
    qualityStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DAMAGED' | 'PARTIAL';
    rejectionReason?: string;
    notes?: string;
  }[];
}

interface UpdateGoodsReceiptData {
  receiptDate?: string;
  receivedBy?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  notes?: string;
  attachments?: Record<string, unknown>;
  status?: 'PENDING_QC' | 'QC_PASSED' | 'QC_FAILED' | 'PARTIALLY_ACCEPTED' | 'COMPLETED';
}

interface UpdateGoodsReceiptItemData {
  receivedQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DAMAGED' | 'PARTIAL';
  rejectionReason?: string;
  notes?: string;
}

interface QualityCheckData {
  status: 'QC_PASSED' | 'QC_FAILED' | 'PARTIALLY_ACCEPTED';
  qualityCheckBy: string;
  qualityCheckNotes?: string;
  items: {
    itemId: string;
    acceptedQuantity: number;
    rejectedQuantity: number;
    qualityStatus: 'ACCEPTED' | 'REJECTED' | 'DAMAGED' | 'PARTIAL';
    rejectionReason?: string;
  }[];
}

interface ApproveGoodsReceiptData {
  locationId: string;
  qualityCheckBy?: string;
  qualityCheckNotes?: string;
}

export interface GoodsReceiptStats {
  total: number;
  pendingQC: number;
  completed: number;
  todayReceipts: number;
}

export const useGoodsReceipt = () => {
  const { fetchData } = useFetch();

  // Create goods receipt
  const createGoodsReceipt = useCallback(
    async (data: CreateGoodsReceiptData) => {
      return await fetchData({
        endpoint: '/goods-receipts',
        method: 'POST',
        data,
      });
    },
    [fetchData]
  );

  // Get all goods receipts
  const getAllGoodsReceipts = useCallback(
    async (filters?: GoodsReceiptFilters) => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.purchaseOrderId) params.append('purchaseOrderId', filters.purchaseOrderId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      return await fetchData({
        endpoint: `/goods-receipts?${params.toString()}`,
        method: 'GET', silent:true
      });
    },
    [fetchData]
  );

  // Get goods receipt by ID
  const getGoodsReceiptById = useCallback(
    async (id: string) => {
      return await fetchData({
        endpoint: `/goods-receipts/${id}`,
        method: 'GET', silent:true
      });
    },
    [fetchData]
  );

  // Update goods receipt
  const updateGoodsReceipt = useCallback(
    async (id: string, data: UpdateGoodsReceiptData) => {
      return await fetchData({
        endpoint: `/goods-receipts/${id}`,
        method: 'PUT',
        data,
      });
    },
    [fetchData]
  );

  // Update goods receipt item
  const updateGoodsReceiptItem = useCallback(
    async (grnId: string, itemId: string, data: UpdateGoodsReceiptItemData) => {
      return await fetchData({
        endpoint: `/goods-receipts/${grnId}/items/${itemId}`,
        method: 'PUT',
        data,
      });
    },
    [fetchData]
  );

  // Perform quality check
  const performQualityCheck = useCallback(
    async (id: string, data: QualityCheckData) => {
      return await fetchData({
        endpoint: `/goods-receipts/${id}/quality-check`,
        method: 'POST',
        data,
      });
    },
    [fetchData]
  );

  // Approve goods receipt (update inventory)
  const approveGoodsReceipt = useCallback(
    async (id: string, data: ApproveGoodsReceiptData) => {
      return await fetchData({
        endpoint: `/goods-receipts/${id}/approve`,
        method: 'POST',
        data,
      });
    },
    [fetchData]
  );

  // Delete goods receipt
  const deleteGoodsReceipt = useCallback(
    async (id: string) => {
      return await fetchData({
        endpoint: `/goods-receipts/${id}`,
        method: 'DELETE',
      });
    },
    [fetchData]
  );

  // Get goods receipts by purchase order
  const getGoodsReceiptsByPurchaseOrder = useCallback(
    async (purchaseOrderId: string) => {
      return await fetchData({
        endpoint: `/goods-receipts/purchase-order/${purchaseOrderId}`,
        method: 'GET', silent:true
      });
    },
    [fetchData]
  );

  // Get statistics
  const getGoodsReceiptStats = useCallback(
    async () => {
      return await fetchData({
        endpoint: '/goods-receipts/stats',
        method: 'GET', silent:true
      });
    },
    [fetchData]
  );

  return {
    createGoodsReceipt,
    getAllGoodsReceipts,
    getGoodsReceiptById,
    updateGoodsReceipt,
    updateGoodsReceiptItem,
    performQualityCheck,
    approveGoodsReceipt,
    deleteGoodsReceipt,
    getGoodsReceiptsByPurchaseOrder,
    getGoodsReceiptStats,
  };
};
