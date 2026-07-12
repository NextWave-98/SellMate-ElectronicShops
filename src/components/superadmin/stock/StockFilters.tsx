import { Search, Filter, X, Tag } from 'lucide-react';
import type { ProductVariantType } from '../../../hooks/useProductVariantType';

interface StockFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onReset?: () => void;
  categories?: { id: string; name: string }[];
  // Variant attribute filters
  variantTypes?: ProductVariantType[];
  selectedVariantAttrs?: Record<string, string>;
  onVariantAttrsChange?: (attrs: Record<string, string>) => void;
}

export default function StockFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  onReset,
  categories = [],
  variantTypes = [],
  selectedVariantAttrs = {},
  onVariantAttrsChange,
}: StockFiltersProps) {
  const activeVariantFilters = Object.values(selectedVariantAttrs).filter(Boolean).length;
  const hasActiveFilters = !!(searchQuery || selectedCategory || selectedStatus || activeVariantFilters > 0);

  // Only show variant types with selectable options
  const filterableVariantTypes = variantTypes.filter(
    (vt) =>
      vt.isActive &&
      (vt.inputType === 'select' || vt.inputType === 'color_picker') &&
      Array.isArray(vt.options) &&
      vt.options.length > 0
  );

  const handleVariantAttrChange = (name: string, value: string) => {
    const updated = { ...selectedVariantAttrs, [name]: value };
    if (!value) delete updated[name];
    onVariantAttrsChange?.(updated);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="ml-auto text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, SKU, barcode, brand, model, category, tags..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
            <option value="lowstock">Low Stock</option>
          </select>
        </div>
      </div>

      {/* Variant Attribute Filters */}
      {filterableVariantTypes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Filter by Variant
            </span>
            {activeVariantFilters > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                {activeVariantFilters} active
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {filterableVariantTypes.map((vt) => (
              <div key={vt.id} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">{vt.displayName}</span>
                <select
                  value={selectedVariantAttrs[vt.name] || ''}
                  onChange={(e) => handleVariantAttrChange(vt.name, e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-w-27.5"
                >
                  <option value="">All {vt.displayName}</option>
                  {Array.isArray(vt.options) && vt.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
