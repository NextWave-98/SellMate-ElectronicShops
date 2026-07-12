import { useState, useEffect } from 'react';
import { X, DollarSign, Loader2 } from 'lucide-react';

interface AddPurchaseOrderPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  purchaseOrder: {
    id: string;
    // API may use `poNumber` or `orderNumber`
    orderNumber?: string;
    poNumber?: string;
    supplierId?: string;
    supplierName?: string;
    // amounts may come as strings from API, and due field may be `dueAmount` or `balanceAmount`
    totalAmount?: number | string;
    paidAmount?: number | string;
    dueAmount?: number | string;
    balanceAmount?: number | string;
  } | null;
}

export interface PaymentFormData {
  purchaseOrderId: string;
  supplierId: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'CHECK' | 'OTHER';
  paymentDate?: string;
  reference?: string;
  bankName?: string;
  checkNumber?: string;
  transactionId?: string;
  notes?: string;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_PAYMENT', label: 'Mobile Payment' },
  { value: 'CHECK', label: 'Check' },
  { value: 'OTHER', label: 'Other' },
];

export default function AddPurchaseOrderPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  purchaseOrder,
}: AddPurchaseOrderPaymentModalProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    purchaseOrderId: purchaseOrder?.id || '',
    supplierId: purchaseOrder?.supplierId || '',
    amount: 0,
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    bankName: '',
    checkNumber: '',
    transactionId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  // Helper to coerce API values (which may be strings) to numbers
  const toNumber = (v: number | string | undefined | null) => {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return Number(v) || 0;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const totalNumeric = toNumber(purchaseOrder?.totalAmount ?? 0);
  const paidNumeric = toNumber(purchaseOrder?.paidAmount ?? 0);
  // prefer dueAmount, fallback to balanceAmount
  const dueNumeric = toNumber(purchaseOrder?.dueAmount ?? purchaseOrder?.balanceAmount ?? 0);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      setFormData((prev) => ({
        ...prev,
        purchaseOrderId: purchaseOrder.id,
        supplierId: purchaseOrder.supplierId || '',
        amount: dueNumeric > 0 ? dueNumeric : 0,
        paymentDate: new Date().toISOString().split('T')[0],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, purchaseOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchaseOrder) return;
    
    if (formData.amount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    if (formData.amount > dueNumeric) {
      const confirmOverpayment = window.confirm(
        `Payment amount (LKR ${formData.amount.toFixed(2)}) exceeds due amount (LKR ${toNumber(dueNumeric).toFixed(2)}). Do you want to proceed?`
      );
      if (!confirmOverpayment) return;
    }

    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || '',
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value) || 0,
    }));
  };

  const handleQuickAmount = (amount: number) => {
    setFormData((prev) => ({
      ...prev,
      amount,
    }));
  };

  const formatCurrency = (amount?: number | null) => {
    const num = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
    return `LKR ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isOpen || !purchaseOrder) return null;

  return (
 <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>    
   <div className="glass-modal-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-600 mr-2" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Record Supplier Payment</h2>
              <p className="text-sm text-gray-600 mt-1">
                PO: {purchaseOrder.poNumber ?? purchaseOrder.orderNumber} - {purchaseOrder.supplierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Balance Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(totalNumeric)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Paid Amount</p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(paidNumeric)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Due Amount</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(dueNumeric)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount (LKR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleNumberChange}
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-semibold"
            />
            
            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleQuickAmount(dueNumeric)}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Full Payment
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(Math.floor(dueNumeric / 2))}
                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
              >
                50%
              </button>
              {[10000, 50000, 100000, 500000].map((amt) => (
                dueNumeric >= amt && (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {amt.toLocaleString('en-US')}
                  </button>
                )
              ))}
            </div>

            {/* Overpayment Warning */}
            {formData.amount > dueNumeric && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ Payment exceeds due amount by {formatCurrency(formData.amount - dueNumeric)}
                </p>
              </div>
            )}

            {/* Remaining Balance Preview */}
            {formData.amount > 0 && formData.amount <= dueNumeric && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-800">
                  Remaining balance after payment: {formatCurrency(dueNumeric - formData.amount)}
                </p>
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Fields based on Payment Method */}
          {formData.paymentMethod === 'CHECK' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Number
                </label>
                <input
                  type="text"
                  name="checkNumber"
                  value={formData.checkNumber}
                  onChange={handleChange}
                  placeholder="Enter check number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}

          {(formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'MOBILE_PAYMENT') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleChange}
                  placeholder="Enter transaction ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="Payment reference or invoice number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional notes about this payment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.amount <= 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
