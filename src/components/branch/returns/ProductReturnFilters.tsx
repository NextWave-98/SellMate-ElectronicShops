import { Search, Filter, X, Calendar } from 'lucide-react';

export type ProductReturnStatus = 'RECEIVED' | 'INSPECTING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REPLACEMENT_SENT';
export type ProductReturnCategory = 'CUSTOMER_RETURN' | 'WARRANTY_RETURN' | 'DEFECTIVE' | 'EXCESS_STOCK' | 'QUALITY_FAILURE' | 'DAMAGED' | 'INTERNAL_TRANSFER';
export type ProductReturnSourceType = 'SALE' | 'WARRANTY_CLAIM' | 'JOB_SHEET' | 'STOCK_CHECK' | 'DIRECT' | 'GOODS_RECEIPT';

interface ProductReturnFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: ProductReturnStatus | '';
  onStatusChange: (status: ProductReturnStatus | '') => void;
  selectedCategory: ProductReturnCategory | '';
  onCategoryChange: (category: ProductReturnCategory | '') => void;
  selectedSourceType: ProductReturnSourceType | '';
  onSourceTypeChange: (sourceType: ProductReturnSourceType | '') => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onReset?: () => void;
}

export default function ProductReturnFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  selectedSourceType,
  onSourceTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
}: ProductReturnFiltersProps) {
  const hasActiveFilters = searchQuery || selectedStatus || selectedCategory || selectedSourceType || startDate || endDate;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && onReset && (
          <button
            onClick={onReset}
            className="ml-auto text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search return, customer..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as ProductReturnStatus | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Status</option>
            <option value="RECEIVED">Received</option>
            <option value="INSPECTING">Inspecting</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REPLACEMENT_SENT">Replacement Sent</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as ProductReturnCategory | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Categories</option>
            <option value="CUSTOMER_RETURN">Customer Return</option>
            <option value="WARRANTY_RETURN">Warranty Return</option>
            <option value="DEFECTIVE">Defective</option>
            <option value="EXCESS_STOCK">Excess Stock</option>
            <option value="QUALITY_FAILURE">Quality Failure</option>
            <option value="DAMAGED">Damaged</option>
            <option value="INTERNAL_TRANSFER">Internal Transfer</option>
          </select>
        </div>

        {/* Source Type Filter */}
        <div>
          <select
            value={selectedSourceType}
            onChange={(e) => onSourceTypeChange(e.target.value as ProductReturnSourceType | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Sources</option>
            <option value="SALE">Sale</option>
            <option value="WARRANTY_CLAIM">Warranty Claim</option>
            <option value="JOB_SHEET">Job Sheet</option>
            <option value="STOCK_CHECK">Stock Check</option>
            <option value="DIRECT">Direct</option>
            <option value="GOODS_RECEIPT">Goods Receipt</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
            placeholder="Start Date"
          />
        </div>

        {/* End Date */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
            placeholder="End Date"
          />
        </div>
      </div>
    </div>
  );
}