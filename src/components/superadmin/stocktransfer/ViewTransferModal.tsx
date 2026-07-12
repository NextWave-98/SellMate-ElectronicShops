import React from 'react';
import { X, Package, MapPin, Calendar, User, FileText, CheckCircle, Clock, Truck, AlertCircle } from 'lucide-react';
import type { StockRelease } from '../../../types/stockTransfer.types';

interface ViewTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockRelease | null;
}

const ViewTransferModal: React.FC<ViewTransferModalProps> = ({
  isOpen,
  onClose,
  transfer,
}) => {
  if (!isOpen || !transfer) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'RELEASED':
      case 'IN_TRANSIT':
        return 'bg-orange-100 text-orange-800';
      case 'APPROVED':
        return 'bg-purple-100 text-purple-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'RELEASED':
      case 'IN_TRANSIT':
        return <Truck size={20} className="text-orange-600" />;
      case 'APPROVED':
        return <CheckCircle size={20} className="text-purple-600" />;
      case 'PENDING':
        return <Clock size={20} className="text-yellow-600" />;
      case 'CANCELLED':
        return <AlertCircle size={20} className="text-red-600" />;
      default:
        return <Package size={20} className="text-gray-600" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalQuantity = transfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="glass-modal-panel max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Package className="text-orange-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Transfer Details</h2>
              <p className="text-sm text-gray-500">Release #{transfer.releaseNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="glass-modal-scroll px-6">
          {/* Status Badge */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              {getStatusIcon(transfer.status)}
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(transfer.status)}`}>
                {transfer.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Transfer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Source Branch */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="text-orange-600" size={20} />
                <h3 className="font-semibold text-gray-800">From</h3>
              </div>
              <p className="text-gray-900 font-medium">{transfer.fromBranch?.name}</p>
              <p className="text-sm text-gray-500">{transfer.fromBranch?.location}</p>
            </div>

            {/* Destination Branch */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="text-green-600" size={20} />
                <h3 className="font-semibold text-gray-800">To</h3>
              </div>
              <p className="text-gray-900 font-medium">{transfer.toBranch?.name}</p>
              <p className="text-sm text-gray-500">{transfer.toBranch?.location}</p>
            </div>
          </div>

          {/* Dates and User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="text-gray-600" size={20} />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(transfer.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="text-gray-600" size={20} />
              <div>
                <p className="text-xs text-gray-500">Created By</p>
                <p className="text-sm font-medium text-gray-900">
                  {transfer.createdBy?.name || 'N/A'}
                </p>
              </div>
            </div>

            {transfer.approvedAt && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="text-purple-600" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Approved</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(transfer.approvedAt)}
                  </p>
                </div>
              </div>
            )}

            {transfer.approvedBy && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="text-purple-600" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Approved By</p>
                  <p className="text-sm font-medium text-gray-900">
                    {transfer.approvedBy.name}
                  </p>
                </div>
              </div>
            )}

            {transfer.releasedAt && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="text-orange-600" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Released</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(transfer.releasedAt)}
                  </p>
                </div>
              </div>
            )}

            {transfer.receivedAt && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="text-green-600" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Received</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(transfer.receivedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Transfer Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Transfer Items ({transfer.items?.length || 0} products, {totalQuantity} total units)
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfer.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {item.product.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.product.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ${item.unitPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                        ${((item.unitPrice || 0) * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900">
                      Total
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {totalQuantity}
                    </td>
                    <td></td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      $
                      {transfer.items
                        ?.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)
                        .toFixed(2) || '0.00'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Notes</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{transfer.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewTransferModal;
