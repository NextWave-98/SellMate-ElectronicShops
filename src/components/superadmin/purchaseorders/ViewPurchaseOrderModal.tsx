import { X } from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderItem } from '../../../hooks/usePurchaseOrder';

interface ViewPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
}

export default function ViewPurchaseOrderModal({ isOpen, onClose, purchaseOrder }: ViewPurchaseOrderModalProps) {
  if (!isOpen || !purchaseOrder) return null;

  const calculateItemTotal = (item: PurchaseOrderItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = (subtotal * (item.discountPercent || 0)) / 100;
    const afterDiscount = subtotal - discount;
    const tax = (afterDiscount * (item.taxPercent || 0)) / 100;
    return afterDiscount + tax;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-orange-100 text-orange-800',
      PARTIALLY_RECEIVED: 'bg-purple-100 text-purple-800',
      RECEIVED: 'bg-teal-100 text-teal-800',
      COMPLETED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ON_HOLD: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-orange-100 text-orange-800',
      NORMAL: 'bg-gray-100 text-gray-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Purchase Order Details</h2>
            <p className="text-sm text-gray-500">{purchaseOrder.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(purchaseOrder.status)}`}>
              {purchaseOrder.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(purchaseOrder.priority)}`}>
              {purchaseOrder.priority}
            </span>
          </div>

          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Supplier</p>
              <p className="font-medium">
                {purchaseOrder.supplier?.name || 'N/A'}
                {purchaseOrder.supplier?.supplierCode && (
                  <span className="text-sm text-gray-500 ml-2">({purchaseOrder.supplier.supplierCode})</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Order Date</p>
              <p className="font-medium">{new Date(purchaseOrder.orderDate).toLocaleDateString()}</p>
            </div>

            {purchaseOrder.expectedDate && (
              <div>
                <p className="text-sm text-gray-500">Expected Date</p>
                <p className="font-medium">{new Date(purchaseOrder.expectedDate).toLocaleDateString()}</p>
              </div>
            )}

            {purchaseOrder.receivedDate && (
              <div>
                <p className="text-sm text-gray-500">Received Date</p>
                <p className="font-medium">{new Date(purchaseOrder.receivedDate).toLocaleDateString()}</p>
              </div>
            )}

            {purchaseOrder.paymentTerms && (
              <div>
                <p className="text-sm text-gray-500">Payment Terms</p>
                <p className="font-medium">{purchaseOrder.paymentTerms}</p>
              </div>
            )}

            {purchaseOrder.shippingMethod && (
              <div>
                <p className="text-sm text-gray-500">Shipping Method</p>
                <p className="font-medium">{purchaseOrder.shippingMethod}</p>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          {purchaseOrder.shippingAddress && (
            <div>
              <p className="text-sm text-gray-500">Shipping Address</p>
              <p className="font-medium whitespace-pre-line">{purchaseOrder.shippingAddress}</p>
            </div>
          )}

          {/* Items */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrder.items?.map((item: PurchaseOrderItem, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.product?.name || 'N/A'}</div>
                        {item.product?.productCode && (
                          <div className="text-sm text-gray-500">{item.product.productCode}</div>
                        )}
                        {item.notes && <div className="text-xs text-gray-400 mt-1">{item.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.quantity}
                        {(item.receivedQuantity > 0 || item.acceptedQuantity > 0) && (
                          <div className="text-xs text-gray-500">
                            Received: {item.receivedQuantity || 0} | Accepted: {item.acceptedQuantity || 0}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">Rs. {item.unitPrice}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.taxPercent > 0 ? `${item.taxPercent}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        Rs. {calculateItemTotal(item).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-t pt-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">Rs. {purchaseOrder.subtotal || '0.00'}</span>
              </div>
              
              {purchaseOrder.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">- Rs. {purchaseOrder.discountAmount}</span>
                </div>
              )}
              
              {purchaseOrder.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">Rs. {purchaseOrder.taxAmount}</span>
                </div>
              )}
              
              {purchaseOrder.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">Rs. {purchaseOrder.shippingCost}</span>
                </div>
              )}
              
              <div className="border-t pt-2 flex justify-between">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-lg font-semibold text-orange-600">
                  Rs. {purchaseOrder.totalAmount || '0.00'}
                </span>
              </div>

              {purchaseOrder.paidAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="font-medium text-green-600">Rs. {purchaseOrder.paidAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Due Amount:</span>
                    <span className="font-medium text-orange-600">Rs. {purchaseOrder.dueAmount || '0.00'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {purchaseOrder.notes && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="text-sm whitespace-pre-line bg-gray-50 p-3 rounded-lg">{purchaseOrder.notes}</p>
            </div>
          )}

          {/* Approval Info */}
          {purchaseOrder.approvedBy && purchaseOrder.approvedAt && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">
                Approved by {purchaseOrder.approvedBy} on {new Date(purchaseOrder.approvedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Created:</span> {new Date(purchaseOrder.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span> {new Date(purchaseOrder.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
