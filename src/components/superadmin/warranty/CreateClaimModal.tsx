import { X, ClipboardCheck, AlertCircle, Package, ShieldCheck, ShieldX, Info } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyCard, type ClaimEligibility } from '../../../hooks/useWarranty';

interface CreateClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: WarrantyCard | null;
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  issueDescription: Yup.string()
    .required('Issue description is required')
    .min(10, 'Please provide at least 10 characters describing the issue'),
  issueType: Yup.string().required('Issue type is required'),
  priority: Yup.string().required('Priority is required'),
  estimatedCost: Yup.number()
    .min(0, 'Cost must be positive')
    .nullable(),
  notes: Yup.string(),
});

export default function CreateClaimModal({ isOpen, onClose, warranty, onSuccess }: CreateClaimModalProps) {
  const [loading, setLoading] = useState(false);
  const warrantyHook = useWarranty();
  const { getClaimEligibility } = warrantyHook;

  // Eligibility   advisory only. It tells whoever is filing the claim what
  // should be covered, whether the DOA window is still open, and how many
  // claims are left; it never blocks the form. The final call stays with
  // the person filing it, same as everywhere else this system offers guidance.
  const [eligibility, setEligibility] = useState<ClaimEligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  useEffect(() => {
    if (!isOpen || !warranty?.id) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingEligibility(true);
      const res = await getClaimEligibility(warranty.id);
      if (!cancelled && res?.data) setEligibility(res.data as ClaimEligibility);
      setLoadingEligibility(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, warranty?.id]);

  const formik = useFormik({
    initialValues: {
      issueDescription: '',
      issueType: 'DEFECT',
      priority: 'MEDIUM',
      estimatedCost: '',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!warranty?.id || !warranty?.locationId) {
        toast.error('Invalid warranty information');
        return;
      }

      setLoading(true);
      try {
        const claimData = {
          warrantyCardId: warranty.id,
          issueDescription: values.issueDescription,
          issueType: values.issueType,
          priority: values.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
          locationId: warranty.locationId,
          estimatedCost: values.estimatedCost ? parseFloat(values.estimatedCost) : undefined,
          notes: values.notes || undefined,
        };

        await warrantyHook.createClaim(claimData);
        toast.success('Warranty claim created successfully');
        onSuccess();
        onClose();
        formik.resetForm();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create claim';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !warranty) return null;

  // Check if warranty is active
  const isWarrantyActive = warranty.status === 'ACTIVE';
  const isWarrantyExpired = warranty.status === 'EXPIRED';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Warranty Claim</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Warranty Info */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-xs text-orange-600 mb-1">Warranty Details</p>
              <p className="text-lg font-semibold text-gray-900">{warranty.warrantyNumber}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <Package className="w-3 h-3 mr-1" />
                    {warranty.productName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium text-gray-900">{warranty.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    isWarrantyActive ? 'bg-green-100 text-green-800' : 
                    isWarrantyExpired ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
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

            {/* Eligibility   advisory guidance, never a gate */}
            {loadingEligibility ? (
              <p className="text-xs text-gray-400">Checking coverage…</p>
            ) : eligibility && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-900">{eligibility.summary}</p>
                </div>

                {(eligibility.covered.length > 0 || eligibility.excluded.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eligibility.covered.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Covered</p>
                        <div className="flex flex-wrap gap-1.5">
                          {eligibility.covered.map(name => (
                            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                              <ShieldCheck className="w-3 h-3" /> {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {eligibility.excluded.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Excluded</p>
                        <div className="flex flex-wrap gap-1.5">
                          {eligibility.excluded.map(name => (
                            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                              <ShieldX className="w-3 h-3" /> {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 pt-1 border-t border-blue-100">
                  {eligibility.doa.days != null && (
                    <span>
                      DOA: {eligibility.doa.withinWindow ? 'within window' : 'window passed'}
                      {eligibility.doa.daysRemaining != null && ` (${eligibility.doa.daysRemaining} day(s) remaining)`}
                    </span>
                  )}
                  {eligibility.claims.limit != null && (
                    <span>
                      Claims: {eligibility.claims.used} used, {eligibility.claims.remaining} of {eligibility.claims.limit} remaining
                    </span>
                  )}
                  {eligibility.provider && <span>Provider: {eligibility.provider}</span>}
                </div>
              </div>
            )}

            {/* Warning for non-active warranties */}
            {!isWarrantyActive && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    {isWarrantyExpired ? 'Warranty Expired' : 'Warranty Not Active'}
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    {isWarrantyExpired 
                      ? 'This warranty has expired. The claim may not be covered under standard terms.'
                      : 'This warranty is not currently active. Please verify the warranty status before proceeding.'}
                  </p>
                </div>
              </div>
            )}

            {/* Issue Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <select
                {...formik.getFieldProps('issueType')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.issueType && formik.errors.issueType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="DEFECT">Manufacturing Defect</option>
                <option value="MALFUNCTION">Malfunction</option>
                <option value="DAMAGE">Physical Damage</option>
                <option value="PERFORMANCE">Performance Issue</option>
                <option value="SOFTWARE">Software Issue</option>
                <option value="BATTERY">Battery Issue</option>
                <option value="DISPLAY">Display Issue</option>
                <option value="AUDIO">Audio Issue</option>
                <option value="CONNECTIVITY">Connectivity Issue</option>
                <option value="OTHER">Other</option>
              </select>
              {formik.touched.issueType && formik.errors.issueType && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.issueType}</p>
              )}
            </div>

            {/* Issue Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description <span className="text-red-500">*</span>
              </label>
              <textarea
                {...formik.getFieldProps('issueDescription')}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.issueDescription && formik.errors.issueDescription ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe the issue in detail (symptoms, when it started, frequency, etc.)"
              />
              {formik.touched.issueDescription && formik.errors.issueDescription && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.issueDescription}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                {...formik.getFieldProps('priority')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.priority && formik.errors.priority ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="LOW">Low - Minor issue, doesn't affect usage</option>
                <option value="MEDIUM">Medium - Affects some functionality</option>
                <option value="HIGH">High - Significant impact on usage</option>
                <option value="URGENT">Urgent - Device is unusable</option>
              </select>
              {formik.touched.priority && formik.errors.priority && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.priority}</p>
              )}
            </div>

            {/* Estimated Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Repair Cost (LKR) (Optional)
              </label>
              <input
                type="number"
                {...formik.getFieldProps('estimatedCost')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.estimatedCost && formik.errors.estimatedCost ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="5000"
                step="0.01"
              />
              {formik.touched.estimatedCost && formik.errors.estimatedCost && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.estimatedCost}</p>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                {...formik.getFieldProps('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="Any additional information that might be helpful..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <ClipboardCheck className="w-4 h-4 mr-2 text-orange-600" />
                What happens next?
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Claim will be submitted for review</li>
                <li>You'll receive a claim number for tracking</li>
                <li>Our team will assess the issue within 24-48 hours</li>
                <li>Customer will be notified of claim status updates</li>
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
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <ClipboardCheck className="w-4 h-4" />
              {loading ? 'Creating Claim...' : 'Create Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
