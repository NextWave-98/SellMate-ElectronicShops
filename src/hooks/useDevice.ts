import { useCallback } from 'react';
import useFetch from './useFetch';

// Device Types
export interface Device {
  id: string;
  customerId: string;
  deviceType: 'MOBILE' | 'TABLET' | 'LAPTOP' | 'DESKTOP' | 'SMARTWATCH' | 'OTHER';
  brand: string;
  model: string;
  serialNumber?: string | null;
  imei?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    customerId: string;
    name: string;
    phone: string;
  };
}

export interface CreateDeviceData {
  customerId: string;
  deviceType: 'MOBILE' | 'TABLET' | 'LAPTOP' | 'DESKTOP' | 'SMARTWATCH' | 'OTHER';
  brand: string;
  model: string;
  serialNumber?: string | null;
  imei?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
}

export interface UpdateDeviceData {
  deviceType?: 'MOBILE' | 'TABLET' | 'LAPTOP' | 'DESKTOP' | 'SMARTWATCH' | 'OTHER';
  brand?: string;
  model?: string;
  serialNumber?: string | null;
  imei?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

const useDevice = () => {
  const getDevicesFetch = useFetch();
  const getDeviceByIdFetch = useFetch();
  const getCustomerDevicesFetch = useFetch();
  const createDeviceFetch = useFetch();
  const updateDeviceFetch = useFetch();
  const deleteDeviceFetch = useFetch();
  const getDeviceJobSheetsFetch = useFetch();

  // Get all devices with pagination and filters
  const getDevices = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      customerId?: string;
      deviceType?: string;
      isActive?: boolean;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.customerId) queryParams.append('customerId', params.customerId);
      if (params?.deviceType) queryParams.append('deviceType', params.deviceType);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      return getDevicesFetch.fetchData({
        endpoint: `/devices?${queryParams.toString()}`,
        method: 'GET',
        silent: true,
      });
    },
    [getDevicesFetch]
  );

  // Get device by ID
  const getDeviceById = useCallback(
    async (id: string) => {
      return getDeviceByIdFetch.fetchData({
        endpoint: `/devices/${id}`,
        method: 'GET',
        silent: true,
      });
    },
    [getDeviceByIdFetch]
  );

  // Get customer's devices
  const getCustomerDevices = useCallback(
    async (customerId: string) => {
      return getCustomerDevicesFetch.fetchData({
        endpoint: `/customers/${customerId}/devices`,
        method: 'GET',
        silent: true,
      });
    },
    [getCustomerDevicesFetch]
  );

  // Create device
  const createDevice = useCallback(
    async (data: CreateDeviceData) => {
      return createDeviceFetch.fetchData({
        endpoint: '/devices',
        method: 'POST',
        data,
        successMessage: 'Device registered successfully!',
      });
    },
    [createDeviceFetch]
  );

  // Update device
  const updateDevice = useCallback(
    async (id: string, data: UpdateDeviceData) => {
      return updateDeviceFetch.fetchData({
        endpoint: `/devices/${id}`,
        method: 'PUT',
        data,
        successMessage: 'Device updated successfully!',
      });
    },
    [updateDeviceFetch]
  );

  // Delete device
  const deleteDevice = useCallback(
    async (id: string) => {
      return deleteDeviceFetch.fetchData({
        endpoint: `/devices/${id}`,
        method: 'DELETE',
        successMessage: 'Device deleted successfully!',
      });
    },
    [deleteDeviceFetch]
  );

  // Get device repair history
  const getDeviceJobSheets = useCallback(
    async (deviceId: string) => {
      return getDeviceJobSheetsFetch.fetchData({
        endpoint: `/devices/${deviceId}/jobsheets`,
        method: 'GET',
        silent: true,
      });
    },
    [getDeviceJobSheetsFetch]
  );

  return {
    getDevices,
    getDeviceById,
    getCustomerDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    getDeviceJobSheets,
    loading: createDeviceFetch.loading || updateDeviceFetch.loading || deleteDeviceFetch.loading,
  };
};

export default useDevice;
