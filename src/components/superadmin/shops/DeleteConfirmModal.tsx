import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Shop } from '../../../types/shop.types';
import type { Location } from '../../../types/location.types';

type ShopOrLocation = Shop | Location;

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shop: ShopOrLocation | null;
  isDeleting: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  shop,
  isDeleting,
}: DeleteConfirmModalProps) {
  if (!isOpen || !shop) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !isDeleting && onClose()}>
      <DialogContent className="max-w-md p-0  ">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">Delete Branch</DialogTitle>
          </div>
        </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete the branch <strong>"{shop.name}"</strong>?
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action cannot be undone. All data associated with
                this branch will be permanently deleted.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Location Code:</span>
                <span className="font-medium text-gray-900">{'locationCode' in shop ? shop.locationCode : shop.code}</span>
              </div>
              {shop.address && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-gray-900 text-right">{shop.address}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Total Users:</span>
                <span className="font-medium text-gray-900">{shop.users?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Branch'}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
