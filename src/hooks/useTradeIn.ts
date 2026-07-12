/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';

export type TradeInStatus = 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'REFURBISHING' | 'READY_FOR_SALE' | 'SOLD';
export type TradeInGrade = 'A' | 'B' | 'C' | 'D';

export interface TradeInRecord {
  id: string;
  tradeInNumber: string;
  brand: string;
  model: string;
  imeiOrSerial?: string;
  grade: TradeInGrade;
  status: TradeInStatus;
  quotedAmount: number;
  acceptedAmount?: number;
  dataWipeConfirmed: boolean;
  refurbCost: number;
  resalePrice?: number;
  customer?: { id: string; name: string; phone?: string };
  createdAt?: string;
}

export interface TradeInPriceRuleRecord {
  id: string;
  brand: string;
  model: string;
  variant?: string;
  gradePrices: Record<string, number>;
  isActive: boolean;
}

const toParams = (filters?: Record<string, any>) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const useTradeIn = () => {
  const { fetchData } = useFetch();

  const getStats = useCallback(
    async () => fetchData({ endpoint: '/trade-ins/stats', method: 'GET', silent: true }),
    [fetchData]
  );

  const getQuote = useCallback(
    async (brand: string, model: string, grade: string, variant?: string) =>
      fetchData({ endpoint: `/trade-ins/quote${toParams({ brand, model, grade, variant })}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getTradeIns = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/trade-ins${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getTradeInById = useCallback(
    async (id: string) => fetchData({ endpoint: `/trade-ins/${id}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createTradeIn = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/trade-ins', method: 'POST', data, successMessage: 'Trade-in recorded' }),
    [fetchData]
  );

  const updateTradeIn = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/trade-ins/${id}`, method: 'PUT', data, successMessage: 'Trade-in updated' }),
    [fetchData]
  );

  const relistTradeIn = useCallback(
    async (id: string, data: { unitPrice: number; name?: string; categoryId?: string }) =>
      fetchData({ endpoint: `/trade-ins/${id}/relist`, method: 'POST', data, successMessage: 'Relisted as sellable product' }),
    [fetchData]
  );

  // Price rules
  const getRules = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/trade-ins/price-rules${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createRule = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/trade-ins/price-rules', method: 'POST', data, successMessage: 'Price rule created' }),
    [fetchData]
  );

  const updateRule = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/trade-ins/price-rules/${id}`, method: 'PUT', data, successMessage: 'Price rule updated' }),
    [fetchData]
  );

  const deleteRule = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/trade-ins/price-rules/${id}`, method: 'DELETE', successMessage: 'Price rule deleted' }),
    [fetchData]
  );

  return {
    getStats, getQuote,
    getTradeIns, getTradeInById, createTradeIn, updateTradeIn, relistTradeIn,
    getRules, createRule, updateRule, deleteRule,
  };
};

export default useTradeIn;
