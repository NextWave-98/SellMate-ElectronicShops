import { X, Users } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useWarranty, { type WarrantyClaim } from '../../../hooks/useWarranty';

interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: WarrantyClaim | null;
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  technicianId: Yup.string()
    .required('Technician selection is required'),
});

export default function AssignTechnicianModal({ isOpen, onClose, claim, onSuccess }: AssignTechnicianModalProps) {
  const [loading, setLoading] = useState(false);
  const warrantyHook = useWarranty();

  // TODO: Fetch actual technicians list from API
  const technicians = [
    { id: '1', name: 'John Doe', specialization: 'Mobile Repairs' },
    { id: '2', name: 'Jane Smith', specialization: 'Computer Repairs' },
    { id: '3', name: 'Mike Johnson', specialization: 'Electronics' },
    { id: '4', name: 'Sarah Williams', specialization: 'General Repairs' },
  ];

  const formik = useFormik({
    initialValues: {
      technicianId: claim?.assignedToId || '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      if (!claim?.id) return;

      setLoading(true);
      try {
        await warrantyHook.assignClaim(claim.id, values.technicianId);
        toast.success('Claim assigned to technician successfully');
        onSuccess();
        onClose();
        formik.resetForm();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to assign technician';
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
          <h2 className="text-xl font-semibold text-gray-900">Assign Technician</h2>
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
                  <p className="text-xs text-gray-500">Issue Type</p>
                  <p className="text-sm font-medium text-gray-900">{claim.issueType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Priority</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    claim.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    claim.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    claim.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {claim.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Issue Description */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Issue Description</p>
              <p className="text-sm text-gray-900">{claim.issueDescription}</p>
            </div>

            {/* Current Assignment */}
            {claim.assignedToId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Currently Assigned To:</strong> Technician ID {claim.assignedToId}
                </p>
              </div>
            )}

            {/* Technician Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Select Technician <span className="text-red-500">*</span>
              </label>
              <select
                {...formik.getFieldProps('technicianId')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                  formik.touched.technicianId && formik.errors.technicianId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">-- Select a Technician --</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} - {tech.specialization}
                  </option>
                ))}
              </select>
              {formik.touched.technicianId && formik.errors.technicianId && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.technicianId}</p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Technician will be notified about the assignment</li>
                <li>Claim status may automatically update to "IN_PROGRESS"</li>
                <li>Technician can view full claim details and warranty info</li>
                <li>You can reassign to a different technician if needed</li>
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
              <Users className="w-4 h-4" />
              {loading ? 'Assigning...' : 'Assign Technician'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
