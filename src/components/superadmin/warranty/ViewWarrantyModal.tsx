import { X, FileText, Calendar, Package, User, Phone, MapPin, Award, Shield } from 'lucide-react';
import type { WarrantyCard } from '../../../hooks/useWarranty';

interface ViewWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: WarrantyCard | null;
}

export default function ViewWarrantyModal({ isOpen, onClose, warranty }: ViewWarrantyModalProps) {
  if (!isOpen || !warranty) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
      case 'CLAIMED': return 'bg-orange-100 text-orange-800';
      case 'VOIDED': return 'bg-red-100 text-red-800';
      case 'TRANSFERRED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWarrantyTypeColor = (type: string) => {
    switch (type) {
      case 'STANDARD': return 'bg-orange-100 text-orange-800';
      case 'EXTENDED': return 'bg-purple-100 text-purple-800';
      case 'LIMITED': return 'bg-yellow-100 text-yellow-800';
      case 'LIFETIME': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Warranty Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(warranty.status)}`}>
              {warranty.status}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getWarrantyTypeColor(warranty.warrantyType)}`}>
              <Shield className="w-3 h-3 mr-1" />
              {warranty.warrantyType}
            </span>
            {warranty.isTransferred && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Transferred
              </span>
            )}
          </div>

          {/* Warranty Number */}
          <div className="bg-gradient-to-r from-orange-50 to-indigo-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center text-sm text-orange-600 mb-1">
              <FileText className="w-4 h-4 mr-2" />
              Warranty Number
            </div>
            <p className="text-xl font-bold text-gray-900">{warranty.warrantyNumber}</p>
          </div>

          {/* Product Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2 text-orange-600" />
              Product Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Product Name</p>
                <p className="text-sm font-medium text-gray-900">{warranty.productName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Product Code</p>
                <p className="text-sm font-medium text-gray-900">{warranty.productCode}</p>
              </div>
              {warranty.productSKU && (
                <div>
                  <p className="text-xs text-gray-500">SKU</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.productSKU}</p>
                </div>
              )}
              {warranty.serialNumber && (
                <div>
                  <p className="text-xs text-gray-500">Serial Number</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.serialNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-orange-600" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">{warranty.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">{warranty.customerPhone}</p>
              </div>
              {warranty.customerEmail && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.customerEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Warranty Period */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-orange-600" />
              Warranty Period
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-medium text-gray-900">{warranty.warrantyMonths} Months</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(warranty.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expiry Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(warranty.expiryDate)}</p>
              </div>
            </div>
          </div>

          {/* Coverage Details */}
          {(warranty.coverage || warranty.terms || warranty.exclusions) && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Award className="w-4 h-4 mr-2 text-orange-600" />
                Coverage Details
              </h3>
              <div className="space-y-3">
                {warranty.coverage && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Coverage</p>
                    <p className="text-sm text-gray-900">{warranty.coverage}</p>
                  </div>
                )}
                {warranty.terms && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Terms & Conditions</p>
                    <p className="text-sm text-gray-900">{warranty.terms}</p>
                  </div>
                )}
                {warranty.exclusions && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Exclusions</p>
                    <p className="text-sm text-red-600">{warranty.exclusions}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transfer Information */}
          {warranty.isTransferred && (
            <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Transfer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Transferred To</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.transferredTo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.transferredPhone}</p>
                </div>
                {warranty.transferredDate && (
                  <div>
                    <p className="text-xs text-gray-500">Transfer Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(warranty.transferredDate)}</p>
                  </div>
                )}
                {warranty.transferNotes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm text-gray-900">{warranty.transferNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Void Information */}
          {warranty.status === 'VOIDED' && warranty.voidReason && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2">Void Information</h3>
              <p className="text-sm text-red-800">{warranty.voidReason}</p>
              {warranty.voidedAt && (
                <p className="text-xs text-red-600 mt-2">Voided on: {formatDate(warranty.voidedAt)}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {warranty.notes && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{warranty.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4 flex justify-between text-xs text-gray-500">
            <span>Created: {formatDate(warranty.createdAt)}</span>
            <span>Updated: {formatDate(warranty.updatedAt)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
