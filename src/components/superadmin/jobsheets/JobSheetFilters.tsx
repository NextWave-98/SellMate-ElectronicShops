import { Search, Filter, X, Calendar } from 'lucide-react';
import { JobSheetStatus, JobPriority } from '../../../types/jobsheet.types';

export type DateFilter = 'today' | 'yesterday' | 'this_week' | 'this_year' | 'custom';

interface JobSheetFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: JobSheetStatus | '';
  onStatusChange: (status: JobSheetStatus | '') => void;
  selectedPriority: JobPriority | '';
  onPriorityChange: (priority: JobPriority | '') => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onReset?: () => void;
  showMyJobsToggle?: boolean;
  myJobsOnly?: boolean;
  onMyJobsChange?: (value: boolean) => void;
}

export default function JobSheetFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  dateFilter,
  onDateFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
  showMyJobsToggle = false,
  myJobsOnly = false,
  onMyJobsChange,
}: JobSheetFiltersProps) {
  const hasActiveFilters = searchQuery || selectedStatus || selectedPriority || dateFilter !== 'today' || (dateFilter === 'custom' && (startDate || endDate)) || myJobsOnly;

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

      {showMyJobsToggle && onMyJobsChange && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => onMyJobsChange(false)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${
              !myJobsOnly
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'
            }`}
          >
            All Jobs
          </button>
          <button
            type="button"
            onClick={() => onMyJobsChange(true)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${
              myJobsOnly
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'
            }`}
          >
            My Jobs
          </button>
        </div>
      )}

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
            placeholder="Search job, customer..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as JobSheetStatus | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Status</option>
            <option value={JobSheetStatus.PENDING}>Pending</option>
            <option value={JobSheetStatus.IN_PROGRESS}>In Progress</option>
            <option value={JobSheetStatus.WAITING_FOR_PARTS}>Waiting for Parts</option>
            <option value={JobSheetStatus.READY_FOR_PICKUP}>Ready for Pickup</option>
            <option value={JobSheetStatus.COMPLETED}>Completed</option>
            <option value={JobSheetStatus.CANCELLED}>Cancelled</option>
            <option value={JobSheetStatus.ON_HOLD}>On Hold</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value as JobPriority | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Priorities</option>
            <option value={JobPriority.LOW}>Low</option>
            <option value={JobPriority.MEDIUM}>Medium</option>
            <option value={JobPriority.HIGH}>High</option>
            <option value={JobPriority.URGENT}>Urgent</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Date Range - only show when custom is selected */}
        {dateFilter === 'custom' && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                placeholder="Start Date"
              />
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
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
        )}
      </div>
    </div>
  );
}
