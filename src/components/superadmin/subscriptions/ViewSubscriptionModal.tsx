import { X, Building2, CreditCard, Calendar, Package, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { BusinessSubscription } from '../../../types/subscription.types';

interface ViewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: BusinessSubscription | null;
}

export default function ViewSubscriptionModal({ isOpen, onClose, subscription }: ViewSubscriptionModalProps) {
  if (!isOpen || !subscription) return null;

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getSubscriptionPrice = () => {
    if (!subscription.plan) return 0;
    switch (subscription.billingCycle) {
      case 'MONTHLY':
        return subscription.plan.monthlyPrice;
      case 'QUARTERLY':
        return subscription.plan.quarterlyPrice;
      case 'SEMI_ANNUAL':
        return subscription.plan.semiAnnualPrice;
      case 'ANNUAL':
        return subscription.plan.annualPrice;
      default:
        return subscription.plan.monthlyPrice;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle2 className="w-4 h-4" /> },
      TRIAL: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="w-4 h-4" /> },
      EXPIRED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" /> },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="w-4 h-4" /> },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertCircle className="w-4 h-4" /> },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const daysUntilExpiry = () => {
    if (!subscription.endDate) return null;
    const end = new Date(subscription.endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const expiryDays = daysUntilExpiry();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Details</h2>
                <p className="text-sm text-gray-500">#{subscription.id.slice(0, 8)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
                {getStatusBadge(subscription.status)}
              </div>
              {expiryDays !== null && subscription.status === 'ACTIVE' && (
                <span className={`text-sm font-medium ${expiryDays <= 7 ? 'text-red-600' : expiryDays <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {expiryDays > 0 ? `${expiryDays} days remaining` : 'Expires today'}
                </span>
              )}
            </div>

            {/* Business Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Business Information
              </h3>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Business Name</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {subscription.business?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Business ID</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                      {subscription.businessId?.slice(0, 8) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Plan Details
              </h3>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Plan Name</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {subscription.plan?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Plan Type</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {subscription.plan?.planType || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing Information
              </h3>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Billing Cycle</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {subscription.billingCycle?.toLowerCase() || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Price</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(getSubscriptionPrice())}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Auto Renew</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {subscription.autoRenew ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-500 flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> No
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Next Billing</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(subscription.nextBillingDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Subscription Dates
              </h3>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Start Date</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(subscription.startDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">End Date</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(subscription.endDate)}
                    </p>
                  </div>
                  {subscription.trialEndDate && (
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Trial End Date</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(subscription.trialEndDate)}
                      </p>
                    </div>
                  )}
                  {subscription.cancelledAt && (
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Cancelled At</span>
                      <p className="text-sm font-medium text-red-600">
                        {formatDate(subscription.cancelledAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cancellation Reason */}
            {subscription.cancellationReason && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Cancellation Reason</h3>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">{subscription.cancellationReason}</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Created: {formatDate(subscription.createdAt)}</span>
                <span>Updated: {formatDate(subscription.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
