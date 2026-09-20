/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Edit3, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useJobSheet, { type UpdateJobSheetData } from '../../../hooks/useJobSheet';
import { useStaff } from '../../../hooks/useStaff';
import type { JobSheet } from '../../../types/jobsheet.types';

interface EditJobSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateJobSheetData) => Promise<void>;
  jobSheet: JobSheet;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: 'text-gray-600' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'text-orange-600' },
  { value: 'WAITING_PARTS', label: 'Waiting for Parts', color: 'text-orange-600' },
  { value: 'WAITING_APPROVAL', label: 'Waiting for Customer Approval', color: 'text-amber-600' },
  { value: 'QUALITY_CHECK', label: 'Quality Check', color: 'text-purple-600' },
  { value: 'COMPLETED', label: 'Completed', color: 'text-green-600' },
  { value: 'READY_DELIVERY', label: 'Ready for Delivery', color: 'text-teal-600' },
  { value: 'DELIVERED', label: 'Delivered', color: 'text-emerald-600' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'text-red-600' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'text-yellow-600' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'text-gray-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-orange-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600' },
];

export default function EditJobSheetModal({
  isOpen,
  onClose,
  onSubmit,
  jobSheet,
}: EditJobSheetModalProps) {
  const { getAllStaff } = useStaff();
  const [staffOptions, setStaffOptions] = useState<Array<{ userId: string; name: string; roleName: string }>>([]);
  const [formData, setFormData] = useState<UpdateJobSheetData>({
    issueDescription: '',
    diagnosisNotes: '',
    repairNotes: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    assignedToId: null,
    labourCost: 0,
    partsCost: 0,
    discountAmount: 0,
    warrantyPeriod: 0,
    expectedCompletionDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (isOpen && jobSheet) {
      const labourCost = typeof jobSheet.labourCost === 'string'
        ? parseFloat(jobSheet.labourCost)
        : (jobSheet.labourCost || 0);

      const partsCost = typeof jobSheet.partsCost === 'string'
        ? parseFloat(jobSheet.partsCost)
        : (jobSheet.partsCost || 0);

      const discountAmount = typeof jobSheet.discountAmount === 'string'
        ? parseFloat(jobSheet.discountAmount)
        : (jobSheet.discountAmount || 0);

      // Handle expectedDate field (API returns expectedDate, not expectedCompletionDate)
      const expectedDate = (jobSheet as any).expectedDate || jobSheet.expectedCompletionDate || '';
      const formattedDate = expectedDate ? expectedDate.split('T')[0] : '';

      setFormData({
        issueDescription: jobSheet.issueDescription || '',
        diagnosisNotes: jobSheet.diagnosisNotes || '',
        repairNotes: jobSheet.repairNotes || '',
        status: jobSheet.status?.toUpperCase() as any || 'PENDING',
        priority: jobSheet.priority?.toUpperCase() as any || 'MEDIUM',
        assignedToId: jobSheet.assignedToId || null,
        labourCost,
        partsCost,
        discountAmount,
        warrantyPeriod: jobSheet.warrantyPeriod || 0,
        expectedCompletionDate: formattedDate,
      });

      const locationId = jobSheet.locationId || (jobSheet as any).location?.id;
      if (locationId) {
        getAllStaff(1, 100, { branchId: locationId, isActive: true })
          .then((response) => {
            const staffList = (response as { staff?: Array<{ user: { id: string; name: string; role?: { name: string } } }> })?.staff ?? [];
            setStaffOptions(
              staffList.map((member) => ({
                userId: member.user.id,
                name: member.user.name,
                roleName: member.user.role?.name ?? 'Staff',
              }))
            );
          })
          .catch(() => setStaffOptions([]));
      }
    }
  }, [isOpen, jobSheet, getAllStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.issueDescription || formData.issueDescription.length < 10) {
      alert('Issue description must be at least 10 characters');
      return;
    }

    setLoading(true);

    try {
      // Prepare data: omit expectedCompletionDate if empty
      const submitData = {
        ...formData,
        expectedCompletionDate: formData.expectedCompletionDate || undefined,
      };
      await onSubmit(jobSheet.id.toString(), submitData);
     
    } catch (error) {
      console.error('Failed to update job sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'assignedToId' ? (value || null) : (value || ''),
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value) || 0,
    }));
  };

  const handleAIEnhance = async (field: 'diagnosisNotes' | 'repairNotes') => {
    setAiLoading(true);
    try {
      // Simulate AI enhancement
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const currentText = formData[field] || '';
      const issueDescription = formData.issueDescription || jobSheet.issueDescription || '';
      
      let enhancedText = currentText;
      
      if (field === 'diagnosisNotes') {
        // AI-enhanced diagnosis suggestions based on issue
        const suggestions = [
          `Initial Diagnosis: ${issueDescription}`,
          `Components Checked: Display, Battery, Charging Port, Logic Board`,
          `Test Results: Performed visual inspection and functional testing`,
          `Recommended Solution: ${currentText || 'Component replacement or repair required'}`,
          `Estimated Repair Time: 2-3 business days`,
        ];
        enhancedText = suggestions.join('\n');
      } else if (field === 'repairNotes') {
        // AI-enhanced repair notes
        const repairSteps = [
          `Repair Process for: ${issueDescription}`,
          `Steps Completed:`,
          `1. Device disassembly and initial inspection`,
          `2. Identified faulty components`,
          `3. ${currentText || 'Component replacement performed'}`,
          `4. Reassembly and testing`,
          `5. Quality check passed`,
          `Parts Used: To be specified`,
          `Final Status: Repair completed successfully`,
        ];
        enhancedText = repairSteps.join('\n');
      }
      
      setFormData((prev) => ({
        ...prev,
        [field]: enhancedText,
      }));
    } catch (error) {
      console.error('AI enhancement failed:', error);
      alert('Failed to enhance with AI. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const calculateTotal = () => {
    return (formData.labourCost || 0) + (formData.partsCost || 0) - (formData.discountAmount || 0);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]  ">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 z-10">
          <div className="flex items-center">
            <Edit3 className="w-6 h-6 text-orange-600 mr-2" />
            <div>
              <DialogTitle>Edit Job Sheet</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {jobSheet.jobNumber} - {jobSheet.customerName}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Technician
            </label>
            <select
              name="assignedToId"
              value={formData.assignedToId || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Unassigned</option>
              {staffOptions.map((staff) => (
                <option key={staff.userId} value={staff.userId}>
                  {staff.name} ({staff.roleName})
                </option>
              ))}
            </select>
          </div>

          {/* Issue Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="issueDescription"
              value={formData.issueDescription}
              onChange={handleChange}
              required
              minLength={10}
              rows={3}
              placeholder="Describe the issue with the device..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters required
            </p>
          </div>

          {/* Diagnosis Notes with AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Diagnosis Notes
              </label>
              {/* <button
                type="button"
                onClick={() => handleAIEnhance('diagnosisNotes')}
                disabled={aiLoading}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-gradient-to-r from-purple-600 to-orange-600 text-white rounded-lg hover:from-purple-700 hover:to-orange-700 transition-all disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    AI Enhance
                  </>
                )}
              </button> */}
            </div>
            <textarea
              name="diagnosisNotes"
              value={formData.diagnosisNotes}
              onChange={handleChange}
              rows={4}
              placeholder="Enter diagnosis notes or use AI to generate suggestions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Repair Notes with AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Repair Notes
              </label>
              {/* <button
                type="button"
                onClick={() => handleAIEnhance('repairNotes')}
                disabled={aiLoading}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-gradient-to-r from-purple-600 to-orange-600 text-white rounded-lg hover:from-purple-700 hover:to-orange-700 transition-all disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    AI Enhance
                  </>
                )}
              </button> */}
            </div>
            <textarea
              name="repairNotes"
              value={formData.repairNotes}
              onChange={handleChange}
              rows={4}
              placeholder="Enter repair notes or use AI to generate detailed repair documentation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Financial Summary - Read Only */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount</label>
                <div className="text-lg font-bold text-gray-900">
                  LKR {jobSheet.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paid Amount</label>
                <div className="text-lg font-bold text-green-600">
                  LKR {jobSheet.paidAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Balance Amount</label>
                <div className="text-lg font-bold text-red-600">
                  LKR {jobSheet.balanceAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Cost Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Cost Breakdown</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Labour Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labour Cost (LKR)
                </label>
                <input
                  type="number"
                  name="labourCost"
                  value={formData.labourCost}
                  onChange={handleNumberChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Parts Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parts Cost (LKR)
                </label>
                <input
                  type="number"
                  name="partsCost"
                  value={formData.partsCost}
                  onChange={handleNumberChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warranty Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warranty Period (Days)
              </label>
              <input
                type="number"
                name="warrantyPeriod"
                value={formData.warrantyPeriod}
                onChange={handleNumberChange}
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Expected Completion Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Completion Date
              </label>
              <input
                type="date"
                name="expectedCompletionDate"
                value={formData.expectedCompletionDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || aiLoading}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2" disabled={loading || aiLoading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Updating...</>
              ) : (
                <><Edit3 className="w-4 h-4" />Update Job Sheet</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
