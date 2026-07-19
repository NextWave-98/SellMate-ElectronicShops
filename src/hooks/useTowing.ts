/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';

export type TowingStatus =
  | 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE' | 'PICKED_UP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

export const TOWING_STATUSES: TowingStatus[] = [
  'REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED',
];

const toParams = (filters?: Record<string, any>) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const useTowing = () => {
  const { fetchData } = useFetch();

  const getStats = useCallback(
    async () => fetchData({ endpoint: '/towing/stats', method: 'GET', silent: true }),
    [fetchData]
  );

  const list = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/towing${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const create = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/towing', method: 'POST', data, successMessage: 'Towing request created' }),
    [fetchData]
  );

  const update = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/towing/${id}`, method: 'PUT', data, successMessage: 'Updated' }),
    [fetchData]
  );

  const assignDriver = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/towing/${id}/assign`, method: 'POST', data, successMessage: 'Driver assigned' }),
    [fetchData]
  );

  const setStatus = useCallback(
    async (id: string, status: TowingStatus) =>
      fetchData({ endpoint: `/towing/${id}/status`, method: 'POST', data: { status }, successMessage: 'Status updated' }),
    [fetchData]
  );

  const remove = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/towing/${id}`, method: 'DELETE', successMessage: 'Deleted' }),
    [fetchData]
  );

  return useMemo(
    () => ({ getStats, list, create, update, assignDriver, setStatus, remove }),
    [getStats, list, create, update, assignDriver, setStatus, remove]
  );
};

export default useTowing;
