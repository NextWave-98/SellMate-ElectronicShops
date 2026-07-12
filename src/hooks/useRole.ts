import { useState, useCallback } from 'react';
import useFetch from './useFetch';

// Backend API response types
interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
  _count?: {
    users: number;
  };
}

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
}

interface RoleListResponse {
  roles: Role[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface RoleFilters {
  search?: string;
  page?: number;
  limit?: number;
}

interface CreateRolePayload {
  name: string;
  description?: string;
  permissionNames?: string[];
}

interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissionNames?: string[];
}

export const useRole = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleListFetch = useFetch<RoleListResponse>('/roles');
  const roleByIdFetch = useFetch<Role>('/roles/:id');
  const createRoleFetch = useFetch<Role>('/roles');
  const updateRoleFetch = useFetch<Role>('/roles/:id');
  const deleteRoleFetch = useFetch<{ message: string }>('/roles/:id');

  /**
   * Get all roles with pagination and search
   */
  const getAllRoles = useCallback(async (filters: RoleFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { search = '', page = 1, limit = 10 } = filters;
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      if (search) {
        queryParams.append('search', search);
      }

      const response = await roleListFetch.fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/roles?${queryParams.toString()}`,
      });
      
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch roles';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Get role by ID
   */
  const getRoleById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await roleByIdFetch.fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/roles/${id}`,
      });
      
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch role';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Create a new custom role
   */
  const createRole = useCallback(async (payload: CreateRolePayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createRoleFetch.fetchData({
        method: 'POST',
        endpoint: '/roles',
        data: payload,
      });
      
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create role';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Update an existing role
   */
  const updateRole = useCallback(async (id: string, payload: UpdateRolePayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await updateRoleFetch.fetchData({
        method: 'PUT',
        endpoint: `/roles/${id}`,
        data: payload,
      });
      
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update role';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Delete a role
   */
  const deleteRole = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await deleteRoleFetch.fetchData({
        method: 'DELETE',
        endpoint: `/roles/${id}`,
      });
      
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete role';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    error,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
  };
};
