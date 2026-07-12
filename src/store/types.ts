/**
 * Redux Store Types
 * Defines all types for the Redux store state
 */

// Permission type matching backend Permission model
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

// Role type matching backend Role model
export interface Role {
  id: string;
  name: string;
  description: string | null;
  businessId?: string;
  isActive: boolean;
  permissions: Permission[];
}

// Location type matching backend Location model
export interface Location {
  id: string;
  name: string;
  locationCode: string;
  locationType: 'WAREHOUSE' | 'BRANCH' | 'STORE' | 'OUTLET';
  isActive: boolean;
  address?: string;
  city?: string;
  phone?: string;
}

// Business type matching backend Business model
export interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  isActive: boolean;
  industryType?: 'ELECTRONICS' | 'CLOTHING' | 'GENERAL' | 'VEHICLE_RENTAL' | 'CAR_WASH' | 'GARAGE';
}

// Subscription type matching backend BusinessSubscription model
export interface Subscription {
  id: string;
  businessId: string;
  planId: string;
  planType: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
  startDate: string;
  endDate: string;
  trialEndDate?: string;
  autoRenew: boolean;
  // Plan limits
  maxLocations: number;
  maxUsers: number;
  maxProducts: number;
  features: string[];
}

// A branch (Location) a staff member is assigned to
export interface AssignedBranch {
  assignmentId?: string | null;
  locationId: string;
  name: string;
  locationCode: string;
  address?: string;
  isActive?: boolean;
  isPrimary?: boolean;
}

// User type matching backend User model with relationships
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  businessId?: string | null;
  business?: Business;
  locationId?: string | null;
  location?: Location;
  locationCode?: string | null;
  // Deprecated: use locationId/location
  branchId?: string | null;
  branchCode?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  };
  subscription?: Subscription;
  // Multi-branch support
  assignedBranches?: AssignedBranch[];
  isAdmin?: boolean;
  activeBranch?: { locationId: string; locationCode: string } | null;
  adminMode?: boolean;
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  // Post-login branch selection
  requiresBranchSelection: boolean;
  assignedBranches: AssignedBranch[];
}

// Permission check result
export interface PermissionCheckResult {
  hasPermission: boolean;
  permissionName: string;
}

// Role check result
export interface RoleCheckResult {
  hasRole: boolean;
  roleName: string;
}

// Available permission modules (matching backend)
export type PermissionModule = 
  | 'users'
  | 'roles'
  | 'locations'
  | 'customers'
  | 'products'
  | 'productcategories'
  | 'productreturns'
  | 'categories'
  | 'inventory'
  | 'sales'
  | 'jobsheets'
  | 'warranty'
  | 'suppliers'
  | 'supplierpayments'
  | 'purchaseorders'
  | 'goodsreceipts'
  | 'purchase-orders'
  | 'goods-receipts'
  | 'stock-transfers'
  | 'payments'
  | 'returns'
  | 'reports'
  | 'notifications'
  | 'communication'
  | 'whatsapp'
  | 'aianalytics'
  | 'addonrequests'
  | 'activitylogs'
  | 'couriers'
  | 'shipments'
  | 'installments'
  | 'installment_payments'
  | 'customer_financials'
  | 'subscription_payments'
  | 'settings'
  | 'business'
  | 'subscription';

// Available permission actions (matching backend)
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'manage';

// Pre-defined permission names (matching backend)
export const PERMISSIONS = {
  // User management
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Role management
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  // Location management
  LOCATIONS_CREATE: 'locations.create',
  LOCATIONS_READ: 'locations.read',
  LOCATIONS_UPDATE: 'locations.update',
  LOCATIONS_DELETE: 'locations.delete',

  // Customer management
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',

  // Product management
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_READ: 'products.read',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  // Category management
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_READ: 'categories.read',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',

  // Inventory management
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_DELETE: 'inventory.delete',

  // Parts catalog (repair / job sheets)
  PARTS_CREATE: 'parts.create',
  PARTS_READ: 'parts.read',
  PARTS_UPDATE: 'parts.update',
  PARTS_DELETE: 'parts.delete',

  // Sales management
  SALES_CREATE: 'sales.create',
  SALES_READ: 'sales.read',
  SALES_UPDATE: 'sales.update',
  SALES_DELETE: 'sales.delete',

  // Job sheet management
  JOBSHEETS_CREATE: 'jobsheets.create',
  JOBSHEETS_READ: 'jobsheets.read',
  JOBSHEETS_UPDATE: 'jobsheets.update',
  JOBSHEETS_MANAGE: 'jobsheets.manage',
  JOBSHEETS_DELETE: 'jobsheets.delete',

  // Warranty management
  WARRANTY_CREATE: 'warranty.create',
  WARRANTY_READ: 'warranty.read',
  WARRANTY_UPDATE: 'warranty.update',
  WARRANTY_DELETE: 'warranty.delete',

  // Supplier management
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_READ: 'suppliers.read',
  SUPPLIERS_UPDATE: 'suppliers.update',
  SUPPLIERS_DELETE: 'suppliers.delete',

  // Purchase order management
  PURCHASE_ORDERS_CREATE: 'purchase-orders.create',
  PURCHASE_ORDERS_READ: 'purchase-orders.read',
  PURCHASE_ORDERS_UPDATE: 'purchase-orders.update',
  PURCHASE_ORDERS_DELETE: 'purchase-orders.delete',

  // Goods receipt management
  GOODS_RECEIPTS_CREATE: 'goods-receipts.create',
  GOODS_RECEIPTS_READ: 'goods-receipts.read',
  GOODS_RECEIPTS_UPDATE: 'goods-receipts.update',
  GOODS_RECEIPTS_DELETE: 'goods-receipts.delete',

  // Stock transfer management
  STOCK_TRANSFERS_CREATE: 'stock-transfers.create',
  STOCK_TRANSFERS_READ: 'stock-transfers.read',
  STOCK_TRANSFERS_UPDATE: 'stock-transfers.update',
  STOCK_TRANSFERS_DELETE: 'stock-transfers.delete',

  // Payment management
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_UPDATE: 'payments.update',
  PAYMENTS_DELETE: 'payments.delete',

  // Returns management
  RETURNS_CREATE: 'returns.create',
  RETURNS_READ: 'returns.read',
  RETURNS_UPDATE: 'returns.update',
  RETURNS_DELETE: 'returns.delete',

  // Courier management
  COURIER_CREATE: 'courier.create',
  COURIER_READ: 'courier.read',
  COURIER_UPDATE: 'courier.update',
  COURIER_DELETE: 'courier.delete',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'download:reports',

  // Notifications
  NOTIFICATIONS_READ: 'notifications.read',
  NOTIFICATIONS_MANAGE: 'notifications.manage',

  // Settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',

  // Business management (Admin only)
  BUSINESS_CREATE: 'business.create',
  BUSINESS_READ: 'business.read',
  BUSINESS_UPDATE: 'business.update',
  BUSINESS_DELETE: 'business.delete',

  // Subscription management (Admin only)
  SUBSCRIPTION_READ: 'subscription.read',
  SUBSCRIPTION_MANAGE: 'subscription.manage',

  // Organization management (SUPER_ADMIN only - Platform level)
  ORGANIZATIONS_CREATE: 'organizations.create',
  ORGANIZATIONS_READ: 'organizations.read',
  ORGANIZATIONS_UPDATE: 'organizations.update',
  ORGANIZATIONS_DELETE: 'organizations.delete',
  ORGANIZATIONS_MANAGE: 'organizations.manage',
  ORGANIZATIONS_SUSPEND: 'organizations.suspend',

  // Platform administration (SUPER_ADMIN only)
  PLATFORM_MANAGE: 'platform.manage',
  PLATFORM_SETTINGS: 'platform.settings',

  // Communication management
  COMMUNICATION_VIEW: 'communication.view',
  COMMUNICATION_MANAGE: 'communication.manage',

  // WhatsApp Business
  WHATSAPP_VIEW: 'whatsapp.view',
  WHATSAPP_MANAGE: 'whatsapp.manage',

  // Facebook Lead Ads
  FACEBOOK_LEADS_VIEW: 'facebook-leads.view',
  FACEBOOK_LEADS_MANAGE: 'facebook-leads.manage',

  // AI Analytics
  AIANALYTICS_VIEW: 'aianalytics.view',
  AIANALYTICS_MANAGE: 'aianalytics.manage',

  // Installment management
  INSTALLMENTS_CREATE: 'installments.create',
  INSTALLMENTS_READ: 'installments.read',
  INSTALLMENTS_UPDATE: 'installments.update',
  INSTALLMENTS_DELETE: 'installments.delete',
  INSTALLMENTS_MANAGE: 'installments.manage',

  // Installment payment management
  INSTALLMENT_PAYMENTS_CREATE: 'installment.payments.create',
  INSTALLMENT_PAYMENTS_READ: 'installment.payments.read',
  INSTALLMENT_PAYMENTS_UPDATE: 'installment.payments.update',
  INSTALLMENT_PAYMENTS_DELETE: 'installment.payments.delete',
  INSTALLMENT_PAYMENTS_PROCESS: 'installment.payments.process',

  // Customer financial management
  CUSTOMER_FINANCIALS_CREATE: 'customer.financials.create',
  CUSTOMER_FINANCIALS_READ: 'customer.financials.read',
  CUSTOMER_FINANCIALS_UPDATE: 'customer.financials.update',
  CUSTOMER_FINANCIALS_DELETE: 'customer.financials.delete',
  CUSTOMER_FINANCIALS_VERIFY: 'customer.financials.verify',

  // Couriers (correct backend naming)
  COURIERS_CREATE: 'couriers.create',
  COURIERS_READ: 'couriers.read',
  COURIERS_UPDATE: 'couriers.update',
  COURIERS_DELETE: 'couriers.delete',
  COURIERS_MANAGE: 'couriers.manage',

  // Shipments
  SHIPMENTS_CREATE: 'shipments.create',
  SHIPMENTS_READ: 'shipments.read',
  SHIPMENTS_UPDATE: 'shipments.update',
  SHIPMENTS_DELETE: 'shipments.delete',
  SHIPMENTS_TRACK: 'shipments.track',

  // Supplier payments
  SUPPLIERPAYMENTS_CREATE: 'supplierpayments.create',
  SUPPLIERPAYMENTS_READ: 'supplierpayments.read',
  SUPPLIERPAYMENTS_UPDATE: 'supplierpayments.update',
  SUPPLIERPAYMENTS_DELETE: 'supplierpayments.delete',
  SUPPLIERPAYMENTS_APPROVE: 'supplierpayments.approve',

  // Subscription payments
  SUBSCRIPTION_PAYMENTS_CREATE: 'subscription.payments.create',
  SUBSCRIPTION_PAYMENTS_READ: 'subscription.payments.read',
  SUBSCRIPTION_PAYMENTS_UPDATE: 'subscription.payments.update',
  SUBSCRIPTION_PAYMENTS_DELETE: 'subscription.payments.delete',

  // Addon requests
  ADDONREQUESTS_CREATE: 'addonrequests.create',
  ADDONREQUESTS_READ: 'addonrequests.read',
  ADDONREQUESTS_UPDATE: 'addonrequests.update',
  ADDONREQUESTS_DELETE: 'addonrequests.delete',
  ADDONREQUESTS_APPROVE: 'addonrequests.approve',
  ADDONREQUESTS_REJECT: 'addonrequests.reject',

  // Product returns (correct backend naming)
  PRODUCTRETURNS_CREATE: 'productreturns.create',
  PRODUCTRETURNS_READ: 'productreturns.read',
  PRODUCTRETURNS_UPDATE: 'productreturns.update',
  PRODUCTRETURNS_DELETE: 'productreturns.delete',
  PRODUCTRETURNS_APPROVE: 'productreturns.approve',

  // Product categories (correct backend naming)
  PRODUCTCATEGORIES_CREATE: 'productcategories.create',
  PRODUCTCATEGORIES_READ: 'productcategories.read',
  PRODUCTCATEGORIES_UPDATE: 'productcategories.update',
  PRODUCTCATEGORIES_DELETE: 'productcategories.delete',

  // Purchase orders (correct backend naming)
  PURCHASEORDERS_CREATE: 'purchaseorders.create',
  PURCHASEORDERS_READ: 'purchaseorders.read',
  PURCHASEORDERS_UPDATE: 'purchaseorders.update',
  PURCHASEORDERS_DELETE: 'purchaseorders.delete',
  PURCHASEORDERS_APPROVE: 'purchaseorders.approve',

  // Goods receipts (correct backend naming)
  GOODSRECEIPTS_CREATE: 'goodsreceipts.create',
  GOODSRECEIPTS_READ: 'goodsreceipts.read',
  GOODSRECEIPTS_UPDATE: 'goodsreceipts.update',
  GOODSRECEIPTS_DELETE: 'goodsreceipts.delete',
  GOODSRECEIPTS_APPROVE: 'goodsreceipts.approve',

  // Activity logs
  ACTIVITYLOGS_READ: 'activitylogs.read',
  ACTIVITYLOGS_DELETE: 'activitylogs.delete',
  ACTIVITYLOGS_EXPORT: 'activitylogs.export',

  // Attendance management
  ATTENDANCE_CREATE: 'attendance.create',
  ATTENDANCE_READ: 'attendance.read',
  ATTENDANCE_UPDATE: 'attendance.update',
  ATTENDANCE_DELETE: 'attendance.delete',
  ATTENDANCE_MANAGE: 'attendance.manage',

  // Payroll management
  PAYROLL_READ: 'payroll.read',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_UPDATE: 'payroll.update',
  PAYROLL_DELETE: 'payroll.delete',
  PAYROLL_MANAGE: 'payroll.manage',
  PAYROLL_RUN: 'payroll.run',
  PAYROLL_EXPORT: 'payroll.export',
} as const;

// Role names matching backend
export const ROLE_NAMES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;

/**
 * Role Hierarchy (from highest to lowest):
 * - SUPER_ADMIN: Platform owner (1-2 users), can manage all organizations
 * - ADMIN: Organization administrator, manages their own business/organization
 * - MANAGER: Branch/Location manager within an organization
 * - STAFF: Regular staff with limited permissions
 */
export const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4, // Highest - Platform level
  ADMIN: 3,       // Organization level
  MANAGER: 2,     // Branch/Location level
  STAFF: 1,       // Basic level
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];
export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];
