/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useRef } from 'react';
import useFetch from './useFetch';

export enum CourierServiceProvider {
  // 🇱🇰 Local Sri Lankan Couriers - Most Popular for Online Businesses
  KOOMBIYO = 'KOOMBIYO',                    // Very popular for online sellers, budget-friendly
  DOMEX = 'DOMEX',                          // Islandwide express delivery with COD
  PRONTO_LANKA = 'PRONTO_LANKA',            // Same-day & next-day delivery, popular for eCommerce
  SRI_LANKA_POST = 'SRI_LANKA_POST',        // Domestic & international (EMS, registered post, normal post)
  
  // Other Local Courier Services
  PROMPT_XPRESS = 'PROMPT_XPRESS',          // Business & personal deliveries, reliable urban coverage
  CITYPAK = 'CITYPAK',                      // Fast document & parcel delivery (deprecated - use CITYPACK)
  CITYPACK = 'CITYPACK',                    // Fast document & parcel delivery
  FARDAR_KOOMBIO = 'FARDAR_KOOMBIO',        // Express delivery & logistics
  FARDAR_EXPRESS = 'FARDAR_EXPRESS',        // Fardar Express Domestic - API-enabled courier
  TRANS_EXPRESS = 'TRANS_EXPRESS',          // Reliable express delivery service
  COURIER_PLUS = 'COURIER_PLUS',            // Business logistics & express delivery
  EXEL_DELIVERY = 'EXEL_DELIVERY',           // Same-day delivery in main cities
  PETTAH_CARGO = 'PETTAH_CARGO',            // Cargo & bulk shipment services
  CURFOX = 'CURFOX',                        // Royal Express / Curfox DMS (API-enabled)

  // 🌍 International Courier Services
  DHL = 'DHL',                              // International express shipping
  FEDEX = 'FEDEX',                          // International express shipping
  UPS = 'UPS',                              // International express shipping
  ARAMEX = 'ARAMEX',                        // International & regional express
  TNT = 'TNT',                              // International express shipping
  SKYNET = 'SKYNET',                        // Regional express shipping
  
  // Alternative Delivery Methods
  SELF_DELIVERY = 'SELF_DELIVERY',          // Business delivers directly
  PICKUP = 'PICKUP'                         // Customer pickup from store
}

export enum CourierShipmentStatus {
  // Awaiting admin approval (non-admin applied discount)
  PENDING_APPROVAL = 'PENDING_APPROVAL',

  // Internal pre-handover lifecycle (set by our system, not the courier)
  PROCESSING = 'PROCESSING',
  PACKAGING = 'PACKAGING',
  WAITING_COURIER_PICKUP = 'WAITING_COURIER_PICKUP',
  RELEASED_TO_COURIER = 'RELEASED_TO_COURIER',

  PENDING = 'PENDING',
  PENDING_PICKUP = 'PENDING_PICKUP',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  DELIVERY_FAILED = 'DELIVERY_FAILED',

  // Returns and exceptions (generic across courier providers)
  RESCHEDULED = 'RESCHEDULED',
  DATE_CHANGED = 'DATE_CHANGED',
  REARRANGED = 'REARRANGED',
  DAMAGED = 'DAMAGED',
  RETURN_PENDING = 'RETURN_PENDING',
  RETURN_COMPLETE = 'RETURN_COMPLETE',
  RETURNED_TO_SENDER = 'RETURNED_TO_SENDER',
  RETURNED = 'RETURNED',
  RETURNED_TO_LOCATION = 'RETURNED_TO_LOCATION',

  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD'
}

export enum DeliveryMethod {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  SAME_DAY = 'SAME_DAY',
  OVERNIGHT = 'OVERNIGHT'
}

export enum CourierMode {
  SYSTEM_ONLY = 'SYSTEM_ONLY',
  API_ENABLED = 'API_ENABLED'
}

export interface CourierLabelSettings {
  hideSenderSection: boolean;
  showPhoneBelowShipment: boolean;
  labelPhoneNumber?: string;
}

export interface BusinessCourierSettings {
  courierMode: CourierMode;
  defaultCourierServiceId?: string;
  defaultCourierService?: CourierService;
  discountApprovalRequired?: boolean;
  courierStaffLimitedPermissions?: boolean;
  labelSettings?: CourierLabelSettings;
}

/** Statuses staff may set when courierStaffLimitedPermissions is enabled. */
export const STAFF_ALLOWED_COURIER_STATUSES: CourierShipmentStatus[] = [
  CourierShipmentStatus.PROCESSING,
  CourierShipmentStatus.PACKAGING,
  CourierShipmentStatus.WAITING_COURIER_PICKUP,
  CourierShipmentStatus.RELEASED_TO_COURIER,
  CourierShipmentStatus.ON_HOLD,
  CourierShipmentStatus.DAMAGED,
  CourierShipmentStatus.RETURN_PENDING,
  CourierShipmentStatus.RETURN_COMPLETE,
  CourierShipmentStatus.RETURNED,
  CourierShipmentStatus.RETURNED_TO_SENDER,
  CourierShipmentStatus.RETURNED_TO_LOCATION,
];

/** All shipment statuses — use for filter/view dropdowns (staff may filter any status). */
export const ALL_COURIER_SHIPMENT_STATUSES: CourierShipmentStatus[] =
  Object.values(CourierShipmentStatus);

export function isCourierAdminRole(roleName?: string | null): boolean {
  const role = roleName?.toUpperCase().replace(/\s+/g, '_');
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
}

export function isStaffCourierPermissionsLimited(
  settings: BusinessCourierSettings | null | undefined,
  roleName?: string | null,
): boolean {
  if (!settings?.courierStaffLimitedPermissions) return false;
  return !isCourierAdminRole(roleName);
}

export function filterCourierStatusesForRole(
  statuses: CourierShipmentStatus[],
  settings: BusinessCourierSettings | null | undefined,
  roleName?: string | null,
): CourierShipmentStatus[] {
  if (!isStaffCourierPermissionsLimited(settings, roleName)) return statuses;
  return statuses.filter((status) => STAFF_ALLOWED_COURIER_STATUSES.includes(status));
}

export const FARDAR_BULK_STATUS_OPTIONS: Array<{ label: string; value: CourierShipmentStatus }> = [
  { label: 'Processing', value: CourierShipmentStatus.PICKED_UP },
  { label: 'Transfer', value: CourierShipmentStatus.IN_TRANSIT },
  { label: 'Dispatched', value: CourierShipmentStatus.OUT_FOR_DELIVERY },
  { label: 'Delivered', value: CourierShipmentStatus.DELIVERED },
  { label: 'Reschedule', value: CourierShipmentStatus.RESCHEDULED },
  { label: 'Date Changed', value: CourierShipmentStatus.DATE_CHANGED },
  { label: 'Rearranged', value: CourierShipmentStatus.REARRANGED },
  { label: 'Return', value: CourierShipmentStatus.RETURNED },
  { label: 'Return Complete', value: CourierShipmentStatus.RETURN_COMPLETE },
  { label: 'Damage', value: CourierShipmentStatus.DAMAGED },
  { label: 'Hold', value: CourierShipmentStatus.ON_HOLD },
];

export function getFardarBulkStatusOptions(
  settings: BusinessCourierSettings | null | undefined,
  roleName?: string | null,
): Array<{ label: string; value: CourierShipmentStatus }> {
  const allowed = new Set(
    filterCourierStatusesForRole(Object.values(CourierShipmentStatus), settings, roleName),
  );
  return FARDAR_BULK_STATUS_OPTIONS.filter((option) => allowed.has(option.value));
}

export const COURIER_BULK_STATUS_OPTIONS: Array<{ label: string; value: CourierShipmentStatus }> = [
  { label: 'Pending Approval', value: CourierShipmentStatus.PENDING_APPROVAL },
  { label: 'Processing', value: CourierShipmentStatus.PROCESSING },
  { label: 'Packaging Process', value: CourierShipmentStatus.PACKAGING },
  { label: 'Waiting to courier pickup', value: CourierShipmentStatus.WAITING_COURIER_PICKUP },
  { label: 'Released to Courier', value: CourierShipmentStatus.RELEASED_TO_COURIER },
  { label: 'Pending', value: CourierShipmentStatus.PENDING },
  { label: 'Pending Pickup', value: CourierShipmentStatus.PENDING_PICKUP },
  { label: 'Picked Up', value: CourierShipmentStatus.PICKED_UP },
  { label: 'In Transit', value: CourierShipmentStatus.IN_TRANSIT },
  { label: 'Out for Delivery', value: CourierShipmentStatus.OUT_FOR_DELIVERY },
  { label: 'Delivered', value: CourierShipmentStatus.DELIVERED },
  { label: 'Failed Delivery', value: CourierShipmentStatus.FAILED_DELIVERY },
  { label: 'Delivery Failed', value: CourierShipmentStatus.DELIVERY_FAILED },
  { label: 'Rescheduled', value: CourierShipmentStatus.RESCHEDULED },
  { label: 'Date Changed', value: CourierShipmentStatus.DATE_CHANGED },
  { label: 'Rearranged', value: CourierShipmentStatus.REARRANGED },
  { label: 'Damaged', value: CourierShipmentStatus.DAMAGED },
  { label: 'Return Pending', value: CourierShipmentStatus.RETURN_PENDING },
  { label: 'Return Complete', value: CourierShipmentStatus.RETURN_COMPLETE },
  { label: 'Returned to Sender', value: CourierShipmentStatus.RETURNED_TO_SENDER },
  { label: 'Returned', value: CourierShipmentStatus.RETURNED },
  { label: 'Returned to Location', value: CourierShipmentStatus.RETURNED_TO_LOCATION },
  { label: 'Cancelled', value: CourierShipmentStatus.CANCELLED },
  { label: 'On Hold', value: CourierShipmentStatus.ON_HOLD },
];

export function getBulkStatusOptions(
  settings: BusinessCourierSettings | null | undefined,
  roleName?: string | null,
): Array<{ label: string; value: CourierShipmentStatus }> {
  const allowed = new Set(
    filterCourierStatusesForRole(Object.values(CourierShipmentStatus), settings, roleName),
  );
  return COURIER_BULK_STATUS_OPTIONS.filter((option) => allowed.has(option.value));
}

/** Max shipments per Fardar live-sync request (matches backend cap). */
export const FARDAR_BULK_SYNC_MAX = 100;

export function canBulkSyncFromFardar(selectedCount: number): boolean {
  return selectedCount > 0 && selectedCount <= FARDAR_BULK_SYNC_MAX;
}

export type CourierShipmentFetchScope = 'org' | 'branch';

export interface CourierService {
  id: string;
  businessId?: string;
  provider: CourierServiceProvider;
  name: string;
  description?: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  hasApiKey?: boolean;
  hasApiSecret?: boolean;
  apiEnabled: boolean;
  baseCharge?: number;
  perKmCharge?: number;
  perKgCharge?: number;
  baseWeightLimit?: number;
  minimumCharge?: number;
  coverageAreas?: string[];
  serviceLevels?: Record<string, any>;
  displayOrder?: number;
  isActive: boolean;
  settings?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierShipment {
  id: string;
  shipmentNumber: string;
  saleNumber?: string;
  courierServiceId: string;
  saleId?: string;
  returnId?: string;
  pickupLocationId?: string;
  status: CourierShipmentStatus;
  deliveryMethod: DeliveryMethod;
  awb_number?: string;
  
  // Sender Info
  senderName: string;
  senderPhone?: string;
  senderAddress: string;
  senderCity?: string;
  senderDistrict?: string;
  senderPostalCode?: string;
  
  // Recipient Info
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  recipientEmail?: string;
  recipientAddress: string;
  recipientCity: string;
  recipientDistrict?: string;
  recipientPostalCode?: string;
  
  // Package Details
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  numberOfPieces: number;
  description?: string;
  declaredValue?: number;
  
  // Charges
  shippingCharge: number;
  insuranceCharge: number;
  additionalCharges: number;
  actualShippingCost?: number; // Actual cost paid to courier (for P&L) – may differ from shippingCharge billed to customer
  totalCharge: number;
  
  // COD
  codEnabled: boolean;
  codAmount?: number;
  
  // Tracking
  trackingNumber?: string;
  pickupDate?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  
  notes?: string;
  deliveryInstructions?: string;
  paymentMethod?: 'bank' | 'online' | 'cod' | 'koko' | 'mintpay' | 'payzy';
  paymentConfirmed?: boolean;
  paymentConfirmedAmount?: number;
  paymentDescription?: string;
  createdAt?: string;
  updatedAt?: string;
  staffName?: string | null;
  branchName?: string | null;

  // Relations
  courier?: CourierService;
  sale?: any;
  productReturn?: any;
  pickupLocation?: any;
  trackingHistory?: CourierTracking[];
}

export interface CourierTracking {
  id: string;
  shipmentId: string;
  eventType: string;
  eventDescription: string;
  eventTimestamp: string;
  location?: string;
  remarks?: string;
}

export interface CourierCustomConfig {
  apiKey?: string;
  apiSecret?: string;
  apiEndpoint?: string;
  accountNumber?: string;
  additionalConfig?: {
    tenant?: string;
    merchant_business_id?: string;
    origin_city_name?: string;
    origin_state_name?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface BusinessCourierPreference {
  id: string;
  businessId: string;
  courierServiceId: string;
  isEnabled: boolean;
  isDefault: boolean;
  priority: number;
  customConfig?: CourierCustomConfig;
  settings?: Record<string, any>;
  courier?: CourierService;
}

export interface PhoneOrderSummary {
  id: string;
  shipmentNumber: string;
  status: string;
  recipientName: string;
  codAmount: number;
  createdAt: string;
}

export interface PhoneOrderInsights {
  phone: string;
  customerId: string | null;
  hasPreviousOrders: boolean;
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  inProgressOrders: number;
  cancelledOrders: number;
  successRate: number | null;
  returnRate: number | null;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  recentOrders: PhoneOrderSummary[];
  possibleDuplicates: PhoneOrderSummary[];
  hasPossibleDuplicate: boolean;
}

const useCourier = () => {
  const [courierServices, setCourierServices] = useState<CourierService[]>([]);
  const [courierShipments, setCourierShipments] = useState<CourierShipment[]>([]);
  const [businessPreferences, setBusinessPreferences] = useState<BusinessCourierPreference[]>([]);
  const [courierSettings, setCourierSettings] = useState<BusinessCourierSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [shipmentsTotal, setShipmentsTotal] = useState(0);
  const [shipmentsTotalPages, setShipmentsTotalPages] = useState(1);
  const shipmentScopeRef = useRef<CourierShipmentFetchScope | null>(null);
  const lastShipmentFiltersRef = useRef<any>({});

  const { fetchData } = useFetch();

  // ================ COURIER SERVICES ================

  const fetchCourierServices = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== '') {
            queryParams.append(key, filters[key]);
          }
        });
      }
      
      const response = await fetchData({
        method: 'GET', silent:true,
        endpoint: `/courier/services${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      });

      if (response?.success) {
        // Transform snake_case to camelCase for frontend compatibility
        const transformedServices = (response.data.services || []).map((service: any) => ({
          ...service,
          isActive: service.is_active,
          businessId: service.business_id,
          contactNumber: service.contact_number,
          apiEndpoint: service.api_endpoint,
          hasApiKey: service.hasApiKey ?? !!service.api_key,
          hasApiSecret: service.hasApiSecret ?? !!service.api_secret,
          apiEnabled: service.apiEnabled ?? service.api_enabled ?? false,
          baseCharge: service.base_charge !== undefined ? parseFloat(service.base_charge) : 0,
          perKmCharge: service.per_km_charge !== undefined ? parseFloat(service.per_km_charge) : undefined,
          perKgCharge: service.per_kg_charge !== undefined ? parseFloat(service.per_kg_charge) : 150,
          baseWeightLimit: service.base_weight_limit !== undefined ? parseFloat(service.base_weight_limit) : 1.0,
          minimumCharge: service.minimum_charge !== undefined ? parseFloat(service.minimum_charge) : undefined,
          coverageAreas: service.coverage_areas,
          serviceLevels: service.service_levels,
          displayOrder: service.display_order,
          createdAt: service.created_at,
          updatedAt: service.updated_at
        }));
        setCourierServices(transformedServices);
        setTotal(response.data.total || 0);
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch courier services:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCourierService = useCallback(async (data: Partial<CourierService>) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: '/courier/services',
        data
      });

      if (response?.success) {
        await fetchCourierServices();
      }
      return response;
    } catch (error) {
      console.error('Failed to create courier service:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCourierService = useCallback(async (id: string, data: Partial<CourierService>) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'PUT',
        endpoint: `/courier/services/${id}`,
        data
      });

      if (response?.success) {
        await fetchCourierServices();
      }
      return response;
    } catch (error) {
      console.error('Failed to update courier service:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCourierService = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'DELETE',
        endpoint: `/courier/services/${id}`
      });

      if (response?.success) {
        await fetchCourierServices();
      }
      return response;
    } catch (error) {
      console.error('Failed to delete courier service:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ================ COURIER SHIPMENTS ================

  const fetchCourierShipments = useCallback(async (
    filters?: any,
    options?: { scope?: CourierShipmentFetchScope | null },
  ) => {
    if (options && 'scope' in options) {
      shipmentScopeRef.current = options.scope ?? null;
    }

    const effectiveFilters = filters !== undefined ? filters : lastShipmentFiltersRef.current;
    if (filters !== undefined) {
      lastShipmentFiltersRef.current = filters;
    }

    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (effectiveFilters) {
        Object.keys(effectiveFilters).forEach(key => {
          if (effectiveFilters[key] !== undefined && effectiveFilters[key] !== '') {
            queryParams.append(key, effectiveFilters[key]);
          }
        });
      }

      const scope = shipmentScopeRef.current;
      const basePath =
        scope === 'branch' ? '/courier/shipments/branch'
        : scope === 'org' ? '/courier/shipments/org'
        : '/courier/shipments';

      const response = await fetchData({
        method: 'GET', silent:true,
        endpoint: `${basePath}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      });

      if (response?.success) {
        // Transform snake_case to camelCase for frontend compatibility
        const transformedShipments = (response.data.shipments || []).map((shipment: any) => {
          const sale = shipment.sale;
          const soldBy = sale?.soldBy ?? sale?.sold_by;
          const saleLocation = sale?.location;
          const pickup = shipment.pickupLocation ?? shipment.pickup_location;
          // Pickup location is authoritative for shipment branch display
          const branchName =
            pickup?.name ??
            saleLocation?.name ??
            null;
          const staffName = soldBy?.name ?? sale?.creator?.name ?? null;

          return {
          ...shipment,
          shipmentNumber: shipment.shipment_number,
          trackingNumber: shipment.tracking_number,
          awb_number: shipment.awb_number,
          courierServiceId: shipment.courier_service_id,
          saleId: shipment.sale_id,
          returnId: shipment.return_id,
          pickupLocationId: shipment.pickup_location_id,
          deliveryMethod: shipment.delivery_method,
          senderName: shipment.sender_name,
          senderPhone: shipment.sender_phone,
          senderAddress: shipment.sender_address,
          senderCity: shipment.sender_city,
          senderPostalCode: shipment.sender_postal_code,
          recipientName: shipment.recipient_name,
          recipientPhone: shipment.recipient_phone,
          recipientPhone2: shipment.recipient_phone_2,
          recipientEmail: shipment.recipient_email,
          recipientAddress: shipment.recipient_address,
          recipientCity: shipment.recipient_city,
          recipientDistrict: shipment.recipient_district,
          recipientPostalCode: shipment.recipient_postal_code,
          numberOfPieces: shipment.number_of_pieces,
          declaredValue: parseFloat(shipment.declared_value) || 0,
          shippingCharge: parseFloat(shipment.shipping_charge) || 0,
          insuranceCharge: parseFloat(shipment.insurance_charge) || 0,
          additionalCharges: parseFloat(shipment.additional_charges) || 0,
          actualShippingCost: parseFloat(shipment.actual_shipping_cost) || 0,
          totalCharge: parseFloat(shipment.total_charge) || 0,
          codEnabled: shipment.cod_enabled,
          codAmount: parseFloat(shipment.cod_amount) || 0,
          pickupDate: shipment.pickup_date,
          estimatedDeliveryDate: shipment.estimated_delivery_date,
          actualDeliveryDate: shipment.actual_delivery_date,
          deliveryInstructions: shipment.delivery_instructions,
          deliveredTo: shipment.delivered_to,
          podImageUrl: shipment.pod_image_url,
          lastTrackingData: shipment.last_tracking_data,
          lastTrackedAt: shipment.last_tracked_at,
          createdAt: shipment.created_at,
          updatedAt: shipment.updated_at,
          businessId: shipment.business_id,
          productReturn: shipment.productReturn,
          trackingHistory: shipment.tracking_history,
          staffName,
          branchName,
        };
        });
        setCourierShipments(transformedShipments);
        setTotal(response.data.total || 0);
        setShipmentsTotal(response.data.total || 0);
        setShipmentsTotalPages(response.data.totalPages || 1);
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch courier shipments:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCourierShipment = useCallback(async (data: Partial<CourierShipment>) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: '/courier/shipments',
        data
      });

      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to create courier shipment:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCourierShipment = useCallback(async (id: string, data: Partial<CourierShipment>) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'PUT',
        endpoint: `/courier/shipments/${id}`,
        data
      });

      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to update courier shipment:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateShipmentStatus = useCallback(async (id: string, status: CourierShipmentStatus, remarks?: string) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/shipments/${id}/status`,
        data: { status, remarks }
      });

      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to update shipment status:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCourierShipments]);

  const bulkUpdateShipmentStatus = useCallback(async (
    updates: Array<{ id: string; status: CourierShipmentStatus; remarks?: string }>
  ) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'PATCH',
        endpoint: '/courier/shipments/bulk-status',
        data: { updates }
      });
      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to bulk update shipment status:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCourierShipments]);

  const bulkSyncFromFardar = useCallback(async (shipmentIds: string[]) => {
    if (!canBulkSyncFromFardar(shipmentIds.length)) {
      return {
        success: false,
        message: `Maximum ${FARDAR_BULK_SYNC_MAX} shipments allowed per Fardar sync`,
      };
    }
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: '/courier/shipments/bulk-sync-fardar',
        data: { shipmentIds },
      });
      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to bulk sync from Fardar:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCourierShipments]);

  const bulkSyncSaleLocationFromPickup = useCallback(async (shipmentIds: string[]) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: '/courier/shipments/bulk-sync-sale-location',
        data: { shipmentIds },
      });
      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to bulk sync sale location from pickup:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCourierShipments]);

  const bulkUpdateShipmentNumbers = useCallback(async (updates: Array<{ id: string; shipmentNumber: string }>) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'PATCH',
        endpoint: '/courier/shipments/bulk-number',
        data: { updates }
      });
      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to bulk update shipment numbers:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCourierShipments]);

  // ── Admin: pending approval shipments ─────────────────────────────────────
  const fetchPendingApprovalShipments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'GET',
        endpoint: '/courier/shipments/pending-approval',
      });
      const raw = (response as any)?.data ?? [];
      return raw.map((shipment: any) => {
        const courier = shipment.courier;
        const courierDefaultCharge =
          parseFloat(courier?.base_charge ?? courier?.baseCharge ?? 0) ||
          parseFloat(courier?.minimum_charge ?? courier?.minimumCharge ?? 0) ||
          0;
        const storedShipping =
          parseFloat(shipment.shipping_charge ?? shipment.shippingCharge ?? 0) || 0;
        const shippingCharge = storedShipping > 0 ? storedShipping : courierDefaultCharge;

        const sale = shipment.sale;
        const saleItems = (sale?.saleItems ?? sale?.sale_items ?? []).map((item: any) => ({
          productName: item.productName ?? item.product_name ?? item.name ?? 'Item',
          quantity: Number(item.quantity ?? 0),
          unitPrice: parseFloat(item.unitPrice ?? item.unit_price ?? 0) || 0,
        }));

        return {
          id: shipment.id,
          shipmentNumber: shipment.shipment_number ?? shipment.shipmentNumber,
          recipientName: shipment.recipient_name ?? shipment.recipientName,
          recipientPhone: shipment.recipient_phone ?? shipment.recipientPhone,
          recipientCity: shipment.recipient_city ?? shipment.recipientCity,
          shippingCharge,
          codAmount: parseFloat(shipment.cod_amount ?? shipment.codAmount ?? 0) || 0,
          notes: shipment.notes,
          createdAt: shipment.created_at ?? shipment.createdAt,
          sale: sale
            ? {
                saleNumber: sale.saleNumber ?? sale.sale_number,
                discount: parseFloat(sale.discount ?? 0) || 0,
                discountType: sale.discountType ?? sale.discount_type,
                totalAmount: parseFloat(sale.totalAmount ?? sale.total_amount ?? 0) || 0,
                subtotal: parseFloat(sale.subtotal ?? 0) || 0,
                soldBy: sale.soldBy ?? sale.sold_by,
                saleItems,
              }
            : undefined,
          courier: courier
            ? {
                name: courier.name,
                provider: courier.provider,
                baseCharge: parseFloat(courier.base_charge ?? courier.baseCharge ?? 0) || 0,
              }
            : undefined,
        };
      });
    } catch (error) {
      console.error('Failed to fetch pending approval shipments:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const approveShipment = useCallback(async (
    id: string,
    approve: boolean,
    rejectionReason?: string,
    priceAdjustments?: {
      adjustedDiscountType?: 'FIXED' | 'PERCENTAGE';
      adjustedDiscountValue?: number;
      adjustedShippingCharge?: number;
    },
  ) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/shipments/pending-approval/${id}/approve`,
        data: {
          approve,
          rejectionReason,
          ...priceAdjustments,
        },
      });
      return response;
    } catch (error) {
      console.error('Failed to approve/reject shipment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const trackShipment = useCallback(async (trackingNumber: string) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'GET', silent:true,
        endpoint: `/courier/shipments/tracking/${trackingNumber}`
      });
      return response;
    } catch (error) {
      console.error('Failed to track shipment:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getShipmentTracking = useCallback(async (shipmentId: number) => {
    try {
      const response = await fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/courier/shipments/${shipmentId}/tracking-history`
      });
      
      // Transform snake_case to camelCase
      if (response?.success && response.data && Array.isArray(response.data)) {
        return response.data.map((tracking: any) => ({
          id: tracking.id,
          businessId: tracking.businessId || tracking.business_id,
          shipmentId: tracking.shipment_id,
          eventType: tracking.event_type,
          eventDescription: tracking.event_description,
          eventTimestamp: tracking.event_timestamp,
          location: tracking.location,
          facility: tracking.facility,
          handledBy: tracking.handled_by,
          remarks: tracking.remarks,
          rawData: tracking.raw_data,
          createdAt: tracking.created_at,
          updatedAt: tracking.updated_at
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch shipment tracking:', error);
      return [];
    }
  }, []);

  const calculateShippingCost = useCallback(async (data: any) => {
    try {
      const response = await fetchData({
        method: 'POST',
        endpoint: '/courier/calculate-cost',
        data
      });
      return response;
    } catch (error) {
      console.error('Failed to calculate shipping cost:', error);
      return null;
    }
  }, []);

  // ================ BUSINESS COURIER PREFERENCES ================

  const fetchBusinessCourierPreferences = useCallback(async (businessId: string) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'GET', silent:true,
        endpoint: `/courier/businesses/${businessId}/couriers`
      });

      if (response?.success) {
        // Normalise snake_case API response to camelCase (model uses snake_case property names)
        const normalized = ((response.data as any[]) || []).map((p: any): BusinessCourierPreference => ({
          id: p.id,
          businessId: p.businessId ?? p.business_id,
          courierServiceId: p.courierServiceId ?? p.courier_service_id,
          isEnabled: p.isEnabled ?? p.is_enabled,
          isDefault: p.isDefault ?? p.is_default,
          priority: p.priority ?? p.priority_order,
          customConfig: p.customConfig ?? p.custom_config,
          settings: p.settings,
          courier: p.courier ?? p.courierService,
        }));
        setBusinessPreferences(normalized);
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch business courier preferences:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const addBusinessCourierPreference = useCallback(async (businessId: string, data: any) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/businesses/${businessId}/couriers`,
        data
      });

      if (response?.success) {
        await fetchBusinessCourierPreferences(businessId);
      }
      return response;
    } catch (error) {
      console.error('Failed to add business courier preference:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBusinessCourierPreference = useCallback(async (preferenceId: string, data: any, businessId?: string) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'PUT',
        endpoint: `/courier/businesses/courier-preferences/${preferenceId}`,
        data
      });
      if (response?.success && businessId) {
        await fetchBusinessCourierPreferences(businessId);
      }
      return response;
    } catch (error) {
      console.error('Failed to update business courier preference:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setDefaultCourier = useCallback(async (businessId: string, courierServiceId: string) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/businesses/${businessId}/couriers/${courierServiceId}/set-default`
      });

      if (response?.success) {
        await fetchBusinessCourierPreferences(businessId);
      }
      return response;
    } catch (error) {
      console.error('Failed to set default couriers.', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  // ================ COURIER SETTINGS ================

  const fetchCourierSettings = useCallback(async (businessId: string) => {
    try {
      const response = await fetchData({
        method: 'GET', silent:true,
        endpoint: `/courier/businesses/${businessId}/settings`
      });

      if (response?.success) {
        const settings: BusinessCourierSettings = {
          courierMode: response.data.courierMode || CourierMode.SYSTEM_ONLY,
          defaultCourierServiceId: response.data.defaultCourierServiceId,
          discountApprovalRequired: response.data.discountApprovalRequired ?? false,
          courierStaffLimitedPermissions: response.data.courierStaffLimitedPermissions ?? false,
          labelSettings: response.data.labelSettings,
        };
        setCourierSettings(settings);
      }
      return response;
    } catch (error) {
      console.error('Failed to fetch courier settings:', error);
      return null;
    }
  }, []);

  const updateCourierSettings = useCallback(async (
    businessId: string,
    courierMode: CourierMode,
    defaultCourierServiceId?: string,
    labelSettings?: { hideSenderSection?: boolean; showPhoneBelowShipment?: boolean; labelPhoneNumber?: string },
    discountApprovalRequired?: boolean,
    courierStaffLimitedPermissions?: boolean,
  ) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'PUT',
        endpoint: `/courier/businesses/${businessId}/settings`,
        data: {
          courierMode,
          defaultCourierServiceId,
          ...(labelSettings !== undefined ? { labelSettings } : {}),
          ...(discountApprovalRequired !== undefined ? { discountApprovalRequired } : {}),
          ...(courierStaffLimitedPermissions !== undefined ? { courierStaffLimitedPermissions } : {}),
        }
      });

      if (response?.success) {
        await fetchCourierSettings(businessId);
      }
      return response;
    } catch (error) {
      console.error('Failed to update courier settings:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDefaultCourier = useCallback(async (businessId: string) => {
    try {
      const response = await fetchData({
        method: 'GET', silent:true,
        endpoint: `/courier/businesses/${businessId}/default-courier`
      });

      return response;
    } catch (error) {
      console.error('Failed to get default courier:', error);
      return null;
    }
  }, []);
  // ================ COURIER API INTEGRATION ================

  const createShipmentViaAPI = useCallback(async (businessId: string, courierServiceId: string, data: any) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/businesses/${businessId}/couriers/${courierServiceId}/api/shipments`,
        data
      });

      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to create shipment via API:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateShipmentViaAPI = useCallback(async (businessId: string, shipmentId: string, data: any) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'PUT',
        endpoint: `/courier/businesses/${businessId}/api/shipments/${shipmentId}`,
        data
      });

      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to update shipment via API:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelShipmentViaAPI = useCallback(async (businessId: string, shipmentId: string, reason?: string) => {
    try {
      setLoading(true);
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/businesses/${businessId}/api/shipments/${shipmentId}/cancel`,
        data: { reason }
      });

      if (response?.success) {
        await fetchCourierShipments();
      }
      return response;
    } catch (error) {
      console.error('Failed to cancel shipment via API:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateRateViaAPI = useCallback(async (businessId: string, courierServiceId: string, data: any) => {
    try {
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/businesses/${businessId}/couriers/${courierServiceId}/api/calculate-rate`,
        data
      });
      return response;
    } catch (error) {
      console.error('Failed to calculate rate via API:', error);
      return null;
    }
  }, []);

  const validateCourierCredentials = useCallback(async (businessId: string, courierServiceId: string) => {
    try {
      const response = await fetchData({
        method: 'POST',
        endpoint: `/courier/businesses/${businessId}/couriers/${courierServiceId}/api/validate`
      });
      return response;
    } catch (error) {
      console.error('Failed to validate courier credentials:', error);
      return null;
    }
  }, []);

  const getSupportedServiceTypes = useCallback(async (businessId: string, courierServiceId: string) => {
    try {
      const response = await fetchData({
        method: 'GET', silent:true,
        endpoint: `/courier/businesses/${businessId}/couriers/${courierServiceId}/api/service-types`
      });
      return response;
    } catch (error) {
      console.error('Failed to get supported service types:', error);
      return null;
    }
  }, []);

  const CITIES_CACHE_KEY_PREFIX = 'curfox_cities_';
  const CITIES_CACHE_TTL_MS     = 24 * 60 * 60 * 1000; // 24 hours

  const getCourierCities = useCallback(async (businessId: string, courierServiceId: string): Promise<Array<{ id: number; name: string; stateName: string }>> => {
    const cacheKey = `${CITIES_CACHE_KEY_PREFIX}${courierServiceId}`;

    // Return from localStorage if cached and younger than 24 h
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached: { fetchedAt: number; cities: Array<{ id: number; name: string; stateName: string }> } = JSON.parse(raw);
        if (Date.now() - cached.fetchedAt < CITIES_CACHE_TTL_MS) {
          return cached.cities;
        }
      }
    } catch { /* corrupt cache — will re-fetch below */ }

    try {
      const response: any = await fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/courier/businesses/${businessId}/couriers/${courierServiceId}/cities`
      });
      const cities: Array<{ id: number; name: string; stateName: string }> = response?.data?.cities || [];

      // Persist to localStorage for 24-hour reuse
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: Date.now(), cities }));
      } catch { /* localStorage may be full — silently skip */ }

      return cities;
    } catch (error) {
      console.error('Failed to get courier cities:', error);
      return [];
    }
  }, []);

  /**
   * Fetch customer order insight for a phone number (business-wide / all branches):
   * delivered-vs-returned success rate, return history and possible duplicate
   * orders. Used to flag risky/fake customers and duplicate orders at courier
   * creation time. Returns null on failure (never throws to the UI).
   */
  const getPhoneOrderInsights = useCallback(async (
    phone: string,
  ): Promise<PhoneOrderInsights | null> => {
    const trimmed = (phone || '').trim();
    if (!trimmed) return null;
    try {
      const params = new URLSearchParams({ phone: trimmed });
      const response = await fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/courier/phone-insights?${params.toString()}`,
      });
      if (response?.success) {
        return response.data as PhoneOrderInsights;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch phone order insights:', error);
      return null;
    }
  }, [fetchData]);

  /**
   * Look up a single shipment by a scanned code (tracking / waybill / shipment
   * number), business-wide. Returns the shipment or null if not found.
   */
  const lookupShipmentByCode = useCallback(async (code: string) => {
    const trimmed = (code || '').trim();
    if (!trimmed) return null;
    try {
      const response = await fetchData({
        method: 'GET',
        silent: true,
        endpoint: `/courier/shipments/lookup?code=${encodeURIComponent(trimmed)}`,
      });
      return response?.success ? response.data : null;
    } catch (error) {
      console.error('Failed to look up shipment by code:', error);
      return null;
    }
  }, [fetchData]);

  /**
   * Scan a returned parcel back in at a branch. Sets the shipment to
   * RETURNED_TO_LOCATION (manual — not a courier webhook update). Accepts the
   * tracking / waybill / shipment number.
   */
  const scanReturnToLocation = useCallback(async (code: string, notes?: string) => {
    const trimmed = (code || '').trim();
    if (!trimmed) return null;
    try {
      const response = await fetchData({
        method: 'POST',
        endpoint: '/courier/shipments/scan-return',
        data: { code: trimmed, notes },
      });
      return response?.success ? response.data : null;
    } catch (error) {
      console.error('Failed to scan return to location:', error);
      return null;
    }
  }, [fetchData]);

  return {
    // State
    courierServices,
    courierShipments,
    businessPreferences,
    courierSettings,
    loading,
    total,
    shipmentsTotal,
    shipmentsTotalPages,

    // Courier Services
    fetchCourierServices,
    createCourierService,
    updateCourierService,
    deleteCourierService,

    // Courier Shipments
    fetchCourierShipments,
    createCourierShipment,
    updateCourierShipment,
    updateShipmentStatus,
    bulkUpdateShipmentStatus,
    bulkSyncFromFardar,
    bulkSyncSaleLocationFromPickup,
    bulkUpdateShipmentNumbers,
    trackShipment,
    getShipmentTracking,
    calculateShippingCost,
    getPhoneOrderInsights,
    scanReturnToLocation,
    lookupShipmentByCode,

    // Admin approval flow
    fetchPendingApprovalShipments,
    approveShipment,

    // Business Preferences
    fetchBusinessCourierPreferences,
    addBusinessCourierPreference,
    updateBusinessCourierPreference,
    setDefaultCourier,

    // Courier Settings
    fetchCourierSettings,
    updateCourierSettings,
    getDefaultCourier,

    // API Integration
    createShipmentViaAPI,
    updateShipmentViaAPI,
    cancelShipmentViaAPI,
    calculateRateViaAPI,
    validateCourierCredentials,
    getSupportedServiceTypes,
    getCourierCities
  };
};

export default useCourier;
