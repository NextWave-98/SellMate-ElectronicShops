import { X, Package, Check, X as XIcon, DollarSign, Users, MapPin, Calendar } from 'lucide-react';
import type { SubscriptionPlan } from '../../../types/subscription.types';

interface ViewPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
}

export default function ViewPlanModal({ isOpen, onClose, plan }: ViewPlanModalProps) {
  if (!isOpen || !plan) return null;

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  };

  const FeatureItem = ({ label, value, enabled }: { label: string; value?: number | string; enabled?: boolean }) => {
    if (enabled !== undefined) {
      return (
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          {enabled ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <XIcon className="w-5 h-5 text-red-400" />
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    plan.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">{plan.type}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Pricing */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                Pricing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-500">Monthly</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(plan.monthlyPrice)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-500">Annual</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(plan.annualPrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {plan.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{plan.description}</p>
              </div>
            )}

            {/* Limits */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                Limits
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 divide-y divide-gray-200 dark:divide-gray-600">
                <FeatureItem label="Max Users" value={plan.maxUsers} />
                <FeatureItem label="Max Locations" value={plan.maxLocations} />
                <FeatureItem label="Max Products" value={plan.maxProducts} />
                <FeatureItem label="Max Daily Sales" value={plan.maxDailySales} />
                <FeatureItem label="Max Monthly Sales" value={plan.maxMonthlySales} />
                <FeatureItem label="Storage (GB)" value={plan.storageLimit} />
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                Features
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 divide-y divide-gray-200 dark:divide-gray-600">
                <FeatureItem label="API Access" enabled={plan.allowApiAccess} />
                <FeatureItem label="Custom Reports" enabled={plan.allowCustomReports} />
                <FeatureItem label="Advanced Analytics" enabled={plan.allowAdvancedAnalytics} />
                <FeatureItem label="Priority Support" enabled={plan.hasPrioritySupport} />
                <FeatureItem label="Multi Currency" enabled={plan.allowMultiCurrency} />
                <FeatureItem label="White Label" enabled={plan.allowWhiteLabel} />
                <FeatureItem label="Custom Integrations" enabled={plan.allowCustomIntegrations} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
