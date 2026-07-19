import { useCallback } from 'react';
import useFetch from './useFetch';
import { LocationType } from '../types/location.types';
import type { 
 
  CreateLocationDTO, 
  UpdateLocationDTO, 
  LocationFilters
} from '../types/location.types';

export const useLocation = () => {
  const { fetchData, loading, error, data, reset } = useFetch();

  // Get all locations with filters
  const getAllLocations = useCallback(async (filters?: LocationFilters) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    queryParams.set('branch', 'all');
    const endpoint = `/locations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get locations by type
  const getLocationsByType = useCallback(async (type: LocationType) => {
    return await fetchData({
      endpoint: `/locations/type/${type}`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get warehouses only
  const getWarehouses = useCallback(async () => {
    return await fetchData({
      endpoint: '/locations/warehouses',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get branches only (for backward compatibility and filtering)
  const getBranches = useCallback(async () => {
    return await fetchData({
      endpoint: '/locations/branches',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get stores only
  const getStores = useCallback(async () => {
    return await fetchData({
      endpoint: '/locations/type/STORE',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get outlets only
  const getOutlets = useCallback(async () => {
    return await fetchData({
      endpoint: '/locations/type/OUTLET',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get main warehouse
  const getMainWarehouse = useCallback(async () => {
    return await fetchData({
      endpoint: '/locations/warehouse/main',
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get location by ID
  const getLocationById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/locations/${id}`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Create location (warehouse, branch, store, or outlet)
  const createLocation = useCallback(async (data: CreateLocationDTO) => {
    const locationTypeLabel = data.locationType.toLowerCase();
    return await fetchData({
      endpoint: '/locations',
      method: 'POST',
      data,
      successMessage: `${locationTypeLabel.charAt(0).toUpperCase() + locationTypeLabel.slice(1)} created successfully`
    });
  }, [fetchData]);

  // Update location
  const updateLocation = useCallback(async (id: string, data: UpdateLocationDTO) => {
    return await fetchData({
      endpoint: `/locations/${id}`,
      method: 'PUT',
      data,
      successMessage: 'Location updated successfully'
    });
  }, [fetchData]);

  // Delete location
  const deleteLocation = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/locations/${id}`,
      method: 'DELETE',
      successMessage: 'Location deleted successfully'
    });
  }, [fetchData]);

  // Get location users
  const getLocationUsers = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/locations/${id}/users`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get location inventory
  const getLocationInventory = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/locations/${id}/inventory`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Get location statistics
  const getLocationStats = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/locations/${id}/stats`,
      method: 'GET',
      silent: true
    });
  }, [fetchData]);

  // Assign user to location
  const assignUserToLocation = useCallback(async (userId: string, locationId: string) => {
    return await fetchData({
      endpoint: '/locations/assign-user',
      method: 'POST',
      data: { userId, locationId },
      successMessage: 'User assigned to location successfully'
    });
  }, [fetchData]);

  // Unassign user from location
  const unassignUserFromLocation = useCallback(async (userId: string) => {
    return await fetchData({
      endpoint: `/locations/unassign-user/${userId}`,
      method: 'DELETE',
      successMessage: 'User unassigned from location successfully'
    });
  }, [fetchData]);

  // ===== BACKWARD COMPATIBILITY ALIASES =====
  // These allow existing code using branch terminology to continue working
  const getAllBranches = getBranches;
  const getBranchById = getLocationById;
  const createBranch = createLocation;
  const updateBranch = updateLocation;
  const deleteBranch = deleteLocation;

  return {
    // Location operations (new)
    getAllLocations,
    getLocationsByType,
    getWarehouses,
    getBranches,
    getStores,
    getOutlets,
    getMainWarehouse,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationUsers,
    getLocationInventory,
    getLocationStats,
    assignUserToLocation,
    unassignUserFromLocation,
    
    // Backward compatibility (old branch methods)
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
    
    // State
    loading,
    error,
    data,
    reset
  };
};
