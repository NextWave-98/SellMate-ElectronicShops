import { Search, Filter, X } from 'lucide-react';

interface ShopFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: boolean | undefined;
  onStatusChange: (status: boolean | undefined) => void;
  onReset?: () => void;
}

export default function ShopFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onReset,
}: ShopFiltersProps) {
  const hasActiveFilters = searchQuery || selectedStatus !== undefined;

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
            placeholder="Search shops, branch code, manager..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus === undefined ? '' : selectedStatus ? 'true' : 'false'}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onStatusChange(undefined);
              } else {
                onStatusChange(value === 'true');
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
    </div>
  );
}
