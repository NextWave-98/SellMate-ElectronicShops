import { useCallback } from 'react';
import useFetch from './useFetch';

interface InventoryItem {
  id: string;
  partId: string;
  part?: {
    id: string;
    partNumber: string;
    name: string;
    category: string;
    unitPrice: number;
  };
  branchId: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderLevel: number;
  reorderQuantity: number;
  lastRestocked?: string;
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  partId: string;
  part?: {
    id: string;
    partNumber: string;
    name: string;
  };
  branchId: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
  createdAt: string;
}

interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  partId?: string;
  category?: string;
  lowStock?: boolean;
  sortBy?: 'quantity' | 'partNumber' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface StockMovementFilters {
  page?: number;
  limit?: number;
  branchId?: string;
  partId?: string;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalQuantity: number;
  categoryBreakdown: Record<string, number>;
  pendingTransfers: number;
  recentTransfers: number;
}

interface CreateInventoryData {
  partId: string;
  branchId: string;
  quantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

interface UpdateInventoryData extends Partial<CreateInventoryData> {
  id: string;
}

interface AdjustStockData {
  id?: string; // Optional if using POST /inventory/adjust
  quantity: number;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED';
  notes?: string;
  referenceId?: string;
  referenceType?: string;
}

interface TransferStockData {
  partId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
}

export const useStock = () => {
  const { fetchData, loading, error, data, reset } = useFetch();

  // Get all inventory items with filters
  const getAllInventory = useCallback(async (filters?: InventoryFilters) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/inventory${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get low stock items
  const getLowStockItems = useCallback(async () => {
    return await fetchData({
      endpoint: '/inventory/low-stock',
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get stock movements
  const getStockMovements = useCallback(async (filters?: StockMovementFilters) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/inventory/movements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Get inventory by ID
  const getInventoryById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/inventory/${id}`,
      method: 'GET',  silent:true
    });
  }, [fetchData]);

  // Create inventory record
  const createInventory = useCallback(async (inventoryData: CreateInventoryData) => {
    return await fetchData({
      endpoint: '/inventory',
      method: 'POST',
      data: inventoryData,
      successMessage: 'Inventory record created successfully',
    });
  }, [fetchData]);

  // Update inventory
  const updateInventory = useCallback(async (inventoryData: UpdateInventoryData) => {
    const { id, ...updateData } = inventoryData;
    return await fetchData({
      endpoint: `/inventory/${id}`,
      method: 'PUT',
      data: updateData,
      successMessage: 'Inventory updated successfully',
    });
  }, [fetchData]);

  // Adjust stock (using path parameter)
  const adjustStockById = useCallback(async (id: string, adjustData: Omit<AdjustStockData, 'id'>) => {
    return await fetchData({
      endpoint: `/inventory/${id}/adjust`,
      method: 'POST',
      data: adjustData,
      successMessage: 'Stock adjusted successfully',
    });
  }, [fetchData]);

  // Adjust stock (using request body with id)
  const adjustStock = useCallback(async (adjustData: AdjustStockData) => {
    return await fetchData({
      endpoint: '/inventory/adjust',
      method: 'POST',
      data: adjustData,
      successMessage: 'Stock adjusted successfully',
    });
  }, [fetchData]);

  // Transfer stock between branches
  const transferStock = useCallback(async (transferData: TransferStockData) => {
    return await fetchData({
      endpoint: '/inventory/transfer',
      method: 'POST',
      data: transferData,
      successMessage: 'Stock transferred successfully',
    });
  }, [fetchData]);

  // Get inventory statistics (computed from inventory data)
  const getInventoryStats = useCallback(async (branchId?: string) => {
    const filters: InventoryFilters = {};
    if (branchId) {
      filters.branchId = branchId;
    }
    return await getAllInventory(filters);
  }, [getAllInventory]);

  return {
    // State
    inventory: data?.data as InventoryItem[] | undefined,
    inventoryItem: data?.data as InventoryItem | undefined,
    stockMovements: data?.data as StockMovement[] | undefined,
    stats: data?.data as InventoryStats | undefined,
    loading,
    error,
    
    // Methods
    getAllInventory,
    getLowStockItems,
    getStockMovements,
    getInventoryById,
    createInventory,
    updateInventory,
    adjustStock,
    adjustStockById,
    transferStock,
    getInventoryStats,
    reset,
  };
};

export default useStock;
