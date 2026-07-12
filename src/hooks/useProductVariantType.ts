/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';

export type VariantInputType = 'select' | 'text' | 'number' | 'color_picker';
export type VariantCategory = 'ELECTRONICS' | 'CLOTHING' | 'GENERAL' | 'CUSTOM';

export interface ProductVariantType {
  id: string;
  businessId: string;
  name: string;
  displayName: string;
  inputType: VariantInputType;
  category: VariantCategory;
  options?: string[];
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresetVariantType {
  name: string;
  displayName: string;
  inputType: VariantInputType;
  category: VariantCategory;
  options: string[];
  displayOrder: number;
}

export interface CreateVariantTypeData {
  name: string;
  displayName: string;
  inputType: VariantInputType;
  category: VariantCategory;
  options?: string[];
  isRequired?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateVariantTypeData extends Partial<CreateVariantTypeData> {
  id: string;
}

export const useProductVariantType = () => {
  const { fetchData, loading, error } = useFetch();

  const getAllVariantTypes = useCallback(
    async (filters?: { category?: VariantCategory; isActive?: boolean }) => {
      const queryParams = new URLSearchParams();
      if (filters?.category) queryParams.append('category', filters.category);
      if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive));
      const endpoint = `/product-variant-types${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return await fetchData({ endpoint, method: 'GET', silent: true });
    },
    [fetchData]
  );

  const getVariantTypeById = useCallback(
    async (id: string) => {
      return await fetchData({ endpoint: `/product-variant-types/${id}`, method: 'GET', silent: true });
    },
    [fetchData]
  );

  const createVariantType = useCallback(
    async (data: CreateVariantTypeData) => {
      return await fetchData({ endpoint: '/product-variant-types', method: 'POST', data });
    },
    [fetchData]
  );

  const updateVariantType = useCallback(
    async (data: UpdateVariantTypeData) => {
      const { id, ...rest } = data;
      return await fetchData({ endpoint: `/product-variant-types/${id}`, method: 'PUT', data: rest });
    },
    [fetchData]
  );

  const deleteVariantType = useCallback(
    async (id: string) => {
      return await fetchData({ endpoint: `/product-variant-types/${id}`, method: 'DELETE' });
    },
    [fetchData]
  );

  const seedPresets = useCallback(
    async (category?: VariantCategory) => {
      const queryParams = category ? `?category=${category}` : '';
      return await fetchData({ endpoint: `/product-variant-types/seed-presets${queryParams}`, method: 'POST', data: {} });
    },
    [fetchData]
  );

  const getAvailablePresets = useCallback(
    async (category?: VariantCategory) => {
      const queryParams = category ? `?category=${category}` : '';
      return await fetchData({ endpoint: `/product-variant-types/presets${queryParams}`, method: 'GET', silent: true });
    },
    [fetchData]
  );

  return {
    loading,
    error,
    getAllVariantTypes,
    getVariantTypeById,
    createVariantType,
    updateVariantType,
    deleteVariantType,
    seedPresets,
    getAvailablePresets,
  };
};

export default useProductVariantType;
