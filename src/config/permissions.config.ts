/**
 * Permission Configuration
 * Centralized configuration for sidebar items, routes, and button permissions
 */

import { PERMISSIONS } from '../store/types';

/**
 * Sidebar Menu Permission Configuration
 * Maps sidebar menu item IDs to required permissions
 */
export interface SidebarPermissionConfig {
  id: string;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAnyPermission?: boolean; // true = ANY permission, false = ALL permissions
  requiredModule?: string; // Check if user has any permission in this module
  allowedRoles?: string[]; // Alternative: specify allowed roles
  children?: SidebarPermissionConfig[];
}

/**
 * SuperAdmin Sidebar Permission Configuration
 */
export const SUPERADMIN_SIDEBAR_PERMISSIONS: SidebarPermissionConfig[] = [
  {
    id: 'dashboard',
    // Dashboard is accessible to all authenticated admin users
  },
  {
    id: 'system-usage',
    // Help guide — all authenticated admin users
  },
  {
    id: 'shops',
    requiredModule: 'locations',
  },
  {
    id: 'staff',
    requiredModule: 'users',
  },
  {
    id: 'roles',
    requiredModule: 'roles',
  },
  {
    id: 'suppliers',
    requiredPermissions: [
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.SUPPLIERS_CREATE,
      PERMISSIONS.PURCHASEORDERS_READ,
      PERMISSIONS.PURCHASEORDERS_CREATE,
    ],
    requireAnyPermission: true,
  },
  {
    id: 'goods-receipts',
    requiredModule: 'goodsreceipts',
  },
  {
    id: 'addon-requests',
    requiredPermission: PERMISSIONS.PRODUCTS_READ,
  },
  {
    id: 'quick-pos',
    requiredPermission: PERMISSIONS.SALES_CREATE,
  },
  {
    id: 'advance-payments',
    requiredModule: 'sales',
  },
  {
    id: 'orders',
    requiredModule: 'sales',
  },
  {
    id: 'staff-skills',
    requiredModule: 'staff',
  },
  {
    id: 'product-usage',
    requiredModule: 'inventory',
  },
  {
    id: 'rental',
    requiredModule: 'rental',
    children: [
      { id: 'rental-dashboard', requiredModule: 'rental' },
      { id: 'rental-fleet', requiredModule: 'rental' },
      { id: 'rental-bookings', requiredModule: 'rental' },
      { id: 'rental-maintenance', requiredModule: 'rental' },
      { id: 'rental-fuel', requiredModule: 'rental' },
      { id: 'rental-claims', requiredModule: 'rental' },
      { id: 'rental-pricing', requiredModule: 'rental' },
    ],
  },
  {
    id: 'carwash',
    requiredModule: 'carwash',
    children: [
      { id: 'carwash-queue', requiredModule: 'carwash' },
      { id: 'carwash-services', requiredModule: 'carwash' },
      { id: 'carwash-memberships', requiredModule: 'carwash' },
      { id: 'carwash-performance', requiredModule: 'carwash' },
    ],
  },
  {
    id: 'garage',
    requiredModule: 'garage',
    children: [
      { id: 'garage-estimates', requiredModule: 'garage' },
      { id: 'garage-vehicles', requiredModule: 'garage' },
      { id: 'garage-reminders', requiredModule: 'garage' },
    ],
  },
  {
    id: 'trade-ins',
    requiredModule: 'tradein',
    children: [
      { id: 'trade-ins-list', requiredModule: 'tradein' },
      { id: 'trade-ins-rules', requiredModule: 'tradein' },
    ],
  },
  {
    id: 'appointments',
    requiredModule: 'appointment',
  },
  {
    id: 'towing',
    requiredModule: 'towing',
  },
  {
    id: 'accounting',
    requiredModule: 'accounting',
    children: [
      { id: 'accounting-accounts', requiredModule: 'accounting' },
      { id: 'accounting-journals', requiredModule: 'accounting' },
      { id: 'accounting-reports', requiredModule: 'accounting' },
    ],
  },
  {
    id: 'website',
    requiredModule: 'cms',
    children: [
      { id: 'website-settings', requiredModule: 'cms' },
      { id: 'website-pages', requiredModule: 'cms' },
      { id: 'website-blog', requiredModule: 'cms' },
      { id: 'website-testimonials', requiredModule: 'cms' },
      { id: 'website-payments', requiredModule: 'cms' },
    ],
  },
  {
    id: 'crm-tasks',
    requiredModule: 'crm',
  },
  {
    id: 'stock',
    requiredModule: 'products',
    children: [
      {
        id: 'product',
        requiredModule: 'products',
      },
      {
        id: 'stock-dashboard',
        requiredPermission: PERMISSIONS.INVENTORY_READ,
      },
      {
        id: 'barcodes',
        requiredModule: 'products',
      },
      {
        id: 'inventory',
        requiredModule: 'inventory',
      },
      {
        id: 'categories',
        requiredModule: 'productcategories',
      },
      {
        id: 'discounts',
        requiredModule: 'products',
      },
    ],
  },
  {
    id: 'sales',
    requiredModule: 'sales',
  },
  {
    id: 'jobsheets',
    requiredModule: 'jobsheets',
  },
  {
    id: 'sale-jobs',
    requiredModule: 'salejobs',
  },
  {
    id: 'parts',
    requiredModule: 'parts',
  },
  {
    id: 'payments',
    requiredModule: 'payments',
  },
  {
    id: 'customer',
    requiredModule: 'customers',
  },
  {
    id: 'warranty',
    requiredModule: 'warranty',
  },
  {
    id: 'returns',
    requiredModule: 'productreturns',
  },
  {
    id: 'installments',
    requiredModule: 'installments',
  },
  {
    id: 'courier',
    requiredModule: 'couriers',
    children: [
      { id: 'courier-services', requiredModule: 'couriers' },
      { id: 'shipment-tracking', requiredModule: 'couriers' },
    ],
  },
  {
    // Hidden when courier access is missing (same gate as Courier sidebar)
    id: 'woocommerce',
    requiredModule: 'couriers',
    children: [
      { id: 'woocommerce-settings', requiredModule: 'couriers' },
      { id: 'woocommerce-orders', requiredModule: 'couriers' },
    ],
  },
  {
    id: 'reports',
    requiredPermissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT],
    requireAnyPermission: true,
  },
  {
    id: 'activity-logs',
    requiredPermission: PERMISSIONS.ACTIVITYLOGS_READ,
  },
  {
    id: 'activity-monitoring',
    requiredPermissions: [
      PERMISSIONS.ACTIVITY_MONITORING_VIEW_TEAM,
      PERMISSIONS.ACTIVITY_MONITORING_MANAGE,
    ],
    requireAnyPermission: true,
  },
  {
    id: 'scorecard',
    requiredPermissions: [
      PERMISSIONS.SCORECARD_VIEW_OWN,
      PERMISSIONS.SCORECARD_VIEW_TEAM,
      PERMISSIONS.SCORECARD_MANAGE,
    ],
    requireAnyPermission: true,
  },
  {
    id: 'notifications',
    requiredModule: 'notifications',
  },
  {
    id: 'communication',
    children: [
      { id: 'communication-settings', requiredModule: 'communication' },
      {
        id: 'sms-automation',
        requiredPermissions: [PERMISSIONS.SMS_AUTOMATION_VIEW, PERMISSIONS.SMS_AUTOMATION_MANAGE],
        requireAnyPermission: true,
      },
      {
        id: 'whatsapp-settings',
        requiredPermissions: [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW],
        requireAnyPermission: true,
      },
      {
        id: 'whatsapp-ai',
        requiredPermissions: [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW],
        requireAnyPermission: true,
      },
      {
        id: 'whatsapp-inbox',
        requiredPermissions: [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW],
        requireAnyPermission: true,
      },
      {
        id: 'whatsapp-orders',
        requiredPermissions: [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW],
        requireAnyPermission: true,
      },
      {
        id: 'facebook-leads',
        requiredPermissions: [PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE],
        requireAnyPermission: true,
      },
      {
        id: 'facebook-leads-settings',
        requiredPermissions: [PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE],
        requireAnyPermission: true,
      },
      {
        id: 'lead-forms',
        requiredPermissions: [PERMISSIONS.LEAD_FORMS_VIEW, PERMISSIONS.LEAD_FORMS_MANAGE],
        requireAnyPermission: true,
      },
      { id: 'notification-settings', requiredPermission: PERMISSIONS.NOTIFICATIONS_MANAGE },
    ],
  },
  {
    id: 'ai-analytics',
    requiredModule: 'aianalytics',
  },
  {
    id: 'attendance',
    requiredModule: 'attendance',
  },
  {
    id: 'payroll',
    requiredModule: 'payroll',
  },
  {
    id: 'pos-settings',
    // Always visible to authenticated admin users
  },
  {
    id: 'subscription-checkout',
    requiredPermission: PERMISSIONS.SETTINGS_READ,
  },
];

/**
 * Branch Sidebar Permission Configuration
 */
export const BRANCH_SIDEBAR_PERMISSIONS: SidebarPermissionConfig[] = [
  {
    id: 'quick-pos',
    requiredPermission: PERMISSIONS.SALES_CREATE,
  },
  {
    id: 'cash-drawer',
    requiredPermission: PERMISSIONS.SALES_CREATE,
  },
  {
    id: 'advance-payments',
    requiredModule: 'sales',
  },
  {
    id: 'orders',
    requiredModule: 'sales',
  },
  {
    id: 'barcodes',
    requiredPermission: PERMISSIONS.PRODUCTS_READ,
  },
  {
    id: 'dashboard',
    // Dashboard is accessible to all authenticated branch users
  },
  {
    id: 'system-usage',
    // Help guide — all authenticated branch users
  },
  {
    id: 'pos',
    requiredPermission: PERMISSIONS.SALES_CREATE,
  },
  {
    id: 'products',
    requiredModule: 'products',
  },
  {
    id: 'stock-dashboard',
    requiredPermission: PERMISSIONS.INVENTORY_READ,
  },
  {
    id: 'product-usage',
    requiredModule: 'inventory',
  },
  {
    id: 'addon-requests',
    requiredPermission: PERMISSIONS.PRODUCTS_READ,
  },
  {
    id: 'sales',
    requiredModule: 'sales',
  },
  {
    id: 'customers',
    requiredModule: 'customers',
  },
  {
    id: 'jobsheets',
    requiredModule: 'jobsheets',
  },
  {
    id: 'sale-jobs',
    requiredModule: 'salejobs',
  },
  {
    id: 'parts',
    requiredModule: 'parts',
  },
  {
    id: 'returns',
    requiredModule: 'productreturns',
  },
  {
    id: 'warranty',
    requiredModule: 'warranty',
  },
  {
    id: 'installments',
    requiredPermission: PERMISSIONS.INSTALLMENTS_READ,
  },
  {
    id: 'courier',
    requiredModule: 'couriers',
  },
  {
    // Hidden when courier access is missing (same gate as Courier sidebar)
    id: 'woocommerce-orders',
    requiredModule: 'couriers',
  },
  {
    id: 'attendance',
    // Accessible to all authenticated branch staff
  },
  {
    id: 'rental',
    requiredModule: 'rental',
  },
  {
    id: 'carwash',
    requiredModule: 'carwash',
  },
  {
    id: 'garage',
    requiredModule: 'garage',
  },
  {
    id: 'trade-ins',
    requiredModule: 'tradein',
  },
  {
    id: 'appointments',
    requiredModule: 'appointment',
  },
  {
    id: 'towing',
    requiredModule: 'towing',
  },
  {
    id: 'accounting',
    requiredModule: 'accounting',
  },
  {
    id: 'website',
    requiredModule: 'cms',
  },
  {
    id: 'crm-tasks',
    requiredModule: 'crm',
  },
  {
    id: 'leads',
    requiredPermissions: [PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE],
    requireAnyPermission: true,
  },
  {
    id: 'my-activity',
    requiredPermission: PERMISSIONS.ACTIVITY_MONITORING_VIEW_OWN,
  },
  {
    id: 'my-scorecard',
    requiredPermissions: [PERMISSIONS.SCORECARD_VIEW_OWN, PERMISSIONS.SCORECARD_VIEW_TEAM],
    requireAnyPermission: true,
  },
  {
    id: 'suppliers',
    requiredPermissions: [
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.SUPPLIERS_CREATE,
      PERMISSIONS.PURCHASEORDERS_READ,
      PERMISSIONS.PURCHASEORDERS_CREATE,
    ],
    requireAnyPermission: true,
  },
];

/**
 * Route Permission Configuration
 * Maps route paths to required permissions for protection
 */
export interface RoutePermissionConfig {
  path: string;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAnyPermission?: boolean;
  requiredModule?: string;
  allowedRoles?: string[];
}

/**
 * SuperAdmin Route Permissions
 */
export const SUPERADMIN_ROUTE_PERMISSIONS: RoutePermissionConfig[] = [
  { path: '/superadmin/dashboard' }, // All admins can access
  { path: '/superadmin/system-usage' }, // Help guide — all admins
  { path: '/superadmin/shops/management', requiredModule: 'locations' },
  { path: '/superadmin/staff/management', requiredModule: 'users' },
  { path: '/superadmin/roles/management', requiredModule: 'roles' },
  { path: '/superadmin/suppliers/management', requiredPermissions: [
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.PURCHASEORDERS_READ,
    PERMISSIONS.PURCHASEORDERS_CREATE,
  ], requireAnyPermission: true },
  { path: '/superadmin/goods-receipts', requiredModule: 'goods-receipts' },
  { path: '/superadmin/addon-requests', requiredPermission: PERMISSIONS.PRODUCTS_READ },
  { path: '/superadmin/stock/management', requiredModule: 'products' },
  { path: '/superadmin/stock/dashboard', requiredPermission: PERMISSIONS.INVENTORY_READ },
  { path: '/superadmin/inventory/monitor', requiredModule: 'inventory' },
  { path: '/superadmin/categories/management', requiredModule: 'categories' },
  { path: '/superadmin/sales/monitor', requiredModule: 'sales' },
  { path: '/superadmin/job-sheets/monitor', requiredModule: 'jobsheets' },
  { path: '/superadmin/parts/management', requiredModule: 'parts' },
  { path: '/superadmin/payments/management', requiredModule: 'payments' },
  { path: '/superadmin/customers/management', requiredModule: 'customers' },
  { path: '/superadmin/warranty/management', requiredModule: 'warranty' },
  { path: '/superadmin/returns', requiredModule: 'returns' },
  { path: '/superadmin/courier/management', requiredModule: 'courier' },
  { path: '/superadmin/reports', requiredPermissions: [PERMISSIONS.REPORTS_VIEW], requireAnyPermission: true },
  { path: '/superadmin/ai-analytics', requiredModule: 'aianalytics' },
  {
    path: '/superadmin/activity-monitoring',
    requiredPermissions: [
      PERMISSIONS.ACTIVITY_MONITORING_VIEW_TEAM,
      PERMISSIONS.ACTIVITY_MONITORING_MANAGE,
    ],
    requireAnyPermission: true,
  },
  {
    path: '/superadmin/scorecard',
    requiredPermissions: [
      PERMISSIONS.SCORECARD_VIEW_OWN,
      PERMISSIONS.SCORECARD_VIEW_TEAM,
      PERMISSIONS.SCORECARD_MANAGE,
    ],
    requireAnyPermission: true,
  },
  { path: '/superadmin/notifications/dashboard', requiredModule: 'notifications' },
  { path: '/superadmin/notifications/settings', requiredPermission: PERMISSIONS.NOTIFICATIONS_MANAGE },
  { path: '/superadmin/communication/settings', requiredModule: 'communication' },
  {
    path: '/superadmin/communication/sms-automation',
    requiredPermissions: [PERMISSIONS.SMS_AUTOMATION_VIEW, PERMISSIONS.SMS_AUTOMATION_MANAGE],
    requireAnyPermission: true,
  },
  {
    path: '/superadmin/communication/whatsapp',
    requiredPermissions: [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW],
    requireAnyPermission: true,
  },
  {
    path: '/superadmin/communication/whatsapp/ai',
    requiredPermissions: [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW],
    requireAnyPermission: true,
  },
  {
    path: '/superadmin/communication/whatsapp/inbox',
    requiredPermissions: [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.COMMUNICATION_VIEW],
    requireAnyPermission: true,
  },
  {
    path: '/superadmin/facebook-leads',
    requiredPermissions: [PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE],
    requireAnyPermission: true,
  },
  {
    path: '/superadmin/facebook-leads/settings',
    requiredPermissions: [PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE],
    requireAnyPermission: true,
  },
  {
    path: '/superadmin/facebook-leads/forms',
    requiredPermissions: [PERMISSIONS.LEAD_FORMS_VIEW, PERMISSIONS.LEAD_FORMS_MANAGE],
    requireAnyPermission: true,
  },
  { path: '/superadmin/installments', requiredModule: 'installments' },
];

/**
 * Branch Route Permissions
 */
export const BRANCH_ROUTE_PERMISSIONS: RoutePermissionConfig[] = [
  { path: '/:branchCode/dashboard' }, // All branch users can access
  { path: '/:branchCode/system-usage' }, // Help guide — all branch users
  { path: '/:branchCode/pos', requiredPermission: PERMISSIONS.SALES_CREATE },
  { path: '/:branchCode/quick-pos', requiredPermission: PERMISSIONS.SALES_CREATE },
  { path: '/:branchCode/cash-drawer', requiredPermission: PERMISSIONS.SALES_CREATE },
  { path: '/:branchCode/advance-payments', requiredPermission: PERMISSIONS.PAYMENTS_READ },
  { path: '/:branchCode/orders', requiredModule: 'sales' },
  { path: '/:branchCode/barcodes', requiredPermission: PERMISSIONS.PRODUCTS_READ },
  { path: '/:branchCode/products', requiredModule: 'products' },
  { path: '/:branchCode/stock/dashboard', requiredPermission: PERMISSIONS.INVENTORY_READ },
  { path: '/:branchCode/product-usage', requiredModule: 'inventory' },
  { path: '/:branchCode/addon-requests', requiredPermission: PERMISSIONS.PRODUCTS_READ },
  { path: '/:branchCode/sales', requiredModule: 'sales' },
  { path: '/:branchCode/customers', requiredModule: 'customers' },
  { path: '/:branchCode/jobsheets', requiredModule: 'jobsheets' },
  { path: '/:branchCode/parts', requiredModule: 'parts' },
  { path: '/:branchCode/returns', requiredModule: 'returns' },
  { path: '/:branchCode/warranty', requiredModule: 'warranty' },
  { path: '/:branchCode/installments', requiredPermission: PERMISSIONS.INSTALLMENTS_READ },
  { path: '/:branchCode/installments/create', requiredPermission: PERMISSIONS.INSTALLMENTS_CREATE },
  { path: '/:branchCode/installments/:id', requiredPermission: PERMISSIONS.INSTALLMENTS_READ },
  {
    path: '/:branchCode/leads',
    requiredPermissions: [PERMISSIONS.FACEBOOK_LEADS_VIEW, PERMISSIONS.FACEBOOK_LEADS_MANAGE],
    requireAnyPermission: true,
  },
  {
    path: '/:branchCode/my-activity',
    requiredPermission: PERMISSIONS.ACTIVITY_MONITORING_VIEW_OWN,
  },
  {
    path: '/:branchCode/my-scorecard',
    requiredPermissions: [PERMISSIONS.SCORECARD_VIEW_OWN, PERMISSIONS.SCORECARD_VIEW_TEAM],
    requireAnyPermission: true,
  },
  {
    path: '/:branchCode/suppliers/management',
    requiredPermissions: [
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.SUPPLIERS_CREATE,
      PERMISSIONS.PURCHASEORDERS_READ,
      PERMISSIONS.PURCHASEORDERS_CREATE,
    ],
    requireAnyPermission: true,
  },
];

/**
 * Button Permission Configuration
 * Define permissions for common action buttons
 */
export const BUTTON_PERMISSIONS = {
  // User Management
  CREATE_USER: PERMISSIONS.USERS_CREATE,
  EDIT_USER: PERMISSIONS.USERS_UPDATE,
  DELETE_USER: PERMISSIONS.USERS_DELETE,
  VIEW_USER: PERMISSIONS.USERS_READ,

  // Product Management
  CREATE_PRODUCT: PERMISSIONS.PRODUCTS_CREATE,
  EDIT_PRODUCT: PERMISSIONS.PRODUCTS_UPDATE,
  DELETE_PRODUCT: PERMISSIONS.PRODUCTS_DELETE,
  VIEW_PRODUCT: PERMISSIONS.PRODUCTS_READ,

  // Sales Management
  CREATE_SALE: PERMISSIONS.SALES_CREATE,
  EDIT_SALE: PERMISSIONS.SALES_UPDATE,
  DELETE_SALE: PERMISSIONS.SALES_DELETE,
  VIEW_SALE: PERMISSIONS.SALES_READ,

  // Customer Management
  CREATE_CUSTOMER: PERMISSIONS.CUSTOMERS_CREATE,
  EDIT_CUSTOMER: PERMISSIONS.CUSTOMERS_UPDATE,
  DELETE_CUSTOMER: PERMISSIONS.CUSTOMERS_DELETE,
  VIEW_CUSTOMER: PERMISSIONS.CUSTOMERS_READ,

  // Inventory Management
  CREATE_INVENTORY: PERMISSIONS.INVENTORY_CREATE,
  EDIT_INVENTORY: PERMISSIONS.INVENTORY_UPDATE,
  DELETE_INVENTORY: PERMISSIONS.INVENTORY_DELETE,
  VIEW_INVENTORY: PERMISSIONS.INVENTORY_READ,

  // Job Sheets
  CREATE_JOBSHEET: PERMISSIONS.JOBSHEETS_CREATE,
  EDIT_JOBSHEET: PERMISSIONS.JOBSHEETS_UPDATE,
  DELETE_JOBSHEET: PERMISSIONS.JOBSHEETS_DELETE,
  VIEW_JOBSHEET: PERMISSIONS.JOBSHEETS_READ,

  // Warranty
  CREATE_WARRANTY: PERMISSIONS.WARRANTY_CREATE,
  EDIT_WARRANTY: PERMISSIONS.WARRANTY_UPDATE,
  DELETE_WARRANTY: PERMISSIONS.WARRANTY_DELETE,
  VIEW_WARRANTY: PERMISSIONS.WARRANTY_READ,

  // Supplier Management
  CREATE_SUPPLIER: PERMISSIONS.SUPPLIERS_CREATE,
  EDIT_SUPPLIER: PERMISSIONS.SUPPLIERS_UPDATE,
  DELETE_SUPPLIER: PERMISSIONS.SUPPLIERS_DELETE,
  VIEW_SUPPLIER: PERMISSIONS.SUPPLIERS_READ,

  // Purchase Orders
  CREATE_PURCHASE_ORDER: PERMISSIONS.PURCHASE_ORDERS_CREATE,
  EDIT_PURCHASE_ORDER: PERMISSIONS.PURCHASE_ORDERS_UPDATE,
  DELETE_PURCHASE_ORDER: PERMISSIONS.PURCHASE_ORDERS_DELETE,
  VIEW_PURCHASE_ORDER: PERMISSIONS.PURCHASE_ORDERS_READ,

  // Goods Receipts
  CREATE_GOODS_RECEIPT: PERMISSIONS.GOODS_RECEIPTS_CREATE,
  EDIT_GOODS_RECEIPT: PERMISSIONS.GOODS_RECEIPTS_UPDATE,
  DELETE_GOODS_RECEIPT: PERMISSIONS.GOODS_RECEIPTS_DELETE,
  VIEW_GOODS_RECEIPT: PERMISSIONS.GOODS_RECEIPTS_READ,

  // Stock Transfers
  CREATE_STOCK_TRANSFER: PERMISSIONS.STOCK_TRANSFERS_CREATE,
  EDIT_STOCK_TRANSFER: PERMISSIONS.STOCK_TRANSFERS_UPDATE,
  DELETE_STOCK_TRANSFER: PERMISSIONS.STOCK_TRANSFERS_DELETE,
  VIEW_STOCK_TRANSFER: PERMISSIONS.STOCK_TRANSFERS_READ,

  // Payments
  CREATE_PAYMENT: PERMISSIONS.PAYMENTS_CREATE,
  EDIT_PAYMENT: PERMISSIONS.PAYMENTS_UPDATE,
  DELETE_PAYMENT: PERMISSIONS.PAYMENTS_DELETE,
  VIEW_PAYMENT: PERMISSIONS.PAYMENTS_READ,

  // Installments
  CREATE_INSTALLMENT: PERMISSIONS.INSTALLMENTS_CREATE,
  EDIT_INSTALLMENT: PERMISSIONS.INSTALLMENTS_UPDATE,
  DELETE_INSTALLMENT: PERMISSIONS.INSTALLMENTS_DELETE,
  VIEW_INSTALLMENT: PERMISSIONS.INSTALLMENTS_READ,
  MANAGE_INSTALLMENT: PERMISSIONS.INSTALLMENTS_MANAGE,

  // Installment Payments
  CREATE_INSTALLMENT_PAYMENT: PERMISSIONS.INSTALLMENT_PAYMENTS_CREATE,
  EDIT_INSTALLMENT_PAYMENT: PERMISSIONS.INSTALLMENT_PAYMENTS_UPDATE,
  DELETE_INSTALLMENT_PAYMENT: PERMISSIONS.INSTALLMENT_PAYMENTS_DELETE,
  VIEW_INSTALLMENT_PAYMENT: PERMISSIONS.INSTALLMENT_PAYMENTS_READ,
  PROCESS_INSTALLMENT_PAYMENT: PERMISSIONS.INSTALLMENT_PAYMENTS_PROCESS,

  // Customer Financials
  CREATE_CUSTOMER_FINANCIAL: PERMISSIONS.CUSTOMER_FINANCIALS_CREATE,
  EDIT_CUSTOMER_FINANCIAL: PERMISSIONS.CUSTOMER_FINANCIALS_UPDATE,
  DELETE_CUSTOMER_FINANCIAL: PERMISSIONS.CUSTOMER_FINANCIALS_DELETE,
  VIEW_CUSTOMER_FINANCIAL: PERMISSIONS.CUSTOMER_FINANCIALS_READ,
  VERIFY_CUSTOMER_FINANCIAL: PERMISSIONS.CUSTOMER_FINANCIALS_VERIFY,

  // Returns
  CREATE_RETURN: PERMISSIONS.RETURNS_CREATE,
  EDIT_RETURN: PERMISSIONS.RETURNS_UPDATE,
  DELETE_RETURN: PERMISSIONS.RETURNS_DELETE,
  VIEW_RETURN: PERMISSIONS.RETURNS_READ,

  // Reports
  VIEW_REPORTS: PERMISSIONS.REPORTS_VIEW,
  EXPORT_REPORTS: PERMISSIONS.REPORTS_EXPORT,

  // AI Analytics
  VIEW_AI_ANALYTICS: PERMISSIONS.AIANALYTICS_VIEW,
  MANAGE_AI_ANALYTICS: PERMISSIONS.AIANALYTICS_MANAGE,

  // Locations
  CREATE_LOCATION: PERMISSIONS.LOCATIONS_CREATE,
  EDIT_LOCATION: PERMISSIONS.LOCATIONS_UPDATE,
  DELETE_LOCATION: PERMISSIONS.LOCATIONS_DELETE,
  VIEW_LOCATION: PERMISSIONS.LOCATIONS_READ,

  // Categories
  CREATE_CATEGORY: PERMISSIONS.CATEGORIES_CREATE,
  EDIT_CATEGORY: PERMISSIONS.CATEGORIES_UPDATE,
  DELETE_CATEGORY: PERMISSIONS.CATEGORIES_DELETE,
  VIEW_CATEGORY: PERMISSIONS.CATEGORIES_READ,

  // Notifications
  VIEW_NOTIFICATIONS: PERMISSIONS.NOTIFICATIONS_READ,
  MANAGE_NOTIFICATIONS: PERMISSIONS.NOTIFICATIONS_MANAGE,

  // Settings
  VIEW_SETTINGS: PERMISSIONS.SETTINGS_READ,
  EDIT_SETTINGS: PERMISSIONS.SETTINGS_UPDATE,
} as const;

export type ButtonPermissionKey = keyof typeof BUTTON_PERMISSIONS;
