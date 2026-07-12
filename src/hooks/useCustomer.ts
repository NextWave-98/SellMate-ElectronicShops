import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

// Customer Types
export interface Customer {
  id: string;
  customerId: string;
  name: string;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  nicNumber?: string | null;
  branchId?: string | null;
  customerType: 'WALK_IN' | 'REGULAR' | 'VIP';
  loyaltyPoints: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalSales?: number;
  totalPurchases?: number;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  email?: string | null;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  nicNumber?: string | null;
  locationId?: string | null; // Preferred
  branchId?: string | null; // Deprecated: use locationId
  customerType?: 'WALK_IN' | 'REGULAR' | 'VIP';
  loyaltyPoints?: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string | null;
  phone?: string;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  nicNumber?: string | null;
  locationId?: string | null; // Preferred
  branchId?: string | null; // Deprecated: use locationId
  customerType?: 'WALK_IN' | 'REGULAR' | 'VIP';
  loyaltyPoints?: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: 'WALK_IN' | 'REGULAR' | 'VIP';
  locationId?: string; // Preferred
  branchId?: string; // Deprecated: use locationId
  isActive?: boolean;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  blocked: number;
  vip: number;
  regular: number;
  walkIn: number;
}

export interface PaginatedCustomersResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AddLoyaltyPointsData {
  points: number;
}

/**
 * Custom hook for managing customer operations
 * Integrates with backend customer APIs using useFetch
 */
const useCustomer = () => {
  const { fetchData: baseFetchData } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  /**
   * Create a new customer
   * POST /customers
   */
  const createCustomer = useCallback(
    async (customerData: CreateCustomerData, silent = false) => {
      return await baseFetchData({
        endpoint: '/customers',
        method: 'POST',
        data: { ...customerData, businessId },
        silent,
        successMessage: 'Customer created successfully',
      });
    },
    [baseFetchData, businessId]
  );

  /**
   * Get all customers with pagination and filters
   * GET /customers/all
   */
  const getCustomers = useCallback(
    async (params?: CustomerQueryParams, silent = true) => {
      const queryData = { ...params, businessId };
      return await baseFetchData({
        endpoint: '/customers/all',
        method: 'GET',
        data: queryData,
        silent,
      });
    },
    [baseFetchData, businessId]
  );

  /**
   * Get customer by ID (UUID)
   * GET /customers/:id
   */
  const getCustomerById = useCallback(
    async (id: string, silent = true) => {
      return await baseFetchData({
        endpoint: `/customers/${id}`,
        method: 'GET',
        silent,
      });
    },
    [baseFetchData]
  );

  /**
   * Get customer by Customer ID/Code (e.g., CUS0001)
   * GET /customers/code/:customerId
   */
  const getCustomerByCustomerId = useCallback(
    async (customerId: string, silent = true) => {
      return await baseFetchData({
        endpoint: `/customers/code/${customerId}`,
        method: 'GET',
        silent,
      });
    },
    [baseFetchData]
  );

  /**
   * Update customer by ID
   * PUT /customers/:id
   */
  const updateCustomer = useCallback(
    async (id: string, customerData: UpdateCustomerData, silent = false) => {
      return await baseFetchData({
        endpoint: `/customers/${id}`,
        method: 'PUT',
        data: { ...customerData, businessId },
        silent,
        successMessage: 'Customer updated successfully',
      });
    },
    [baseFetchData, businessId]
  );

  /**
   * Delete customer by ID
   * DELETE /customers/:id
   */
  const deleteCustomer = useCallback(
    async (id: string, silent = false) => {
      console.log('useCustomer.deleteCustomer called with:', {
        id,
        idType: typeof id,
        endpoint: `/customers/${id}`,
      });
      
      return await baseFetchData({
        endpoint: `/customers/${id}`,
        method: 'DELETE',
        silent,
        successMessage: 'Customer deleted successfully',
      });
    },
    [baseFetchData]
  );

  /**
   * Add loyalty points to a customer
   * POST /customers/:id/loyalty-points
   */
  const addLoyaltyPoints = useCallback(
    async (id: string, points: number, silent = false) => {
      return await baseFetchData({
        endpoint: `/customers/${id}/loyalty-points`,
        method: 'POST',
        data: { points, businessId },
        silent,
        successMessage: `${points} loyalty points added successfully`,
      });
    },
    [baseFetchData, businessId]
  );

  /**
   * Get customer statistics
   * GET /customers/stats
   */
  const getCustomerStats = useCallback(
    async (branchId?: string, silent = true) => {
      const params = branchId ? { branchId } : undefined;
      return await baseFetchData({
        endpoint: '/customers/stats',
        method: 'GET',
        data: params,
        silent,
      });
    },
    [baseFetchData]
  );

  /**
   * Search customers by name, phone, or customer ID
   * GET /customers/search
   */
  const searchCustomers = useCallback(
    async (searchTerm: string, limit = 10, silent = true) => {
      return await baseFetchData({
        endpoint: '/customers/search',
        method: 'GET',
        data: { search: searchTerm, limit },
        silent,
      });
    },
    [baseFetchData]
  );

  return {
    createCustomer,
    getCustomers,
    getCustomerById,
    getCustomerByCustomerId,
    updateCustomer,
    deleteCustomer,
    addLoyaltyPoints,
    getCustomerStats,
    searchCustomers,
  };
};

export default useCustomer;
