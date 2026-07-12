/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useProductCategory } from '../../../hooks/useProductCategory';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  displayOrder: string;
  isActive: boolean;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Category name is required'),
  description: Yup.string(),
  parentId: Yup.string(),
  displayOrder: Yup.number()
    .min(0, 'Display order must be positive')
    .integer('Display order must be a whole number')
    .default(0),
  isActive: Yup.boolean().default(true),
  subcategories: Yup.array().of(
    Yup.object({
      name: Yup.string().required('Subcategory name is required'),
      description: Yup.string(),
      displayOrder: Yup.number().min(0).default(0),
      isActive: Yup.boolean().default(true),
    })
  ),
});

export default function AddCategoryModal({ isOpen, onClose, onSuccess }: AddCategoryModalProps) {
  const categoryHook = useProductCategory();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Load parent categories
      const categoryResponse = await categoryHook.getAllCategories({ limit: 100 });
      if (categoryResponse?.data) {
        setCategories(categoryResponse.data as Category[]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load sub  categories');
    } finally {
      setLoadingData(false);
    }
  }, [categoryHook]);

  const addSubcategory = () => {
    const newSubcategory: Subcategory = {
      id: Date.now().toString(),
      name: '',
      description: '',
      displayOrder: subcategories.length.toString(),
      isActive: true,
    };
    setSubcategories([...subcategories, newSubcategory]);
  };

  const removeSubcategory = (id: string) => {
    setSubcategories(subcategories.filter(sub => sub.id !== id));
  };

  const updateSubcategory = (id: string, field: keyof Subcategory, value: string | boolean) => {
    setSubcategories(subcategories.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ));
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      parentId: '',
      displayOrder: '0',
      isActive: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const submitData = {
          name: values.name,
          description: values.description || undefined,
          parentId: values.parentId || undefined,
          displayOrder: parseInt(values.displayOrder) || 0,
          isActive: values.isActive,
          subcategories: subcategories.length > 0 ? subcategories.map(sub => ({
            name: sub.name,
            description: sub.description || undefined,
            displayOrder: parseInt(sub.displayOrder) || 0,
            isActive: sub.isActive,
          })) : undefined,
        };

        const response = await categoryHook.createCategory(submitData);

        if (response?.success) {
          toast.success('Category added successfully');
          onSuccess();
          onClose();
          formik.resetForm();
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error adding category:', error);
        toast.error('Failed to add category');
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      formik.resetForm();
      setSubcategories([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]  ">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
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

                {/* Subcategories Section - Only show if no parent is selected */}
                {!formik.values.parentId && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Subcategories</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Add subcategories for this category (optional, can add 0, 1, or more)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addSubcategory}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subcategory
                      </button>
                    </div>

                    {subcategories.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-sm text-gray-500">
                          No subcategories added yet. Click "Add Subcategory" to create one.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {subcategories.map((subcategory, index) => (
                          <div key={subcategory.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-700">
                                Subcategory {index + 1}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeSubcategory(subcategory.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Remove subcategory"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              {/* Subcategory Name */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={subcategory.name}
                                  onChange={(e) => updateSubcategory(subcategory.id, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                                  placeholder="Enter subcategory name"
                                />
                              </div>

                              {/* Subcategory Description */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  rows={2}
                                  value={subcategory.description}
                                  onChange={(e) => updateSubcategory(subcategory.id, 'description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                                  placeholder="Enter subcategory description"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Subcategory Display Order */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Display Order
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={subcategory.displayOrder}
                                    onChange={(e) => updateSubcategory(subcategory.id, 'displayOrder', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                                  />
                                </div>

                                {/* Subcategory Active Status */}
                                <div className="flex items-center pt-6">
                                  <input
                                    type="checkbox"
                                    id={`subcategory-active-${subcategory.id}`}
                                    checked={subcategory.isActive}
                                    onChange={(e) => updateSubcategory(subcategory.id, 'isActive', e.target.checked)}
                                    className="h-4 w-4 text-orange-600 focus:ring-orange-400 border-gray-300 rounded"
                                  />
                                  <label htmlFor={`subcategory-active-${subcategory.id}`} className="ml-2 block text-xs text-gray-700">
                                    Active
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Category'}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
