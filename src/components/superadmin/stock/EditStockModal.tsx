/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { X, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { ProductItem } from '../../../hooks/useProduct';
import { useProduct } from '../../../hooks/useProduct';
import { useProductCategory } from '../../../hooks/useProductCategory';
import { useProductVariantType } from '../../../hooks/useProductVariantType';
import type { ProductVariantType } from '../../../hooks/useProductVariantType';
import LoadingSpinner from '../../common/LoadingSpinner';

interface EditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockItem: ProductItem | null;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Product name is required'),
  description: Yup.string(),
  categoryId: Yup.string(), // Now optional
  brand: Yup.string(),
  model: Yup.string(),
  unitPrice: Yup.number()
    .required('Unit price is required')
    .min(0, 'Unit price must be positive'),
  costPrice: Yup.number()
    .min(0, 'Cost price must be positive'), // Now optional
  minStockLevel: Yup.number()
    .min(0, 'Min stock level must be positive')
    .integer('Min stock level must be a whole number'),
  maxStockLevel: Yup.number()
    .min(0, 'Max stock level must be positive')
    .integer('Max stock level must be a whole number'),
  reorderLevel: Yup.number()
    .min(0, 'Reorder level must be positive')
    .integer('Reorder level must be a whole number'),
  reorderQuantity: Yup.number()
    .min(0, 'Reorder quantity must be positive')
    .integer('Reorder quantity must be a whole number'),
  warrantyMonths: Yup.number()
    .min(0, 'Warranty months must be positive')
    .integer('Warranty months must be a whole number'),
  warrantyType: Yup.string(),
  tags: Yup.string(),
});

export default function EditStockModal({ isOpen, onClose, onSuccess, stockItem }: EditStockModalProps) {
  const productHook = useProduct();
  const categoryHook = useProductCategory();
  const variantTypeHook = useProductVariantType();
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [hasVariantsToggle, setHasVariantsToggle] = useState(false);
  const [selectedVariantTypeIds, setSelectedVariantTypeIds] = useState<string[]>([]);
  const formik=useFormik({
    initialValues: {
      name: '',
      description: '',
      categoryId: '',
      brand: '',
      model: '',
      unitPrice: '',
      costPrice: '',
      minStockLevel: '',
      maxStockLevel: '',
      reorderLevel: '',
      reorderQuantity: '',
      warrantyMonths: '',
      warrantyType: '',
      terms: '',
      coverage: '',
      exclusions: '',
      tags: '', // Comma-separated tags
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!stockItem?.id) {
        toast.error('Product ID is missing');
        return;
      }

      setLoading(true);
      try {
        // Parse tags from comma-separated string
        const tagsArray = values.tags 
          ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
          : undefined;

        const submitData = {
          id: stockItem.id,
          name: values.name,
          description: values.description || undefined,
          categoryId: values.categoryId || undefined,
          brand: values.brand || undefined,
          model: values.model || undefined,
          unitPrice: values.unitPrice ? parseFloat(values.unitPrice) : undefined,
          costPrice: values.costPrice ? parseFloat(values.costPrice) : undefined,
          minStockLevel: values.minStockLevel ? parseInt(values.minStockLevel) : undefined,
          maxStockLevel: values.maxStockLevel ? parseInt(values.maxStockLevel) : undefined,
          reorderLevel: values.reorderLevel ? parseInt(values.reorderLevel) : undefined,
          reorderQuantity: values.reorderQuantity ? parseInt(values.reorderQuantity) : undefined,
          warrantyMonths: values.warrantyMonths ? parseInt(values.warrantyMonths) : undefined,
          warrantyType: values.warrantyType || undefined,
          terms: values.terms || undefined,
          coverage: values.coverage || undefined,
          exclusions: values.exclusions || undefined,
          tags: tagsArray,
          hasVariants: hasVariantsToggle,
          customAttributes: hasVariantsToggle && selectedVariantTypeIds.length > 0
            ? { variantTypeIds: selectedVariantTypeIds }
            : undefined,
        };

        const response = await productHook.updateProduct(submitData);
        
        if (response?.success) {
          toast.success('Product updated successfully');
          if (hasVariantsToggle) {
            toast('Use the "Manage Variants" button on the product to add or update individual variants.', {
              duration: 6000,
              icon: '💡',
            });
          }
          onSuccess();
          onClose();
        }
      } catch (error) {
        console.error('Error updating product:', error);
        toast.error('Failed to update product');
      } finally {
        setLoading(false);
      }
    },
  });

  const loadStockDetails = useCallback(async () => {
    if (!stockItem?.id) return;
    
    setFetchingDetails(true);
    try {
      // Load categories and variant types in parallel
      const [categoryResponse, variantTypesResponse, productResponse] = await Promise.all([
        categoryHook.getAllCategories({ limit: 100 }),
        variantTypeHook.getAllVariantTypes(),
        productHook.getProductById(stockItem.id),
      ]);

      if (categoryResponse?.data) {
        setCategories(categoryResponse.data);
      }
      if (variantTypesResponse?.data) {
        setVariantTypes(variantTypesResponse.data as ProductVariantType[]);
      }

      const data = productResponse?.data;
      if (data) {
        formik.setValues({
          name: data.name || '',
          description: data.description || '',
          categoryId: data.categoryId || '',
          brand: data.brand || '',
          model: data.model || '',
          unitPrice: data.unitPrice?.toString() || '',
          costPrice: data.costPrice?.toString() || '',
          minStockLevel: data.minStockLevel?.toString() || '',
          maxStockLevel: data.maxStockLevel?.toString() || '',
          reorderLevel: data.reorderLevel?.toString() || '',
          reorderQuantity: data.reorderQuantity?.toString() || '',
          warrantyMonths: data.warrantyMonths?.toString() || '',
          warrantyType: data.warrantyType || '',
          terms: data.terms || '',
          coverage: data.coverage || '',
          exclusions: data.exclusions || '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        });
        // Pre-populate variant state
        setHasVariantsToggle(!!data.hasVariants);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingIds = (data as any).customAttributes?.variantTypeIds;
        setSelectedVariantTypeIds(Array.isArray(existingIds) ? existingIds : []);
      }
    } catch (error) {
      console.error('Error loading product details:', error);
      toast.error('Failed to load product details');
    } finally {
      setFetchingDetails(false);
    }
  }, [productHook, categoryHook, stockItem?.id, formik]);

  useEffect(() => {
    if (stockItem && isOpen) {
      loadStockDetails();
    }
  }, [stockItem, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 shrink-0 bg-transparent px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Stock Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {fetchingDetails ? (
          <div className="p-12 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <form onSubmit={formik.handleSubmit} className="p-6">
            {/* Product Information Header */}
            {stockItem && (
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Product Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Product Code:</span>
                    <span className="ml-2 font-medium">{stockItem.productCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <span className="ml-2 font-medium">{stockItem.category?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
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
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <select
                  name="categoryId"
                  value={formik.values.categoryId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                >
                  <option value="">Select category (or leave blank)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {formik.touched.categoryId && formik.errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.categoryId}</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formik.values.tags}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  placeholder="e.g., summer, sale, new-arrival (comma-separated)"
                />
                <p className="mt-1 text-xs text-gray-500">Separate multiple tags with commas</p>
              </div>

              {/* Brand and Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formik.values.brand}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formik.values.model}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="unitPrice"
                    value={formik.values.unitPrice}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                  {formik.touched.unitPrice && formik.errors.unitPrice && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.unitPrice}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="costPrice"
                    value={formik.values.costPrice}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                  {formik.touched.costPrice && formik.errors.costPrice && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.costPrice}</p>
                  )}
                </div>
              </div>

              {/* Product Variants Section */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${hasVariantsToggle ? 'bg-orange-50 border-b border-orange-200' : 'bg-gray-50'}`}
                  onClick={() => {
                    setHasVariantsToggle(v => !v);
                    if (hasVariantsToggle) setSelectedVariantTypeIds([]);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Layers className={`w-5 h-5 ${hasVariantsToggle ? 'text-orange-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Product Variants</p>
                      <p className="text-xs text-gray-500">Enable if this product comes in different options (Color, Size, Storage, etc.)</p>
                    </div>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${hasVariantsToggle ? 'bg-orange-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${hasVariantsToggle ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                {hasVariantsToggle && (
                  <div className="p-4 bg-orange-50">
                    {variantTypes.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No variant types configured yet.</p>
                        <p className="text-xs text-orange-600 mt-1">
                          Use "Variant Types" button in the header to set up attribute types first.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Select which attributes apply to this product:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variantTypes.map(vt => {
                            const selected = selectedVariantTypeIds.includes(vt.id);
                            return (
                              <button
                                key={vt.id}
                                type="button"
                                onClick={() => setSelectedVariantTypeIds(prev =>
                                  prev.includes(vt.id) ? prev.filter(x => x !== vt.id) : [...prev, vt.id]
                                )}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                  selected
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                                }`}
                              >
                                {selected && <span className="w-3 h-3 flex items-center justify-center">✓</span>}
                                {vt.displayName}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Warranty Information */}
              {/*  */}

              {/* Stock Management */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Stock Management <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                    <input
                      type="number"
                      name="minStockLevel"
                      min="0"
                      value={formik.values.minStockLevel}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
                    <input
                      type="number"
                      name="maxStockLevel"
                      min="0"
                      value={formik.values.maxStockLevel}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      name="reorderLevel"
                      min="0"
                      value={formik.values.reorderLevel}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label>
                    <input
                      type="number"
                      name="reorderQuantity"
                      min="0"
                      value={formik.values.reorderQuantity}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Product'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
