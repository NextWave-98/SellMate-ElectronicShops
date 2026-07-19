/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';

export type AppointmentStatus =
  | 'REQUESTED' | 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'REQUESTED', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
];

export const APPOINTMENT_TYPES = ['WALK_IN', 'ONLINE', 'PHONE', 'EMERGENCY'] as const;

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

export const useAppointment = () => {
  const { fetchData } = useFetch();

  const getStats = useCallback(
    async () => fetchData({ endpoint: '/appointments/stats', method: 'GET', silent: true }),
    [fetchData]
  );

  const list = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/appointments${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getById = useCallback(
    async (id: string) => fetchData({ endpoint: `/appointments/${id}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const create = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/appointments', method: 'POST', data, successMessage: 'Appointment created' }),
    [fetchData]
  );

  const update = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/appointments/${id}`, method: 'PUT', data, successMessage: 'Appointment updated' }),
    [fetchData]
  );

  const assign = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/appointments/${id}/assign`, method: 'POST', data, successMessage: 'Appointment scheduled' }),
    [fetchData]
  );

  const setStatus = useCallback(
    async (id: string, status: AppointmentStatus) =>
      fetchData({ endpoint: `/appointments/${id}/status`, method: 'POST', data: { status }, successMessage: 'Status updated' }),
    [fetchData]
  );

  const remind = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/appointments/${id}/remind`, method: 'POST', data: {}, successMessage: 'Reminder sent' }),
    [fetchData]
  );

  const remove = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/appointments/${id}`, method: 'DELETE', successMessage: 'Appointment deleted' }),
    [fetchData]
  );

  return useMemo(
    () => ({ getStats, list, getById, create, update, assign, setStatus, remind, remove }),
    [getStats, list, getById, create, update, assign, setStatus, remind, remove]
  );
};

export default useAppointment;
