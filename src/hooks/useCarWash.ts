/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';

export type WashJobStatus = 'WAITING' | 'IN_BAY' | 'DRYING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export const VEHICLE_SIZE_CLASSES = [
  'MOTORCYCLE', 'THREE_WHEELER', 'CAR', 'SUV', 'VAN', 'LORRY', 'BUS',
] as const;

export interface WashServiceRecord {
  id: string;
  name: string;
  description?: string;
  priceMatrix: Record<string, number>;
  estimatedMinutes?: number;
  isAddon: boolean;
  isActive: boolean;
}

export interface WashJobRecord {
  id: string;
  jobNumber: string;
  vehiclePlate: string;
  vehicleSizeClass: string;
  status: WashJobStatus;
  totalAmount: number;
  paidAmount: number;
  redeemedViaMembership: boolean;
  items?: Array<{ id: string; serviceName: string; price: number }>;
  customer?: { id: string; name: string; phone?: string };
  bay?: { id: string; name: string };
  createdAt?: string;
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

export const useCarWash = () => {
  const { fetchData } = useFetch();

  const getStats = useCallback(
    async () => fetchData({ endpoint: '/carwash/stats', method: 'GET', silent: true }),
    [fetchData]
  );

  const getStaffPerformance = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/carwash/staff-performance${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const lookupPlate = useCallback(
    async (plate: string) =>
      fetchData({ endpoint: `/carwash/plate/${encodeURIComponent(plate)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  // Services
  const getServices = useCallback(
    async (includeInactive = false) =>
      fetchData({ endpoint: `/carwash/services${includeInactive ? '?includeInactive=true' : ''}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createService = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/carwash/services', method: 'POST', data, successMessage: 'Service created' }),
    [fetchData]
  );

  const updateService = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/carwash/services/${id}`, method: 'PUT', data, successMessage: 'Service updated' }),
    [fetchData]
  );

  // Bays
  const getBays = useCallback(
    async () => fetchData({ endpoint: '/carwash/bays', method: 'GET', silent: true }),
    [fetchData]
  );

  const createBay = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/carwash/bays', method: 'POST', data, successMessage: 'Bay created' }),
    [fetchData]
  );

  // Jobs
  const getJobs = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/carwash/jobs${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createJob = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/carwash/jobs', method: 'POST', data, successMessage: 'Wash job added to queue' }),
    [fetchData]
  );

  const updateJob = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/carwash/jobs/${id}`, method: 'PUT', data, successMessage: 'Job updated' }),
    [fetchData]
  );

  // Membership plans
  const getPlans = useCallback(
    async () => fetchData({ endpoint: '/carwash/plans', method: 'GET', silent: true }),
    [fetchData]
  );

  const createPlan = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/carwash/plans', method: 'POST', data, successMessage: 'Membership plan created' }),
    [fetchData]
  );

  const updatePlan = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/carwash/plans/${id}`, method: 'PUT', data, successMessage: 'Plan updated' }),
    [fetchData]
  );

  // Memberships
  const getMemberships = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/carwash/memberships${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const sellMembership = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/carwash/memberships', method: 'POST', data, successMessage: 'Membership sold' }),
    [fetchData]
  );

  return {
    getStats, getStaffPerformance, lookupPlate,
    getServices, createService, updateService,
    getBays, createBay,
    getJobs, createJob, updateJob,
    getPlans, createPlan, updatePlan,
    getMemberships, sellMembership,
  };
};

export default useCarWash;
