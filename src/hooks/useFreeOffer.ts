/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

export interface FreeOfferEligibleItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
    unitPrice?: number;
    isService?: boolean;
    isReload?: boolean;
  };
}

export interface FreeOfferItem {
  id: string;
  businessId: string;
  name: string;
  triggerProductId: string;
  triggerProduct?: {
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
    unitPrice?: number;
  };
  buyQuantity: number;
  freeQuantity: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  priority: number;
  eligibleItems?: FreeOfferEligibleItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface FreeOfferFilters {
  page?: number;
  limit?: number;
  search?: string;
  triggerProductId?: string;
  isActive?: boolean | string;
}

export interface CreateFreeOfferData {
  name: string;
  triggerProductId: string;
  buyQuantity: number;
  freeQuantity: number;
  eligibleProductIds: string[];
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  priority?: number;
}

interface UpdateFreeOfferData extends Partial<CreateFreeOfferData> {
  id: string;
}

const useFreeOffer = () => {
  const { businessId } = useAuth() as any;
  const { fetchData } = useFetch();

  const getAllFreeOffers = useCallback(
    async (filters?: FreeOfferFilters) => {
      const params = new URLSearchParams();
      if (filters) {
        if (filters.page) params.set('page', String(filters.page));
        if (filters.limit) params.set('limit', String(filters.limit));
        if (filters.search) params.set('search', filters.search);
        if (filters.triggerProductId) {
          params.set('triggerProductId', filters.triggerProductId);
        }
        if (filters.isActive !== undefined) {
          params.set('isActive', String(filters.isActive));
        }
      }
      const qs = params.toString();
      return await fetchData({
        endpoint: `/free-offers${qs ? `?${qs}` : ''}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetchData],
  );

  const getActiveFreeOffers = useCallback(
    async (triggerProductId?: string) => {
      const qs = triggerProductId
        ? `?triggerProductId=${encodeURIComponent(triggerProductId)}`
        : '';
      return await fetchData({
        endpoint: `/free-offers/active${qs}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetchData],
  );

  const createFreeOffer = useCallback(
    async (data: CreateFreeOfferData) => {
      return await fetchData({
        endpoint: '/free-offers',
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Free offer created successfully',
      });
    },
    [fetchData, businessId],
  );

  const updateFreeOffer = useCallback(
    async (data: UpdateFreeOfferData) => {
      const { id, ...updateData } = data;
      return await fetchData({
        endpoint: `/free-offers/${id}`,
        method: 'PUT',
        data: updateData,
        successMessage: 'Free offer updated successfully',
      });
    },
    [fetchData],
  );

  const deleteFreeOffer = useCallback(
    async (id: string) => {
      return await fetchData({
        endpoint: `/free-offers/${id}`,
        method: 'DELETE',
        successMessage: 'Free offer deleted successfully',
      });
    },
    [fetchData],
  );

  return useMemo(
    () => ({
      getAllFreeOffers,
      getActiveFreeOffers,
      createFreeOffer,
      updateFreeOffer,
      deleteFreeOffer,
    }),
    [
      getAllFreeOffers,
      getActiveFreeOffers,
      createFreeOffer,
      updateFreeOffer,
      deleteFreeOffer,
    ],
  );
};

export default useFreeOffer;
