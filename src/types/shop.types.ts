// Branch/Shop Types - Aligned with Backend API
export interface Shop {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  phone2?: string | null;
  phone3?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
  users?: BranchUser[];
}

export interface BranchUser {
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

export interface BranchStats {
  branch: {
    id: string;
    name: string;
    code: string;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: {
      role: string;
      count: number;
    }[];
  };
}

export const ShopStatus = {
  ACTIVE: true,
  INACTIVE: false,
} as const;

export type ShopStatus = boolean;

export interface CreateShopDTO {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  phone2?: string;
  phone3?: string;
  email?: string;
}

export interface UpdateShopDTO {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  isActive?: boolean;
}

export interface ShopFilters {
  isActive?: boolean;
  searchQuery?: string;
}

export interface ShopStats {
  totalShops: number;
  activeShops: number;
  inactiveShops: number;
  totalUsers: number;
}

export interface BranchResponse {
  branches: Shop[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AssignUserDTO {
  userId: string;
  branchId: string;
}
