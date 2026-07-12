// Permission Management Types

export interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface PermissionsListResponse {
  permissions: Permission[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PermissionFilters {
  search?: string;
  module?: string;
  page?: number;
  limit?: number;
}
