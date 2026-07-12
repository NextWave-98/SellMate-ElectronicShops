import { useState } from 'react';
import { X, Package } from 'lucide-react';
import type { CreateSubscriptionPlanDTO, SubscriptionPlanType } from '../../../types/subscription.types';
import toast from 'react-hot-toast';

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubscriptionPlanDTO) => Promise<void>;
  isLoading: boolean;
}

export default function AddPlanModal({ isOpen, onClose, onSubmit, isLoading }: AddPlanModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    planType: 'BASIC' as SubscriptionPlanType,
    description: '',
    monthlyPrice: '',
    quarterlyPrice: '',
    semiAnnualPrice: '',
    annualPrice: '',
    maxUsers: '5',
    maxLocations: '1',
    maxWarehouses: '1',
    maxBranches: '1',
    maxProducts: '100',
    storageLimitGb: '5',
    unlimitedStorage: false,
    posEnabled: true,
    onlineSalesEnabled: false,
    courierIntegrationEnabled: false,
    advancedReporting: false,
    apiAccess: false,
    customBranding: false,
    multiCurrency: false,
    prioritySupport: false,
    trialDays: '14',
    isActive: true,
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!formData.monthlyPrice || !formData.annualPrice) {
      toast.error('Monthly and annual pricing are required');
      return;
    }

    try {
      const planData: CreateSubscriptionPlanDTO = {
        name: formData.name,
        planType: formData.planType,
        description: formData.description || undefined,
        monthlyPrice: parseFloat(formData.monthlyPrice),
        quarterlyPrice: parseFloat(formData.quarterlyPrice) || parseFloat(formData.monthlyPrice) * 3 * 0.95,
        semiAnnualPrice: parseFloat(formData.semiAnnualPrice) || parseFloat(formData.monthlyPrice) * 6 * 0.9,
        annualPrice: parseFloat(formData.annualPrice),
        maxUsers: parseInt(formData.maxUsers),
        maxLocations: parseInt(formData.maxLocations),
        maxWarehouses: parseInt(formData.maxWarehouses),
        maxBranches: parseInt(formData.maxBranches),
        maxProducts: parseInt(formData.maxProducts),
        unlimitedStorage: formData.unlimitedStorage,
        storageLimitGb: formData.unlimitedStorage ? undefined : parseInt(formData.storageLimitGb),
        posEnabled: formData.posEnabled,
        onlineSalesEnabled: formData.onlineSalesEnabled,
        courierIntegrationEnabled: formData.courierIntegrationEnabled,
        advancedReporting: formData.advancedReporting,
        apiAccess: formData.apiAccess,
        customBranding: formData.customBranding,
        multiCurrency: formData.multiCurrency,
        prioritySupport: formData.prioritySupport,
        trialDays: parseInt(formData.trialDays),
      };

      await onSubmit(planData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create plan';
      toast.error(errorMsg);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      planType: 'BASIC',
      description: '',
      monthlyPrice: '',
      quarterlyPrice: '',
      semiAnnualPrice: '',
      annualPrice: '',
      maxUsers: '5',
      maxLocations: '1',
      maxWarehouses: '1',
      maxBranches: '1',
      maxProducts: '100',
      storageLimitGb: '5',
      unlimitedStorage: false,
      posEnabled: true,
      onlineSalesEnabled: false,
      courierIntegrationEnabled: false,
      advancedReporting: false,
      apiAccess: false,
      customBranding: false,
      multiCurrency: false,
      prioritySupport: false,
      trialDays: '14',
      isActive: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Subscription Plan</h2>
                <p className="text-sm text-gray-500">Add a new pricing plan</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Basic Plan"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plan Type *
                </label>
                <select
                  name="planType"
                  value={formData.planType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="BASIC">Basic</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trial Days
                </label>
                <input
                  type="number"
                  name="trialDays"
                  value={formData.trialDays}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Plan description..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Price ($) *
                  </label>
                  <input
                    type="number"
                    name="monthlyPrice"
                    value={formData.monthlyPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quarterly Price ($)
                  </label>
                  <input
                    type="number"
                    name="quarterlyPrice"
                    value={formData.quarterlyPrice}
                    onChange={handleChange}
                    placeholder="Auto-calculated"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Semi-Annual Price ($)
                  </label>
                  <input
                    type="number"
                    name="semiAnnualPrice"
                    value={formData.semiAnnualPrice}
                    onChange={handleChange}
                    placeholder="Auto-calculated"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Annual Price ($) *
                  </label>
                  <input
                    type="number"
                    name="annualPrice"
                    value={formData.annualPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Limits */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Limits</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Users
                  </label>
                  <input
                    type="number"
                    name="maxUsers"
                    value={formData.maxUsers}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Locations
                  </label>
                  <input
                    type="number"
                    name="maxLocations"
                    value={formData.maxLocations}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Warehouses
                  </label>
                  <input
                    type="number"
                    name="maxWarehouses"
                    value={formData.maxWarehouses}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Branches
                  </label>
                  <input
                    type="number"
                    name="maxBranches"
                    value={formData.maxBranches}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Products
                  </label>
                  <input
                    type="number"
                    name="maxProducts"
                    value={formData.maxProducts}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Storage (GB)
                  </label>
                  <input
                    type="number"
                    name="storageLimitGb"
                    value={formData.storageLimitGb}
                    onChange={handleChange}
                    min="1"
                    disabled={formData.unlimitedStorage}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Features</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'unlimitedStorage', label: 'Unlimited Storage' },
                  { name: 'posEnabled', label: 'POS Enabled' },
                  { name: 'onlineSalesEnabled', label: 'Online Sales' },
                  { name: 'courierIntegrationEnabled', label: 'Courier Integration' },
                  { name: 'advancedReporting', label: 'Advanced Reporting' },
                  { name: 'apiAccess', label: 'API Access' },
                  { name: 'customBranding', label: 'Custom Branding' },
                  { name: 'multiCurrency', label: 'Multi Currency' },
                  { name: 'prioritySupport', label: 'Priority Support' },
                ].map((feature) => (
                  <div key={feature.name} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name={feature.name}
                      checked={formData[feature.name as keyof typeof formData] as boolean}
                      onChange={handleChange}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300">{feature.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
