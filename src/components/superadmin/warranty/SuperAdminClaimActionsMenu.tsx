import { FileText, Edit, Users, ClipboardCheck, XCircle, X } from 'lucide-react';

interface SuperAdminClaimActionsMenuProps {
  selectedCount: number;
  onViewClaim: () => void;
  onUpdateStatus: () => void;
  onAssignTechnician: () => void;
  onResolveClaim: () => void;
  onRejectClaim: () => void;
  onClearSelection: () => void;
}

export default function SuperAdminClaimActionsMenu({
  selectedCount,
  onViewClaim,
  onUpdateStatus,
  onAssignTechnician,
  onResolveClaim,
  onRejectClaim,
  onClearSelection,
}: SuperAdminClaimActionsMenuProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-orange-900">
            {selectedCount} {selectedCount === 1 ? 'claim' : 'claims'} selected
          </span>
          <div className="flex items-center space-x-2">
            {selectedCount === 1 && (
              <>
                <button
                  onClick={onViewClaim}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  View Details
                </button>
                <button
                  onClick={onUpdateStatus}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <Edit className="w-4 h-4 mr-1.5" />
                  Update Status
                </button>
                <button
                  onClick={onAssignTechnician}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Assign Technician
                </button>
                <button
                  onClick={onResolveClaim}
                  className="inline-flex items-center px-3 py-1.5 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                >
                  <ClipboardCheck className="w-4 h-4 mr-1.5" />
                  Resolve
                </button>
                <button
                  onClick={onRejectClaim}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onClearSelection}
          className="text-orange-600 hover:text-orange-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
