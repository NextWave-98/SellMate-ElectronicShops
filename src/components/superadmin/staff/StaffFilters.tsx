import { Search, Filter, X } from 'lucide-react';
import { StaffStatus, StaffRole, Department } from '../../../types/staff.types';

interface StaffFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRole: StaffRole | '';
  onRoleChange: (role: StaffRole | '') => void;
  selectedStatus: StaffStatus | '';
  onStatusChange: (status: StaffStatus | '') => void;
  selectedDepartment: Department | '';
  onDepartmentChange: (department: Department | '') => void;
  onReset?: () => void;
}

export default function StaffFilters({
  searchQuery,
  onSearchChange,
  selectedRole,
  onRoleChange,
  selectedStatus,
  onStatusChange,
  selectedDepartment,
  onDepartmentChange,
  onReset,
}: StaffFiltersProps) {
  const hasActiveFilters = searchQuery || selectedRole || selectedStatus || selectedDepartment;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, employee ID..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          />
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value as StaffRole | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Roles</option>
            <option value={StaffRole.SUPER_ADMIN}>Super Admin</option>
            <option value={StaffRole.ADMIN}>Admin</option>
            <option value={StaffRole.MANAGER}>Manager</option>
            <option value={StaffRole.TECHNICIAN}>Technician</option>
            <option value={StaffRole.SALES_PERSON}>Sales Person</option>
            <option value={StaffRole.CASHIER}>Cashier</option>
            <option value={StaffRole.STOCK_KEEPER}>Stock Keeper</option>
          </select>
        </div>

        {/* Department Filter */}
        {/* <div>
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value as Department | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Departments</option>
            <option value={Department.MANAGEMENT}>Management</option>
            <option value={Department.SALES}>Sales</option>
            <option value={Department.TECHNICAL}>Technical</option>
            <option value={Department.INVENTORY}>Inventory</option>
            <option value={Department.FINANCE}>Finance</option>
            <option value={Department.CUSTOMER_SERVICE}>Customer Service</option>
          </select>
        </div> */}

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as StaffStatus | '')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          >
            <option value="">All Status</option>
            <option value={StaffStatus.ACTIVE}>Active</option>
            <option value={StaffStatus.INACTIVE}>Inactive</option>
            <option value={StaffStatus.ON_LEAVE}>On Leave</option>
            <option value={StaffStatus.SUSPENDED}>Suspended</option>
            <option value={StaffStatus.TERMINATED}>Terminated</option>
          </select>
        </div>
      </div>
    </div>
  );
}
