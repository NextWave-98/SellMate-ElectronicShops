import { Search, Filter, X, Calendar } from 'lucide-react';
import { SaleStatus, PaymentMethod } from '../../../types/sales.types';

export type DateFilterType = 'all' | 'today' | 'yesterday' | 'thisMonth' | 'thisYear' | 'custom';

interface SalesFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: SaleStatus | '';
  onStatusChange: (status: SaleStatus | '') => void;
  selectedPaymentMethod: PaymentMethod | '';
  onPaymentMethodChange: (method: PaymentMethod | '') => void;
  dateFilter: DateFilterType;
  onDateFilterChange: (filter: DateFilterType) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onReset?: () => void;
}

export default function SalesFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
  dateFilter,
  onDateFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
}: SalesFiltersProps) {
  const hasActiveFilters = searchQuery || selectedStatus || selectedPaymentMethod || dateFilter !== 'all';

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

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search invoice, customer..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value as SaleStatus | '')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
            >
              <option value="">All Status</option>
              <option value={SaleStatus.COMPLETED}>Completed</option>
              <option value={SaleStatus.PENDING}>Pending</option>
              <option value={SaleStatus.CANCELLED}>Cancelled</option>
              <option value={SaleStatus.REFUNDED}>Refunded</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod | '')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
            >
              <option value="">All Payments</option>
              <option value={PaymentMethod.CASH}>Cash</option>
              <option value={PaymentMethod.CARD}>Card</option>
              <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
              <option value={PaymentMethod.MOBILE_PAYMENT}>Mobile Payment</option>
              <option value={PaymentMethod.CREDIT}>Credit</option>
            </select>
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value as DateFilterType)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisMonth">This Month</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pl-4 border-l-2 border-orange-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
