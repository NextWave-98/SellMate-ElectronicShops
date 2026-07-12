export const NotificationType = {
  ALERT : 'alert',
  WARNING : 'warning',
  INFO : 'info',
  SUCCESS : 'success',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationCategory = {
  STOCK : 'stock',
  SALES : 'sales',
  JOBSHEET : 'jobsheet',
  STAFF : 'staff',
  SYSTEM : 'system',
  WARRANTY : 'warranty',
  CUSTOMER : 'customer',
}

export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory];

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  shopId?: number;
  shopName?: string;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  lowStockAlerts: boolean;
  lowStockThreshold: number;
  salesTargetAlerts: boolean;
  overdueJobSheetAlerts: boolean;
  warrantyExpiryAlerts: boolean;
  warrantyExpiryDays: number;
  staffAttendanceAlerts: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
}

export interface NotificationStats {
  totalNotifications: number;
  unreadNotifications: number;
  highPriorityUnread: number;
  notificationsByCategory: {
    stock: number;
    sales: number;
    jobsheet: number;
    staff: number;
    system: number;
    warranty: number;
    customer: number;
  };
}
