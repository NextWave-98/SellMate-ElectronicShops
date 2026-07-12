import { Search, Filter, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type JobSheetStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING_FOR_PARTS' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
export type JobPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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
  const hasActiveFilters = searchQuery || selectedStatus || selectedPriority || dateFilter !== 'today' || myJobsOnly;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="ml-auto text-orange-600 hover:text-orange-700"
          >
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      {showMyJobsToggle && onMyJobsChange && (
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={myJobsOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => onMyJobsChange(false)}
            className={!myJobsOnly ? 'border-orange-300 text-orange-700' : ''}
          >
            All Jobs
          </Button>
          <Button
            type="button"
            variant={myJobsOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => onMyJobsChange(true)}
            className={myJobsOnly ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-300 text-orange-700'}
          >
            My Jobs
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search job, customer..."
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={selectedStatus || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : val as JobSheetStatus)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="WAITING_FOR_PARTS">Waiting for Parts</SelectItem>
            <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={selectedPriority || 'all'}
          onValueChange={(val) => onPriorityChange(val === 'all' ? '' : val as JobPriority)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select
          value={dateFilter}
          onValueChange={(val) => onDateFilterChange(val as DateFilter)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        {dateFilter === 'custom' && (
          <div className="flex gap-2 col-span-full lg:col-span-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
