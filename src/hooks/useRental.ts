/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import useFetch from './useFetch';

export type RentalVehicleStatus = 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE' | 'RETIRED';
export type RentalBookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_OUT' | 'RETURNED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export const VEHICLE_CLASSES = [
  'ECONOMY', 'COMPACT', 'SEDAN', 'SUV', 'VAN', 'LUXURY', 'PICKUP', 'BUS', 'MOTORCYCLE', 'THREE_WHEELER',
] as const;

export interface RentalVehicleRecord {
  id: string;
  registrationNo: string;
  make: string;
  model: string;
  year?: number;
  vehicleClass: string;
  fuelType?: string;
  transmission?: string;
  seats?: number;
  color?: string;
  status: RentalVehicleStatus;
  currentOdometer: number;
  insuranceExpiry?: string;
  licenseExpiry?: string;
  emissionTestExpiry?: string;
  isActive: boolean;
}

export interface RentalBookingRecord {
  id: string;
  bookingNumber: string;
  vehicleId: string;
  customerId: string;
  status: RentalBookingStatus;
  startAt: string;
  endAt: string;
  withDriver: boolean;
  baseAmount: number;
  extrasAmount: number;
  chargesAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  depositAmount: number;
  depositReleased: boolean;
  vehicle?: RentalVehicleRecord;
  customer?: { id: string; name: string; phone?: string };
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

export const useRental = () => {
  const { fetchData } = useFetch();

  // Stats
  const getStats = useCallback(
    async () => fetchData({ endpoint: '/rental/stats', method: 'GET', silent: true }),
    [fetchData]
  );

  // Vehicles
  const getVehicles = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/rental/vehicles${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getVehicleById = useCallback(
    async (id: string) => fetchData({ endpoint: `/rental/vehicles/${id}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getAvailability = useCallback(
    async (startAt: string, endAt: string, vehicleClass?: string) =>
      fetchData({
        endpoint: `/rental/vehicles/availability${toParams({ startAt, endAt, vehicleClass })}`,
        method: 'GET',
        silent: true,
      }),
    [fetchData]
  );

  const createVehicle = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/rental/vehicles', method: 'POST', data, successMessage: 'Vehicle added to fleet' }),
    [fetchData]
  );

  const updateVehicle = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/rental/vehicles/${id}`, method: 'PUT', data, successMessage: 'Vehicle updated' }),
    [fetchData]
  );

  const deleteVehicle = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/rental/vehicles/${id}`, method: 'DELETE', successMessage: 'Vehicle retired' }),
    [fetchData]
  );

  // Rate plans
  const getRatePlans = useCallback(
    async () => fetchData({ endpoint: '/rental/rate-plans', method: 'GET', silent: true }),
    [fetchData]
  );

  const createRatePlan = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/rental/rate-plans', method: 'POST', data, successMessage: 'Rate plan created' }),
    [fetchData]
  );

  const updateRatePlan = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/rental/rate-plans/${id}`, method: 'PUT', data, successMessage: 'Rate plan updated' }),
    [fetchData]
  );

  // Bookings
  const getBookings = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/rental/bookings${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const getBookingById = useCallback(
    async (id: string) => fetchData({ endpoint: `/rental/bookings/${id}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createBooking = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/rental/bookings', method: 'POST', data, successMessage: 'Booking created' }),
    [fetchData]
  );

  const updateBooking = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/rental/bookings/${id}`, method: 'PUT', data, successMessage: 'Booking updated' }),
    [fetchData]
  );

  const bookingAction = useCallback(
    async (id: string, action: 'confirm' | 'checkout' | 'checkin' | 'complete' | 'cancel', data: any = {}) =>
      fetchData({
        endpoint: `/rental/bookings/${id}/${action}`,
        method: 'POST',
        data,
        successMessage: `Booking ${action} successful`,
      }),
    [fetchData]
  );

  const generateAgreement = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/rental/bookings/${id}/agreement`, method: 'POST', data: {}, successMessage: 'Agreement generated' }),
    [fetchData]
  );

  const addCharge = useCallback(
    async (bookingId: string, data: any) =>
      fetchData({ endpoint: `/rental/bookings/${bookingId}/charges`, method: 'POST', data, successMessage: 'Charge added' }),
    [fetchData]
  );

  // Pricing engine
  const getPricingRules = useCallback(
    async () => fetchData({ endpoint: '/rental/pricing-rules', method: 'GET', silent: true }),
    [fetchData]
  );
  const createPricingRule = useCallback(
    async (data: any) => fetchData({ endpoint: '/rental/pricing-rules', method: 'POST', data, successMessage: 'Pricing rule created' }),
    [fetchData]
  );
  const updatePricingRule = useCallback(
    async (id: string, data: any) => fetchData({ endpoint: `/rental/pricing-rules/${id}`, method: 'PUT', data, successMessage: 'Rule updated' }),
    [fetchData]
  );
  const getExtraFees = useCallback(
    async () => fetchData({ endpoint: '/rental/extra-fees', method: 'GET', silent: true }),
    [fetchData]
  );
  const createExtraFee = useCallback(
    async (data: any) => fetchData({ endpoint: '/rental/extra-fees', method: 'POST', data, successMessage: 'Fee created' }),
    [fetchData]
  );
  const getCoupons = useCallback(
    async () => fetchData({ endpoint: '/rental/coupons', method: 'GET', silent: true }),
    [fetchData]
  );
  const createCoupon = useCallback(
    async (data: any) => fetchData({ endpoint: '/rental/coupons', method: 'POST', data, successMessage: 'Coupon created' }),
    [fetchData]
  );
  const getBookingQuote = useCallback(
    async (data: any) => fetchData({ endpoint: '/rental/bookings/quote', method: 'POST', data, silent: true }),
    [fetchData]
  );
  const sendAgreement = useCallback(
    async (id: string, channel: 'SMS' | 'WHATSAPP' = 'SMS') =>
      fetchData({ endpoint: `/rental/bookings/${id}/agreement/send`, method: 'POST', data: { channel }, successMessage: `Agreement sent via ${channel}` }),
    [fetchData]
  );

  // Fuel logs
  const getFuelLogs = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/rental/fuel-logs${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createFuelLog = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/rental/fuel-logs', method: 'POST', data, successMessage: 'Fuel log added' }),
    [fetchData]
  );

  const deleteFuelLog = useCallback(
    async (id: string) =>
      fetchData({ endpoint: `/rental/fuel-logs/${id}`, method: 'DELETE', successMessage: 'Fuel log deleted' }),
    [fetchData]
  );

  // Insurance claims
  const getClaims = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/rental/insurance-claims${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createClaim = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/rental/insurance-claims', method: 'POST', data, successMessage: 'Claim created' }),
    [fetchData]
  );

  const updateClaim = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/rental/insurance-claims/${id}`, method: 'PUT', data, successMessage: 'Claim updated' }),
    [fetchData]
  );

  // Maintenance
  const getMaintenances = useCallback(
    async (filters?: Record<string, any>) =>
      fetchData({ endpoint: `/rental/maintenance${toParams(filters)}`, method: 'GET', silent: true }),
    [fetchData]
  );

  const createMaintenance = useCallback(
    async (data: any) =>
      fetchData({ endpoint: '/rental/maintenance', method: 'POST', data, successMessage: 'Maintenance scheduled' }),
    [fetchData]
  );

  const updateMaintenance = useCallback(
    async (id: string, data: any) =>
      fetchData({ endpoint: `/rental/maintenance/${id}`, method: 'PUT', data, successMessage: 'Maintenance updated' }),
    [fetchData]
  );

  return {
    getStats,
    getVehicles, getVehicleById, getAvailability, createVehicle, updateVehicle, deleteVehicle,
    getRatePlans, createRatePlan, updateRatePlan,
    getBookings, getBookingById, createBooking, updateBooking, bookingAction, addCharge, generateAgreement,
    getMaintenances, createMaintenance, updateMaintenance,
    getFuelLogs, createFuelLog, deleteFuelLog,
    getClaims, createClaim, updateClaim,
    getPricingRules, createPricingRule, updatePricingRule,
    getExtraFees, createExtraFee,
    getCoupons, createCoupon,
    getBookingQuote, sendAgreement,
  };
};

export const VEHICLE_FEATURES = [
  'GPS', 'BLUETOOTH', 'CARPLAY', 'SUNROOF', 'LEATHER_SEATS', 'REVERSE_CAMERA', 'CRUISE_CONTROL',
] as const;

export default useRental;
