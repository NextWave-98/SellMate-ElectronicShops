import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Check, CheckCheck, Trash2, Settings, AlertTriangle, Info, CheckCircle, Wallet } from 'lucide-react';
import useNotification, { type Notification, type NotificationStats } from '../../hooks/useNotification';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';


export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'failed'>('all');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const {
    getNotifications,
    getMyNotifications,
    getNotificationStats,
    markAsRead,
    deleteNotification,
    retryNotification,
  } = useNotification();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryFilters: Record<string, string | number> = { limit: 50 };
      if (filter === 'pending') queryFilters.status = 'PENDING';
      if (filter === 'failed') queryFilters.status = 'FAILED';

      const [myNotifResult, allNotifResult, statsResult] = await Promise.all([
        getMyNotifications(queryFilters as Parameters<typeof getMyNotifications>[0]),
        getNotifications(queryFilters as Parameters<typeof getNotifications>[0]),
        getNotificationStats(),
      ]);

      const parseNotificationPayload = (payload: unknown) => {
        const result = payload as {
          notifications?: Notification[];
          data?: Notification[];
          settings?: unknown[];
          pagination?: typeof pagination;
        };

        if (!result || Array.isArray(result.settings)) {
          return { notifications: [] as Notification[], pagination: undefined as typeof pagination | undefined };
        }

        if (Array.isArray(result.notifications)) {
          return { notifications: result.notifications, pagination: result.pagination };
        }

        if (Array.isArray(result.data)) {
          return { notifications: result.data, pagination: result.pagination };
        }

        if (Array.isArray(payload)) {
          return { notifications: payload as Notification[], pagination: result.pagination };
        }

        return { notifications: [] as Notification[], pagination: result.pagination };
      };

      const myParsed = parseNotificationPayload(myNotifResult);
      const allParsed = parseNotificationPayload(allNotifResult);

      const selected = myParsed.notifications.length > 0 ? myParsed : allParsed;

      setNotifications(selected.notifications);
      if (selected.pagination) {
        setPagination(selected.pagination);
      } else {
        setPagination(prev => ({
          ...prev,
          total: selected.notifications.length,
          page: 1,
          totalPages: 1,
        }));
      }

      if (statsResult) setStats(statsResult);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter, getMyNotifications, getNotifications, getNotificationStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      loadData();
      toast.success('Marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retryNotification(id);
      toast.success('Retry queued');
      loadData();
    } catch {
      toast.error('Failed to retry notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('CASH_DRAWER')) {
      return <Wallet className="w-5 h-5 text-amber-700" />;
    }
    if (type.includes('CANCEL') || type.includes('FAILED') || type.includes('REJECT'))
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (type.includes('COMPLET') || type.includes('APPROV') || type.includes('DELIVER'))
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <Info className="w-5 h-5 text-orange-600" />;
  };

  const getNotificationBg = (status: string, type: string) => {
    if (type.includes('CASH_DRAWER_OPENED')) return 'bg-amber-50 border-l-4 border-amber-400';
    if (type.includes('CASH_DRAWER_CLOSED')) return 'bg-slate-50 border-l-4 border-slate-400';
    switch (status) {
      case 'FAILED': return 'bg-red-50 border-l-4 border-red-400';
      case 'SENT':
      case 'DELIVERED': return 'bg-green-50 border-l-4 border-green-400';
      default: return 'bg-orange-50 border-l-4 border-orange-300';
    }
  };

  const getNotificationTitle = (type: string) => {
    if (type === 'CASH_DRAWER_OPENED') return 'Cash Drawer Opened';
    if (type === 'CASH_DRAWER_CLOSED') return 'Cash Drawer Closed';
    return type.replace(/_/g, ' ');
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      SMS: 'bg-blue-100 text-blue-700',
      WHATSAPP: 'bg-green-100 text-green-700',
      EMAIL: 'bg-purple-100 text-purple-700',
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Stay updated with message delivery status</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <BellOff className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'default' : 'ghost'}
              className={filter === 'all' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : ''}
            >
              All ({pagination.total})
            </Button>
            <Button
              onClick={() => setFilter('pending')}
              variant={filter === 'pending' ? 'default' : 'ghost'}
              className={filter === 'pending' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : ''}
            >
              Pending ({stats?.pending || 0})
            </Button>
            <Button
              onClick={() => setFilter('failed')}
              variant={filter === 'failed' ? 'default' : 'ghost'}
              className={filter === 'failed' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
            >
              Failed ({stats?.failed || 0})
            </Button>
          </div>
        </CardContent>

        {/* Notifications List */}
        <div className="divide-y">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No notifications to display</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 ${getNotificationBg(notification.status, notification.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-gray-900">{getNotificationTitle(notification.type)}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getMethodBadge(notification.method)}`}>
                            {notification.method}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            notification.status === 'SENT' || notification.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                            notification.status === 'FAILED' && notification.failureReason?.includes('disabled') ? 'bg-gray-100 text-gray-500' :
                            notification.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {notification.status === 'FAILED' && notification.failureReason?.includes('disabled')
                              ? 'CHANNEL OFF'
                              : notification.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                          <span>To: {notification.recipient}</span>
                          <span>• {notification.recipientType}</span>
                          {notification.priority && (
                            <span className={`px-2 py-0.5 rounded-full ${
                              notification.priority === 'HIGH' || notification.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                              notification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {notification.priority}
                            </span>
                          )}
                          <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        </div>
                        {notification.failureReason && (
                          <p className="text-xs text-red-500 mt-1">Error: {notification.failureReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {notification.status === 'PENDING' && (
                          <Button
                            onClick={() => handleMarkAsRead(notification.id)}
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-orange-600"
                            title="Mark as delivered"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        {notification.status === 'FAILED' && !notification.failureReason?.includes('disabled') && (
                          <Button
                            onClick={() => handleRetry(notification.id)}
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-blue-600"
                            title="Retry"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDelete(notification.id)}
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
