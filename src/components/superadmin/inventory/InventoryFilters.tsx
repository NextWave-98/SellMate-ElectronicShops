import { Search, Filter, X } from 'lucide-react';
import type { InventoryStatus } from '../../../types/inventory.types';
import { InventoryStatus as Status } from '../../../types/inventory.types';

interface InventoryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: InventoryStatus | '';
  onStatusChange: (status: InventoryStatus | '') => void;
  selectedShop: string;
  onShopChange: (shopId: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  shops: Array<{ shopId: string; shopName: string; branchCode: string }>;
  categories: string[];
  onReset: () => void;
}

export default function InventoryFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedShop,
  onShopChange,
  selectedCategory,
  onCategoryChange,
  shops,
  categories,
  onReset,
}: InventoryFiltersProps) {
  const hasActiveFilters = searchQuery || selectedStatus || selectedShop || selectedCategory;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 mr-1" />
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products, codes, shops..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as InventoryStatus | '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value={Status.IN_STOCK}>In Stock</option>
            <option value={Status.LOW_STOCK}>Low Stock</option>
            <option value={Status.OUT_OF_STOCK}>Out of Stock</option>
            <option value={Status.OVERSTOCKED}>Overstocked</option>
          </select>
        </div>

        {/* Shop Filter */}
        <div>
          <select
            value={selectedShop}
            onChange={(e) => onShopChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            <option value="">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.shopId} value={shop.shopId}>
                {shop.shopName} ({shop.branchCode})
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
