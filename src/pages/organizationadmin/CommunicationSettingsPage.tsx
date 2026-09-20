import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import useFetch from '../../hooks/useFetch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Mail,
  MessageSquare,
  Phone,
  Bell,
  Edit,
  Trash2,
  Power,
  RefreshCw,
  Save,
  BarChart2,
} from 'lucide-react';
import CreateCredentialModal from '../../components/superadmin/communication/CreateCredentialModal';
import EditCredentialModal from '../../components/superadmin/communication/EditCredentialModal';
import UsageStatsModal from '../../components/superadmin/communication/UsageStatsModal';
import alert from '../../utils/alert';

interface CommunicationCredential {
  id: string;
  businessId: string;
  provider: string;
  channel: string;
  strategy: string;
  isActive: boolean;
  monthlyQuota: number | null;
  currentMonthUsage: number;
  quotaResetDate: string | null;
  costPerUnit: number | null;
  totalCost: number;
  isValidated: boolean;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationSettings {
  notificationsEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  notificationMode: 'PLATFORM_MANAGED' | 'BYOC';
  smsMonthlyQuota: number | null;
  smsCurrentUsage: number;
  emailMonthlyQuota: number | null;
  emailCurrentUsage: number;
  whatsappMonthlyQuota: number | null;
  whatsappCurrentUsage: number;
  quotaResetDate: string | null;
}

type NotifPrefs = Record<string, boolean>;

const NOTIFICATION_TYPE_GROUPS = [
  {
    group: 'Sales',
    types: [
      { key: 'SALE_CREATED', label: 'Sale Created' },
      { key: 'SALE_COMPLETED', label: 'Sale Completed' },
      { key: 'SALE_UPDATED', label: 'Sale Updated' },
      { key: 'SALE_CANCELLED', label: 'Sale Cancelled' },
      { key: 'SALE_PRICE_CHANGED', label: 'Sale Price Changed' },
      { key: 'SALE_PAYMENT_RECEIVED', label: 'Sale Payment Received' },
      { key: 'SALE_HIGH_VALUE', label: 'High Value Sale' },
    ],
  },
  {
    group: 'Repairs / Jobs',
    types: [
      { key: 'JOB_CREATED', label: 'Job Created' },
      { key: 'JOB_ASSIGNED', label: 'Job Assigned' },
      { key: 'JOB_DIAGNOSED', label: 'Job Diagnosed' },
      { key: 'JOB_REPAIRING', label: 'Job Repairing' },
      { key: 'JOB_READY_PICKUP', label: 'Ready for Pickup' },
      { key: 'JOB_COMPLETED', label: 'Job Completed' },
      { key: 'JOB_DELIVERED', label: 'Job Delivered' },
      { key: 'JOB_CANCELLED', label: 'Job Cancelled' },
      { key: 'JOB_PRICE_UPDATED', label: 'Job Price Updated' },
      { key: 'PAYMENT_RECEIVED', label: 'Payment Received' },
    ],
  },
  {
    group: 'Returns',
    types: [
      { key: 'RETURN_CREATED', label: 'Return Created' },
      { key: 'RETURN_INSPECTED', label: 'Return Inspected' },
      { key: 'RETURN_APPROVED', label: 'Return Approved' },
      { key: 'RETURN_REJECTED', label: 'Return Rejected' },
      { key: 'RETURN_COMPLETED', label: 'Return Completed' },
      { key: 'RETURN_CANCELLED', label: 'Return Cancelled' },
    ],
  },
  {
    group: 'Installments',
    types: [
      { key: 'INSTALLMENT_CREATED', label: 'Installment Created' },
      { key: 'INSTALLMENT_PAYMENT_RECEIVED', label: 'Installment Payment Received' },
      { key: 'INSTALLMENT_OVERDUE', label: 'Installment Overdue' },
      { key: 'INSTALLMENT_COMPLETED', label: 'Installment Completed' },
    ],
  },
];

const CommunicationSettingsPage: React.FC = () => {
  const { user } = useAuthRedux();
  const [credentials, setCredentials] = useState<CommunicationCredential[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<CommunicationCredential | null>(null);

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    notificationsEnabled: true,
    smsEnabled: true,
    emailEnabled: false,
    whatsappEnabled: false,
    notificationMode: 'PLATFORM_MANAGED',
    smsMonthlyQuota: null,
    smsCurrentUsage: 0,
    emailMonthlyQuota: null,
    emailCurrentUsage: 0,
    whatsappMonthlyQuota: null,
    whatsappCurrentUsage: 0,
    quotaResetDate: null,
  });
  const [notifDraft, setNotifDraft] = useState<NotificationSettings>(notifSettings);
  const [notifDirty, setNotifDirty] = useState(false);

  // WhatsApp per-type notification preferences
  const [waPrefs, setWaPrefs] = useState<NotifPrefs>({});
  const [waPrefsDirty, setWaPrefsDirty] = useState(false);

  const { fetchData: fetchCredentials, loading: loadingCredentials } = useFetch();
  const { fetchData: toggleCredential, loading: toggling } = useFetch();
  const { fetchData: deleteCredential, loading: deleting } = useFetch();
  const { fetchData: validateCredential, loading: validating } = useFetch();
  const { fetchData: resetQuota, loading: resetting } = useFetch();
  const { fetchData: fetchNotifSettings, loading: loadingNotif } = useFetch();
  const { fetchData: saveNotifSettings, loading: savingNotif } = useFetch();
  const { fetchData: fetchWaPrefs } = useFetch();
  const { fetchData: saveWaPrefs, loading: savingWaPrefs } = useFetch();

  const businessId = user?.businessId;

  useEffect(() => {
    if (businessId) {
      loadCredentials();
      loadNotificationSettings();
      loadWaPrefs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, selectedChannel]);

  const loadCredentials = async () => {
    if (!businessId) return;
    const channelParam = selectedChannel !== 'ALL' ? `?channel=${selectedChannel}` : '';
    const response = await fetchCredentials({
      endpoint: `/communication-credentials/businesses/${businessId}${channelParam}`,
      method: 'GET',
    });
    if (response?.data) {
      setCredentials(response.data as CommunicationCredential[]);
    }
  };

  const loadWaPrefs = async () => {
    if (!businessId) return;
    const response = await fetchWaPrefs({
      endpoint: `/notification-settings/businesses/${businessId}/notification-preferences`,
      method: 'GET',
    });
    if (response?.data) {
      const raw = response.data as Record<string, { whatsapp?: boolean }>;
      const flat: NotifPrefs = {};
      Object.entries(raw).forEach(([type, pref]) => {
        flat[type] = pref.whatsapp !== false;
      });
      setWaPrefs(flat);
      setWaPrefsDirty(false);
    }
  };

  const loadNotificationSettings = async () => {
    if (!businessId) return;
    const response = await fetchNotifSettings({
      endpoint: `/notification-settings/businesses/${businessId}`,
      method: 'GET',
    });
    if (response?.data) {
      const s = response.data as NotificationSettings;
      setNotifSettings(s);
      setNotifDraft(s);
      setNotifDirty(false);
    }
  };

  const handleNotifChange = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setNotifDraft((prev) => ({ ...prev, [key]: value }));
    setNotifDirty(true);
  };

  const handleWaPrefToggle = (typeKey: string) => {
    setWaPrefs((prev) => ({ ...prev, [typeKey]: !(prev[typeKey] !== false) }));
    setWaPrefsDirty(true);
  };

  const handleSaveWaPrefs = async () => {
    if (!businessId) return;
    const preferences: Record<string, { whatsapp: boolean }> = {};
    NOTIFICATION_TYPE_GROUPS.forEach(({ types }) => {
      types.forEach(({ key }) => {
        preferences[key] = { whatsapp: waPrefs[key] !== false };
      });
    });
    const response = await saveWaPrefs({
      endpoint: `/notification-settings/businesses/${businessId}/notification-preferences`,
      method: 'PUT',
      data: { preferences },
    });
    if (response?.success) {
      alert.success('WhatsApp notification preferences saved');
      setWaPrefsDirty(false);
    }
  };

  const handleSaveNotifSettings = async () => {
    if (!businessId) return;
    const response = await saveNotifSettings({
      endpoint: `/notification-settings/businesses/${businessId}`,
      method: 'PUT',
      data: {
        notificationsEnabled: notifDraft.notificationsEnabled,
        smsEnabled: notifDraft.smsEnabled,
        emailEnabled: notifDraft.emailEnabled,
        whatsappEnabled: notifDraft.whatsappEnabled,
        notificationMode: notifDraft.notificationMode,
        smsMonthlyQuota: notifDraft.smsMonthlyQuota,
        emailMonthlyQuota: notifDraft.emailMonthlyQuota,
        whatsappMonthlyQuota: notifDraft.whatsappMonthlyQuota,
      },
    });
    if (response?.success) {
      alert.success('Notification settings saved');
      loadNotificationSettings();
    }
  };

  const handleToggle = async (id: string) => {
    const response = await toggleCredential({
      endpoint: `/communication-credentials/${id}/toggle`,
      method: 'PATCH',
    });
    if (response?.success) {
      loadCredentials();
      alert.success('Credential status updated successfully');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    const response = await deleteCredential({
      endpoint: `/communication-credentials/${id}`,
      method: 'DELETE',
    });
    if (response?.success) {
      loadCredentials();
      alert.success('Credential deleted successfully');
    }
  };

  const handleValidate = async (id: string) => {
    const response = await validateCredential({
      endpoint: `/communication-credentials/${id}/validate`,
      method: 'POST',
    });
    if (response?.data) {
      const result = response.data as { isValid: boolean; message: string };
      if (result.isValid) {
        alert.success(result.message);
      } else {
        alert.error(result.message);
      }
      loadCredentials();
    }
  };

  const handleResetQuota = async (id: string) => {
    if (!confirm('Are you sure you want to reset the quota for this credential?')) return;
    const response = await resetQuota({
      endpoint: `/communication-credentials/${id}/reset-quota`,
      method: 'POST',
    });
    if (response?.success) {
      loadCredentials();
      alert.success('Quota reset successfully');
    }
  };

  const handleEdit = (credential: CommunicationCredential) => {
    setSelectedCredential(credential);
    setIsEditModalOpen(true);
  };

  const handleViewUsage = (credential: CommunicationCredential) => {
    setSelectedCredential(credential);
    setIsUsageModalOpen(true);
  };

  const getChannelConfig = (channel: string) => {
    switch (channel) {
      case 'SMS':
        return {
          icon: <MessageSquare className="w-5 h-5" />,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          gradient: 'from-blue-500 to-blue-600',
          lightBg: 'bg-blue-100',
          badgeColor: 'bg-blue-100 text-blue-700',
        };
      case 'EMAIL':
        return {
          icon: <Mail className="w-5 h-5" />,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          gradient: 'from-green-500 to-emerald-600',
          lightBg: 'bg-green-100',
          badgeColor: 'bg-green-100 text-green-700',
        };
      case 'WHATSAPP':
        return {
          icon: <Phone className="w-5 h-5" />,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          gradient: 'from-emerald-500 to-teal-600',
          lightBg: 'bg-emerald-100',
          badgeColor: 'bg-emerald-100 text-emerald-700',
        };
      case 'PUSH':
        return {
          icon: <Bell className="w-5 h-5" />,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          gradient: 'from-purple-500 to-violet-600',
          lightBg: 'bg-purple-100',
          badgeColor: 'bg-purple-100 text-purple-700',
        };
      default:
        return {
          icon: <Settings className="w-5 h-5" />,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          gradient: 'from-gray-500 to-gray-600',
          lightBg: 'bg-gray-100',
          badgeColor: 'bg-gray-100 text-gray-700',
        };
    }
  };

  const getChannelIcon = (channel: string) => getChannelConfig(channel).icon;

  const getStrategyBadge = (strategy: string) => {
    return strategy === 'PLATFORM_MANAGED' ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
        <Settings className="w-3 h-3" /> Platform Managed
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
        <CheckCircle className="w-3 h-3" /> Business Managed (BYOC)
      </span>
    );
  };

  const getUsagePercentage = (credential: CommunicationCredential) => {
    if (!credential.monthlyQuota) return null;
    return Math.round((credential.currentMonthUsage / credential.monthlyQuota) * 100);
  };

  const filteredCredentials = credentials;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-600 shadow-900 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Bell className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Communication Settings</h1>
              <p className="text-indigo-100 mt-1 text-sm sm:text-base">
                Manage SMS, Email, WhatsApp, and other communication channels
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="self-start sm:self-auto bg-orange-500 text-indigo-700 hover:bg-indigo-50 font-semibold shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Credential
          </Button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Credentials', value: credentials.length, color: 'bg-white/20' },
            { label: 'Active', value: credentials.filter((c) => c.isActive).length, color: 'bg-green-400/30' },
            { label: 'Inactive', value: credentials.filter((c) => !c.isActive).length, color: 'bg-red-400/30' },
            { label: 'Validated', value: credentials.filter((c) => c.isValidated).length, color: 'bg-yellow-400/30' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl px-4 py-2.5 backdrop-blur-sm`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-indigo-100 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp BYOC   each org uses their own Meta credentials */}
      <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100">
              <Phone className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-semibold text-emerald-900">WhatsApp Business (your own Meta account)</h2>
              <p className="text-sm text-emerald-800/80 mt-1 max-w-xl">
                Connect your organization&apos;s Meta Cloud API credentials   phone number, access token,
                and webhook. Outbound notifications and auto-replies use <strong>your</strong> WhatsApp
                number, not the platform&apos;s.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
            <Link to="/superadmin/communication/whatsapp">Open WhatsApp Settings</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings Panel */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100">
                <Bell className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Notification Settings</CardTitle>
                <CardDescription>
                  Control which channels are active and how credentials are managed.
                </CardDescription>
              </div>
            </div>
            {notifDirty && (
              <Button
                onClick={handleSaveNotifSettings}
                disabled={savingNotif}
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
              >
                {savingNotif ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loadingNotif ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            <>
              {/* Master toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${notifDraft.notificationsEnabled ? 'border-indigo-200 bg-indigo-50' : 'border-white/30 bg-white/20 backdrop-blur-sm'}`}>
                <div>
                  <Label className="text-base font-semibold text-gray-800">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Master switch   disabling this stops all outbound messages.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifDraft.notificationsEnabled}
                  onClick={() => handleNotifChange('notificationsEnabled', !notifDraft.notificationsEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${notifDraft.notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${notifDraft.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Per-channel toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SMS */}
                <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-colors ${notifDraft.smsEnabled && notifDraft.notificationsEnabled ? 'border-blue-200 bg-blue-50' : 'border-white/20 bg-white/20 backdrop-blur-sm'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-100">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <Label className="font-semibold text-gray-700">SMS</Label>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifDraft.smsEnabled}
                    disabled={!notifDraft.notificationsEnabled}
                    onClick={() => handleNotifChange('smsEnabled', !notifDraft.smsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${notifDraft.smsEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${notifDraft.smsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Email */}
                <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-colors ${notifDraft.emailEnabled && notifDraft.notificationsEnabled ? 'border-green-200 bg-green-50' : 'border-white/20 bg-white/20 backdrop-blur-sm'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-green-100">
                      <Mail className="w-4 h-4 text-green-600" />
                    </div>
                    <Label className="font-semibold text-gray-700">Email</Label>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifDraft.emailEnabled}
                    disabled={!notifDraft.notificationsEnabled}
                    onClick={() => handleNotifChange('emailEnabled', !notifDraft.emailEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${notifDraft.emailEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${notifDraft.emailEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* WhatsApp */}
                <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-colors ${notifDraft.whatsappEnabled && notifDraft.notificationsEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-white/20 bg-white/20 backdrop-blur-sm'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <Label className="font-semibold text-gray-700">WhatsApp</Label>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifDraft.whatsappEnabled}
                    disabled={!notifDraft.notificationsEnabled}
                    onClick={() => handleNotifChange('whatsappEnabled', !notifDraft.whatsappEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${notifDraft.whatsappEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${notifDraft.whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Credential mode */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200">
                <div>
                  <Label className="font-semibold text-violet-800">Credential Mode</Label>
                  <p className="text-sm text-violet-600 mt-0.5">
                    <strong>Platform Managed</strong>   use shared platform credentials.&nbsp;
                    <strong>BYOC</strong>   bring your own credentials.
                  </p>
                </div>
                <Select
                  value={notifDraft.notificationMode}
                  onValueChange={(v) =>
                    handleNotifChange('notificationMode', v as 'PLATFORM_MANAGED' | 'BYOC')
                  }
                >
                  <SelectTrigger className="w-56 border-violet-300 bg-white shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLATFORM_MANAGED">Platform Managed</SelectItem>
                    <SelectItem value="BYOC">BYOC (Own Credentials)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Monthly quotas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <Label htmlFor="smsQuota" className="flex items-center gap-1.5 text-blue-700 font-medium">
                    <MessageSquare className="w-4 h-4" /> SMS Monthly Quota
                  </Label>
                  <Input
                    id="smsQuota"
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={notifDraft.smsMonthlyQuota ?? ''}
                    onChange={(e) =>
                      handleNotifChange(
                        'smsMonthlyQuota',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className="border-blue-300 bg-white"
                  />
                  {notifSettings.smsMonthlyQuota && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-blue-600 font-medium">
                        <span>{notifSettings.smsCurrentUsage} used</span>
                        <span>{notifSettings.smsMonthlyQuota} quota</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min(Math.round((notifSettings.smsCurrentUsage / notifSettings.smsMonthlyQuota) * 100), 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-green-50 border border-green-200">
                  <Label htmlFor="emailQuota" className="flex items-center gap-1.5 text-green-700 font-medium">
                    <Mail className="w-4 h-4" /> Email Monthly Quota
                  </Label>
                  <Input
                    id="emailQuota"
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={notifDraft.emailMonthlyQuota ?? ''}
                    onChange={(e) =>
                      handleNotifChange(
                        'emailMonthlyQuota',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className="border-green-300 bg-white"
                  />
                  {notifSettings.emailMonthlyQuota && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-green-600 font-medium">
                        <span>{notifSettings.emailCurrentUsage} used</span>
                        <span>{notifSettings.emailMonthlyQuota} quota</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-green-500 transition-all"
                          style={{ width: `${Math.min(Math.round((notifSettings.emailCurrentUsage / notifSettings.emailMonthlyQuota) * 100), 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <Label htmlFor="whatsappQuota" className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Phone className="w-4 h-4" /> WhatsApp Monthly Quota
                  </Label>
                  <Input
                    id="whatsappQuota"
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={notifDraft.whatsappMonthlyQuota ?? ''}
                    onChange={(e) =>
                      handleNotifChange(
                        'whatsappMonthlyQuota',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className="border-emerald-300 bg-white"
                  />
                  {notifSettings.whatsappMonthlyQuota && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-emerald-600 font-medium">
                        <span>{notifSettings.whatsappCurrentUsage} used</span>
                        <span>{notifSettings.whatsappMonthlyQuota} quota</span>
                      </div>
                      <div className="w-full bg-emerald-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(Math.round((notifSettings.whatsappCurrentUsage / notifSettings.whatsappMonthlyQuota) * 100), 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Notification Preferences */}
      {notifDraft.whatsappEnabled && (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-emerald-800">WhatsApp Notification Preferences</CardTitle>
                  <CardDescription className="text-emerald-600">Control which events trigger WhatsApp messages to customers</CardDescription>
                </div>
              </div>
              <Button
                size="sm"
                disabled={!waPrefsDirty || savingWaPrefs}
                onClick={handleSaveWaPrefs}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Save className="w-4 h-4" />
                {savingWaPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {NOTIFICATION_TYPE_GROUPS.map(({ group, types }) => (
              <div key={group}>
                <div className="px-6 py-2 bg-white/20 backdrop-blur-sm border-b border-white/20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{group}</span>
                </div>
                <div className="divide-y">
                  {types.map(({ key, label }) => {
                    const enabled = waPrefs[key] !== false;
                    return (
                      <div key={key} className="flex items-center justify-between px-6 py-3 hover:bg-white/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{label}</span>
                          <span className="text-xs text-gray-400 font-mono">{key}</span>
                        </div>
                        <button
                          role="switch"
                          aria-checked={enabled}
                          onClick={() => handleWaPrefToggle(key)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            enabled ? 'bg-emerald-500' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                              enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Channel Filter */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Credentials</CardTitle>
                <CardDescription className="text-sm">
                  {notifDraft.notificationMode === 'BYOC'
                    ? 'Your own credentials are active   add at least one per channel you have enabled above.'
                    : 'Platform credentials are in use. Switch to BYOC to add your own.'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'SMS', 'EMAIL', 'WHATSAPP', 'PUSH'].map((channel) => {
              const isAll = channel === 'ALL';
              const cfg = isAll ? null : getChannelConfig(channel);
              const isSelected = selectedChannel === channel;
              return (
                <button
                  key={channel}
                  onClick={() => setSelectedChannel(channel)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    isSelected
                      ? isAll
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : `bg-gradient-to-r ${cfg!.gradient} text-white border-transparent shadow-sm`
                      : isAll
                      ? 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                      : `bg-white/40 backdrop-blur-sm ${cfg!.color} border-white/40 hover:${cfg!.bg} hover:border-current`
                  }`}
                >
                  {!isAll && <span className="scale-75">{cfg!.icon}</span>}
                  {channel === 'EMAIL' ? 'Email' : channel === 'WHATSAPP' ? 'WhatsApp' : channel}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Credentials Grid */}
      {loadingCredentials ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Loading credentials...</p>
        </div>
      ) : filteredCredentials.length === 0 ? (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No credentials found</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Get started by adding your first communication credential
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Credential
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCredentials.map((credential) => {
            const usagePercentage = getUsagePercentage(credential);
            const isQuotaWarning = usagePercentage && usagePercentage > 80;
            const isQuotaExceeded = usagePercentage && usagePercentage >= 100;
            const cfg = getChannelConfig(credential.channel);

            return (
              <Card
                key={credential.id}
                className={`border-0 shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden`}
              >
                <div className={`h-1 bg-gradient-to-r ${cfg.gradient}`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cfg.bg}`}>
                        <span className={cfg.color}>{cfg.icon}</span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{credential.channel}</CardTitle>
                        <CardDescription className="text-xs">
                          {credential.provider.replace(/_/g, ' ')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {credential.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Strategy */}
                  <div>{getStrategyBadge(credential.strategy)}</div>

                  {/* Validation Status */}
                  {credential.strategy === 'BUSINESS_MANAGED' && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${credential.isValidated ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {credential.isValidated ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="font-medium">Validated</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="font-medium">Not Validated</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Usage Stats */}
                  {credential.monthlyQuota && (
                    <div className={`p-3 rounded-lg ${cfg.bg} space-y-2`}>
                      <div className="flex justify-between text-xs font-medium">
                        <span className={cfg.color}>Usage</span>
                        <span className={`font-semibold ${isQuotaExceeded ? 'text-red-600' : isQuotaWarning ? 'text-yellow-600' : cfg.color}`}>
                          {credential.currentMonthUsage} / {credential.monthlyQuota}
                        </span>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isQuotaExceeded
                              ? 'bg-red-500'
                              : isQuotaWarning
                              ? 'bg-yellow-500'
                              : `bg-gradient-to-r ${cfg.gradient}`
                          }`}
                          style={{ width: `${Math.min(usagePercentage || 0, 100)}%` }}
                        />
                      </div>
                      {usagePercentage !== null && (
                        <p className={`text-xs ${isQuotaExceeded ? 'text-red-600' : isQuotaWarning ? 'text-yellow-600' : cfg.color} text-right`}>
                          {usagePercentage}% used
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cost */}
                  {credential.strategy === 'PLATFORM_MANAGED' && credential.costPerUnit && (
                    <div className="flex justify-between items-center text-sm px-3 py-2 rounded-xl bg-white/30 backdrop-blur-sm border border-white/20">
                      <span className="text-gray-500 flex items-center gap-1">
                        <BarChart2 className="w-3.5 h-3.5" /> Total Cost
                      </span>
                      <span className="font-bold text-gray-800">
                        ${credential.totalCost.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
                      onClick={() => handleViewUsage(credential)}
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Usage
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => handleEdit(credential)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {credential.strategy === 'BUSINESS_MANAGED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-gray-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleValidate(credential.id)}
                        disabled={validating}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Validate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 px-2 text-xs ${credential.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                      onClick={() => handleToggle(credential.id)}
                      disabled={toggling}
                    >
                      <Power className="w-3 h-3 mr-1" />
                      {credential.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    {credential.monthlyQuota && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100"
                        onClick={() => handleResetQuota(credential.id)}
                        disabled={resetting}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 ml-auto"
                      onClick={() => handleDelete(credential.id)}
                      disabled={deleting}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateCredentialModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadCredentials();
          }}
          businessId={businessId!}
        />
      )}

      {isEditModalOpen && selectedCredential && (
        <EditCredentialModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCredential(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setSelectedCredential(null);
            loadCredentials();
          }}
          credential={selectedCredential}
        />
      )}

      {isUsageModalOpen && selectedCredential && (
        <UsageStatsModal
          isOpen={isUsageModalOpen}
          onClose={() => {
            setIsUsageModalOpen(false);
            setSelectedCredential(null);
          }}
          credentialId={selectedCredential.id}
        />
      )}
    </div>
  );
};


export default CommunicationSettingsPage;
