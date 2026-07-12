// Location Types - Aligned with Backend Location System

export enum LocationType {
  WAREHOUSE = "WAREHOUSE",
  BRANCH = "BRANCH",
  STORE = "STORE",
  OUTLET = "OUTLET"
}

export interface Location {
  id: string;
  name: string;
  locationCode: string;
  locationType: LocationType;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  
  // Warehouse-specific fields
  isMainWarehouse?: boolean;
  warehouseCapacity?: number | null;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Relations
  _count?: {
    users: number;
    inventory: number;
  };
  users?: LocationUser[];
}

export interface LocationUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  role: {
    id: string;
    name: string;
    description?: string | null;
  };
}

export interface LocationStats {
  location: {
    id: string;
    name: string;
    locationCode: string;
    locationType: LocationType;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalInventoryItems: number;
    totalInventoryValue: number;
    usersByRole: {
      role: string;
      count: number;
    }[];
  };
}

export interface CreateLocationDTO {
  name: string;
  locationCode: string;
  locationType: LocationType;
  address?: string;
  phone?: string;
  email?: string;
  isMainWarehouse?: boolean;
  warehouseCapacity?: number;
}

export interface UpdateLocationDTO {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  warehouseCapacity?: number;
}

export interface LocationFilters {
  type?: LocationType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  warehouseOr?: boolean;
}

export interface LocationInventorySummary {
  location: {
    id: string;
    name: string;
    locationCode: string;
    locationType: LocationType;
  };
  summary: {
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

// Backward compatibility type alias
export type Branch = Location;
export type BranchUser = LocationUser;
export type BranchStats = LocationStats;
