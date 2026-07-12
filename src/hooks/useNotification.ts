/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import useFetch from './useFetch.tsx';

export interface Notification {
  id: string;
  type: string;
  method: string;
  recipientType: string;
  recipient: string;
  recipientUserId?: string;
  recipientRole?: string;
  subject?: string;
  message: string;
  status: string;
  priority?: string;
  eventType?: string;
  customerId?: string;
  jobSheetId?: string;
  saleId?: string;
  productReturnId?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  retryCount?: number;
  failureReason?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  status?: string;
  type?: string;
  recipientType?: string;
  recipientRole?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  saleId?: string;
  productReturnId?: string;
  jobSheetId?: string;
  limit?: number;
}

export interface NotificationSettings {
  id: string;
  notificationType: string;
  enabled: boolean;
  adminEnabled: boolean;
  managerEnabled: boolean;
  customerEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  priority: string;
  autoSend: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  delivered: number;
  byType: Record<string, number>;
  byRecipientType: Record<string, number>;
  byPriority: Record<string, number>;
}

const useNotification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchData } = useFetch();

  // =============================================
  // NOTIFICATION CRUD OPERATIONS
  // =============================================

  /**
   * Get all notifications with filters
   */
  const getNotifications = useCallback(async (filters?: NotificationFilters) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, String(value));
        });
      }
      const endpoint = `/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetchData({
        method: 'GET',
        endpoint,
        silent: true
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Get notification by ID
   */
  const getNotificationById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'GET',
        endpoint: `/notifications/${id}`,
        silent: true
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch notification';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Get notifications for current user
   */
  const getMyNotifications = useCallback(async (filters?: NotificationFilters) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, String(value));
        });
      }
      const endpoint = `/notifications/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetchData({
        method: 'GET',
        endpoint,
        silent: true
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch my notifications';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Get notification statistics
   */
  const getNotificationStats = useCallback(async (filters?: NotificationFilters): Promise<NotificationStats> => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, String(value));
        });
      }
      const endpoint = `/notifications/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetchData({
        method: 'GET',
        endpoint,
        silent: true
      });
      return response?.data as NotificationStats;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch notification stats';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Retry failed notification
   */
  const retryNotification = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'POST',
        endpoint: `/notifications/${id}/retry`,
        data: {},
        silent: false
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to retry notification';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'PATCH',
        endpoint: `/notifications/${id}/read`,
        data: {},
        silent: false
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark as read';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchData({
        method: 'DELETE',
        endpoint: `/notifications/${id}`,
        silent: false
      });
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete notification';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // =============================================
  // NOTIFICATION SETTINGS MANAGEMENT
  // =============================================

  /**
   * Get all notification settings
   */
  const getNotificationSettings = useCallback(async (): Promise<NotificationSettings[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'GET',
        endpoint: '/notifications/settings',
        silent: true
      });
      return (response?.data as any)?.settings || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch notification settings';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Update notification settings
   */
  const updateNotificationSettings = useCallback(async (
    notificationType: string,
    settings: Partial<NotificationSettings>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'PATCH',
        endpoint: `/notifications/settings/${notificationType}`,
        data: settings,
        silent: false
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update notification settings';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Bulk update notification settings
   */
  const bulkUpdateSettings = useCallback(async (
    settings: Array<{ notificationType: string; updates: Partial<NotificationSettings> }>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'POST',
        endpoint: '/notifications/settings/bulk-update',
        data: { settings },
        silent: false
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to bulk update settings';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // =============================================
  // RECIPIENT MANAGEMENT
  // =============================================

  /**
   * Get admin recipients for notifications
   */
  const getAdminRecipients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'GET',
        endpoint: '/notifications/recipients/admins',
        silent: true
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch admin recipients';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Get manager recipients for notifications (optionally by location)
   */
  const getManagerRecipients = useCallback(async (locationId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = `/notifications/recipients/managers${locationId ? `?locationId=${locationId}` : ''}`;
      const response = await fetchData({
        method: 'GET',
        endpoint,
        silent: true
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch manager recipients';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  /**
   * Get all possible recipients by role
   */
  const getRecipientsByRole = useCallback(async (role: string, locationId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = `/notifications/recipients/by-role/${role}${locationId ? `?locationId=${locationId}` : ''}`;
      const response = await fetchData({
        method: 'GET',
        endpoint,
        silent: true
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch recipients by role';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // =============================================
  // NOTIFICATION TESTING
  // =============================================

  /**
   * Send test notification
   */
  const sendTestNotification = useCallback(async (data: {
    type: string;
    recipientType: string;
    recipient: string;
    method: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchData({
        method: 'POST',
        endpoint: '/notifications/test',
        data,
        silent: false
      });
      return response?.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send test notification';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  return {
    loading,
    error,
    
    // Notification CRUD
    getNotifications,
    getNotificationById,
    getMyNotifications,
    getNotificationStats,
    retryNotification,
    markAsRead,
    deleteNotification,
    
    // Settings Management
    getNotificationSettings,
    updateNotificationSettings,
    bulkUpdateSettings,
    
    // Recipient Management
    getAdminRecipients,
    getManagerRecipients,
    getRecipientsByRole,
    
    // Testing
    sendTestNotification,
  };
};

export default useNotification;
