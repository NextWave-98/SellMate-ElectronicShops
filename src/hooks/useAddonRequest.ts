import { useCallback } from 'react';
import useFetch from './useFetch';

export const AddonRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const;

export type AddonRequestStatus = typeof AddonRequestStatus[keyof typeof AddonRequestStatus];

export interface AddonRequest {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    productCode: string;
    sku?: string;
  };
  locationId: string;
  location?: {
    id: string;
    name: string;
    locationCode: string;
  };
  requestedBy: string;
  requestedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  currentQuantity: number;
  requestedQuantity: number;
  remark?: string;
  status: AddonRequestStatus;
  smsNotificationSent: boolean;
  smsDelivered: boolean;
  smsResponse?: string;
  smsMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddonRequestData {
  productId: string;
  locationId: string;
  requestedBy: string;
  currentQuantity: number;
  requestedQuantity: number;
  remark?: string;
}

export interface UpdateAddonRequestData {
  status?: AddonRequestStatus;
  remark?: string;
}

export interface AddonRequestQueryParams {
  productId?: string;
  locationId?: string;
  requestedBy?: string;
  status?: AddonRequestStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AddonRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
}

export const useAddonRequest = () => {
  const { fetchData, loading, error, data, reset } = useFetch();

  // Create a new addon request
  const createAddonRequest = useCallback(async (requestData: CreateAddonRequestData) => {
    return await fetchData({
      endpoint: '/addon-requests',
      method: 'POST',
      data: requestData,
    });
  }, [fetchData]);

  // Get all addon requests with filters
  const getAllAddonRequests = useCallback(async (params?: AddonRequestQueryParams) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const endpoint = `/addon-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await fetchData({
      endpoint,
      method: 'GET',
      silent: true,
    });
  }, [fetchData]);

  // Get a single addon request by ID
  const getAddonRequestById = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/addon-requests/${id}`,
      method: 'GET',
      silent: true,
    });
  }, [fetchData]);

  // Update an addon request
  const updateAddonRequest = useCallback(async (id: string, updateData: UpdateAddonRequestData) => {
    return await fetchData({
      endpoint: `/addon-requests/${id}`,
      method: 'PUT',
      data: updateData,
    });
  }, [fetchData]);

  // Delete an addon request
  const deleteAddonRequest = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/addon-requests/${id}`,
      method: 'DELETE',
    });
  }, [fetchData]);

  // Get addon request statistics
  const getAddonRequestStats = useCallback(async (locationId?: string) => {
    const queryParams = locationId ? `?locationId=${locationId}` : '';
    return await fetchData({
      endpoint: `/addon-requests/stats${queryParams}`,
      method: 'GET',
      silent: true,
    });
  }, [fetchData]);

  // Resend notification for an addon request
  const resendNotification = useCallback(async (id: string) => {
    return await fetchData({
      endpoint: `/addon-requests/${id}/resend-notification`,
      method: 'POST',
    });
  }, [fetchData]);

  return {
    createAddonRequest,
    getAllAddonRequests,
    getAddonRequestById,
    updateAddonRequest,
    deleteAddonRequest,
    getAddonRequestStats,
    resendNotification,
    loading,
    error,
    data,
    reset,
  };
};

export default useAddonRequest;
