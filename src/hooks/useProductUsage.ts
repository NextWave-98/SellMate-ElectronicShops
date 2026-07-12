/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import useFetch from './useFetch';

export type UsageType =
  | 'JOB_SHEET'
  | 'SALE'
  | 'REPAIR'
  | 'INTERNAL'
  | 'DEMO'
  | 'DAMAGED'
  | 'MANUAL'
  | 'OTHER';

export const USAGE_TYPE_LABELS: Record<UsageType, string> = {
  JOB_SHEET: 'Job Sheet',
  SALE: 'Sale',
  REPAIR: 'Repair',
  INTERNAL: 'Internal Use',
  DEMO: 'Demo / Display',
  DAMAGED: 'Damaged / Write-off',
  MANUAL: 'Manual Usage',
  OTHER: 'Other',
};

export const USAGE_TYPE_COLORS: Record<UsageType, string> = {
  JOB_SHEET: 'bg-blue-100 text-blue-800',
  SALE: 'bg-green-100 text-green-800',
  REPAIR: 'bg-purple-100 text-purple-800',
  INTERNAL: 'bg-yellow-100 text-yellow-800',
  DEMO: 'bg-pink-100 text-pink-800',
  DAMAGED: 'bg-red-100 text-red-800',
  MANUAL: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-slate-100 text-slate-800',
};

export interface ProductUsageRecord {
  id: string;
  businessId: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    productCode: string;
    sku: string;
    primaryImage?: string;
    costPrice?: number;
  };
  locationId: string;
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  quantity: number;
  usageType: UsageType;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  performedBy?: string;
  performer?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface CreateProductUsagePayload {
  productId: string;
  locationId: string;
  quantity: number;
  usageType: UsageType;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  notes?: string;
}

interface UsageFilters {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  locationId?: string;
  usageType?: UsageType | '';
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'quantity' | 'totalCost';
  sortOrder?: 'asc' | 'desc';
}

export interface UsageStats {
  totalAll: number;
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  byType: { usageType: string; count: string; totalQuantity: string; totalCost: string }[];
}

export const useProductUsage = () => {
  const { execute } = useFetch<any>();
  const [loading, setLoading] = useState(false);

  const logUsage = useCallback(
    async (payload: CreateProductUsagePayload): Promise<ProductUsageRecord | null> => {
      setLoading(true);
      try {
        const res = await execute('/product-usages', { method: 'POST', data: payload });
        if (res?.success) return res.data as ProductUsageRecord;
        return null;
      } finally {
        setLoading(false);
      }
    },
    [execute],
  );

  const getUsages = useCallback(
    async (filters: UsageFilters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
      const res = await execute(`/product-usages?${params.toString()}`,{silent: true});
      if (res?.success) {
        return {
          data: (res.data ?? []) as ProductUsageRecord[],
          pagination: (res as any).pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
        };
      }
      return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    },
    [execute],
  );

  const getStats = useCallback(async (): Promise<UsageStats | null> => {
    const res = await execute('/product-usages/stats',{silent: true});
    return res?.success ? (res.data as UsageStats) : null;
  }, [execute]);

  const getProductHistory = useCallback(
    async (productId: string, limit = 30): Promise<ProductUsageRecord[]> => {
      const res = await execute(`/product-usages/product/${productId}/history?limit=${limit}`,{silent: true});
      return res?.success ? (res.data as ProductUsageRecord[]) : [];
    },
    [execute],
  );

  return { logUsage, getUsages, getStats, getProductHistory, loading };
};
