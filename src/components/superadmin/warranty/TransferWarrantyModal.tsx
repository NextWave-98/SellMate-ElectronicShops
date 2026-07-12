import { X, Users, Phone } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyCard } from '../../../hooks/useWarranty';

interface TransferWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: WarrantyCard | null;
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  transferredTo: Yup.string()
    .required('New owner name is required')
    .min(2, 'Name must be at least 2 characters'),
  transferredPhone: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  transferNotes: Yup.string(),
});

export default function TransferWarrantyModal({ isOpen, onClose, warranty, onSuccess }: TransferWarrantyModalProps) {
  const [loading, setLoading] = useState(false);
  const warrantyHook = useWarranty();

  const formik = useFormik({
    initialValues: {
      transferredTo: '',
      transferredPhone: '',
      transferNotes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!warranty?.id) return;

      setLoading(true);
      try {
        await warrantyHook.transferWarranty(warranty.id, values);
        toast.success('Warranty transferred successfully');
        onSuccess();
        onClose();
        formik.resetForm();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to transfer warranty';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !warranty) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Transfer Warranty Ownership</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Current Warranty Info */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-xs text-orange-600 mb-1">Current Warranty</p>
              <p className="text-lg font-semibold text-gray-900">{warranty.warrantyNumber}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.productName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Owner</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.customerName}</p>
                </div>
              </div>
            </div>

            {/* Warning Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Transferring warranty ownership cannot be undone. The new owner will have full rights to this warranty.
              </p>
            </div>

            {/* New Owner Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                New Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...formik.getFieldProps('transferredTo')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.transferredTo && formik.errors.transferredTo ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter new owner's full name"
              />
              {formik.touched.transferredTo && formik.errors.transferredTo && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.transferredTo}</p>
              )}
            </div>

            {/* New Owner Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                New Owner Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...formik.getFieldProps('transferredPhone')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.transferredPhone && formik.errors.transferredPhone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0771234567"
                maxLength={10}
              />
              {formik.touched.transferredPhone && formik.errors.transferredPhone && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.transferredPhone}</p>
              )}
            </div>

            {/* Transfer Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Notes (Optional)
              </label>
              <textarea
                {...formik.getFieldProps('transferNotes')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="Add any notes about this transfer (e.g., reason for transfer, relationship between parties, etc.)"
              />
            </div>

            {/* Transfer Confirmation */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Warranty ownership will be transferred to the new owner</li>
                <li>Original warranty terms and coverage remain unchanged</li>
                <li>New owner can claim warranty using their contact information</li>
                <li>Transfer history will be recorded in the system</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Transferring...' : 'Transfer Warranty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
