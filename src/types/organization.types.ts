// Organization Management Types

export type BusinessType = 'RETAIL' | 'WHOLESALE' | 'SERVICE' | 'MANUFACTURING' | 'OTHER';
export type LocationType = 'WAREHOUSE' | 'BRANCH' | 'OUTLET' | 'STORE';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export interface OrganizationOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export interface OrganizationLocation {
  id: string;
  locationCode: string;
  name: string;
  locationType: LocationType;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
}

export interface OrganizationSubscription {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  billingCycle: BillingCycle;
}

export interface Organization {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string;
  province?: string;
  postalCode?: string;
  telephone: string;
  email: string;
  website?: string;
  taxNumber?: string;
  registrationNumber?: string;
  businessType?: BusinessType;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: OrganizationOwner;
  locations?: OrganizationLocation[];
  subscription?: OrganizationSubscription;
  _count?: {
    users: number;
    locations: number;
    products: number;
  };
}

export interface CreateOrganizationDTO {
  business: {
    name: string;
    address: string;
    city: string;
    district?: string;
    province?: string;
    postalCode?: string;
    telephone: string;
    email: string;
    website?: string;
    taxNumber?: string;
    registrationNumber?: string;
    businessType?: BusinessType;
    industryType?: 'ELECTRONICS' | 'CLOTHING' | 'GENERAL' | 'VEHICLE_RENTAL' | 'CAR_WASH' | 'GARAGE';
    description?: string;
  };
  owner: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    nic?: string;
  };
  initialLocation?: {
    locationCode: string;
    name: string;
    locationType: LocationType;
    address: string;
    city: string;
    district?: string;
    province?: string;
    postalCode?: string;
    phone: string;
    email?: string;
    isActive?: boolean;
  };
  autoSubscribe?: {
    planId: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    autoRenew?: boolean;
    startImmediately?: boolean;
  };
}

export interface OrganizationListResponse {
  organizations: Organization[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OrganizationFilters {
  search?: string;
  isActive?: boolean;
  subscriptionStatus?: string;
  limit?: number;
  offset?: number;
}

export interface CreateOrganizationResponse {
  businessId: string;
  businessName: string;
  ownerId: string;
  ownerEmail: string;
  locationId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  message: string;
  nextSteps: string[];
}
