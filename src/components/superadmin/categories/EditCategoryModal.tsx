/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useProductCategory } from '../../../hooks/useProductCategory';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryItem | null;
  onSuccess: () => void;
}

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  displayOrder: number;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Category name is required'),
  description: Yup.string(),
  parentId: Yup.string(),
  displayOrder: Yup.number()
    .min(0, 'Display order must be positive')
    .integer('Display order must be a whole number'),
  isActive: Yup.boolean(),
});

export default function EditCategoryModal({ isOpen, onClose, category, onSuccess }: EditCategoryModalProps) {
  const categoryHook = useProductCategory();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Load parent categories
      const categoryResponse = await categoryHook.getAllCategories({ limit: 100 });
      if (categoryResponse?.data) {
        // Filter out the current category from parent options
        const filtered = (categoryResponse.data as Category[]).filter(
          (cat) => cat.id !== category?.id
        );
        setCategories(filtered);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load parent categories');
    } finally {
      setLoadingData(false);
    }
  }, [categoryHook, category?.id]);

  const formik = useFormik({
    initialValues: {
      name: category?.name || '',
      description: category?.description || '',
      parentId: category?.parentId || '',
      displayOrder: String(category?.displayOrder || 0),
      isActive: category?.isActive ?? true,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!category) return;
      
      setLoading(true);
      try {
        const submitData = {
          id: category.id,
          name: values.name,
          description: values.description || undefined,
          parentId: values.parentId || undefined,
          displayOrder: parseInt(values.displayOrder) || 0,
          isActive: values.isActive,
        };

        const response = await categoryHook.updateCategory(submitData);

        if (response?.success) {
          toast.success('Category updated successfully');
          onSuccess();
          onClose();
        }
      } catch (error) {
        console.error('Error updating category:', error);
        toast.error('Failed to update category');
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    if (isOpen && category) {
      loadInitialData();
    }
  }, [isOpen, category]);

  return (
    <Dialog open={isOpen && !!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {loadingData ? (
            <div className="py-12 text-center text-gray-600">Loading data...</div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    placeholder="Enter category name"
                  />
                  {formik.touched.name && formik.errors.name && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    placeholder="Enter category description"
                  />
                </div>

                {/* Parent Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    name="parentId"
                    value={formik.values.parentId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  >
                    <option value="">None (Root Category)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to create a root category
                  </p>
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="displayOrder"
                    min="0"
                    value={formik.values.displayOrder}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    placeholder="0"
                  />
                  {formik.touched.displayOrder && formik.errors.displayOrder && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.displayOrder}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Lower numbers appear first in the list
                  </p>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formik.values.isActive}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-400 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Category'}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
