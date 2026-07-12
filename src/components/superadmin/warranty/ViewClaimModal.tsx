import { X, FileText, Calendar, Package, User, AlertCircle, DollarSign, Clock } from 'lucide-react';
import type { WarrantyClaim } from '../../../hooks/useWarranty';

interface ViewClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: WarrantyClaim | null;
}

export default function ViewClaimModal({ isOpen, onClose, claim }: ViewClaimModalProps) {
  if (!isOpen || !claim) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-orange-100 text-orange-800';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResolutionColor = (type: string) => {
    switch (type) {
      case 'REPAIRED': return 'bg-green-100 text-green-800';
      case 'REPLACED': return 'bg-orange-100 text-orange-800';
      case 'REFUNDED': return 'bg-purple-100 text-purple-800';
      case 'STORE_CREDIT': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Claim Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
              {claim.status.replace('_', ' ')}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(claim.priority)}`}>
              <AlertCircle className="w-3 h-3 mr-1" />
              {claim.priority} PRIORITY
            </span>
            {claim.resolutionType && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getResolutionColor(claim.resolutionType)}`}>
                {claim.resolutionType.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Claim Number */}
          <div className="bg-gradient-to-r from-orange-50 to-indigo-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center text-sm text-orange-600 mb-1">
              <FileText className="w-4 h-4 mr-2" />
              Claim Number
            </div>
            <p className="text-xl font-bold text-gray-900">{claim.claimNumber}</p>
          </div>

          {/* Warranty Card Info */}
          {claim.warrantyCard && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Associated Warranty</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Warranty Number</p>
                  <p className="text-sm font-medium text-gray-900">{claim.warrantyCard.warrantyNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="text-sm font-medium text-gray-900">{claim.warrantyCard.productName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium text-gray-900">{claim.warrantyCard.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{claim.warrantyCard.customerPhone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Issue Details */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2 text-orange-600" />
              Issue Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Issue Type</p>
                <p className="text-sm font-medium text-gray-900">{claim.issueType.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-900">{claim.issueDescription}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-orange-600" />
              Timeline
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Claim Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(claim.claimDate)}</p>
              </div>
              {claim.resolutionDate && (
                <div>
                  <p className="text-xs text-gray-500">Resolution Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(claim.resolutionDate)}</p>
                </div>
              )}
              {claim.resolutionDate && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Resolution Time</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {Math.ceil((new Date(claim.resolutionDate).getTime() - new Date(claim.claimDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cost Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-orange-600" />
              Cost Information
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {claim.estimatedCost !== null && claim.estimatedCost !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Estimated Cost</p>
                  <p className="text-sm font-medium text-gray-900">LKR {claim.estimatedCost.toLocaleString()}</p>
                </div>
              )}
              {claim.actualCost !== null && claim.actualCost !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Actual Cost</p>
                  <p className="text-sm font-medium text-gray-900">LKR {claim.actualCost.toLocaleString()}</p>
                </div>
              )}
              {claim.customerCharge !== null && claim.customerCharge !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Customer Charge</p>
                  <p className="text-sm font-medium text-gray-900">LKR {claim.customerCharge.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution Details */}
          {(claim.resolutionType || claim.resolutionNotes) && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Resolution Details</h3>
              <div className="space-y-3">
                {claim.resolutionType && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Resolution Type</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getResolutionColor(claim.resolutionType)}`}>
                      {claim.resolutionType.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {claim.resolutionNotes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Resolution Notes</p>
                    <p className="text-sm text-gray-900">{claim.resolutionNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Job Sheet Link */}
          {claim.jobSheetId && (
            <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 mb-1">Linked Job Sheet</p>
              <p className="text-sm font-medium text-gray-900">Job Sheet ID: {claim.jobSheetId}</p>
            </div>
          )}

          {/* Assigned To */}
          {claim.assignedToId && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-orange-600" />
                Assignment
              </h3>
              <p className="text-sm text-gray-900">Assigned to Technician ID: {claim.assignedToId}</p>
            </div>
          )}

          {/* Notes */}
          {claim.notes && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Additional Notes</h3>
              <p className="text-sm text-gray-700">{claim.notes}</p>
            </div>
          )}

          {/* Images & Documents */}
          {((claim.images && claim.images.length > 0) || (claim.documents && claim.documents.length > 0)) && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h3>
              {claim.images && claim.images.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Images ({claim.images.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {claim.images.map((img, idx) => (
                      <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                        Image {idx + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {claim.documents && claim.documents.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Documents ({claim.documents.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {claim.documents.map((doc, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        Document {idx + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4 flex justify-between text-xs text-gray-500">
            <span>Created: {formatDate(claim.createdAt)}</span>
            <span>Updated: {formatDate(claim.updatedAt)}</span>
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
