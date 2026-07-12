// Stock Transfer Types
export interface StockReleaseItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    productCode: string;
    sku?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface StockRelease {
  id: string;
  releaseNumber: string;
  releaseType: 'JOB_USAGE' | 'BRANCH_TRANSFER' | 'INTERNAL_USE' | 'SAMPLE' | 'PROMOTION' | 'DISPOSAL' | 'OTHER';
  releaseDate: string;
  status: 'PENDING' | 'APPROVED' | 'RELEASED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
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
  items?: Array<{
    id: string;
    productId: string;
    product: {
      name: string;
      sku: string;
    };
    quantity: number;
    unitPrice?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransferFilters {
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

export interface StockTransferStats {
  totalTransfers: number;
  pendingTransfers: number;
  pendingApprovals: number;
  inTransitTransfers: number;
  inTransit: number;
  completedTransfers: number;
  completed: number;
  cancelledTransfers: number;
  cancelled: number;
  totalItemsTransferred: number;
  totalValue: number;
}
