import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, Phone, Mail, Calendar, DollarSign, Package, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useJobSheet from '../../../hooks/useJobSheet';
import type { JobSheet } from '../../../hooks/useJobSheet';
import LoadingSpinner from '../../common/LoadingSpinner';
import JobSheetStatusBadge from './JobSheetStatusBadge';
import JobSheetPriorityBadge from './JobSheetPriorityBadge';
import JobSheetUsagePanel from './JobSheetUsagePanel';
import { JobSheetStatus as FrontendStatus, JobPriority as FrontendPriority } from '../../../types/jobsheet.types';

interface ViewJobSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobSheetId: string;
}

// Convert backend status to frontend status
const convertStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'PENDING': FrontendStatus.PENDING,
    'IN_PROGRESS': FrontendStatus.IN_PROGRESS,
    'WAITING_PARTS': FrontendStatus.WAITING_FOR_PARTS,
    'QUALITY_CHECK': FrontendStatus.IN_PROGRESS,
    'COMPLETED': FrontendStatus.COMPLETED,
    'READY_DELIVERY': FrontendStatus.READY_FOR_PICKUP,
    'DELIVERED': FrontendStatus.COMPLETED,
    'CANCELLED': FrontendStatus.CANCELLED,
    'ON_HOLD': FrontendStatus.ON_HOLD,
  };
  return statusMap[status] || status.toLowerCase();
};

// Convert backend priority to frontend priority
const convertPriority = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    'LOW': FrontendPriority.LOW,
    'MEDIUM': FrontendPriority.MEDIUM,
    'HIGH': FrontendPriority.HIGH,
    'URGENT': FrontendPriority.URGENT,
  };
  return priorityMap[priority] || priority.toLowerCase();
};

export default function ViewJobSheetModal({
  isOpen,
  onClose,
  jobSheetId,
}: ViewJobSheetModalProps) {
  const { getJobSheetById, getJobPayments, getStatusHistory } = useJobSheet();
  const [loading, setLoading] = useState(true);
  const [jobSheet, setJobSheet] = useState<JobSheet | null>(null);
  const [payments, setPayments] = useState<Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    createdAt: string;
  }>>([]);
  const [statusHistory, setStatusHistory] = useState<Array<{
    id: string;
    fromStatus?: string;
    toStatus: string;
    changedAt: string;
    remarks?: string;
  }>>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'usage' | 'payments' | 'history'>('details');
  const usageInventoryLoaderRef = useRef<((force?: boolean) => Promise<void>) | null>(null);

  const openUsageTab = useCallback((section?: 'parts' | 'products') => {
    setActiveTab('usage');
    if (section) setUsageSection(section);
    void usageInventoryLoaderRef.current?.(false);
  }, []);

  const [usageSection, setUsageSection] = useState<'parts' | 'products'>('parts');

  useEffect(() => {
    if (isOpen && jobSheetId) {
      loadJobSheetData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, jobSheetId]);

  const loadJobSheetData = async () => {
    setLoading(true);
    try {
      const [jobResponse, paymentsResponse, historyResponse] = await Promise.all([
        getJobSheetById(jobSheetId),
        getJobPayments(jobSheetId),
        getStatusHistory(jobSheetId),
      ]);

      if (jobResponse?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setJobSheet(jobResponse.data as any);
      }
      if (paymentsResponse?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPayments((paymentsResponse.data as any).payments || []);
      }
      if (historyResponse?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setStatusHistory((historyResponse.data as any).statusHistory || []);
      }
    } catch (error) {
      console.error('Failed to load job sheet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const numAmount = Number(amount) || 0;
    return `LKR ${numAmount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh]  ">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 z-10">
          <div className="flex items-center">
            <Eye className="w-6 h-6 text-orange-600 mr-2" />
            <div>
              <DialogTitle>
                {loading ? 'Loading...' : jobSheet?.jobNumber || 'Job Sheet Details'}
              </DialogTitle>
              {!loading && jobSheet && (
                <div className="flex items-center gap-2 mt-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <JobSheetStatusBadge status={convertStatus(jobSheet.status) as any} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <JobSheetPriorityBadge priority={convertPriority(jobSheet.priority) as any} />
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : jobSheet ? (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 px-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'details'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Job Details
                </button>
                <button
                  onClick={() => openUsageTab('parts')}
                  className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'usage'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Parts &amp; Products ({((jobSheet as any).parts || []).length + ((jobSheet as any).products || []).length})
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'payments'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Payments ({payments.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'history'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Status History
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Customer & Device Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-600">Name</p>
                          <p className="text-sm font-medium text-gray-900">{jobSheet.customer?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <p className="text-sm text-gray-900">{jobSheet.customer?.phone}</p>
                        </div>
                        {jobSheet.customer?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <p className="text-sm text-gray-900">{jobSheet.customer.email}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600">Customer ID</p>
                          <p className="text-sm font-mono text-gray-900">{jobSheet.customer?.customerId}</p>
                        </div>
                      </div>
                    </div>

                    {/* Device */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Device Information</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-600">Device</p>
                          <p className="text-sm font-medium text-gray-900">
                            {jobSheet.device?.brand} {jobSheet.device?.model}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Type</p>
                          <p className="text-sm text-gray-900">{jobSheet.device?.deviceType}</p>
                        </div>
                        {jobSheet.device?.serialNumber && (
                          <div>
                            <p className="text-xs text-gray-600">Serial Number</p>
                            <p className="text-sm font-mono text-gray-900">{jobSheet.device.serialNumber}</p>
                          </div>
                        )}
                        {jobSheet.device?.imei && (
                          <div>
                            <p className="text-xs text-gray-600">IMEI</p>
                            <p className="text-sm font-mono text-gray-900">{jobSheet.device.imei}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Job Information */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Job Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Location</p>
                        <p className="text-sm font-medium text-gray-900">
                          {jobSheet.location?.name || 'N/A'} {(jobSheet.location?.locationCode )|| ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Assigned To</p>
                        <p className="text-sm font-medium text-gray-900">
                          {jobSheet.assignedTo?.name || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Warranty Period</p>
                        <p className="text-sm font-medium text-gray-900">
                          {jobSheet.warrantyPeriod ? `${jobSheet.warrantyPeriod} days` : 'None'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Issue & Notes */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Issue Description
                      </label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {jobSheet.issueDescription}
                        </p>
                      </div>
                    </div>

                    {jobSheet.diagnosisNotes && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Diagnosis Notes
                        </label>
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {jobSheet.diagnosisNotes}
                          </p>
                        </div>
                      </div>
                    )}

                    {jobSheet.repairNotes && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Repair Notes
                        </label>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {jobSheet.repairNotes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-xs text-gray-600">Received</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatDate(jobSheet.receivedDate)}</p>
                    </div>

                    {jobSheet.expectedCompletionDate && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <p className="text-xs text-gray-600">Expected</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(jobSheet.expectedCompletionDate)}
                        </p>
                      </div>
                    )}

                    {jobSheet.completedDate && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-xs text-green-600">Completed</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(jobSheet.completedDate)}
                        </p>
                      </div>
                    )}

                    {jobSheet.deliveredDate && (
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-orange-600" />
                          <p className="text-xs text-orange-600">Delivered</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(jobSheet.deliveredDate)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      Cost Breakdown
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Labour Cost:</span>
                        <span className="font-medium">{formatCurrency(jobSheet.labourCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Parts Cost:</span>
                        <span className="font-medium">{formatCurrency(jobSheet.partsCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(jobSheet.discountAmount)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-2">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-gray-900">Total Amount:</span>
                          <span className="text-gray-900">{formatCurrency(jobSheet.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid Amount:</span>
                        <span className="font-medium text-green-600">{formatCurrency(jobSheet.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Balance Amount:</span>
                        <span className={`font-semibold ${jobSheet.balanceAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(jobSheet.balanceAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Parts &amp; Products on Job
                    </h3>
                    <p className="text-sm text-gray-700">
                      {((jobSheet as any).parts || []).length} part(s), {((jobSheet as any).products || []).length} product(s) assigned.
                    </p>
                    <button
                      type="button"
                      onClick={() => openUsageTab('parts')}
                      className="mt-3 text-sm font-medium text-orange-700 hover:text-orange-800"
                    >
                      Add parts / products →
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'usage' && jobSheet && (
                <JobSheetUsagePanel
                  jobSheetId={jobSheetId}
                  locationId={jobSheet.locationId || (jobSheet as any).location?.id}
                  parts={((jobSheet as any).parts || []) as any[]}
                  products={((jobSheet as any).products || []) as any[]}
                  onUpdated={loadJobSheetData}
                  inventoryLoaderRef={usageInventoryLoaderRef}
                  activeSection={usageSection}
                  onSectionChange={setUsageSection}
                />
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  {payments.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No payments recorded yet</p>
                    </div>
                  ) : (
                    <>
                      {payments.map((payment, index) => (
                        <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900">{payment.paymentNumber}</p>
                              <p className="text-xs text-gray-600">{formatDateTime(payment.createdAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(payment.amount)}
                              </p>
                              <p className="text-xs text-gray-600">{payment.paymentMethod}</p>
                            </div>
                          </div>
                          {payment.reference && (
                            <p className="text-sm text-gray-600">Ref: {payment.reference}</p>
                          )}
                          {payment.notes && (
                            <p className="text-sm text-gray-700 mt-2">{payment.notes}</p>
                          )}
                          {index < payments.length - 1 && (
                            <div className="border-t border-gray-200 mt-4" />
                          )}
                        </div>
                      ))}

                      {/* Payment Summary */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Total Paid:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Remaining Balance:</span>
                          <span className="font-semibold text-orange-600">
                            {formatCurrency(jobSheet.balanceAmount)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Status History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {statusHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No status history available</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                      
                      {statusHistory.map((history) => (
                        <div key={history.id} className="relative pl-12 pb-8 last:pb-0">
                          {/* Timeline Dot */}
                          <div className="absolute left-0 w-8 h-8 bg-white border-2 border-orange-600 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-orange-600 rounded-full" />
                          </div>

                          {/* Content */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              <JobSheetStatusBadge status={convertStatus(history.toStatus) as any} />
                              <p className="text-xs text-gray-600">{formatDateTime(history.changedAt)}</p>
                            </div>
                            {history.remarks && (
                              <p className="text-sm text-gray-700 mt-2">{history.remarks}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Failed to load job sheet details</p>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-10 shrink-0 bg-transparent px-6 py-4 flex justify-end">
          <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
