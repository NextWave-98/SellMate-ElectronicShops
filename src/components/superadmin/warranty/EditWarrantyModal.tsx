import { X } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyCard } from '../../../hooks/useWarranty';

interface EditWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: WarrantyCard | null;
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  warrantyType: Yup.string().required('Warranty type is required'),
  warrantyMonths: Yup.number()
    .required('Duration is required')
    .min(1, 'Duration must be at least 1 month')
    .max(120, 'Duration cannot exceed 120 months'),
  coverage: Yup.string(),
  terms: Yup.string(),
  exclusions: Yup.string(),
  notes: Yup.string(),
});

export default function EditWarrantyModal({ isOpen, onClose, warranty, onSuccess }: EditWarrantyModalProps) {
  const [loading, setLoading] = useState(false);
  const warrantyHook = useWarranty();

  const formik = useFormik({
    initialValues: {
      warrantyType: warranty?.warrantyType || 'STANDARD',
      warrantyMonths: warranty?.warrantyMonths || 12,
      coverage: warranty?.coverage || '',
      terms: warranty?.terms || '',
      exclusions: warranty?.exclusions || '',
      notes: warranty?.notes || '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      if (!warranty?.id) return;

      setLoading(true);
      try {
        await warrantyHook.updateWarrantyCard(warranty.id, {
          warrantyType: values.warrantyType as WarrantyCard['warrantyType'],
          warrantyMonths: values.warrantyMonths,
          coverage: values.coverage || undefined,
          terms: values.terms || undefined,
          exclusions: values.exclusions || undefined,
          notes: values.notes || undefined,
        });

        toast.success('Warranty updated successfully');
        onSuccess();
        onClose();
        formik.resetForm();
      } catch (error: any) {
        toast.error(error.message || 'Failed to update warranty');
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
          <h2 className="text-xl font-semibold text-gray-900">Edit Warranty</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Warranty Info (Read-only) */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Warranty Number</p>
              <p className="text-lg font-semibold text-gray-900">{warranty.warrantyNumber}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.productName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.customerName}</p>
                </div>
              </div>
            </div>

            {/* Warranty Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warranty Type <span className="text-red-500">*</span>
              </label>
              <select
                {...formik.getFieldProps('warrantyType')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.warrantyType && formik.errors.warrantyType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="STANDARD">Standard</option>
                <option value="EXTENDED">Extended</option>
                <option value="LIMITED">Limited</option>
                <option value="LIFETIME">Lifetime</option>
                <option value="SERVICE">Service Warranty</option>
                <option value="NO_WARRANTY">No Warranty</option>
              </select>
              {formik.touched.warrantyType && formik.errors.warrantyType && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.warrantyType}</p>
              )}
            </div>

            {/* Warranty Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Months) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...formik.getFieldProps('warrantyMonths')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.warrantyMonths && formik.errors.warrantyMonths ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="12"
              />
              {formik.touched.warrantyMonths && formik.errors.warrantyMonths && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.warrantyMonths}</p>
              )}
            </div>

            {/* Coverage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coverage Details
              </label>
              <textarea
                {...formik.getFieldProps('coverage')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="Describe what is covered under this warranty..."
              />
            </div>

            {/* Terms & Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                {...formik.getFieldProps('terms')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="Enter warranty terms and conditions..."
              />
            </div>

            {/* Exclusions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exclusions
              </label>
              <textarea
                {...formik.getFieldProps('exclusions')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="List what is NOT covered..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internal Notes
              </label>
              <textarea
                {...formik.getFieldProps('notes')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="Add any internal notes..."
              />
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
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Warranty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
