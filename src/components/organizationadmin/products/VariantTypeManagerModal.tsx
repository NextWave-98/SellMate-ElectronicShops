/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Zap, Shirt, Package, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import { useProductVariantType, ProductVariantType, VariantCategory } from '../../../hooks/useProductVariantType';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<VariantCategory, { label: string; icon: any; color: string; description: string }> = {
  ELECTRONICS: { label: 'Electronics', icon: Zap, color: 'blue', description: 'Color, Storage, RAM, Connectivity' },
  CLOTHING: { label: 'Clothing', icon: Shirt, color: 'purple', description: 'Size, Color, Material, Gender' },
  GENERAL: { label: 'General', icon: Package, color: 'green', description: 'Color, Size, Weight, Material' },
  CUSTOM: { label: 'Custom', icon: Sparkles, color: 'orange', description: 'Your own variant types' },
};

const INPUT_TYPE_LABELS = {
  select: 'Dropdown',
  text: 'Text Input',
  number: 'Number',
  color_picker: 'Color Picker',
};

export default function VariantTypeManagerModal({ isOpen, onClose }: Props) {
  const hook = useProductVariantType();
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<VariantCategory>('ELECTRONICS');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [seedingCategory, setSeedingCategory] = useState<VariantCategory | null>(null);

  const [form, setForm] = useState({
    name: '',
    displayName: '',
    inputType: 'select' as 'select' | 'text' | 'number' | 'color_picker',
    category: 'CUSTOM' as VariantCategory,
    options: '',
    isRequired: false,
  });

  const loadVariantTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hook.getAllVariantTypes();
      if (res?.data) setVariantTypes(res.data as ProductVariantType[]);
    } catch {
      toast.error('Failed to load variant types');
    } finally {
      setLoading(false);
    }
  }, [hook]);

  useEffect(() => {
    if (isOpen) loadVariantTypes();
  }, [isOpen]);

  const filtered = variantTypes.filter(v => v.category === activeCategory);

  const handleEdit = (vt: ProductVariantType) => {
    setEditingId(vt.id);
    setForm({
      name: vt.name,
      displayName: vt.displayName,
      inputType: vt.inputType,
      category: vt.category,
      options: (vt.options || []).join(', '),
      isRequired: vt.isRequired,
    });
    setShowAddForm(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setForm({ name: '', displayName: '', inputType: 'select', category: activeCategory, options: '', isRequired: false });
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.displayName.trim()) {
      toast.error('Name and Display Name are required');
      return;
    }
    try {
      const options = form.options.split(',').map(o => o.trim()).filter(Boolean);
      const data = { ...form, options, displayOrder: filtered.length };
      if (editingId) {
        await hook.updateVariantType({ id: editingId, ...data });
        toast.success('Variant type updated');
      } else {
        await hook.createVariantType(data);
        toast.success('Variant type created');
      }
      setShowAddForm(false);
      setEditingId(null);
      loadVariantTypes();
    } catch {
      toast.error('Failed to save variant type');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete variant type "${name}"? This will affect products using it.`)) return;
    try {
      await hook.deleteVariantType(id);
      toast.success('Variant type deleted');
      loadVariantTypes();
    } catch {
      toast.error('Failed to delete variant type');
    }
  };

  const handleSeedPresets = async (category: VariantCategory) => {
    setSeedingCategory(category);
    try {
      const res = await hook.seedPresets(category) as any;
      if (res?.message) {
        toast.success(res.message);
        loadVariantTypes();
      }
    } catch {
      toast.error('Failed to seed presets');
    } finally {
      setSeedingCategory(null);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Manage Variant Types</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">Define attributes that products can have (Color, Size, Storage, etc.)</p>
        </DialogHeader>

        {/* Category Tabs */}
        <div className="flex border-b border-gray-200 px-6 gap-1 pt-3">
          {(Object.keys(CATEGORY_CONFIG) as VariantCategory[]).map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            const count = variantTypes.filter(v => v.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setShowAddForm(false); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeCategory === cat
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Category header with seed presets */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">{CATEGORY_CONFIG[activeCategory].description}</p>
                </div>
                <div className="flex gap-2">
                  {activeCategory !== 'CUSTOM' && (
                    <button
                      onClick={() => handleSeedPresets(activeCategory)}
                      disabled={seedingCategory === activeCategory}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {seedingCategory === activeCategory ? 'Adding...' : 'Add Presets'}
                    </button>
                  )}
                  <button
                    onClick={handleAddNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Custom
                  </button>
                </div>
              </div>

              {/* Add/Edit form */}
              {showAddForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    {editingId ? 'Edit Variant Type' : 'New Variant Type'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Internal Name<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        placeholder="e.g., storage_capacity"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Display Name<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={form.displayName}
                        onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        placeholder="e.g., Storage Capacity"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Input Type</label>
                      <select
                        value={form.inputType}
                        onChange={e => setForm(f => ({ ...f, inputType: e.target.value as any }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                      >
                        {Object.entries(INPUT_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mt-5">
                        <Checkbox
                          id="isRequired"
                          checked={form.isRequired}
                          onCheckedChange={(checked) => setForm(f => ({ ...f, isRequired: checked === true }))}
                        />
                        <label htmlFor="isRequired" className="text-xs font-medium text-gray-700 cursor-pointer">Required field</label>
                      </div>
                    </div>
                  </div>
                  {form.inputType === 'select' || form.inputType === 'color_picker' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Options (comma-separated)</label>
                      <input
                        type="text"
                        value={form.options}
                        onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                        placeholder="e.g., Red, Blue, Black, White"
                      />
                    </div>
                  ) : null}
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => { setShowAddForm(false); setEditingId(null); }}
                      className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 text-xs text-white bg-orange-500 rounded-lg hover:bg-orange-600"
                    >
                      {editingId ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Variant types list */}
              {filtered.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No variant types yet for {CATEGORY_CONFIG[activeCategory].label}</p>
                  {activeCategory !== 'CUSTOM' && (
                    <button
                      onClick={() => handleSeedPresets(activeCategory)}
                      className="mt-3 text-xs text-orange-600 hover:text-orange-700 underline"
                    >
                      Click "Add Presets" to load default {CATEGORY_CONFIG[activeCategory].label} attributes
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(vt => (
                    <div key={vt.id} className="flex items-start justify-between bg-white border border-gray-200 rounded-lg p-3 hover:border-orange-200 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{vt.displayName}</span>
                          <span className="text-xs text-gray-400">({vt.name})</span>
                          {vt.isRequired && (
                            <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">Required</span>
                          )}
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{INPUT_TYPE_LABELS[vt.inputType]}</span>
                        </div>
                        {vt.options && vt.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {vt.options.slice(0, 8).map(opt => (
                              <span key={opt} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                                {opt}
                              </span>
                            ))}
                            {vt.options.length > 8 && (
                              <span className="text-xs text-gray-400">+{vt.options.length - 8} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3 shrink-0">
                        <button onClick={() => handleEdit(vt)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(vt.id, vt.displayName)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
