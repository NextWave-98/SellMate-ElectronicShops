import { FileText, Edit, ClipboardCheck, X, Download, Printer } from 'lucide-react';

interface WarrantyActionsMenuProps {
  selectedCount: number;
  onViewWarranty: () => void;
  onEditWarranty: () => void;
  onCreateClaim: () => void;
  onDownloadPDF: () => void;
  onPrintCard: () => void;
  onClearSelection: () => void;
}

export default function WarrantyActionsMenu({
  selectedCount,
  onViewWarranty,
  onEditWarranty,
  onCreateClaim,
  onDownloadPDF,
  onPrintCard,
  onClearSelection,
}: WarrantyActionsMenuProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-orange-900">
            {selectedCount} {selectedCount === 1 ? 'warranty' : 'warranties'} selected
          </span>
          <div className="flex items-center space-x-2">
            {selectedCount === 1 && (
              <>
                <button
                  onClick={onViewWarranty}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  View Details
                </button>
                <button
                  onClick={onEditWarranty}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <Edit className="w-4 h-4 mr-1.5" />
                  Edit
                </button>
                <button
                  onClick={onCreateClaim}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <ClipboardCheck className="w-4 h-4 mr-1.5" />
                  Create Claim
                </button>
                <button
                  onClick={onDownloadPDF}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </button>
                <button
                  onClick={onPrintCard}
                  className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print
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
