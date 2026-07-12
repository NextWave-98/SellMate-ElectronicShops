/**
 * Notification Types & Configuration
 * Defines notification recipient rules and settings
 */

export interface NotificationRecipientRule {
  recipientType: 'CUSTOMER' | 'MANAGER' | 'ADMIN' | 'STAFF' | 'SYSTEM';
  enabled: boolean;
  locationSpecific?: boolean; // If true, only send to managers/staff at the relevant location
  roleRequired?: string[]; // Specific roles that can receive this notification
}

export interface NotificationChannelSettings {
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  inApp: boolean;
}

export interface NotificationTypeConfiguration {
  notificationType: string;
  displayName: string;
  description: string;
  category: 'SALES' | 'RETURNS' | 'JOBSHEET' | 'INVENTORY' | 'SYSTEM' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  
  // Recipient Configuration
  customerEnabled: boolean;
  managerEnabled: boolean;
  adminEnabled: boolean;
  staffEnabled?: boolean;
  
  // Channel Configuration
  channels: NotificationChannelSettings;
  
  // Behavior
  autoSend: boolean; // Automatically send or require manual approval
  requiresApproval?: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  
  // Conditions
  conditions?: {
    minimumAmount?: number; // For high-value alerts
    statusChangesOnly?: boolean;
    locationSpecific?: boolean;
  };
}

/**
 * Predefined notification configurations for all notification types
 */
export const NOTIFICATION_CONFIGURATIONS: Record<string, NotificationTypeConfiguration> = {
  // ==================== SALES ====================
  SALE_CREATED: {
    notificationType: 'SALE_CREATED',
    displayName: 'Sale Created',
    description: 'Customer receives confirmation when a sale is completed',
    category: 'SALES',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  SALE_UPDATED: {
    notificationType: 'SALE_UPDATED',
    displayName: 'Sale Updated',
    description: 'Customer notified when sale details are modified',
    category: 'SALES',
    priority: 'MEDIUM',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  
  SALE_CANCELLED: {
    notificationType: 'SALE_CANCELLED',
    displayName: 'Sale Cancelled',
    description: 'Customer notified when a sale is cancelled',
    category: 'SALES',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: true,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  SALE_HIGH_VALUE: {
    notificationType: 'SALE_HIGH_VALUE',
    displayName: 'High Value Sale Alert',
    description: 'Managers and admins notified of high-value sales',
    category: 'SALES',
    priority: 'URGENT',
    customerEnabled: false,
    managerEnabled: true,
    adminEnabled: true,
    channels: { sms: true, email: true, whatsapp: false, inApp: true },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
    conditions: {
      minimumAmount: 1000,
      locationSpecific: true,
    },
  },
  
  // ==================== RETURNS ====================
  RETURN_CREATED: {
    notificationType: 'RETURN_CREATED',
    displayName: 'Return Created',
    description: 'Customer receives confirmation when return is initiated',
    category: 'RETURNS',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  RETURN_INSPECTED: {
    notificationType: 'RETURN_INSPECTED',
    displayName: 'Return Inspection Started',
    description: 'Customer notified when inspection begins',
    category: 'RETURNS',
    priority: 'MEDIUM',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  
  RETURN_INSPECTED: {
    notificationType: 'RETURN_INSPECTED',
    displayName: 'Return Inspection Complete',
    description: 'Customer notified when inspection is finished',
    category: 'RETURNS',
    priority: 'MEDIUM',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  
  RETURN_APPROVED: {
    notificationType: 'RETURN_APPROVED',
    displayName: 'Return Approved',
    description: 'Customer notified when return is approved',
    category: 'RETURNS',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: true,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  RETURN_REJECTED: {
    notificationType: 'RETURN_REJECTED',
    displayName: 'Return Rejected',
    description: 'Customer notified when return is rejected',
    category: 'RETURNS',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: true,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  RETURN_REFUNDED: {
    notificationType: 'RETURN_REFUNDED',
    displayName: 'Refund Processed',
    description: 'Customer notified when refund is processed',
    category: 'RETURNS',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  RETURN_COMPLETED: {
    notificationType: 'RETURN_COMPLETED',
    displayName: 'Return Completed',
    description: 'Customer notified when return process is complete',
    category: 'RETURNS',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  
  RETURN_CANCELLED: {
    notificationType: 'RETURN_CANCELLED',
    displayName: 'Return Cancelled',
    description: 'Customer notified when return is cancelled',
    category: 'RETURNS',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: true,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  // ==================== JOB SHEETS ====================
  JOB_CREATED: {
    notificationType: 'JOB_CREATED',
    displayName: 'Job Sheet Created',
    description: 'Customer receives job confirmation',
    category: 'JOBSHEET',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    staffEnabled: true,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  JOB_STARTED: {
    notificationType: 'JOB_STARTED',
    displayName: 'Job Started',
    description: 'Customer notified when job work begins',
    category: 'JOBSHEET',
    priority: 'MEDIUM',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  
  JOB_DIAGNOSED: {
    notificationType: 'JOB_DIAGNOSED',
    displayName: 'Job Diagnosed',
    description: 'Customer receives diagnosis details',
    category: 'JOBSHEET',
    priority: 'MEDIUM',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: false, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  
  JOB_REPAIRING: {
    notificationType: 'JOB_REPAIRING',
    displayName: 'Job Repair In Progress',
    description: 'Customer notified repair is ongoing',
    category: 'JOBSHEET',
    priority: 'LOW',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: false,
    maxRetries: 1,
  },
  
  JOB_COMPLETED: {
    notificationType: 'JOB_COMPLETED',
    displayName: 'Job Completed',
    description: 'Customer notified when job is finished',
    category: 'JOBSHEET',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  JOB_READY_PICKUP: {
    notificationType: 'JOB_READY_PICKUP',
    displayName: 'Job Ready for Pickup',
    description: 'Customer notified device is ready for collection',
    category: 'JOBSHEET',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  JOB_DELIVERED: {
    notificationType: 'JOB_DELIVERED',
    displayName: 'Job Delivered',
    description: 'Customer notified of delivery',
    category: 'JOBSHEET',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: false,
    adminEnabled: false,
    channels: { sms: true, email: false, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 2,
  },
  
  JOB_CANCELLED: {
    notificationType: 'JOB_CANCELLED',
    displayName: 'Job Cancelled',
    description: 'Customer notified when job is cancelled',
    category: 'JOBSHEET',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: true,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
  
  JOB_PRICE_UPDATED: {
    notificationType: 'JOB_PRICE_UPDATED',
    displayName: 'Job Price Updated',
    description: 'Customer notified of price changes',
    category: 'JOBSHEET',
    priority: 'HIGH',
    customerEnabled: true,
    managerEnabled: true,
    adminEnabled: false,
    channels: { sms: true, email: true, whatsapp: false, inApp: false },
    autoSend: true,
    retryOnFailure: true,
    maxRetries: 3,
  },
};

/**
 * Helper function to get notification configuration
 */
export const getNotificationConfig = (notificationType: string): NotificationTypeConfiguration | null => {
  return NOTIFICATION_CONFIGURATIONS[notificationType] || null;
};

/**
 * Helper function to determine if a notification should be sent to a specific recipient type
 */
export const shouldSendToRecipient = (
  notificationType: string,
  recipientType: 'CUSTOMER' | 'MANAGER' | 'ADMIN' | 'STAFF'
): boolean => {
  const config = getNotificationConfig(notificationType);
  if (!config) return false;
  
  switch (recipientType) {
    case 'CUSTOMER':
      return config.customerEnabled;
    case 'MANAGER':
      return config.managerEnabled;
    case 'ADMIN':
      return config.adminEnabled;
    case 'STAFF':
      return config.staffEnabled || false;
    default:
      return false;
  }
};

/**
 * Helper function to get enabled channels for a notification type
 */
export const getEnabledChannels = (notificationType: string): string[] => {
  const config = getNotificationConfig(notificationType);
  if (!config) return [];
  
  const channels: string[] = [];
  if (config.channels.sms) channels.push('SMS');
  if (config.channels.email) channels.push('EMAIL');
  if (config.channels.whatsapp) channels.push('WHATSAPP');
  if (config.channels.inApp) channels.push('IN_APP');
  
  return channels;
};

/**
 * Helper function to get all notification types by category
 */
export const getNotificationTypesByCategory = (
  category: 'SALES' | 'RETURNS' | 'JOBSHEET' | 'INVENTORY' | 'SYSTEM' | 'GENERAL'
): NotificationTypeConfiguration[] => {
  return Object.values(NOTIFICATION_CONFIGURATIONS).filter(
    config => config.category === category
  );
};
