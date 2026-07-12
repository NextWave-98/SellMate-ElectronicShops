/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type DiscountScope = 'product' | 'category';

export interface DiscountItem {
  id: string;
  businessId: string;
  name: string;
  productId?: string;
  categoryId?: string;
  product?: { id: string; name: string; productCode: string; unitPrice: number };
  category?: { id: string; name: string; categoryCode: string };
  discountType: DiscountType;
  discountValue: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveDiscount {
  hasDiscount: boolean;
  discount: DiscountItem | null;
  discountAmount?: number;
  effectivePrice: number;
}

export interface DiscountInfoPayload {
  discountId: string;
  discountName: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  effectivePrice: number;
  startDate?: string | null;
  endDate?: string | null;
  scope: DiscountScope;
}

interface DiscountFilters {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  categoryId?: string;
  isActive?: boolean | string;
}

interface CreateDiscountData {
  name: string;
  discountType: DiscountType;
  discountValue: number;
  /** Target a single product */
  productId?: string;
  /** Target a category */
  categoryId?: string;
  /** Target multiple products (bulk) */
  productIds?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

interface UpdateDiscountData extends Partial<CreateDiscountData> {
  id: string;
}

const useDiscount = () => {
  const { businessId } = useAuth() as any;
  const { fetchData } = useFetch();

  /** Fetch all discounts with optional filters */
  const getAllDiscounts = useCallback(
    async (filters?: DiscountFilters) => {
      const params = new URLSearchParams();
      if (filters) {
        if (filters.page) params.set('page', String(filters.page));
        if (filters.limit) params.set('limit', String(filters.limit));
        if (filters.search) params.set('search', filters.search);
        if (filters.productId) params.set('productId', filters.productId);
        if (filters.categoryId) params.set('categoryId', filters.categoryId);
        if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
      }
      const qs = params.toString();
      return await fetchData({
        endpoint: `/discounts${qs ? `?${qs}` : ''}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetchData],
  );

  /** Create a discount (single product, category, or bulk product array) */
  const createDiscount = useCallback(
    async (data: CreateDiscountData) => {
      return await fetchData({
        endpoint: '/discounts',
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Discount created successfully',
      });
    },
    [fetchData, businessId],
  );

  /** Update a discount by ID */
  const updateDiscount = useCallback(
    async (data: UpdateDiscountData) => {
      const { id, ...updateData } = data;
      return await fetchData({
        endpoint: `/discounts/${id}`,
        method: 'PUT',
        data: updateData,
        successMessage: 'Discount updated successfully',
      });
    },
    [fetchData],
  );

  /** Delete a discount by ID */
  const deleteDiscount = useCallback(
    async (id: string) => {
      return await fetchData({
        endpoint: `/discounts/${id}`,
        method: 'DELETE',
        successMessage: 'Discount deleted successfully',
      });
    },
    [fetchData],
  );

  /** Get a single discount by ID */
  const getDiscountById = useCallback(
    async (id: string) => {
      return await fetchData({
        endpoint: `/discounts/${id}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetchData],
  );

  /** Get the resolved effective discount for a specific product */
  const getProductEffectiveDiscount = useCallback(
    async (productId: string): Promise<EffectiveDiscount | null> => {
      return await fetchData({
        endpoint: `/discounts/product/${productId}/effective`,
        method: 'GET',
        silent: true,
      });
    },
    [fetchData],
  );

  return {
    getAllDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getDiscountById,
    getProductEffectiveDiscount,
  };
};

export default useDiscount;
