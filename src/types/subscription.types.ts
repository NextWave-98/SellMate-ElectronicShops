// Subscription Management Types

export type SubscriptionPlanType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'TRIAL' | 'EXPIRED';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'CHECK' | 'PAYPAL' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REFUNDED';

// Subscription Plan Types
export interface SubscriptionPlan {
  id: string;
  plan_type: SubscriptionPlanType;
  name: string;
  description?: string;
  monthly_price: string;
  quarterly_price: string;
  semi_annual_price: string;
  annual_price: string;
  max_locations: number;
  max_warehouses: number;
  max_branches: number;
  max_users: number;
  max_products: number;
  unlimited_storage: boolean;
  storage_limit_gb?: number | null;
  pos_enabled: boolean;
  online_sales_enabled: boolean;
  courier_integration_enabled: boolean;
  advanced_reporting: boolean;
  api_access: boolean;
  custom_branding: boolean;
  multi_currency: boolean;
  priority_support: boolean;
  trial_days: number;
  is_active: boolean;
  features?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  _count?: {
    subscriptions: number;
  };
}

export interface CreateSubscriptionPlanDTO {
  planType: SubscriptionPlanType;
  name: string;
  description?: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  semiAnnualPrice: number;
  annualPrice: number;
  maxLocations: number;
  maxWarehouses: number;
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
  unlimitedStorage?: boolean;
  storageLimitGb?: number;
  posEnabled?: boolean;
  onlineSalesEnabled?: boolean;
  courierIntegrationEnabled?: boolean;
  advancedReporting?: boolean;
  apiAccess?: boolean;
  customBranding?: boolean;
  multiCurrency?: boolean;
  prioritySupport?: boolean;
  trialDays?: number;
  features?: Record<string, unknown>;
}

// UpdateSubscriptionPlanDTO - all fields optional for partial updates
export type UpdateSubscriptionPlanDTO = Partial<CreateSubscriptionPlanDTO>;

// Business Subscription Types
export interface BusinessSubscription {
  id: string;
  businessId: string;
  planId: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  nextBillingDate?: string;
  lastPaymentDate?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  customLimits?: Record<string, unknown>;
  couponCode?: string;
  discountAmount?: number;
  createdAt: string;
  updatedAt: string;
  plan?: SubscriptionPlan;
  business?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    payments: number;
  };
}

export interface CreateBusinessSubscriptionDTO {
  businessId: string;
  planId: string;
  billingCycle: BillingCycle;
  startDate: string;
  couponCode?: string;
  autoRenew?: boolean;
  customLimits?: Record<string, unknown>;
}

export interface UpdateBusinessSubscriptionDTO {
  planId?: string;
  billingCycle?: BillingCycle;
  status?: SubscriptionStatus;
  autoRenew?: boolean;
  customLimits?: Record<string, unknown>;
}

// Subscription Payment Types
export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDate: string;
  transactionId?: string;
  paymentGateway?: string;
  notes?: string;
  paymentMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  subscription?: BusinessSubscription;
}

export interface CreateSubscriptionPaymentDTO {
  subscriptionId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  transactionId?: string;
  paymentGateway?: string;
  notes?: string;
  paymentMetadata?: Record<string, unknown>;
}

// Response Types
export interface SubscriptionPlansListResponse {
  plans: SubscriptionPlan[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BusinessSubscriptionsListResponse {
  subscriptions: BusinessSubscription[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SubscriptionPaymentsListResponse {
  payments: SubscriptionPayment[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// PayPal Types
export interface PayPalCreateOrderResponse {
  orderID: string;
  approveUrl: string;
  amount?: number;
  planId?: string;
  billingCycle?: string;
}

export interface PayPalCaptureResponse {
  captureId: string;
  status: string;
  payment: Record<string, unknown>;
  subscription?: BusinessSubscription;
}

// Filter Types
export interface SubscriptionPlanFilters {
  isActive?: boolean;
  planType?: SubscriptionPlanType;
}

export interface BusinessSubscriptionFilters {
  businessId?: string;
  status?: SubscriptionStatus;
  planId?: string;
  page?: number;
  limit?: number;
}

export interface SubscriptionPaymentFilters {
  subscriptionId?: string;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
