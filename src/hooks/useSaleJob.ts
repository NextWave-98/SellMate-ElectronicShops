import { useCallback } from 'react';
import useFetch from './useFetch';
import { useAuth } from '../context/AuthContext';
import type { CreateSaleJobData, JobStatus } from '../types/saleJob.types';

export interface SaleJobListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  jobType?: string;
  locationId?: string;
  assignedToId?: string;
  saleId?: string;
  unassignedOnly?: boolean;
}

/**
 * API hook for Sale Jobs (POS work orders). Mirrors useJobSheet conventions:
 * each call gets its own useFetch instance; businessId is injected on mutations.
 * Non-silent calls auto-toast via the shared fetch layer.
 */
const useSaleJob = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;

  const listFetch = useFetch();
  const myFetch = useFetch();
  const byIdFetch = useFetch();
  const createFetch = useFetch();
  const assignFetch = useFetch();
  const claimFetch = useFetch();
  const unassignFetch = useFetch();
  const statusFetch = useFetch();
  const completeFetch = useFetch();
  const historyFetch = useFetch();

  const buildQuery = (params?: SaleJobListParams) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.jobType) q.append('jobType', params.jobType);
    if (params?.locationId) q.append('locationId', params.locationId);
    if (params?.assignedToId) q.append('assignedToId', params.assignedToId);
    if (params?.saleId) q.append('saleId', params.saleId);
    if (params?.unassignedOnly) q.append('unassignedOnly', 'true');
    return q.toString();
  };

  const getSaleJobs = useCallback(
    (params?: SaleJobListParams) =>
      listFetch.fetchData({ endpoint: `/sale-jobs?${buildQuery(params)}`, method: 'GET', silent: true }),
    [listFetch]
  );

  const getMyJobs = useCallback(
    (params?: SaleJobListParams) =>
      myFetch.fetchData({ endpoint: `/sale-jobs/my?${buildQuery(params)}`, method: 'GET', silent: true }),
    [myFetch]
  );

  const getSaleJobById = useCallback(
    (id: string) =>
      byIdFetch.fetchData({ endpoint: `/sale-jobs/${id}`, method: 'GET', silent: true }),
    [byIdFetch]
  );

  const createSaleJob = useCallback(
    (data: CreateSaleJobData) =>
      createFetch.fetchData({
        endpoint: '/sale-jobs',
        method: 'POST',
        data: { ...data, businessId },
        successMessage: 'Job created successfully!',
      }),
    [createFetch, businessId]
  );

  const assignJob = useCallback(
    (id: string, assignedToId: string) =>
      assignFetch.fetchData({
        endpoint: `/sale-jobs/${id}/assign`,
        method: 'PATCH',
        data: { assignedToId },
        successMessage: 'Job assigned.',
      }),
    [assignFetch]
  );

  const claimJob = useCallback(
    (id: string) =>
      claimFetch.fetchData({
        endpoint: `/sale-jobs/${id}/claim`,
        method: 'PATCH',
        successMessage: 'Job claimed.',
      }),
    [claimFetch]
  );

  const unassignJob = useCallback(
    (id: string) =>
      unassignFetch.fetchData({
        endpoint: `/sale-jobs/${id}/unassign`,
        method: 'PATCH',
        successMessage: 'Job unassigned.',
      }),
    [unassignFetch]
  );

  const updateStatus = useCallback(
    (id: string, status: JobStatus, remarks?: string) =>
      statusFetch.fetchData({
        endpoint: `/sale-jobs/${id}/status`,
        method: 'PATCH',
        data: { status, remarks },
        successMessage: 'Status updated.',
      }),
    [statusFetch]
  );

  const completeJob = useCallback(
    (id: string, opts?: { remarks?: string; notifyCustomer?: boolean }) =>
      completeFetch.fetchData({
        endpoint: `/sale-jobs/${id}/complete`,
        method: 'PATCH',
        data: { remarks: opts?.remarks, notifyCustomer: opts?.notifyCustomer ?? false },
        successMessage: 'Job completed.',
      }),
    [completeFetch]
  );

  const getHistory = useCallback(
    (id: string) =>
      historyFetch.fetchData({ endpoint: `/sale-jobs/${id}/history`, method: 'GET', silent: true }),
    [historyFetch]
  );

  return {
    getSaleJobs,
    getMyJobs,
    getSaleJobById,
    createSaleJob,
    assignJob,
    claimJob,
    unassignJob,
    updateStatus,
    completeJob,
    getHistory,
    loading:
      listFetch.loading ||
      myFetch.loading ||
      createFetch.loading ||
      assignFetch.loading ||
      claimFetch.loading ||
      unassignFetch.loading ||
      statusFetch.loading ||
      completeFetch.loading,
  };
};

export default useSaleJob;
