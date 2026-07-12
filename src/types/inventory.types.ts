export interface Inventory {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  locationId: string; // Changed from shopId
  shopName?: string; // For display purposes
  branchCode?: string; // For display purposes
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType?: string;
  };
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  branchId?: string;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  totalValue: number;
  status: InventoryStatus;
  lastRestocked?: string;
  lastUpdated?: string;
  supplier?: string;
  warehouseLocation?: string; // Warehouse location within shop (renamed from location)
}

export const InventoryStatus = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  OVERSTOCKED: 'overstocked',
} as const;

export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus];

export interface CreateInventoryDTO {
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  locationId: string; // Changed from shopId
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  supplier?: string;
  warehouseLocation?: string; // Renamed from location
}

export interface UpdateInventoryDTO {
  quantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  unitPrice?: number;
  supplier?: string;
  location?: string;
  status?: InventoryStatus;
}

export interface InventoryFilters {
  status?: InventoryStatus;
  locationId?: string; // Changed from shopId
  category?: string;
  searchQuery?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalShops: number;
}

export interface LocationInventorySummary {
  locationId: string; // Changed from shopId
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// Backward compatibility alias
export type ShopInventorySummary = LocationInventorySummary;
