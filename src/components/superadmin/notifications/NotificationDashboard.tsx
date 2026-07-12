/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import useNotification, { type Notification, type NotificationStats } from '../../../hooks/useNotification';
import useSMS from '../../../hooks/useSMS';

interface SMSBalanceData {
  success: boolean;
  message: string;
  credits?: number;
  balance?: number;
  data?: {
    success?: boolean;
    message?: string;
    balance?: number;
    credits?: number;
    data?: {
      status?: string;
      source?: string;
    };
  };
}

const NotificationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    getNotifications,
    getNotificationStats,
    retryNotification,
    markAsRead,
    deleteNotification,
    loading,
    error,
  } = useNotification();

  const { checkSMSBalance } = useSMS();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [smsBalance, setSmsBalance] = useState<SMSBalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedRecipientType, setSelectedRecipientType] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    try {
      const filters: Record<string, string> = {};
      if (selectedStatus !== 'ALL') filters.status = selectedStatus;
      if (selectedType !== 'ALL') filters.type = selectedType;
      if (selectedRecipientType !== 'ALL') filters.recipientType = selectedRecipientType;

      const [notifData, statsData] = await Promise.all([
        getNotifications(filters),
        getNotificationStats(filters),
      ]);
      
      // Handle paginated response structure
      const notificationList = (notifData as any)?.notifications 
        ? (notifData as any).notifications 
        : (Array.isArray(notifData) ? notifData : []);
      setNotifications(notificationList);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [selectedStatus, selectedType, selectedRecipientType, getNotifications, getNotificationStats]);

  

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = async (id: string) => {
    try {
      await retryNotification(id);
      await loadData();
      alert('Notification queued for retry');
    } catch (err) {
      console.error('Failed to retry notification:', err);
      alert('Failed to retry notification');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      await loadData();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await deleteNotification(id);
      await loadData();
      alert('Notification deleted');
    } catch (err) {
      console.error('Failed to delete notification:', err);
      alert('Failed to delete notification');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'DELIVERED':
        return 'bg-orange-100 text-orange-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Notification Dashboard</h1>
          <p className="text-gray-600">Monitor and manage all system notifications</p>
        </div>
        <button
          onClick={() => navigate('/superadmin/notifications/settings')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-950 text-white rounded-lg hover:bg-orange-900 transition-colors cursor-pointer"
          title="Notification Settings"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500 mb-1">Total Notifications</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm text-green-600 mb-1">Sent</h3>
            <p className="text-3xl font-bold text-green-700">{stats.sent}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm text-red-600 mb-1">Failed</h3>
            <p className="text-3xl font-bold text-red-700">{stats.failed}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm text-yellow-600 mb-1">Pending</h3>
            <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="ALL">All Types</option>
              <option value="SALE_CREATED">Sale Created</option>
              <option value="RETURN_CREATED">Return Created</option>
              <option value="JOB_CREATED">Job Created</option>
              <option value="JOB_READY_PICKUP">Ready for Pickup</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
            <select
              value={selectedRecipientType}
              onChange={(e) => setSelectedRecipientType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="ALL">All Recipients</option>
              <option value="CUSTOMER">Customer</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Notifications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No notifications found
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {notification.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {notification.recipientType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{notification.recipient}</div>
                      {notification.recipientRole && (
                        <div className="text-xs text-gray-500">{notification.recipientRole}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {notification.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(notification.status)}`}>
                        {notification.status}
                      </span>
                      {notification.status === 'FAILED' && notification.failureReason && (
                        <div className="text-xs text-red-600 mt-1" title={notification.failureReason}>
                          {notification.failureReason.substring(0, 30)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {notification.priority && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-900">{notification.method}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        {notification.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(notification.id)}
                            className="text-orange-600 hover:text-orange-900 text-xs"
                            title="Retry"
                          >
                            ↻ Retry
                          </button>
                        )}
                        {notification.status === 'SENT' && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                            title="Mark as Read"
                          >
                            ✓ Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="text-red-600 hover:text-red-900 text-xs"
                          title="Delete"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics by Type */}
      {stats && Object.keys(stats.byType).length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Notifications by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{type.replace(/_/g, ' ')}</div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDashboard;
