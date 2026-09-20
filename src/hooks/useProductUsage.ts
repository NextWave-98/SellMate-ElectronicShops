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
  | 'OTHER'
  | 'EXPIRED'
  | 'LOST'
  | 'THEFT'
  | 'SAMPLE'
  | 'WRITE_OFF';

/** Which side of the P&L a loss lands on. */
export type LossBucket = 'COGS' | 'OPEX';

/**
 * Goods gone with no revenue   charged to cost of goods sold, so gross profit
 * drops. These are the entries an owner should be chasing.
 */
export const COGS_LOSS_TYPES: UsageType[] = [
  'DAMAGED',
  'EXPIRED',
  'LOST',
  'THEFT',
  'WRITE_OFF',
];

/** Stock the business consumed itself   an operating expense, not COGS. */
export const INTERNAL_USE_TYPES: UsageType[] = ['INTERNAL', 'DEMO', 'SAMPLE'];

/**
 * Already priced into a job sheet or a sale. Logged for traceability, never
 * counted as a loss   doing so would charge the same cost twice.
 */
export const ALREADY_COUNTED_TYPES: UsageType[] = ['JOB_SHEET', 'SALE', 'REPAIR'];

/** Types a user may pick when logging a usage by hand. */
export const MANUAL_USAGE_TYPES: UsageType[] = [
  'DAMAGED',
  'EXPIRED',
  'LOST',
  'THEFT',
  'WRITE_OFF',
  'INTERNAL',
  'DEMO',
  'SAMPLE',
  'MANUAL',
  'OTHER',
];

export const defaultLossBucket = (t: UsageType): LossBucket | null =>
  COGS_LOSS_TYPES.includes(t) ? 'COGS' : INTERNAL_USE_TYPES.includes(t) ? 'OPEX' : null;

export const USAGE_TYPE_LABELS: Record<UsageType, string> = {
  JOB_SHEET: 'Job Sheet',
  SALE: 'Sale',
  REPAIR: 'Repair',
  INTERNAL: 'Internal Use',
  DEMO: 'Demo / Display',
  DAMAGED: 'Damaged',
  MANUAL: 'Manual Usage',
  OTHER: 'Other',
  EXPIRED: 'Expired',
  LOST: 'Lost',
  THEFT: 'Theft',
  SAMPLE: 'Sample / Giveaway',
  WRITE_OFF: 'Write-off',
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
  EXPIRED: 'bg-orange-100 text-orange-800',
  LOST: 'bg-rose-100 text-rose-800',
  THEFT: 'bg-red-200 text-red-900',
  SAMPLE: 'bg-teal-100 text-teal-800',
  WRITE_OFF: 'bg-red-100 text-red-800',
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
  // Stock-loss accounting
  isLoss?: boolean;
  lossBucket?: LossBucket | null;
  occurredAt?: string;
  recoveredAmount?: number;
  attachmentUrl?: string;
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
  /** Omit and the backend classifies by usage type. Send for MANUAL / OTHER. */
  isLoss?: boolean;
  lossBucket?: LossBucket | null;
  /** Back-date the entry so it lands in the month it actually happened. */
  occurredAt?: string;
  /** Value recovered   scrap sale, supplier credit. Net loss = cost − this. */
  recoveredAmount?: number;
  attachmentUrl?: string;
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
  isLoss?: 'true' | 'false' | '';
  lossBucket?: LossBucket | '';
  sortBy?: 'createdAt' | 'quantity' | 'totalCost';
  sortOrder?: 'asc' | 'desc';
}

export interface LossTotals {
  /** Cost of the goods lost, before recovery. */
  gross: number;
  /** Value clawed back   scrap sale, supplier credit. */
  recovered: number;
  /** gross − recovered: what actually comes off the profit. */
  net: number;
}

export interface UsageStats {
  totalAll: number;
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  byType: { usageType: string; count: string; totalQuantity: string; totalCost: string }[];
  /**
   * Rupee value of stock lost, net of anything recovered. Counts alone are
   * misleading   ten damaged screen guards and one damaged laptop are both
   * "1 entry"   so the value figures are what the page leads with.
   */
  loss?: {
    allTime: LossTotals;
    thisMonth: LossTotals;
    thisMonthCogs: LossTotals;
    thisMonthOpex: LossTotals;
  };
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
