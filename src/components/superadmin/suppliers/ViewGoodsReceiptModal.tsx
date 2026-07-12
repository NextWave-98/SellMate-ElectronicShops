import { X, Package, Calendar, User, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { GoodsReceipt } from '../../../hooks/useGoodsReceipt';

interface ViewGoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: GoodsReceipt | null;
}

const GoodsReceiptStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PENDING_QC: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending QC' },
    APPROVED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Approved' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  };

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const QualityStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    PENDING: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <span>⏳</span> },
    ACCEPTED: { bg: 'bg-green-100', text: 'text-green-600', icon: <CheckCircle className="w-3 h-3" /> },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-600', icon: <XCircle className="w-3 h-3" /> },
    DAMAGED: { bg: 'bg-orange-100', text: 'text-orange-600', icon: <span>⚠️</span> },
    PARTIAL: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: <span>⚡</span> },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status}
    </span>
  );
};

export default function ViewGoodsReceiptModal({ isOpen, onClose, receipt }: ViewGoodsReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTotalReceived = () => {
    return receipt.items?.reduce((sum, item) => sum + item.receivedQuantity, 0) || 0;
  };

  const getTotalAccepted = () => {
    return receipt.items?.reduce((sum, item) => sum + item.acceptedQuantity, 0) || 0;
  };

  const getTotalRejected = () => {
    return receipt.items?.reduce((sum, item) => sum + item.rejectedQuantity, 0) || 0;
  };

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="glass-modal-header flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Goods Receipt Details</h2>
            <p className="text-sm text-gray-500 mt-1">{receipt.receiptNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="glass-modal-scroll px-6 py-6">
          {/* Status and Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <GoodsReceiptStatusBadge status={receipt.status} />
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Total Received</div>
              <div className="text-2xl font-bold text-orange-600">{getTotalReceived()}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Accepted</div>
              <div className="text-2xl font-bold text-green-600">{getTotalAccepted()}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-600">{getTotalRejected()}</div>
            </div>
          </div>

          {/* Receipt Information */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Purchase Order</div>
                  <div className="font-medium text-gray-900">
                    {receipt.purchaseOrder?.poNumber || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Supplier</div>
                  <div className="font-medium text-gray-900">
                    {receipt.purchaseOrder?.supplier?.name || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {receipt.purchaseOrder?.supplier?.supplierCode || ''}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Receipt Date</div>
                  <div className="font-medium text-gray-900">{formatDate(receipt.receiptDate)}</div>
                </div>
              </div>

              {receipt.invoiceNumber && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Invoice Number</div>
                    <div className="font-medium text-gray-900">{receipt.invoiceNumber}</div>
                    {receipt.invoiceDate && (
                      <div className="text-xs text-gray-500">{formatDate(receipt.invoiceDate)}</div>
                    )}
                  </div>
                </div>
              )}

              {receipt.receivedBy && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Received By</div>
                    <div className="font-medium text-gray-900">{receipt.receivedBy}</div>
                  </div>
                </div>
              )}

              {receipt.qualityCheckBy && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Quality Checked By</div>
                    <div className="font-medium text-gray-900">{receipt.qualityCheckBy}</div>
                    {receipt.qualityCheckDate && (
                      <div className="text-xs text-gray-500">{formatDate(receipt.qualityCheckDate)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {receipt.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500 mb-1">Notes</div>
                <div className="text-gray-900">{receipt.notes}</div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Received Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Ordered
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Received
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Accepted
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Rejected
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quality
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Batch/Expiry
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receipt.items?.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          Product #{item.productId.substring(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm text-gray-900">{item.orderedQuantity}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-medium text-gray-900">{item.receivedQuantity}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-medium text-green-600">{item.acceptedQuantity}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-medium text-red-600">{item.rejectedQuantity}</div>
                      </td>
                      <td className="px-4 py-3">
                        <QualityStatusBadge status={item.qualityStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {item.batchNumber && (
                          <div className="text-xs text-gray-600">Batch: {item.batchNumber}</div>
                        )}
                        {item.expiryDate && (
                          <div className="text-xs text-gray-600">Exp: {formatDate(item.expiryDate)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quality Check Notes */}
          {receipt.qualityCheckNotes && (
            <div className="mt-6 bg-orange-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Quality Check Notes</h4>
              <p className="text-sm text-gray-700">{receipt.qualityCheckNotes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="glass-modal-footer flex justify-end">
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
}
