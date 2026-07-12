import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProductCategory } from '../../../hooks/useProductCategory';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryItem | null;
  onSuccess: () => void;
}

interface CategoryItem {
  id: string;
  name: string;
  productCount?: number;
}

export default function DeleteCategoryModal({
  isOpen,
  onClose,
  category,
  onSuccess,
}: DeleteCategoryModalProps) {
  const categoryHook = useProductCategory();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!category) return;

    setLoading(true);
    try {
      const response = await categoryHook.deleteCategory(category.id);

      if (response?.success) {
        toast.success('Category deleted successfully');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const hasProducts = category?.productCount && category.productCount > 0;

  return (
    <Dialog open={isOpen && !!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
        </DialogHeader>

        <div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Are you sure you want to delete this category?
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  You are about to delete the category: <strong>{category?.name}</strong>
                </p>
                {hasProducts && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                    <p className="text-yellow-800 font-medium">
                      ⚠️ Warning: This category contains {category?.productCount} product(s).
                    </p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Deleting this category may affect associated products.
                    </p>
                  </div>
                )}
                <p className="mt-3">This action cannot be undone.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
