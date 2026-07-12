import { useState, useEffect } from 'react';
import { X, CreditCard, Building2 } from 'lucide-react';
import type { SubscriptionPlan } from '../../../types/subscription.types';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  businessName: string;
  email?: string;
}

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    businessId: string;
    planId: string;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    autoRenew: boolean;
  }) => Promise<void>;
  plans: SubscriptionPlan[];
  organizations: Organization[];
  isLoading: boolean;
}

export default function AddSubscriptionModal({
  isOpen,
  onClose,
  onSubmit,
  plans,
  organizations,
  isLoading,
}: AddSubscriptionModalProps) {
  const [formData, setFormData] = useState({
    businessId: '',
    planId: '',
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'ANNUAL',
    autoRenew: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        businessId: '',
        planId: '',
        billingCycle: 'MONTHLY',
        autoRenew: true,
      });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessId) {
      newErrors.businessId = 'Please select a business';
    }
    if (!formData.planId) {
      newErrors.planId = 'Please select a plan';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create subscription';
      toast.error(errorMsg);
    }
  };

  const selectedPlan = plans.find((p) => p.id === formData.planId);
  const activePlans = plans.filter((p) => p.isActive);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Subscription</h2>
                <p className="text-sm text-gray-500">Subscribe a business to a plan</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Business Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Select Business *
              </label>
              <select
                name="businessId"
                value={formData.businessId}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.businessId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">-- Select a business --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.businessName} {org.email ? `(${org.email})` : ''}
                  </option>
                ))}
              </select>
              {errors.businessId && <p className="text-sm text-red-500 mt-1">{errors.businessId}</p>}
            </div>

            {/* Plan Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Plan *
              </label>
              <select
                name="planId"
                value={formData.planId}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.planId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">-- Select a plan --</option>
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.planType}) - {formatCurrency(plan.monthlyPrice)}/mo
                  </option>
                ))}
              </select>
              {errors.planId && <p className="text-sm text-red-500 mt-1">{errors.planId}</p>}
            </div>

            {/* Selected Plan Preview */}
            {selectedPlan && (
              <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-200 mb-2">{selectedPlan.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-indigo-700 dark:text-indigo-300">Monthly:</span>{' '}
                    <span className="font-medium text-indigo-900 dark:text-indigo-100">
                      {formatCurrency(selectedPlan.monthlyPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-700 dark:text-indigo-300">Annual:</span>{' '}
                    <span className="font-medium text-indigo-900 dark:text-indigo-100">
                      {formatCurrency(selectedPlan.annualPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-700 dark:text-indigo-300">Max Users:</span>{' '}
                    <span className="font-medium text-indigo-900 dark:text-indigo-100">{selectedPlan.maxUsers}</span>
                  </div>
                  <div>
                    <span className="text-indigo-700 dark:text-indigo-300">Max Locations:</span>{' '}
                    <span className="font-medium text-indigo-900 dark:text-indigo-100">{selectedPlan.maxLocations}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Cycle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Billing Cycle
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.billingCycle === 'MONTHLY'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="billingCycle"
                    value="MONTHLY"
                    checked={formData.billingCycle === 'MONTHLY'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <p className="font-medium text-gray-900 dark:text-white">Monthly</p>
                    {selectedPlan && (
                      <p className="text-sm text-gray-500">{formatCurrency(selectedPlan.monthlyPrice)}/mo</p>
                    )}
                  </div>
                </label>
                <label
                  className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.billingCycle === 'ANNUAL'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="billingCycle"
                    value="ANNUAL"
                    checked={formData.billingCycle === 'ANNUAL'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <p className="font-medium text-gray-900 dark:text-white">Annual</p>
                    {selectedPlan && (
                      <p className="text-sm text-gray-500">{formatCurrency(selectedPlan.annualPrice)}/yr</p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Auto Renew */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="autoRenew"
                checked={formData.autoRenew}
                onChange={handleChange}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded"
              />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-renew subscription
                </label>
                <p className="text-xs text-gray-500">Automatically renew when subscription expires</p>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
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
              {isLoading ? 'Creating...' : 'Create Subscription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
