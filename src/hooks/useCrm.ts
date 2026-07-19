/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';

export type CrmTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export const CRM_TASK_STATUSES: CrmTaskStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
export const CRM_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

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

export const useCrm = () => {
  const { fetchData } = useFetch();

  const getStats = useCallback(async () => fetchData({ endpoint: '/crm/tasks/stats', method: 'GET', silent: true }), [fetchData]);
  const list = useCallback(async (filters?: Record<string, any>) => fetchData({ endpoint: `/crm/tasks${toParams(filters)}`, method: 'GET', silent: true }), [fetchData]);
  const create = useCallback(async (data: any) => fetchData({ endpoint: '/crm/tasks', method: 'POST', data, successMessage: 'Task created' }), [fetchData]);
  const update = useCallback(async (id: string, data: any) => fetchData({ endpoint: `/crm/tasks/${id}`, method: 'PUT', data, successMessage: 'Task updated' }), [fetchData]);
  const remove = useCallback(async (id: string) => fetchData({ endpoint: `/crm/tasks/${id}`, method: 'DELETE', successMessage: 'Task deleted' }), [fetchData]);

  return useMemo(
    () => ({ getStats, list, create, update, remove }),
    [getStats, list, create, update, remove]
  );
};

export default useCrm;
