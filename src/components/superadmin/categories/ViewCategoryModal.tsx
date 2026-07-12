import { Tag, FolderTree, Hash, Calendar, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ViewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryItem | null;
}

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: {
    name: string;
  };
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ViewCategoryModal({ isOpen, onClose, category }: ViewCategoryModalProps) {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen && !!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Category Details</DialogTitle>
        </DialogHeader>

        {category && <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {category.isActive ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <XCircle className="w-3 h-3 mr-1" />
                Inactive
              </span>
            )}
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <Tag className="w-4 h-4 mr-2" />
                Category Name
              </div>
              <p className="text-lg font-semibold text-gray-900">{category.name}</p>
            </div>

            {category.description && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <p className="text-gray-900">{category.description}</p>
              </div>
            )}

            {category.parent && (
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <FolderTree className="w-4 h-4 mr-2" />
                  Parent Category
                </div>
                <p className="text-gray-900">{category.parent.name}</p>
              </div>
            )}

            <div>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <Hash className="w-4 h-4 mr-2" />
                Display Order
              </div>
              <p className="text-gray-900">{category.displayOrder}</p>
            </div>

            {category.productCount !== undefined && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Products in Category</div>
                <p className="text-gray-900">{category.productCount} products</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Created At
                </div>
                <p className="text-sm text-gray-900">{formatDate(category.createdAt)}</p>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Updated At
                </div>
                <p className="text-sm text-gray-900">{formatDate(category.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* ID */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Category ID</div>
            <p className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded break-all">
              {category.id}
            </p>
          </div>
        </div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
