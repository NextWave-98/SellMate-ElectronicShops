/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

export interface InventoryItem {
  branchId: string;
  branch: any;
  id: string;
  productId: string;
  product?: {
    id: string;
    productCode: string;
    sku: string;
    name: string;
    brand?: string;
    model?: string;
    category: {
      id: string;
      name: string;
      categoryCode: string;
    };
    unitPrice: number;
    costPrice: number;
    primaryImage?: string;
    warrantyMonths: number;
    isActive: boolean;
    discountInfo?: {
      discountId: string;
      discountName: string;
      discountType: 'PERCENTAGE' | 'FIXED';
      discountValue: number;
      discountAmount: number;
      effectivePrice: number;
      startDate?: string | null;
      endDate?: string | null;
      scope: 'product' | 'category';
    } | null;
  };
  locationId: string; // Changed from branchId
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  warehouseLocation?: string;
  zone?: string;
  averageCost: number;
  totalValue: number;
  lastRestocked?: string;
  lastStockCheck?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  locationId?: string; // Changed from branchId
  productId?: string;
  category?: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' | '';
  lowStock?: boolean;
  availableOnly?: boolean;
  sortBy?: 'quantity' | 'productCode' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  includeDiscount?: boolean;
  includeServices?: boolean;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalQuantity: number;
  categoryBreakdown: Record<string, number>;
}

interface AdjustStockData {
  quantity: number;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED';
  notes?: string;
  referenceId?: string;
  referenceType?: string;
}

interface TransferStockData {
  fromLocationId: string; // Changed from fromBranchId
  toLocationId: string; // Changed from toBranchId
  productId: string;
  quantity: number;
  notes?: string;
}

interface CreateInventoryData {
  productId: string;
  locationId: string; // Changed from branchId
  quantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  zone?: string;
}

interface UpdateInventoryData {
  id: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  zone?: string;
}

interface StockMovement {
  id: string;
  productId: string;
  movementType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  notes?: string;
  createdAt: string;
  product?: {
    id: string;
    productCode: string;
    sku: string;
    name: string;
    brand?: string;
    category: {
      id: string;
      name: string;
      categoryCode: string;
    };
  };
}

export const useInventory = () => {
  const { fetchData, loading, error, data, reset } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  // Get all inventory items with filters
  const getAllInventory = useCallback(async (filters?: InventoryFilters) => {
    const queryParams = new URLSearchParams();
    if (businessId) queryParams.append('businessId', businessId);
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
      method: 'GET',
      silent: true
    });
  }, [fetchData, businessId]);

  // Get low stock items
  const getLowStockItems = useCallback(async () => {
    return await fetchData({
      endpoint: '/inventory/low-stock',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get inventory statistics
  const getInventoryStats = useCallback(async () => {
    return await fetchData({
      endpoint: '/inventory/stats',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get dashboard statistics with optional location filter and pagination
  const getDashboardStats = useCallback(async (locationId?: string, page?: number, limit?: number) => {
    const queryParams = new URLSearchParams();
    if (locationId) queryParams.append('locationId', locationId);
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    const endpoint = `/inventory/dashboard-stats-store${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get inventory by ID
  const getInventoryById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/inventory/${id}`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Create inventory
  const createInventory = useCallback(async (inventoryData: CreateInventoryData) => {
    return await fetchData({
      endpoint: '/inventory',
      method: 'POST',
      data: { ...inventoryData, businessId },
      successMessage: 'Inventory created successfully',
    });
  }, [fetchData, businessId]);

  // Update inventory
  const updateInventory = useCallback(async (inventoryData: UpdateInventoryData) => {
    const { id, ...updateData } = inventoryData;
    return await fetchData({
      endpoint: `/inventory/${id}`,
      method: 'PUT',
      data: { ...updateData, businessId },
      successMessage: 'Inventory updated successfully',
    });
  }, [fetchData, businessId]);

  // Delete inventory
  const deleteInventory = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/inventory/${id}`,
      method: 'DELETE',
      successMessage: 'Inventory deleted successfully',
    });
  }, [fetchData]);

  // Adjust stock
  const adjustStock = useCallback(async (id: string, adjustData: AdjustStockData) => {
    return await fetchData({
      endpoint: `/inventory/${id}/adjust`,
      method: 'POST',
      data: { ...adjustData, businessId },
      successMessage: 'Stock adjusted successfully',
    });
  }, [fetchData, businessId]);

  // Transfer stock between branches
  const transferStock = useCallback(async (transferData: TransferStockData) => {
    return await fetchData({
      endpoint: '/inventory/transfer',
      method: 'POST',
      data: { ...transferData, businessId },
      successMessage: 'Stock transferred successfully',
    });
  }, [fetchData, businessId]);

  // Get stock movements
  const getStockMovements = useCallback(async (productId?: string, locationId?: string) => {
    const queryParams = new URLSearchParams();
    if (productId) queryParams.append('productId', productId);
    if (locationId) queryParams.append('locationId', locationId);
    const endpoint = `/inventory/movements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get location inventory (renamed from getBranchInventory)
  const getLocationInventory = useCallback(async (locationId: string) => {
    return await fetchData({
      endpoint: `/inventory/location/${locationId}`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  const getLocationPartInventory = useCallback(async (locationId: string) => {
    return await fetchData({
      endpoint: `/inventory/location/${locationId}/parts`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Backward compatibility alias
  const getBranchInventory = getLocationInventory;

  return {
    // State
    inventory: data?.data as InventoryItem[] | undefined,
    inventoryItem: data?.data as InventoryItem | undefined,
    stats: data?.data as InventoryStats | undefined,
    movements: data?.data as StockMovement[] | undefined,
    loading,
    error,
    
    // Methods
    getAllInventory,
    getLowStockItems,
    getInventoryStats,
    getDashboardStats,
    getInventoryById,
    createInventory,
    updateInventory,
    deleteInventory,
    adjustStock,
    transferStock,
    getStockMovements,
    getLocationInventory,
    getLocationPartInventory,
    getBranchInventory, // Backward compatibility
    reset,
  };
};

export default useInventory;
