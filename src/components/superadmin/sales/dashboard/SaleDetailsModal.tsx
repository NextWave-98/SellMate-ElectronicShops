import { X, User, MapPin, Calendar, DollarSign, CreditCard, Package, FileText } from 'lucide-react';

interface Transaction {
  id: string;
  paymentMethod: string;
  amount: number;
  transactionId?: string;
  referenceNumber?: string;
  date: string;
}

interface SaleItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    brand?: string;
    model?: string;
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
}

interface SaleDetails {
  id: string;
  type: 'POS' | 'JobSheet';
  invoiceNumber: string;
  customer: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
  };
  location: {
    id?: string;
    name: string;
    locationCode?: string;
  };
  soldBy?: {
    id?: string;
    name: string;
    email?: string;
  };
  assignedTo?: {
    id?: string;
    name: string;
    email?: string;
  };
  items?: SaleItem[];
  transactions: Transaction[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentStatus?: string;
  issueDescription?: string;
  diagnosisNotes?: string;
  repairNotes?: string;
  estimatedCost?: number;
  priority?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleDetails: SaleDetails | null;
  loading?: boolean;
}

export default function SaleDetailsModal({ isOpen, onClose, saleDetails, loading = false }: SaleDetailsModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH':
        return '💵';
      case 'CARD':
        return '💳';
      case 'BANK_TRANSFER':
        return '🏦';
      case 'MOBILE_PAYMENT':
        return '📱';
      default:
        return '💰';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {loading ? 'Loading...' : `Sale Details - ${saleDetails?.invoiceNumber}`}
                  </h3>
                  {saleDetails && (
                    <p className="text-sm text-orange-100 mt-0.5">
                      {saleDetails.type} Sale • {formatDate(saleDetails.createdAt)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : saleDetails ? (
              <div className="space-y-6">
                {/* Customer & Location Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-2 font-medium text-gray-900">{saleDetails.customer.name}</span>
                      </div>
                      {saleDetails.customer.phone && (
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2 text-gray-900">{saleDetails.customer.phone}</span>
                        </div>
                      )}
                      {saleDetails.customer.email && (
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2 text-gray-900">{saleDetails.customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location & Staff
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2 font-medium text-gray-900">{saleDetails.location.name}</span>
                      </div>
                      {saleDetails.soldBy && (
                        <div>
                          <span className="text-gray-500">Sold By:</span>
                          <span className="ml-2 text-gray-900">{saleDetails.soldBy.name}</span>
                        </div>
                      )}
                      {saleDetails.assignedTo && (
                        <div>
                          <span className="text-gray-500">Assigned To:</span>
                          <span className="ml-2 text-gray-900">{saleDetails.assignedTo.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items (for POS sales) */}
                {saleDetails.items && saleDetails.items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Items ({saleDetails.items.length})
                    </h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {saleDetails.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                                {item.product.sku && (
                                  <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* JobSheet Details */}
                {saleDetails.type === 'JobSheet' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Job Details</h4>
                    <div className="space-y-2 text-sm">
                      {saleDetails.issueDescription && (
                        <div>
                          <span className="text-gray-500 font-medium">Issue:</span>
                          <p className="mt-1 text-gray-900">{saleDetails.issueDescription}</p>
                        </div>
                      )}
                      {saleDetails.diagnosisNotes && (
                        <div>
                          <span className="text-gray-500 font-medium">Diagnosis:</span>
                          <p className="mt-1 text-gray-900">{saleDetails.diagnosisNotes}</p>
                        </div>
                      )}
                      {saleDetails.repairNotes && (
                        <div>
                          <span className="text-gray-500 font-medium">Repair Notes:</span>
                          <p className="mt-1 text-gray-900">{saleDetails.repairNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transactions */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Transactions ({saleDetails.transactions.length})
                  </h4>
                  {saleDetails.transactions.length > 0 ? (
                    <div className="space-y-2">
                      {saleDetails.transactions.map((txn) => (
                        <div
                          key={txn.id}
                          className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getPaymentMethodIcon(txn.paymentMethod)}</span>
                            <div>
                              <div className="font-medium text-gray-900">{txn.paymentMethod}</div>
                              <div className="text-sm text-gray-500">
                                {formatDate(txn.date)}
                                {txn.transactionId && ` • Txn: ${txn.transactionId}`}
                                {txn.referenceNumber && ` • Ref: ${txn.referenceNumber}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(txn.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-yellow-800">No transactions found</p>
                    </div>
                  )}
                </div>

                {/* Payment Summary */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Payment Summary
                  </h4>
                  <div className="space-y-3">
                    {saleDetails.subtotal !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(saleDetails.subtotal)}</span>
                      </div>
                    )}
                    {saleDetails.discount !== undefined && saleDetails.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(saleDetails.discount)}</span>
                      </div>
                    )}
                    {saleDetails.tax !== undefined && saleDetails.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(saleDetails.tax)}</span>
                      </div>
                    )}
                    <div className="border-t border-orange-300 pt-3 flex justify-between">
                      <span className="text-base font-semibold text-gray-900">Total Amount:</span>
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(saleDetails.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Amount Paid:</span>
                      <span className="text-base font-semibold text-green-600">
                        {formatCurrency(saleDetails.paidAmount)}
                      </span>
                    </div>
                    {saleDetails.totalAmount - saleDetails.paidAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Outstanding:</span>
                        <span className="text-base font-semibold text-red-600">
                          {formatCurrency(saleDetails.totalAmount - saleDetails.paidAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Status</span>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="text-gray-500">Sale Status:</span>
                        <span className="ml-2 font-medium text-gray-900">{saleDetails.status}</span>
                      </div>
                      {saleDetails.paymentStatus && (
                        <div>
                          <span className="text-gray-500">Payment Status:</span>
                          <span className="ml-2 font-medium text-gray-900">{saleDetails.paymentStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Timeline</span>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2 text-gray-900">{formatDate(saleDetails.createdAt)}</span>
                      </div>
                      {saleDetails.completedAt && (
                        <div>
                          <span className="text-gray-500">Completed:</span>
                          <span className="ml-2 text-gray-900">{formatDate(saleDetails.completedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No sale details available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
