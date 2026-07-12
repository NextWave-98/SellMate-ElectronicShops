import { useState, useCallback } from 'react';
import useFetch from './useFetch';
import type {
  Permission,
  PermissionsListResponse,
  PermissionFilters,
  PermissionGroup,
} from '../types/permission.types';

export const usePermissionManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissionsFetch = useFetch<PermissionsListResponse>('/permissions');
  const permissionByIdFetch = useFetch<Permission>('/permissions/:id');

  /**
   * Get all permissions with optional filters
   */
  const getAllPermissions = useCallback(
    async (filters?: PermissionFilters) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        
        if (filters?.page) queryParams.append('page', filters.page.toString());
        if (filters?.limit) queryParams.append('limit', filters.limit.toString());
        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.module) queryParams.append('module', filters.module);

        const endpoint = queryParams.toString() 
          ? `/permissions?${queryParams.toString()}` 
          : '/permissions';

        const response = await permissionsFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch permissions';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Get permission by ID
   */
  const getPermissionById = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await permissionByIdFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint: `/permissions/${id}`,
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch permission';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Group permissions by module
   */
  const groupPermissionsByModule = useCallback((permissions: Permission[]): PermissionGroup[] => {
    const grouped = permissions.reduce((acc, permission) => {
      const module = permission.module || 'other';
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return Object.entries(grouped).map(([module, permissions]) => ({
      module,
      permissions,
    }));
  }, []);

  return {
    loading,
    error,
    getAllPermissions,
    getPermissionById,
    groupPermissionsByModule,
    // Expose fetch loading states
    isLoading: permissionsFetch.loading || permissionByIdFetch.loading || loading,
  };
};

export default usePermissionManagement;
