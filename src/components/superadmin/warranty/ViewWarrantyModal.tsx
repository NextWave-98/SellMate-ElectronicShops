import { useEffect, useState } from 'react';
import { X, FileText, Calendar, Package, User, Award, Shield, ShieldCheck, ShieldX, Truck } from 'lucide-react';
import useWarranty, { type WarrantyCard, type CardCoverageEntry } from '../../../hooks/useWarranty';

interface ViewWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: WarrantyCard | null;
}

export default function ViewWarrantyModal({ isOpen, onClose, warranty }: ViewWarrantyModalProps) {
  const { getCardCoverage } = useWarranty();
  const [cardCoverage, setCardCoverage] = useState<CardCoverageEntry[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  useEffect(() => {
    if (!isOpen || !warranty?.id) {
      setCardCoverage([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingCoverage(true);
      const res = await getCardCoverage(warranty.id);
      if (!cancelled && Array.isArray(res?.data)) setCardCoverage(res!.data as CardCoverageEntry[]);
      setLoadingCoverage(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, warranty?.id]);

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
      case 'SERVICE': return 'bg-blue-100 text-blue-800';
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

          {/* Provider, DOA & Structured Coverage */}
          {(warranty.warrantyProvider || warranty.doaDays != null || warranty.claimLimit != null || loadingCoverage || cardCoverage.length > 0) && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Truck className="w-4 h-4 mr-2 text-orange-600" />
                Provider &amp; Coverage
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                {warranty.warrantyProvider && (
                  <div>
                    <p className="text-xs text-gray-500">Provider</p>
                    <p className="text-sm font-medium text-gray-900">{warranty.warrantyProvider}</p>
                  </div>
                )}
                {warranty.doaDays != null && (
                  <div>
                    <p className="text-xs text-gray-500">DOA Window</p>
                    <p className="text-sm font-medium text-gray-900">{warranty.doaDays} day(s)</p>
                  </div>
                )}
                {warranty.doaAction && (
                  <div>
                    <p className="text-xs text-gray-500">DOA Action</p>
                    <p className="text-sm font-medium text-gray-900">{warranty.doaAction}</p>
                  </div>
                )}
                {warranty.claimLimit != null && (
                  <div>
                    <p className="text-xs text-gray-500">Claim Limit</p>
                    <p className="text-sm font-medium text-gray-900">{warranty.claimLimit}</p>
                  </div>
                )}
              </div>
              {loadingCoverage ? (
                <p className="text-xs text-gray-400">Loading coverage…</p>
              ) : cardCoverage.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cardCoverage.filter(c => c.stance === 'INCLUDED').length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Covered</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cardCoverage.filter(c => c.stance === 'INCLUDED').map(c => (
                          <span key={c.itemName} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                            <ShieldCheck className="w-3 h-3" /> {c.itemName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cardCoverage.filter(c => c.stance === 'EXCLUDED').length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Excluded</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cardCoverage.filter(c => c.stance === 'EXCLUDED').map(c => (
                          <span key={c.itemName} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                            <ShieldX className="w-3 h-3" /> {c.itemName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
