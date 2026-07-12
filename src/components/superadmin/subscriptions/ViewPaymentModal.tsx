import { X, CreditCard, Building2, Calendar, Receipt, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import type { SubscriptionPayment } from '../../../types/subscription.types';

interface ViewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: SubscriptionPayment | null;
}

export default function ViewPaymentModal({ isOpen, onClose, payment }: ViewPaymentModalProps) {
  if (!isOpen || !payment) return null;

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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      COMPLETED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> },
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', icon: <Clock className="w-4 h-4" /> },
      PARTIAL: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', icon: <AlertCircle className="w-4 h-4" /> },
      REFUNDED: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-400', icon: <XCircle className="w-4 h-4" /> },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, string> = {
      CASH: '💵',
      CARD: '💳',
      BANK_TRANSFER: '🏦',
      MOBILE_PAYMENT: '📱',
      CHECK: '📝',
      OTHER: '📋',
    };
    return icons[method] || '💳';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Details</h2>
                <p className="text-sm text-gray-500">Payment #{payment.id?.slice(0, 8)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Amount and Status */}
            <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              {getStatusBadge(payment.paymentStatus)}
            </div>

            {/* Payment Method */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </h3>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getPaymentMethodIcon(payment.paymentMethod)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.paymentMethod?.replace(/_/g, ' ')}
                    </p>
                    {payment.transactionId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        Txn: {payment.transactionId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business & Subscription Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Subscription Info
              </h3>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Business</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.subscription?.business?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Plan</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.subscription?.plan?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Billing Cycle</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {payment.subscription?.billingCycle?.toLowerCase().replace(/_/g, ' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.subscription?.status || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Dates */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Payment Date
              </h3>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Payment Date</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Created At</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gateway Info */}
            {payment.paymentGateway && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Gateway Information
                </h3>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {payment.paymentGateway}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {payment.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Notes
                </h3>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{payment.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
