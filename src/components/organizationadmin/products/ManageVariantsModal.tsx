/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Layers, AlertCircle, MapPin, Package, PlusCircle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { ProductItem } from '../../../hooks/useProduct';
import { useProduct } from '../../../hooks/useProduct';
import { useProductVariantType } from '../../../hooks/useProductVariantType';
import type { ProductVariantType } from '../../../hooks/useProductVariantType';
import { useLocation } from '../../../hooks/useLocation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentProduct: ProductItem | null;
}

const validationSchema = Yup.object({
  unitPrice: Yup.number().required('Price is required').min(0),
  sku: Yup.string(),
  stockQuantity: Yup.number().min(0),
});

export default function ManageVariantsModal({ isOpen, onClose, onSuccess, parentProduct }: Props) {
  const productHook = useProduct();
  const variantTypeHook = useProductVariantType();
  const locationHook = useLocation();
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [childVariants, setChildVariants] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductItem | null>(null);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  // Inline add-stock state
  const [stockingVariantId, setStockingVariantId] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState(1);
  const [stockLocationId, setStockLocationId] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  const loadData = useCallback(async () => {
    if (!parentProduct?.id) return;
    setLoading(true);
    try {
      const [typesRes, childRes] = await Promise.all([
        variantTypeHook.getAllVariantTypes(),
        productHook.getProductVariants(parentProduct.id),
      ]);

      if (typesRes?.data) {
        const allTypes = typesRes.data as ProductVariantType[];
        const selectedTypeIds: string[] = parentProduct.customAttributes?.variantTypeIds || [];
        setVariantTypes(
          selectedTypeIds.length > 0
            ? allTypes.filter(t => selectedTypeIds.includes(t.id))
            : allTypes
        );
      }
      const childData = (childRes as any)?.data?.data ?? (childRes as any)?.data ?? [];
      if (Array.isArray(childData)) setChildVariants(childData as ProductItem[]);
      else if (childRes?.data) setChildVariants(childRes.data as ProductItem[]);
    } catch {
      toast.error('Failed to load variant data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentProduct?.id, (parentProduct?.customAttributes?.variantTypeIds || []).join(',')]);

  // Load locations once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    locationHook.getAllLocations().then(res => {
      const raw = (res as any)?.data;
      const list: any[] = Array.isArray(raw) ? raw : raw?.locations ?? [];
      setLocations(list.map((l: any) => ({ id: l.id, name: l.name })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && parentProduct) {
      loadData();
    }
  }, [isOpen, parentProduct]);

  const handleAddStockClick = (variant: ProductItem) => {
    setStockingVariantId(variant.id);
    setStockQty(1);
    setStockLocationId(locations[0]?.id || '');
  };

  const handleAddStockSave = async (variantId: string) => {
    if (!stockLocationId || stockQty <= 0) {
      toast.error('Select a location and enter a quantity');
      return;
    }
    setStockSaving(true);
    try {
      await productHook.adjustProductStock({
        productId: variantId,
        branchId: stockLocationId,
        quantity: stockQty,
        type: 'IN',
        reason: 'Manual stock entry',
      });
      toast.success('Stock added');
      setStockingVariantId(null);
      loadData();
      onSuccess();
    } catch {
      toast.error('Failed to add stock');
    } finally {
      setStockSaving(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      unitPrice: '',
      costPrice: '',
      sku: '',
      minStockLevel: '',
      maxStockLevel: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!parentProduct?.id) return;
      if (Object.keys(attrValues).length === 0) {
        toast.error('Please select at least one variant attribute value');
        return;
      }
      setSaving(true);
      try {
        const variantName = Object.entries(attrValues)
          .map(([k, v]) => `${v}`)
          .join(' / ');
        const data: any = {
          name: `${parentProduct.name} - ${variantName}`,
          unitPrice: parseFloat(values.unitPrice),
          costPrice: values.costPrice ? parseFloat(values.costPrice) : undefined,
          sku: values.sku || undefined,
          minStockLevel: values.minStockLevel ? parseInt(values.minStockLevel) : undefined,
          maxStockLevel: values.maxStockLevel ? parseInt(values.maxStockLevel) : undefined,
          parentProductId: parentProduct.id,
          variantAttributes: attrValues,
          hasVariants: false,
          categoryId: parentProduct.categoryId,
          brand: parentProduct.brand,
          model: parentProduct.model,
          isActive: true,
        };

        if (editingVariant) {
          await productHook.updateProduct({ id: editingVariant.id, ...data });
          toast.success('Variant updated');
        } else {
          await productHook.createProduct(data);
          toast.success('Variant added');
        }

        setShowAddForm(false);
        setEditingVariant(null);
        setAttrValues({});
        formik.resetForm();
        loadData();
        onSuccess();
      } catch {
        toast.error('Failed to save variant');
      } finally {
        setSaving(false);
      }
    },
  });

  const handleEditVariant = (variant: ProductItem) => {
    setEditingVariant(variant);
    setAttrValues(variant.variantAttributes || {});
    formik.setValues({
      unitPrice: variant.unitPrice?.toString() || '',
      costPrice: variant.costPrice?.toString() || '',
      sku: variant.sku || '',
      minStockLevel: variant.minStockLevel?.toString() || '',
      maxStockLevel: variant.maxStockLevel?.toString() || '',
    });
    setShowAddForm(true);
  };

  const handleDeleteVariant = async (variant: ProductItem) => {
    if (!confirm(`Delete variant "${variant.name}"?`)) return;
    try {
      await productHook.deleteProduct(variant.id);
      toast.success('Variant deleted');
      loadData();
      onSuccess();
    } catch {
      toast.error('Failed to delete variant');
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingVariant(null);
    setAttrValues({});
    formik.resetForm();
  };

  const renderAttrInput = (vt: ProductVariantType) => {
    const val = attrValues[vt.name] || '';
    if (vt.inputType === 'select' && vt.options?.length) {
      return (
        <select
          value={val}
          onChange={e => setAttrValues(a => ({ ...a, [vt.name]: e.target.value }))}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
        >
          <option value="">Select {vt.displayName}</option>
          {vt.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (vt.inputType === 'color_picker') {
      return (
        <div className="flex items-center gap-2">
          {vt.options?.length ? (
            <select
              value={val}
              onChange={e => setAttrValues(a => ({ ...a, [vt.name]: e.target.value }))}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Select color</option>
              {vt.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={val}
              onChange={e => setAttrValues(a => ({ ...a, [vt.name]: e.target.value }))}
              placeholder="Enter color"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
            />
          )}
        </div>
      );
    }
    return (
      <input
        type={vt.inputType === 'number' ? 'number' : 'text'}
        value={val}
        onChange={e => setAttrValues(a => ({ ...a, [vt.name]: e.target.value }))}
        placeholder={`Enter ${vt.displayName}`}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
      />
    );
  };

  if (!parentProduct) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">Manage Variants</DialogTitle>
              <p className="text-xs text-gray-500">{parentProduct.name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* No variant types warning */}
              {variantTypes.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No variant types configured</p>
                    <p className="text-xs text-amber-600 mt-1">
                      {(parentProduct.customAttributes?.variantTypeIds || []).length > 0
                        ? 'The variant types linked to this product could not be found. They may have been deleted. Go to Product Management → Variant Types to reconfigure.'
                        : 'Go to Product Management → Variant Types to set up your attribute types (Color, Size, Storage, etc.) first.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Filtered variant types info */}
              {variantTypes.length > 0 && (parentProduct.customAttributes?.variantTypeIds || []).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Showing <span className="font-semibold">{variantTypes.length}</span> variant type{variantTypes.length !== 1 ? 's' : ''} configured for this product:
                    {' '}{variantTypes.map(vt => vt.displayName).join(', ')}.
                    {' '}Use <strong>Add Variant</strong> below to create each variant combination.
                  </p>
                </div>
              )}

              {/* Add Variant form */}
              {showAddForm && variantTypes.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    {editingVariant ? 'Edit Variant' : 'Add New Variant'}
                  </h3>

                  {/* Variant attributes */}
                  {variantTypes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">Variant Attributes</p>
                      <div className="grid grid-cols-2 gap-3">
                        {variantTypes.map(vt => (
                          <div key={vt.id}>
                            <label className="block text-xs text-gray-600 mb-1">
                              {vt.displayName}
                              {vt.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            {renderAttrInput(vt)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price & Stock */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="unitPrice"
                        value={formik.values.unitPrice}
                        onChange={formik.handleChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white"
                        placeholder="0.00"
                      />
                      {formik.touched.unitPrice && formik.errors.unitPrice && (
                        <p className="text-xs text-red-600 mt-0.5">{formik.errors.unitPrice}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price</label>
                      <input
                        type="number"
                        step="0.01"
                        name="costPrice"
                        value={formik.values.costPrice}
                        onChange={formik.handleChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                      <input
                        type="text"
                        name="sku"
                        value={formik.values.sku}
                        onChange={formik.handleChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white"
                        placeholder="Variant SKU"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Stock</label>
                      <input
                        type="number"
                        name="minStockLevel"
                        value={formik.values.minStockLevel}
                        onChange={formik.handleChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={handleCancelForm}
                      className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="button" onClick={() => formik.handleSubmit()} disabled={saving}
                      className="px-3 py-1.5 text-xs text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                      {saving ? 'Saving...' : editingVariant ? 'Update Variant' : 'Add Variant'}
                    </button>
                  </div>
                </div>
              )}

              {/* Variants list */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Variants ({childVariants.length})
                </h3>
                {!showAddForm && (
                  <button
                    onClick={() => { setShowAddForm(true); setEditingVariant(null); setAttrValues({}); formik.resetForm(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Variant
                  </button>
                )}
              </div>

              {childVariants.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No variants yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add variants like "Red / 128GB" or "Blue / Small"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {childVariants.map(v => {
                    const inv = v.inventorySummary;
                    const totalQty = inv?.totalQuantity ?? 0;
                    const stockColor = totalQty === 0 ? 'text-red-600 bg-red-50 border-red-200' : totalQty <= (v.minStockLevel ?? 5) ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-green-700 bg-green-50 border-green-200';
                    return (
                      <div key={v.id} className="bg-white border border-gray-200 rounded-lg hover:border-orange-200 overflow-hidden">
                        {/* Variant header row */}
                        <div className="flex items-center justify-between p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {v.variantAttributes && Object.entries(v.variantAttributes).map(([k, val]) => (
                                <span key={k} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                                  <span className="text-orange-400 capitalize">{k}:</span> {String(val)}
                                </span>
                              ))}
                              {/* Total stock badge */}
                              <span className={`inline-flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full font-medium ${stockColor}`}>
                                <Package className="w-3 h-3" />
                                {totalQty} in stock
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm font-medium text-green-700">LKR {v.unitPrice}</span>
                              {v.sku && <span className="text-xs text-gray-500">SKU: {v.sku}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3 shrink-0">
                            <button
                              onClick={() => stockingVariantId === v.id ? setStockingVariantId(null) : handleAddStockClick(v)}
                              title="Add stock"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                              <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEditVariant(v)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteVariant(v)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Inline add-stock form */}
                        {stockingVariantId === v.id && (
                          <div className="border-t border-green-100 bg-green-50 px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-green-800 whitespace-nowrap">Add Stock:</span>
                              <select
                                value={stockLocationId}
                                onChange={e => setStockLocationId(e.target.value)}
                                className="flex-1 min-w-[130px] px-2 py-1 text-xs border border-green-200 rounded-lg bg-white focus:ring-1 focus:ring-green-400"
                              >
                                <option value="">Select location</option>
                                {locations.map(l => (
                                  <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1">
                                <label className="text-xs text-green-700 whitespace-nowrap">Qty:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={stockQty}
                                  onChange={e => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 px-2 py-1 text-xs border border-green-200 rounded-lg text-center bg-white focus:ring-1 focus:ring-green-400"
                                />
                              </div>
                              <button
                                onClick={() => handleAddStockSave(v.id)}
                                disabled={stockSaving || !stockLocationId}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                {stockSaving ? 'Saving...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setStockingVariantId(null)}
                                className="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Per-location stock breakdown */}
                        {inv && inv.locations.length > 0 && (
                          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {inv.locations.map(loc => (
                                <div key={loc.locationId} className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  <span className="font-medium">{loc.locationName}</span>
                                  <span className="text-gray-400">·</span>
                                  <span className={loc.quantity === 0 ? 'text-red-600 font-semibold' : loc.quantity <= (v.minStockLevel ?? 5) ? 'text-amber-600 font-semibold' : 'text-green-700 font-semibold'}>
                                    {loc.quantity}
                                  </span>
                                  {loc.reservedQuantity > 0 && (
                                    <span className="text-gray-400 text-[10px]">({loc.reservedQuantity} reserved)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {inv && inv.locations.length === 0 && (
                          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                            <p className="text-xs text-gray-400">No stock assigned to any location yet</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
