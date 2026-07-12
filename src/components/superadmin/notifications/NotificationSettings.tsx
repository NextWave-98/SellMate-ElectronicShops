/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback } from 'react';
import useNotification, { type NotificationSettings } from '../../../hooks/useNotification';

interface NotificationTypeConfig {
  type: string;
  label: string;
  description: string;
  category: 'SALES' | 'RETURNS' | 'JOBSHEET' | 'ADDON' | 'GENERAL';
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  // Sales
  { type: 'SALE_CREATED', label: 'Sale Created', description: 'Customer receives sale confirmation', category: 'SALES', defaultPriority: 'HIGH' },
  { type: 'SALE_UPDATED', label: 'Sale Updated', description: 'Customer notified of sale changes', category: 'SALES', defaultPriority: 'MEDIUM' },
  { type: 'SALE_CANCELLED', label: 'Sale Cancelled', description: 'Customer notified of cancellation', category: 'SALES', defaultPriority: 'HIGH' },
  { type: 'SALE_HIGH_VALUE', label: 'High Value Sale', description: 'Manager alert for high-value sales', category: 'SALES', defaultPriority: 'URGENT' },
  { type: 'SALE_COMPLETED', label: 'Sale Completed', description: 'Customer notified of completed sale', category: 'SALES', defaultPriority: 'MEDIUM' },
  
  // Returns
  { type: 'RETURN_CREATED', label: 'Return Created', description: 'Customer receives return confirmation', category: 'RETURNS', defaultPriority: 'HIGH' },
  { type: 'RETURN_INSPECTING', label: 'Return Inspecting', description: 'Customer notified inspection started', category: 'RETURNS', defaultPriority: 'MEDIUM' },
  { type: 'RETURN_INSPECTED', label: 'Return Inspected', description: 'Customer notified inspection complete', category: 'RETURNS', defaultPriority: 'MEDIUM' },
  { type: 'RETURN_APPROVED', label: 'Return Approved', description: 'Customer notified return approved', category: 'RETURNS', defaultPriority: 'HIGH' },
  { type: 'RETURN_REJECTED', label: 'Return Rejected', description: 'Customer notified return rejected', category: 'RETURNS', defaultPriority: 'HIGH' },
  { type: 'RETURN_REFUNDED', label: 'Return Refunded', description: 'Customer notified refund processed', category: 'RETURNS', defaultPriority: 'HIGH' },
  { type: 'RETURN_COMPLETED', label: 'Return Completed', description: 'Customer notified return complete', category: 'RETURNS', defaultPriority: 'HIGH' },
  { type: 'RETURN_CANCELLED', label: 'Return Cancelled', description: 'Customer notified return cancelled', category: 'RETURNS', defaultPriority: 'HIGH' },
  
  // Job Sheets
  { type: 'JOB_CREATED', label: 'Job Created', description: 'Customer receives job confirmation', category: 'JOBSHEET', defaultPriority: 'HIGH' },
  { type: 'JOB_STARTED', label: 'Job Started', description: 'Customer notified job started', category: 'JOBSHEET', defaultPriority: 'MEDIUM' },
  { type: 'JOB_DIAGNOSED', label: 'Job Diagnosed', description: 'Customer receives diagnosis', category: 'JOBSHEET', defaultPriority: 'MEDIUM' },
  { type: 'JOB_REPAIRING', label: 'Job Repairing', description: 'Customer notified repair in progress', category: 'JOBSHEET', defaultPriority: 'LOW' },
  { type: 'JOB_COMPLETED', label: 'Job Completed', description: 'Customer notified job complete', category: 'JOBSHEET', defaultPriority: 'HIGH' },
  { type: 'JOB_READY_PICKUP', label: 'Job Ready for Pickup', description: 'Customer notified device ready', category: 'JOBSHEET', defaultPriority: 'HIGH' },
  { type: 'JOB_DELIVERED', label: 'Job Delivered', description: 'Customer notified delivery', category: 'JOBSHEET', defaultPriority: 'HIGH' },
  { type: 'JOB_CANCELLED', label: 'Job Cancelled', description: 'Customer notified cancellation', category: 'JOBSHEET', defaultPriority: 'HIGH' },
  { type: 'JOB_PRICE_UPDATED', label: 'Job Price Updated', description: 'Customer notified of price change', category: 'JOBSHEET', defaultPriority: 'HIGH' },
  
  // Addon Requests
  { type: 'ADDON_REQUEST_CREATED', label: 'Addon Request Created', description: 'Admin/Manager notified of new addon request', category: 'ADDON', defaultPriority: 'HIGH' },
  { type: 'ADDON_REQUEST_APPROVED', label: 'Addon Request Approved', description: 'Staff notified request approved', category: 'ADDON', defaultPriority: 'HIGH' },
  { type: 'ADDON_REQUEST_REJECTED', label: 'Addon Request Rejected', description: 'Staff notified request rejected', category: 'ADDON', defaultPriority: 'HIGH' },
  { type: 'ADDON_REQUEST_COMPLETED', label: 'Addon Request Completed', description: 'Staff notified request completed', category: 'ADDON', defaultPriority: 'MEDIUM' },

  // Cash Drawer
  { type: 'CASH_DRAWER_OPENED', label: 'Cash Drawer Opened', description: 'Admin/Manager notified when cash drawer is opened', category: 'GENERAL', defaultPriority: 'MEDIUM' },
  { type: 'CASH_DRAWER_CLOSED', label: 'Cash Drawer Closed', description: 'Admin/Manager notified when cash drawer is closed', category: 'GENERAL', defaultPriority: 'MEDIUM' },
];

const NotificationSettingsPage: React.FC = () => {
  const {
    getNotificationSettings,
    bulkUpdateSettings,
    getAdminRecipients,
    getManagerRecipients,
    loading,
    error,
  } = useNotification();

  const [settings, setSettings] = useState<NotificationSettings[]>([]);
  const [adminRecipients, setAdminRecipients] = useState<any[]>([]);
  const [managerRecipients, setManagerRecipients] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [hasChanges, setHasChanges] = useState(false);
  const [localChanges, setLocalChanges] = useState<Map<string, Partial<NotificationSettings>>>(new Map());

  const loadData = useCallback(async () => {
    try {
      const [settingsData, admins, managers] = await Promise.all([
        getNotificationSettings(),
        getAdminRecipients(),
        getManagerRecipients(),
      ]);
      setSettings(Array.isArray(settingsData) ? settingsData : []);
      setAdminRecipients(Array.isArray(admins) ? admins : []);
      setManagerRecipients(Array.isArray(managers) ? managers : []);
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    }
  }, [getNotificationSettings, getAdminRecipients, getManagerRecipients]);

  useEffect(() => {
    loadData();
  }, []);

  const handleSettingChange = (notificationType: string, field: keyof NotificationSettings, value: any) => {
    const currentChanges = localChanges.get(notificationType) || {};
    const updatedChanges = { ...currentChanges, [field]: value };
    
    const newChanges = new Map(localChanges);
    newChanges.set(notificationType, updatedChanges);
    setLocalChanges(newChanges);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      const changesArray = Array.from(localChanges.entries()).map(([notificationType, updates]) => ({
        notificationType,
        updates,
      }));
      
      await bulkUpdateSettings(changesArray);
      await loadData();
      setLocalChanges(new Map());
      setHasChanges(false);
     
    } catch (err) {
      console.error('Failed to save settings:', err);
     
    }
  };

  const getSettingValue = (notificationType: string, field: keyof NotificationSettings) => {
    const localChange = localChanges.get(notificationType);
    if (localChange && field in localChange) {
      return localChange[field];
    }
    const setting = settings.find(s => s.notificationType === notificationType);
    return setting ? setting[field] : getDefaultValue(field);
  };

  const getDefaultValue = (field: keyof NotificationSettings): any => {
    const defaults: Record<string, any> = {
      enabled: true,
      adminEnabled: false,
      managerEnabled: false,
      customerEnabled: true,
      smsEnabled: true,
      emailEnabled: false,
      whatsappEnabled: false,
      priority: 'MEDIUM',
      autoSend: true,
    };
    return defaults[field];
  };

  const filteredTypes = selectedCategory === 'ALL'
    ? NOTIFICATION_TYPES
    : NOTIFICATION_TYPES.filter(t => t.category === selectedCategory);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Notification Settings</h1>
        <p className="text-gray-600">
          Configure who receives notifications and through which channels
        </p>
      </div>

      {/* Recipients Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 mb-2">Admin Recipients</h3>
          <p className="text-2xl font-bold text-orange-700">{adminRecipients.length}</p>
          <p className="text-sm text-orange-600">
            {adminRecipients.map(a => a.name).join(', ') || 'No admins configured'}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Manager Recipients</h3>
          <p className="text-2xl font-bold text-green-700">{managerRecipients.length}</p>
          <p className="text-sm text-green-600">
            {managerRecipients.map(m => m.name).join(', ') || 'No managers configured'}
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {['ALL', 'SALES', 'RETURNS', 'JOBSHEET', 'ADDON', 'GENERAL'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex justify-between items-center">
          <p className="text-yellow-800">You have unsaved changes</p>
          <button
            onClick={handleSaveChanges}
            disabled={loading}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Settings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notification Type
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SMS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auto Send
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTypes.map((config) => {
                const isEnabled = getSettingValue(config.type, 'enabled') as boolean;
                
                return (
                  <tr key={config.type} className={!isEnabled ? 'opacity-50' : ''}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleSettingChange(config.type, 'enabled', e.target.checked)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-400 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={getSettingValue(config.type, 'customerEnabled') as boolean}
                        onChange={(e) => handleSettingChange(config.type, 'customerEnabled', e.target.checked)}
                        disabled={!isEnabled}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={getSettingValue(config.type, 'managerEnabled') as boolean}
                        onChange={(e) => handleSettingChange(config.type, 'managerEnabled', e.target.checked)}
                        disabled={!isEnabled}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={getSettingValue(config.type, 'adminEnabled') as boolean}
                        onChange={(e) => handleSettingChange(config.type, 'adminEnabled', e.target.checked)}
                        disabled={!isEnabled}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={getSettingValue(config.type, 'smsEnabled') as boolean}
                        onChange={(e) => handleSettingChange(config.type, 'smsEnabled', e.target.checked)}
                        disabled={!isEnabled}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-400 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={getSettingValue(config.type, 'emailEnabled') as boolean}
                        onChange={(e) => handleSettingChange(config.type, 'emailEnabled', e.target.checked)}
                        disabled={!isEnabled}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={getSettingValue(config.type, 'whatsappEnabled') as boolean}
                        onChange={(e) => handleSettingChange(config.type, 'whatsappEnabled', e.target.checked)}
                        disabled={!isEnabled}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={getSettingValue(config.type, 'priority') as string}
                        onChange={(e) => handleSettingChange(config.type, 'priority', e.target.value)}
                        disabled={!isEnabled}
                        className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={getSettingValue(config.type, 'autoSend') as boolean}
                        onChange={(e) => handleSettingChange(config.type, 'autoSend', e.target.checked)}
                        disabled={!isEnabled}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-400 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><strong>Customer:</strong> Send to the customer involved in the transaction</div>
          <div><strong>Manager:</strong> Send to all managers (or location-specific managers)</div>
          <div><strong>Admin:</strong> Send to all system administrators</div>
          <div><strong>Auto Send:</strong> Send immediately when event occurs (vs manual approval)</div>
          <div><strong>Priority:</strong> Affects notification delivery order and retry logic</div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
