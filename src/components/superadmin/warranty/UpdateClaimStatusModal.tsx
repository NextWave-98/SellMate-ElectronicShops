import { X, Edit } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyClaim } from '../../../hooks/useWarranty';

interface UpdateClaimStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: WarrantyClaim | null;
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  status: Yup.string().required('Status is required'),
  notes: Yup.string(),
});

export default function UpdateClaimStatusModal({ isOpen, onClose, claim, onSuccess }: UpdateClaimStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const warrantyHook = useWarranty();

  const formik = useFormik({
    initialValues: {
      status: claim?.status || 'SUBMITTED',
      notes: '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      if (!claim?.id) return;

      setLoading(true);
      try {
        await warrantyHook.updateClaimStatus(claim.id, values.status, values.notes || undefined);
        toast.success('Claim status updated successfully');
        onSuccess();
        onClose();
        formik.resetForm();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update claim status';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !claim) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-900">Update Claim Status</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Claim Info */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-xs text-orange-600 mb-1">Claim Number</p>
              <p className="text-lg font-semibold text-gray-900">{claim.claimNumber}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Current Status</p>
                  <p className="text-sm font-medium text-gray-900">{claim.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Priority</p>
                  <p className="text-sm font-medium text-gray-900">{claim.priority}</p>
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                {...formik.getFieldProps('status')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.status && formik.errors.status ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="SUBMITTED">Submitted - Initial submission</option>
                <option value="UNDER_REVIEW">Under Review - Being evaluated</option>
                <option value="APPROVED">Approved - Claim accepted</option>
                <option value="REJECTED">Rejected - Claim denied</option>
                <option value="IN_PROGRESS">In Progress - Being worked on</option>
                <option value="COMPLETED">Completed - Finished</option>
                <option value="CANCELLED">Cancelled - Customer cancelled</option>
              </select>
              {formik.touched.status && formik.errors.status && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.status}</p>
              )}
            </div>

            {/* Status Update Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Notes (Optional)
              </label>
              <textarea
                {...formik.getFieldProps('notes')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="Add notes about this status change (e.g., reason for rejection, next steps, etc.)"
              />
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Status Guidelines</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li><strong>Submitted:</strong> Initial state when claim is created</li>
                <li><strong>Under Review:</strong> Team is evaluating the claim</li>
                <li><strong>Approved:</strong> Claim is valid and will be processed</li>
                <li><strong>In Progress:</strong> Actively working on repair/replacement</li>
                <li><strong>Completed:</strong> Issue fully resolved</li>
                <li><strong>Rejected:</strong> Claim not covered or invalid</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <Edit className="w-4 h-4" />
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
