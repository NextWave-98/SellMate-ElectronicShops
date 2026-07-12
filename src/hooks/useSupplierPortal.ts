import { useCallback } from 'react';
import useFetch from './useFetch';
import alert from '../utils/alert';

const getAuthHeaders = () => {
  const token = localStorage.getItem('supplierAccessToken');
  return token || undefined;
};

export const useSupplierPortal = () => {
  const { fetchData: fetchDashboard, loading: dashboardLoading } = useFetch('/supplier-portal/dashboard');
  const { fetchData: fetchProfile } = useFetch('/supplier-portal/profile');
  const { fetchData: fetchUpdateProfile } = useFetch('/supplier-portal/profile', { method: 'PUT' });
  const { fetchData: fetchPurchaseOrders } = useFetch('/supplier-portal/purchase-orders');
  const { fetchData: fetchPurchaseOrderById } = useFetch();
  const { fetchData: fetchPayments } = useFetch('/supplier-portal/payments');

  // Get Dashboard Stats
  const getDashboard = useCallback(async () => {
    try {
      const response = await fetchDashboard({
        accessToken: getAuthHeaders(),
        silent: true,
      });
      
      if (response?.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      return null;
    }
  }, [fetchDashboard]);

  // Get Profile
  const getProfile = useCallback(async () => {
    try {
      const response = await fetchProfile({
        accessToken: getAuthHeaders(),
        silent: true,
      });
      
      if (response?.success) {
        return response.data.supplier;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, [fetchProfile]);

  // Update Profile
  const updateProfile = useCallback(async (data: any) => {
    try {
      const response = await fetchUpdateProfile({
        accessToken: getAuthHeaders(),
        data,
        silent: false,
        successMessage: 'Profile updated successfully',
      });
      
      if (response?.success) {
        return response.data;
      }
      throw new Error(response?.message || 'Failed to update profile');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      alert.error(errorMessage);
      throw error;
    }
  }, [fetchUpdateProfile]);

  // Get Purchase Orders
  const getPurchaseOrders = useCallback(async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }) => {
    try {
      const response = await fetchPurchaseOrders({
        accessToken: getAuthHeaders(),
        data: params,
        silent: true,
      });
      
      if (response?.success) {
        return {
          orders: response.data.purchaseOrders || [],
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.pageSize || 10,
        };
      }
      return { orders: [], total: 0, page: 1, pageSize: 10 };
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return { orders: [], total: 0, page: 1, pageSize: 10 };
    }
  }, [fetchPurchaseOrders]);

  // Get Purchase Order by ID
  const getPurchaseOrderById = useCallback(async (id: string) => {
    try {
      const response = await fetchPurchaseOrderById({
        endpoint: `/supplier-portal/purchase-orders/${id}`,
        accessToken: getAuthHeaders(),
        silent: true,
      });
      
      if (response?.success) {
        return response.data.purchaseOrder;
      }
      return null;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      return null;
    }
  }, [fetchPurchaseOrderById]);

  // Get Payments
  const getPayments = useCallback(async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await fetchPayments({
        accessToken: getAuthHeaders(),
        data: params,
        silent: true,
      });
      
      if (response?.success) {
        return {
          payments: response.data.payments || [],
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.pageSize || 10,
        };
      }
      return { payments: [], total: 0, page: 1, pageSize: 10 };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return { payments: [], total: 0, page: 1, pageSize: 10 };
    }
  }, [fetchPayments]);

  return {
    getDashboard,
    getProfile,
    updateProfile,
    getPurchaseOrders,
    getPurchaseOrderById,
    getPayments,
    loading: dashboardLoading,
  };
};
