import { useState } from 'react';
import { X, CreditCard, DollarSign } from 'lucide-react';
import type { BusinessSubscription, CreateSubscriptionPaymentDTO, PaymentMethod } from '../../../types/subscription.types';
import toast from 'react-hot-toast';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubscriptionPaymentDTO) => Promise<void>;
  subscriptions: BusinessSubscription[];
  isLoading: boolean;
}

export default function AddPaymentModal({ isOpen, onClose, onSubmit, subscriptions, isLoading }: AddPaymentModalProps) {
  const [formData, setFormData] = useState({
    subscriptionId: '',
    amount: '',
    paymentMethod: 'CARD' as PaymentMethod,
    transactionId: '',
    paymentGateway: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL');
  const selectedSubscription = activeSubscriptions.find((s) => s.id === formData.subscriptionId);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getSubscriptionPrice = (subscription: BusinessSubscription) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.subscriptionId) newErrors.subscriptionId = 'Please select a subscription';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const paymentData: CreateSubscriptionPaymentDTO = {
        subscriptionId: formData.subscriptionId,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date().toISOString(),
        transactionId: formData.transactionId || undefined,
        paymentGateway: formData.paymentGateway || undefined,
        notes: formData.notes || undefined,
      };

      await onSubmit(paymentData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to record payment';
      toast.error(errorMsg);
    }
  };

  const handleClose = () => {
    setFormData({
      subscriptionId: '',
      amount: '',
      paymentMethod: 'CARD',
      transactionId: '',
      paymentGateway: '',
      notes: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Record Payment</h2>
                <p className="text-sm text-gray-500">Add a new payment record</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Subscription Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subscription *
              </label>
              <select
                name="subscriptionId"
                value={formData.subscriptionId}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.subscriptionId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">-- Select a subscription --</option>
                {activeSubscriptions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.business?.name || 'Unknown'} - {sub.plan?.name || 'Unknown Plan'} ({sub.status})
                  </option>
                ))}
              </select>
              {errors.subscriptionId && <p className="text-sm text-red-500 mt-1">{errors.subscriptionId}</p>}
            </div>

            {/* Selected Subscription Preview */}
            {selectedSubscription && (
              <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2">
                  {selectedSubscription.business?.name}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-indigo-600 dark:text-indigo-400">Plan: </span>
                    <span className="text-indigo-900 dark:text-indigo-200">{selectedSubscription.plan?.name}</span>
                  </div>
                  <div>
                    <span className="text-indigo-600 dark:text-indigo-400">Expected: </span>
                    <span className="font-medium text-green-600">{formatCurrency(getSubscriptionPrice(selectedSubscription))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
              {selectedSubscription && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, amount: String(getSubscriptionPrice(selectedSubscription) || 0) }))}
                  className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                >
                  Use expected amount ({formatCurrency(getSubscriptionPrice(selectedSubscription))})
                </button>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method *
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="CASH">💵 Cash</option>
                <option value="CARD">💳 Card</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                <option value="MOBILE_PAYMENT">📱 Mobile Payment</option>
                <option value="CHECK">📝 Check</option>
                <option value="OTHER">📋 Other</option>
              </select>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction ID
              </label>
              <input
                type="text"
                name="transactionId"
                value={formData.transactionId}
                onChange={handleChange}
                placeholder="e.g., TXN-123456789"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Payment Gateway */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Gateway
              </label>
              <input
                type="text"
                name="paymentGateway"
                value={formData.paymentGateway}
                onChange={handleChange}
                placeholder="e.g., Stripe, PayPal"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Optional notes..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {isLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
