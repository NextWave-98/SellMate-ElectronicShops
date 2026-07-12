import React from 'react';
import { Package, User, Hash, FileText, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProductReturn } from '../../../hooks/useProductReturn';
import { formatDateTime } from '../../../utils/dateUtils';

interface ViewReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnItem: ProductReturn | null;
}

export default function ViewReturnModal({
  isOpen,
  onClose,
  returnItem
}: ViewReturnModalProps) {
  if (!isOpen || !returnItem) return null;

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US')}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      RECEIVED: 'bg-orange-100 text-orange-800 border-orange-200',
      INSPECTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PENDING_APPROVAL: 'bg-orange-100 text-orange-800 border-orange-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      PROCESSING: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
      REPLACEMENT_SENT: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      case 'PENDING_APPROVAL':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen && !!returnItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Return Details</DialogTitle>
            <span className="text-lg font-semibold text-gray-600">#{returnItem?.returnNumber}</span>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(returnItem?.status ?? '')}`}>
              {getStatusIcon(returnItem?.status ?? '')}
              {returnItem?.status?.replace('_', ' ') || 'Unknown'}
            </div>
          </div>
        </DialogHeader>

          <DialogBody className="space-y-6 pb-4">
            {/* Customer Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <User className="w-5 h-5" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="text-gray-900">{returnItem.customerName || returnItem.customer?.name || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="text-gray-900">{returnItem.customerPhone || returnItem.customer?.phone || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{returnItem.customerEmail || returnItem.customer?.email || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                  <p className="text-gray-900">{returnItem.customer?.customerId || returnItem.customerId || '—'}</p>
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" />
                Product Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <p className="text-gray-900">{returnItem.productName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Code</label>
                  <p className="text-gray-900">{returnItem.productCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand</label>
                  <p className="text-gray-900">{returnItem.productBrand || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model</label>
                  <p className="text-gray-900">{returnItem.productModel || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                  <p className="text-gray-900">{returnItem.productSerialNumber || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <p className="text-gray-900">{returnItem.productBatchNumber || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <p className="text-gray-900">{returnItem.quantity}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Value</label>
                  <p className="text-gray-900">{formatCurrency(returnItem.productValue)}</p>
                </div>
                {returnItem.refundAmount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Refund Amount</label>
                    <p className="text-gray-900">{formatCurrency(returnItem.refundAmount)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Return Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5" />
                Return Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source Type</label>
                  <p className="text-gray-900">{returnItem.sourceType?.replace('_', ' ') || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Return Category</label>
                  <p className="text-gray-900">{returnItem.returnCategory?.replace('_', ' ') || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Condition</label>
                  <p className="text-gray-900">{returnItem.productCondition?.replace('_', ' ') || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resolution Type</label>
                  <p className="text-gray-900">{returnItem.resolutionType?.replace('_', ' ') || ''}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Return Reason</label>
                  <p className="text-gray-900">{returnItem.returnReason}</p>
                </div>
                {returnItem.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-gray-900">{returnItem.notes}</p>
                  </div>
                )}
                {returnItem.inspectionNotes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Inspection Notes</label>
                    <p className="text-gray-900">{returnItem.inspectionNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5" />
                Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-600">{formatDateTime(returnItem.createdAt)}</p>
                    {returnItem.createdBy?.name && (
                      <p className="text-xs text-gray-500">by {returnItem.createdBy.name}</p>
                    )}
                  </div>
                </div>

                {returnItem.inspectedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Inspected</p>
                      <p className="text-sm text-gray-600">{formatDateTime(returnItem.inspectedAt)}</p>
                      {returnItem.inspectedBy?.name && (
                        <p className="text-xs text-gray-500">by {returnItem.inspectedBy.name}</p>
                      )}
                    </div>
                  </div>
                )}

                {returnItem.approvedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Approved</p>
                      <p className="text-sm text-gray-600">{formatDateTime(returnItem.approvedAt)}</p>
                      {returnItem.approvedBy?.name && (
                        <p className="text-xs text-gray-500">by {returnItem.approvedBy.name}</p>
                      )}
                    </div>
                  </div>
                )}

                {returnItem.rejectedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Rejected</p>
                      <p className="text-sm text-gray-600">{formatDateTime(returnItem.rejectedAt)}</p>
                      {returnItem.rejectedBy?.name && (
                        <p className="text-xs text-gray-500">by {returnItem.rejectedBy.name}</p>
                      )}
                    </div>
                  </div>
                )}

                {returnItem.processedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Processed</p>
                      <p className="text-sm text-gray-600">{formatDateTime(returnItem.processedAt)}</p>
                      {returnItem.processedBy?.name && (
                        <p className="text-xs text-gray-500">by {returnItem.processedBy.name}</p>
                      )}
                    </div>
                  </div>
                )}

                {returnItem.completedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Completed</p>
                      <p className="text-sm text-gray-600">{formatDateTime(returnItem.completedAt)}</p>
                    </div>
                  </div>
                )}

                {returnItem.cancelledAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Cancelled</p>
                      <p className="text-sm text-gray-600">{formatDateTime(returnItem.cancelledAt)}</p>
                      {returnItem.cancelledBy?.name && (
                        <p className="text-xs text-gray-500">by {returnItem.cancelledBy.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5" />
                Location Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch Name</label>
                  <p className="text-gray-900">{returnItem.location?.name || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch Code</label>
                  <p className="text-gray-900">{returnItem.location?.locationCode || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location ID</label>
                  <p className="text-gray-900">{returnItem.locationId}</p>
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}