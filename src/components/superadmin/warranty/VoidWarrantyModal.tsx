import { X, Ban, AlertTriangle } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyCard } from '../../../hooks/useWarranty';

interface VoidWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: WarrantyCard | null;
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  voidReason: Yup.string()
    .required('Reason for voiding is required')
    .min(10, 'Please provide at least 10 characters explaining the reason'),
  confirmText: Yup.string()
    .required('Confirmation text is required')
    .oneOf(['VOID WARRANTY'], 'You must type "VOID WARRANTY" to confirm'),
});

export default function VoidWarrantyModal({ isOpen, onClose, warranty, onSuccess }: VoidWarrantyModalProps) {
  const [loading, setLoading] = useState(false);
  const warrantyHook = useWarranty();

  const formik = useFormik({
    initialValues: {
      voidReason: '',
      confirmText: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!warranty?.id) return;

      setLoading(true);
      try {
        await warrantyHook.voidWarranty(warranty.id, values.voidReason);
        toast.success('Warranty voided successfully');
        onSuccess();
        onClose();
        formik.resetForm();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to void warranty';
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
        <div className="sticky top-0 bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-red-900 flex items-center gap-2">
            <Ban className="w-6 h-6" />
            Void Warranty
          </h2>
          <button onClick={onClose} className="text-red-400 hover:text-red-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Warning Banner */}
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-900">⚠️ CRITICAL ACTION - CANNOT BE UNDONE</h3>
                  <p className="text-sm text-red-800 mt-1">
                    Voiding this warranty will permanently invalidate it. This action cannot be reversed. 
                    The customer will lose all warranty benefits and will not be able to file claims.
                  </p>
                </div>
              </div>
            </div>

            {/* Warranty Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Warranty to be Voided</p>
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
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {warranty.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expiry Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(warranty.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Common Reasons */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Common Reasons for Voiding</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Fraudulent warranty registration</li>
                <li>Product returned/refunded</li>
                <li>Customer breach of warranty terms</li>
                <li>Unauthorized modifications to product</li>
                <li>Product sold to third party (use Transfer instead)</li>
                <li>Duplicate warranty registration</li>
              </ul>
            </div>

            {/* Void Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Voiding <span className="text-red-500">*</span>
              </label>
              <textarea
                {...formik.getFieldProps('voidReason')}
                rows={5}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  formik.touched.voidReason && formik.errors.voidReason ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Provide a detailed explanation for voiding this warranty. This will be recorded permanently in the system."
              />
              {formik.touched.voidReason && formik.errors.voidReason && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.voidReason}</p>
              )}
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <code className="bg-gray-200 px-2 py-1 rounded text-red-600 font-bold">VOID WARRANTY</code> to confirm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...formik.getFieldProps('confirmText')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  formik.touched.confirmText && formik.errors.confirmText ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Type VOID WARRANTY"
                autoComplete="off"
              />
              {formik.touched.confirmText && formik.errors.confirmText && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.confirmText}</p>
              )}
            </div>

            {/* Final Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 mb-2">What happens when you void this warranty?</p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>Warranty status will be changed to "VOIDED"</li>
                <li>Customer cannot file new claims</li>
                <li>Existing claims may be affected (review separately)</li>
                <li>This action is permanent and cannot be undone</li>
                <li>Complete audit trail will be maintained</li>
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={loading || formik.values.confirmText !== 'VOID WARRANTY'}
            >
              <Ban className="w-4 h-4" />
              {loading ? 'Voiding Warranty...' : 'Void Warranty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
