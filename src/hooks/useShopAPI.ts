/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import useFetch from './useFetch';
import type {
  Shop,
  BranchResponse,
  CreateShopDTO,
  UpdateShopDTO,
  BranchStats,
  AssignUserDTO,
} from '../types/shop.types';

interface UseShopAPIReturn {
  // Get all branches with pagination
  getAllBranches: (page?: number, limit?: number, isActive?: boolean, branch?: string) => Promise<BranchResponse | null>;
  
  // Get single branch by ID
  getBranchById: (id: string) => Promise<Shop | null>;
  
  // Create new branch
  createBranch: (data: CreateShopDTO) => Promise<Shop | null>;
  
  // Update branch
  updateBranch: (id: string, data: UpdateShopDTO) => Promise<Shop | null>;
  
  // Delete branch
  deleteBranch: (id: string) => Promise<{ message: string } | null>;
  
  // Get branch statistics
  getBranchStats: (id: string) => Promise<BranchStats | null>;
  
  // Assign user to branch
  assignUserToBranch: (data: AssignUserDTO) => Promise<any>;
  
  // Unassign user from branch
  unassignUserFromBranch: (userId: string) => Promise<any>;
  
  // Get branch users
  getBranchUsers: (branchId: string, page?: number, limit?: number) => Promise<any>;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
}

export const useShopAPI = (): UseShopAPIReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize useFetch hook
  const { fetchData } = useFetch();

  const getAllBranches = useCallback(
    async (page = 1, limit = 10, isActive?: boolean, branch = 'all'): Promise<BranchResponse | null> => {
      setLoading(true);
      setError(null);
      
      try {
        let endpoint = `/locations?branch=${branch}&page=${page}&limit=${limit}`;
        if (isActive !== undefined) {
          endpoint += `&isActive=${isActive}`;
        }

        const response = await fetchData({
          endpoint,
         method: 'GET',  silent: true,
         
        });

        if (response?.success && response.data) {
          const data = response.data as {
            locations?: Shop[];
            branches?: Shop[];
            pagination?: BranchResponse['pagination'];
          };
          return {
            branches: data.locations ?? data.branches ?? [],
            pagination: data.pagination ?? {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        
        setError(response?.message || 'Failed to fetch branches');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch branches';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const getBranchById = useCallback(
    async (id: string): Promise<Shop | null> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: `/branches/${id}`,
          method: 'GET',
          silent: true,
        });

        if (response?.success && response.data) {
          return response.data as Shop;
        }
        
        setError(response?.message || 'Failed to fetch branch');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch branch';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const createBranch = useCallback(
    async (data: CreateShopDTO): Promise<Shop | null> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: '/branches',
          method: 'POST',
          data,
          successMessage: 'Branch created successfully',
        });

        if (response?.success && response.data) {
          return response.data as Shop;
        }
        
        setError(response?.message || 'Failed to create branch');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create branch';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const updateBranch = useCallback(
    async (id: string, data: UpdateShopDTO): Promise<Shop | null> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: `/branches/${id}`,
          method: 'PUT',
          data,
          successMessage: 'Branch updated successfully',
        });

        if (response?.success && response.data) {
          return response.data as Shop;
        }
        
        setError(response?.message || 'Failed to update branch');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update branch';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const deleteBranch = useCallback(
    async (id: string): Promise<{ message: string } | null> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: `/branches/${id}`,
          method: 'DELETE',
          successMessage: 'Branch deleted successfully',
        });

        if (response?.success && response.data) {
          return response.data as { message: string };
        }
        
        setError(response?.message || 'Failed to delete branch');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete branch';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const getBranchStats = useCallback(
    async (id: string): Promise<BranchStats | null> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: `/branches/${id}/stats`,
          method: 'GET',
          silent: true,
        });

        if (response?.success && response.data) {
          return response.data as BranchStats;
        }
        
        setError(response?.message || 'Failed to fetch branch stats');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch branch stats';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const assignUserToBranch = useCallback(
    async (data: AssignUserDTO): Promise<any> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: '/branches/assign-user',
          method: 'POST',
          data,
          successMessage: 'User assigned to branch successfully',
        });

        if (response?.success && response.data) {
          return response.data;
        }
        
        setError(response?.message || 'Failed to assign user');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to assign user';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const unassignUserFromBranch = useCallback(
    async (userId: string): Promise<any> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: `/branches/unassign-user/${userId}`,
          method: 'DELETE',
          successMessage: 'User unassigned from branch successfully',
        });

        if (response?.success && response.data) {
          return response.data;
        }
        
        setError(response?.message || 'Failed to unassign user');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to unassign user';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const getBranchUsers = useCallback(
    async (branchId: string, page = 1, limit = 10): Promise<any> => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchData({
          endpoint: `/branches/${branchId}/users?page=${page}&limit=${limit}`,
          method: 'GET',
          silent: true,
        });

        if (response?.success && response.data) {
          return response.data;
        }
        
        setError(response?.message || 'Failed to fetch branch users');
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch branch users';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  return {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchStats,
    assignUserToBranch,
    unassignUserFromBranch,
    getBranchUsers,
    loading,
    error,
  };
};

export default useShopAPI;
