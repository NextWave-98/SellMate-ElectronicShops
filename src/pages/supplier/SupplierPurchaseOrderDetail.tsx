import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPackage, FiCalendar, FiTruck } from 'react-icons/fi';
import { useSupplierPortal } from '../../hooks';
import { formatCurrency } from '../../utils/currency';

const SupplierPurchaseOrderDetail = () => {
  const { id } = useParams();
  const { getPurchaseOrderById, loading } = useSupplierPortal();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadPurchaseOrder();
    }
  }, [id]);

  const loadPurchaseOrder = async () => {
    try {
      const data = await getPurchaseOrderById(id!);
      setOrder(data);
    } catch (error) {
      console.error('Error loading purchase order:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      RECEIVED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/supplier/purchase-orders"
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <FiArrowLeft className="mr-2" />
          Back to Orders
        </Link>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.poNumber}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Order Date: {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full ${getStatusColor(
              order.status
            )}`}
          >
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <FiCalendar className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-600">Expected Date</p>
              <p className="font-medium text-gray-900">
                {order.expectedDate
                  ? new Date(order.expectedDate).toLocaleDateString()
                  : 'Not specified'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FiTruck className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-600">Shipping Method</p>
              <p className="font-medium text-gray-900">{order.shippingMethod || 'Standard'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FiPackage className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-600">Payment Terms</p>
              <p className="font-medium text-gray-900">{order.paymentTerms || 'Net 30'}</p>
            </div>
          </div>
        </div>

        {order.shippingAddress && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Shipping Address</h3>
            <p className="text-gray-900">{order.shippingAddress}</p>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Discount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Tax
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items?.map((item: any) => {
                const itemTotal = item.quantity * parseFloat(item.unitPrice);
                const discount = (itemTotal * parseFloat(item.discountPercent || 0)) / 100;
                const tax = ((itemTotal - discount) * parseFloat(item.taxRate || 0)) / 100;
                const total = itemTotal - discount + tax;

                return (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product?.name}
                      </div>
                      {item.notes && (
                        <div className="text-xs text-gray-500">{item.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.product?.sku}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {item.discountPercent || 0}%
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {item.taxRate || 0}%
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Order Totals */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="max-w-md ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(order.shippingCost)}
                </span>
              </div>
            )}
            
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(order.discountAmount)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(order.taxAmount)}
              </span>
            </div>
            
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>Total:</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(order.paidAmount)}
              </span>
            </div>
            
            <div className="flex justify-between text-base font-semibold text-red-600">
              <span>Balance:</span>
              <span>{formatCurrency(order.balanceAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
          <p className="text-gray-700">{order.notes}</p>
        </div>
      )}
    </div>
  );
};

export default SupplierPurchaseOrderDetail;
