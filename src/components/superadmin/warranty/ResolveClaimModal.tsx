import { X, ClipboardCheck, DollarSign } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyClaim } from '../../../hooks/useWarranty';
import useJobSheet, { type JobSheet } from '../../../hooks/useJobSheet';

interface ResolveClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: WarrantyClaim | null;
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  resolutionType: Yup.string().required('Resolution type is required'),
  resolutionNotes: Yup.string()
    .required('Resolution notes are required')
    .min(10, 'Please provide at least 10 characters'),
  actualCost: Yup.number()
    .min(0, 'Cost must be positive')
    .nullable(),
  customerCharge: Yup.number()
    .min(0, 'Charge must be positive')
    .nullable(),
  replacementProductId: Yup.string(),
  jobSheetId: Yup.string(),
});

export default function ResolveClaimModal({ isOpen, onClose, claim, onSuccess }: ResolveClaimModalProps) {
  const [loading, setLoading] = useState(false);
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([]);
  const [loadingJobSheets, setLoadingJobSheets] = useState(false);
  const warrantyHook = useWarranty();
  const { getJobSheets } = useJobSheet();
  const getJobSheetsRef = useRef(getJobSheets);
  getJobSheetsRef.current = getJobSheets;
  const loadedJobSheetsForClaimRef = useRef<string | null>(null);

  const loadJobSheets = useCallback(async (locationId: string, claimId: string) => {
    if (loadedJobSheetsForClaimRef.current === claimId) return;

    setLoadingJobSheets(true);
    try {
      const response = await getJobSheetsRef.current({
        limit: 50,
        locationId,
        status: 'IN_PROGRESS',
      });
      const data = response?.data as { jobSheets?: JobSheet[]; data?: JobSheet[] } | JobSheet[] | undefined;
      const sheets = Array.isArray(data)
        ? data
        : data?.jobSheets ?? data?.data ?? [];
      setJobSheets(sheets);
      loadedJobSheetsForClaimRef.current = claimId;
    } catch {
      setJobSheets([]);
    } finally {
      setLoadingJobSheets(false);
    }
  }, []);

  const formik = useFormik({
    initialValues: {
      resolutionType: 'REPAIRED',
      resolutionNotes: '',
      actualCost: '',
      customerCharge: '',
      replacementProductId: '',
      jobSheetId: '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      if (!claim?.id) return;

      setLoading(true);
      try {
        const resolutionData = {
          resolutionType: values.resolutionType as 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'STORE_CREDIT' | 'REJECTED',
          resolutionNotes: values.resolutionNotes,
          actualCost: values.actualCost ? parseFloat(values.actualCost) : undefined,
          customerCharge: values.customerCharge ? parseFloat(values.customerCharge) : undefined,
          replacementProductId: values.replacementProductId || undefined,
          jobSheetId: values.jobSheetId || undefined,
        };

        await warrantyHook.resolveClaim(claim.id, resolutionData);
        toast.success('Claim resolved successfully');
        loadedJobSheetsForClaimRef.current = null;
        setJobSheets([]);
        onSuccess();
        onClose();
        formik.resetForm();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to resolve claim';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleResolutionTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextType = event.target.value;
      formik.setFieldValue('resolutionType', nextType);

      if (nextType === 'REPAIRED' && claim?.locationId && claim?.id) {
        void loadJobSheets(claim.locationId, claim.id);
        return;
      }

      setJobSheets([]);
      formik.setFieldValue('jobSheetId', '');
      loadedJobSheetsForClaimRef.current = null;
    },
    [claim?.id, claim?.locationId, loadJobSheets, formik.setFieldValue]
  );

  const handleJobSheetSelectFocus = useCallback(() => {
    if (claim?.locationId && claim?.id) {
      void loadJobSheets(claim.locationId, claim.id);
    }
  }, [claim?.id, claim?.locationId, loadJobSheets]);

  const handleClose = useCallback(() => {
    loadedJobSheetsForClaimRef.current = null;
    setJobSheets([]);
    onClose();
  }, [onClose]);

  if (!isOpen || !claim) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-green-50 border-b border-green-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-green-600" />
            Resolve Claim
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-xs text-orange-600 mb-1">Claim Number</p>
              <p className="text-lg font-semibold text-gray-900">{claim.claimNumber}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Issue Type</p>
                  <p className="text-sm font-medium text-gray-900">{claim.issueType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Status</p>
                  <p className="text-sm font-medium text-gray-900">{claim.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Type <span className="text-red-500">*</span>
              </label>
              <select
                name="resolutionType"
                value={formik.values.resolutionType}
                onChange={handleResolutionTypeChange}
                onBlur={formik.handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  formik.touched.resolutionType && formik.errors.resolutionType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="REPAIRED">Repaired - Product fixed successfully</option>
                <option value="REPLACED">Replaced - Product replaced with new one</option>
                <option value="REFUNDED">Refunded - Money refunded to customer</option>
                <option value="STORE_CREDIT">Store Credit - Issued store credit</option>
                <option value="REJECTED">Rejected - Claim not valid</option>
              </select>
              {formik.touched.resolutionType && formik.errors.resolutionType && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.resolutionType}</p>
              )}
            </div>

            {formik.values.resolutionType === 'REPAIRED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Job Sheet (Optional)
                </label>
                <select
                  {...formik.getFieldProps('jobSheetId')}
                  onFocus={handleJobSheetSelectFocus}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loadingJobSheets}
                >
                  <option value="">No job sheet linked</option>
                  {jobSheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.jobNumber}   {sheet.device?.brand} {sheet.device?.model} ({sheet.status})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {loadingJobSheets
                    ? 'Loading job sheets...'
                    : 'Link an in-progress repair job sheet to this warranty resolution'}
                </p>
              </div>
            )}

            {formik.values.resolutionType === 'REPLACED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Replacement Product ID
                </label>
                <input
                  type="text"
                  {...formik.getFieldProps('replacementProductId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter the ID of the replacement product"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                {...formik.getFieldProps('resolutionNotes')}
                rows={5}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  formik.touched.resolutionNotes && formik.errors.resolutionNotes ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe what was done to resolve this claim (parts replaced, repairs performed, reason for rejection, etc.)"
              />
              {formik.touched.resolutionNotes && formik.errors.resolutionNotes && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.resolutionNotes}</p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                Cost Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {claim.estimatedCost !== null && claim.estimatedCost !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Estimated Cost (LKR)</p>
                    <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {claim.estimatedCost.toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Actual Cost (LKR)
                  </label>
                  <input
                    type="number"
                    {...formik.getFieldProps('actualCost')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      formik.touched.actualCost && formik.errors.actualCost ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="5000"
                    step="0.01"
                  />
                  {formik.touched.actualCost && formik.errors.actualCost && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.actualCost}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Customer Charge (LKR)
                  </label>
                  <input
                    type="number"
                    {...formik.getFieldProps('customerCharge')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      formik.touched.customerCharge && formik.errors.customerCharge ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                    step="0.01"
                  />
                  {formik.touched.customerCharge && formik.errors.customerCharge && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.customerCharge}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Leave 0 if fully covered by warranty</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">What happens when you resolve this claim?</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Claim status will be changed to &quot;COMPLETED&quot;</li>
                <li>Customer will be notified of the resolution</li>
                <li>Resolution details will be recorded permanently</li>
                <li>Warranty card status may be updated</li>
                <li>This claim cannot be reopened after resolution</li>
              </ul>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <ClipboardCheck className="w-4 h-4" />
              {loading ? 'Resolving...' : 'Resolve Claim'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
