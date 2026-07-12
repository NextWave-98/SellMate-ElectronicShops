/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';

export type PartCategory =
  | 'SCREEN'
  | 'BATTERY'
  | 'CHARGER'
  | 'BACK_COVER'
  | 'CAMERA'
  | 'SPEAKER'
  | 'MICROPHONE'
  | 'CHARGING_PORT'
  | 'HEADPHONE_JACK'
  | 'BUTTON'
  | 'FLEX_CABLE'
  | 'MOTHERBOARD'
  | 'RAM'
  | 'STORAGE'
  | 'OTHER';

export interface PartRecord {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  category: PartCategory;
  brand?: string;
  model?: string;
  compatibility?: string;
  unitPrice: number;
  costPrice: number;
  minStockLevel: number;
  reorderLevel: number;
  supplier?: string;
  supplierContact?: string;
  warrantyMonths: number;
  isActive: boolean;
  totalStock?: number;
  inventory?: Array<{
    id: string;
    locationId: string;
    quantity: number;
    location?: { id: string; name: string; locationCode?: string };
  }>;
}

export interface PartFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: PartCategory | '';
  brand?: string;
  isActive?: boolean | '';
}

export interface CreatePartData {
  name: string;
  description?: string | null;
  category: PartCategory;
  brand?: string | null;
  model?: string | null;
  compatibility?: string | null;
  unitPrice: number;
  costPrice: number;
  minStockLevel?: number;
  reorderLevel?: number;
  supplier?: string | null;
  supplierContact?: string | null;
  warrantyMonths?: number;
  isActive?: boolean;
}

export interface AdjustPartStockData {
  locationId: string;
  quantity: number;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  notes?: string | null;
}

export const PART_CATEGORIES: { value: PartCategory; label: string }[] = [
  { value: 'SCREEN', label: 'Screen' },
  { value: 'BATTERY', label: 'Battery' },
  { value: 'CHARGER', label: 'Charger' },
  { value: 'BACK_COVER', label: 'Back Cover' },
  { value: 'CAMERA', label: 'Camera' },
  { value: 'SPEAKER', label: 'Speaker' },
  { value: 'MICROPHONE', label: 'Microphone' },
  { value: 'CHARGING_PORT', label: 'Charging Port' },
  { value: 'HEADPHONE_JACK', label: 'Headphone Jack' },
  { value: 'BUTTON', label: 'Button' },
  { value: 'FLEX_CABLE', label: 'Flex Cable' },
  { value: 'MOTHERBOARD', label: 'Motherboard' },
  { value: 'RAM', label: 'RAM' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'OTHER', label: 'Other' },
];

export const usePart = () => {
  const { fetchData } = useFetch();
  const { user } = useAuth();
  const businessId = user?.businessId;

  const getParts = useCallback(
    async (filters?: PartFilters) => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      return fetchData({
        endpoint: `/parts${params.toString() ? `?${params.toString()}` : ''}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetchData]
  );

  const getPartById = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/parts/${id}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getPartStats = useCallback(
    async () => fetchData({ endpoint: '/parts/stats', method: 'GET', silent: true }),
    [fetchData]
  );

  const createPart = useCallback(
    async (data: CreatePartData) =>
      fetchData({
        endpoint: '/parts',
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Part created successfully',
      }),
    [fetchData, businessId]
  );

  const updatePart = useCallback(
    async (id: string, data: Partial<CreatePartData>) =>
      fetchData({
        endpoint: `/parts/${id}`,
        method: 'PUT',
        data: { ...data, businessId },
        successMessage: 'Part updated successfully',
      }),
    [fetchData, businessId]
  );

  const deletePart = useCallback(
    async (id: string) =>
      fetchData({
        endpoint: `/parts/${id}`,
        method: 'DELETE',
        successMessage: 'Part deleted successfully',
      }),
    [fetchData]
  );

  const adjustPartStock = useCallback(
    async (partId: string, data: AdjustPartStockData) =>
      fetchData({
        endpoint: `/parts/${partId}/stock`,
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Part stock updated successfully',
      }),
    [fetchData, businessId]
  );

  return {
    getParts,
    getPartById,
    getPartStats,
    createPart,
    updatePart,
    deletePart,
    adjustPartStock,
  };
};

export default usePart;
