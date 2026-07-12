export interface StockItem {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: StockCategory;
  brand: string;
  model?: string;

  // Quantity tracking
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  allocatedQuantity: number; // Allocated to shops but not yet transferred

  // Location
  location: StockLocation;
  warehouseLocation?: string; // Shelf/Bin location in warehouse

  // Pricing
  costPrice: number;
  sellingPrice: number;
  profit: number;

  // Reorder management
  reorderLevel: number; // Minimum quantity before reorder
  reorderQuantity: number; // Quantity to reorder
  maxStockLevel: number;

  // Supplier
  supplierName: string;
  supplierContact?: string;

  // Status
  status: StockStatus;

  // Metadata
  lastRestocked: string;
  createdAt: string;
  updatedAt: string;
}

export const StockCategory = {
  SMARTPHONE: 'smartphone',
  LAPTOP: 'laptop',
  TABLET: 'tablet',
  ACCESSORY: 'accessory',
  SPARE_PART: 'spare_part',
  CHARGER: 'charger',
  CABLE: 'cable',
  CASE_COVER: 'case_cover',
  SCREEN_PROTECTOR: 'screen_protector',
  HEADPHONE: 'headphone',
  BATTERY: 'battery',
  TOOL: 'tool',
  OTHER: 'other',
} as const;

export type StockCategory = (typeof StockCategory)[keyof typeof StockCategory];

export const StockLocation = {
  CENTRAL_WAREHOUSE: 'central_warehouse',
  SHOP: 'shop',
  IN_TRANSIT: 'in_transit',
} as const;

export type StockLocation = (typeof StockLocation)[keyof typeof StockLocation];

export const StockStatus = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued',
  BACK_ORDER: 'back_order',
} as const;

export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

export interface StockTransfer {
  id: number;
  stockItemId: number;
  stockItemName: string;
  sku: string;
  fromLocation: string;
  toLocation: string;
  toShopId?: number;
  toShopName?: string;
  quantity: number;
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  transferredBy?: string;
  notes?: string;
  requestedDate: string;
  approvedDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const TransferStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
} as const;

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

export interface CreateStockItemDTO {
  sku: string;
  name: string;
  description: string;
  category: StockCategory;
  brand: string;
  model?: string;
  totalQuantity: number;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  reorderQuantity: number;
  maxStockLevel: number;
  supplierName: string;
  supplierContact?: string;
  warehouseLocation?: string;
}

export interface UpdateStockItemDTO {
  name?: string;
  description?: string;
  category?: StockCategory;
  brand?: string;
  model?: string;
  totalQuantity?: number;
  costPrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  maxStockLevel?: number;
  supplierName?: string;
  supplierContact?: string;
  warehouseLocation?: string;
  status?: StockStatus;
}

export interface CreateStockTransferDTO {
  stockItemId: number;
  toShopId: number;
  quantity: number;
  requestedBy: string;
  notes?: string;
}

export interface StockFilters {
  category?: StockCategory;
  status?: StockStatus;
  location?: StockLocation;
  searchQuery?: string;
}

export interface StockStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalQuantity: number;
  categoryBreakdown: {
    smartphones: number;
    laptops: number;
    tablets: number;
    accessories: number;
    spareParts: number;
    others: number;
  };
  pendingTransfers: number;
  recentTransfers: number;
}
