import { useCallback, useState } from 'react';
import useFetch from './useFetch';
import type { StockTransferStats } from '../types/stockTransfer.types';

export interface StockReleaseItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    productCode: string;
    unitPrice: number;
  };
  requestedQuantity: number;
  releasedQuantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  serialNumber?: string;
  location?: string;
  notes?: string;
}

export interface StockRelease {
  id: string;
  releaseNumber: string;
  releaseType: 'JOB_USAGE' | 'BRANCH_TRANSFER' | 'INTERNAL_USE' | 'SAMPLE' | 'PROMOTION' | 'DISPOSAL' | 'OTHER';
  releaseDate: string;
  status: 'PENDING' | 'APPROVED' | 'RELEASED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  fromLocationId: string; // Changed from fromBranchId
  fromLocation?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  toLocationId?: string; // Changed from toBranchId
  toLocation?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  requestedBy?: string;
  createdBy?: {
    id: string;
    name: string;
  };
  approvedBy?: {
    id: string;
    name: string;
  };
  approvedAt?: string;
  releasedBy?: string;
  releasedAt?: string;
  receivedAt?: string;
  notes?: string;
  items: StockReleaseItem[];
  createdAt: string;
  updatedAt: string;
}

interface StockReleaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  releaseType?: string;
  status?: string;
  fromLocationId?: string; // Changed from fromBranchId
  toLocationId?: string; // Changed from toBranchId
  startDate?: string;
  endDate?: string;
  sortBy?: 'releaseNumber' | 'releaseDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface CreateStockReleaseData {
  releaseType: 'JOB_USAGE' | 'BRANCH_TRANSFER' | 'INTERNAL_USE' | 'SAMPLE' | 'PROMOTION' | 'DISPOSAL' | 'OTHER';
  fromLocationId: string; // Changed from fromBranchId
  toLocationId?: string; // Changed from toBranchId
  releaseDate?: string;
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  items: {
    productId: string;
    requestedQuantity: number;
    unitCost?: number;
    batchNumber?: string;
    serialNumber?: string;
    location?: string;
    notes?: string;
  }[];
  notes?: string;
}

interface UpdateStockReleaseData extends Partial<Omit<CreateStockReleaseData, 'items'>> {
  id: string;
}

interface ApproveReleaseData {
  approvedBy?: string;
  notes?: string;
}

interface ReleaseStockData {
  releasedBy?: string;
  notes?: string;
}

interface ReceiveStockData {
  receivedBy?: string;
  receivedDate?: string;
  notes?: string;
}

interface TransferStockData {
  fromLocationId: string; // Changed from fromBranchId
  toLocationId: string; // Changed from toBranchId
  items: {
    productId: string;
    requestedQuantity: number;
    unitCost?: number;
    notes?: string;
  }[];
  notes?: string;
}

export const useStockTransfer = () => {
  const { fetchData, loading, error, data, reset } = useFetch();
  const [stats, setStats] = useState<StockTransferStats | null>(null);

  // Get all stock releases with filters
  const getAllStockReleases = useCallback(async (filters?: StockReleaseFilters) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/stock-releases${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get stock release by ID
  const getStockReleaseById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/stock-releases/${id}`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get pending transfers (awaiting approval)
  const getPendingTransfers = useCallback(async () => {
    return await fetchData({
      endpoint: '/stock-releases?status=PENDING&releaseType=BRANCH_TRANSFER',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get in-transit transfers (released but not received)
  const getInTransitTransfers = useCallback(async () => {
    return await fetchData({
      endpoint: '/stock-releases?status=RELEASED&releaseType=BRANCH_TRANSFER',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get transfers for a specific branch
  const getBranchTransfers = useCallback(async (locationId: string, direction: 'from' | 'to' | 'both' = 'both') => {
    let endpoint = '/stock-releases?releaseType=BRANCH_TRANSFER';
    
    if (direction === 'from') {
      endpoint += `&fromLocationId=${locationId}`;
    } else if (direction === 'to') {
      endpoint += `&toLocationId=${locationId}`;
    } else {
      endpoint += `&locationId=${locationId}`;
    }
    
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Create stock release (transfer request)
  const createStockRelease = useCallback(async (releaseData: CreateStockReleaseData) => {
    return await fetchData({
      endpoint: '/stock-releases',
      method: 'POST',
      data: releaseData,
      successMessage: 'Stock release created successfully',
    });
  }, [fetchData]);

  // Create branch transfer (shortcut for BRANCH_TRANSFER type)
  const createBranchTransfer = useCallback(async (transferData: TransferStockData) => {
    const releaseData: CreateStockReleaseData = {
      releaseType: 'BRANCH_TRANSFER',
      fromLocationId: transferData.fromLocationId,
      toLocationId: transferData.toLocationId,
      items: transferData.items.map(item => ({
        productId: item.productId,
        requestedQuantity: item.requestedQuantity,
        unitCost: item.unitCost,
        notes: item.notes
      })),
      notes: transferData.notes
    };

    return await fetchData({
      endpoint: '/stock-releases',
      method: 'POST',
      data: releaseData,
      successMessage: 'Branch transfer request created successfully',
    });
  }, [fetchData]);

  // Update stock release
  const updateStockRelease = useCallback(async (releaseData: UpdateStockReleaseData) => {
    const { id, ...updateData } = releaseData;
    return await fetchData({
      endpoint: `/stock-releases/${id}`,
      method: 'PUT',
      data: updateData,
      successMessage: 'Stock release updated successfully',
    });
  }, [fetchData]);

  // Delete stock release
  const deleteStockRelease = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/stock-releases/${id}`,
      method: 'DELETE',
      successMessage: 'Stock release deleted successfully',
    });
  }, [fetchData]);

  // Approve stock release
  const approveStockRelease = useCallback(async (id: string, approvalData?: ApproveReleaseData) => {
    return await fetchData({
      endpoint: `/stock-releases/${id}/approve`,
      method: 'POST',
      data: approvalData,
      successMessage: 'Stock release approved successfully',
    });
  }, [fetchData]);

  // Release stock (deduct from source branch)
  const releaseStock = useCallback(async (id: string, releaseData?: ReleaseStockData) => {
    return await fetchData({
      endpoint: `/stock-releases/${id}/release`,
      method: 'POST',
      data: releaseData,
      successMessage: 'Stock released successfully',
    });
  }, [fetchData]);

  // Receive stock (add to destination branch)
  const receiveStock = useCallback(async (id: string, receiveData?: ReceiveStockData) => {
    return await fetchData({
      endpoint: `/stock-releases/${id}/receive`,
      method: 'POST',
      data: receiveData,
      successMessage: 'Stock received successfully',
    });
  }, [fetchData]);

  // Cancel stock release
  const cancelStockRelease = useCallback(async (id: string, reason?: string) => {
    return await fetchData({
      endpoint: `/stock-releases/${id}/cancel`,
      method: 'POST',
      data: { reason },
      successMessage: 'Stock release cancelled successfully',
    });
  }, [fetchData]);

  // Complete stock release (for manual completion)
  const completeStockRelease = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/stock-releases/${id}/complete`,
      method: 'POST',
      successMessage: 'Stock release completed successfully',
    });
  }, [fetchData]);

  // Check stock availability before transfer
  const checkStockAvailability = useCallback(async (locationId: string, productId: string, quantity: number) => {
    return await fetchData({
      endpoint: `/stock-releases/check-availability`,
      method: 'POST',
      data: { locationId, productId, quantity },
      silent: true
    });
  }, [fetchData]);

  // Get transfer statistics
  const getTransferStats = useCallback(async (branchId?: string) => {
    const endpoint = branchId 
      ? `/stock-releases/stats?branchId=${branchId}`
      : '/stock-releases/stats';
    
    const result = await fetchData({
      endpoint,
      method: 'GET',
      silent: true
    });

    if (result?.data) {
      setStats(result.data as StockTransferStats);
    }

    return result;
  }, [fetchData]);

  return {
    // State
    stockReleases: data?.data as StockRelease[] | undefined,
    stats,
    loading,
    error,
    
    // Methods - General
    getAllStockReleases,
    getStockReleaseById,
    createStockRelease,
    updateStockRelease,
    deleteStockRelease,
    
    // Methods - Transfer Specific
    createBranchTransfer,
    getPendingTransfers,
    getInTransitTransfers,
    getBranchTransfers,
    
    // Methods - Workflow
    approveStockRelease,
    releaseStock,
    receiveStock,
    cancelStockRelease,
    completeStockRelease,
    
    // Methods - Helpers
    checkStockAvailability,
    getTransferStats,
    getStockTransferStats: getTransferStats,
    
    reset,
  };
};

export default useStockTransfer;

