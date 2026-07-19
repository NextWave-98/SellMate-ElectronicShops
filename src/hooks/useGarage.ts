/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import useFetch from './useFetch';

export type GarageEstimateStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface CustomerVehicleRecord {
  id: string;
  customerId: string;
  registrationNo: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  engineNo?: string;
  currentMileage?: number;
  nextServiceDate?: string;
  nextServiceMileage?: number;
  isActive: boolean;
  customer?: { id: string; name: string; phone?: string };
}

export interface GarageEstimateRecord {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerVehicleId: string;
  status: GarageEstimateStatus;
  customerComplaints?: string;
  partsTotal: number;
  laborTotal: number;
  totalAmount: number;
  isInsuranceJob: boolean;
  customer?: { id: string; name: string; phone?: string };
  vehicle?: CustomerVehicleRecord;
  items?: Array<{
    id: string;
    itemType: 'PART' | 'LABOR' | 'OUTWORK' | 'OTHER';
    description: string;
    quantity: number;
    laborHours?: number;
    unitPrice: number;
    lineTotal: number;
  }>;
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

export const useGarage = () => {
  const { fetchData } = useFetch();

  const getStats = useCallback(
    async () => fetchData({ endpoint: '/garage/stats', method: 'GET', silent: true }),
    [fetchData]
  );

  // Customer vehicles
  const getVehicles = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/garage/vehicles${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getVehicleById = useCallback(
    async (id: string) => fetchData({ endpoint: `/garage/vehicles/${id}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createVehicle = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/garage/vehicles', method: 'POST', data, successMessage: 'Vehicle registered' }),
    [fetchData]
  );

  const updateVehicle = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/garage/vehicles/${id}`, method: 'PUT', data, successMessage: 'Vehicle updated' }),
    [fetchData]
  );

  // Estimates
  const getEstimates = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/garage/estimates${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getEstimateById = useCallback(
    async (id: string) => fetchData({ endpoint: `/garage/estimates/${id}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createEstimate = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/garage/estimates', method: 'POST', data, successMessage: 'Estimate created' }),
    [fetchData]
  );

  const updateEstimate = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/garage/estimates/${id}`, method: 'PUT', data, successMessage: 'Estimate updated' }),
    [fetchData]
  );

  const setEstimateStatus = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/garage/estimates/${id}/status`, method: 'POST', data, successMessage: 'Estimate status updated' }),
    [fetchData]
  );

  const sendEstimate = useCallback(
    async (id: string, channel: 'SMS' | 'WHATSAPP' = 'SMS') =>
      fetchData({ endpoint: `/garage/estimates/${id}/send`, method: 'POST', data: { channel }, successMessage: `Estimate sent via ${channel}` }),
    [fetchData]
  );

  // Labor entries
  const getLaborEntries = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/garage/labor${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createLaborEntry = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/garage/labor', method: 'POST', data, successMessage: 'Labor entry added' }),
    [fetchData]
  );

  // Bays
  const getBays = useCallback(
    async () => fetchData({ endpoint: '/garage/bays', method: 'GET', silent: true }),
    [fetchData]
  );

  const createBay = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/garage/bays', method: 'POST', data, successMessage: 'Service bay created' }),
    [fetchData]
  );

  const assignJobToBay = useCallback(
    async (jobsheetId: string, bayId: string | null) =>
      fetchData({ endpoint: '/garage/bays/assign', method: 'POST', data: { jobsheetId, bayId }, successMessage: 'Bay assignment updated' }),
    [fetchData]
  );

  // Reminders
  const getReminders = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/garage/reminders${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createReminder = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/garage/reminders', method: 'POST', data, successMessage: 'Reminder created' }),
    [fetchData]
  );

  const updateReminder = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/garage/reminders/${id}`, method: 'PUT', data, successMessage: 'Reminder updated' }),
    [fetchData]
  );

  return useMemo(
    () => ({
      getStats,
      getVehicles, getVehicleById, createVehicle, updateVehicle,
      getEstimates, getEstimateById, createEstimate, updateEstimate, setEstimateStatus, sendEstimate,
      getLaborEntries, createLaborEntry,
      getBays, createBay, assignJobToBay,
      getReminders, createReminder, updateReminder,
    }),
    [
      getStats,
      getVehicles, getVehicleById, createVehicle, updateVehicle,
      getEstimates, getEstimateById, createEstimate, updateEstimate, setEstimateStatus, sendEstimate,
      getLaborEntries, createLaborEntry,
      getBays, createBay, assignJobToBay,
      getReminders, createReminder, updateReminder,
    ]
  );
};

export default useGarage;
