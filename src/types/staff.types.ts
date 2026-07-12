export interface Staff {
  id: string; // Changed from number to string to match database UUID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  roleId: number;
  employeeId: string;
  locationId?: string | null; // Changed from branchId/shopId
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };
  department: Department;
  status: StaffStatus;
  joiningDate: string;
  salary: number;
  address: string;
  city: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  avatar?: string;
  skills: string[];
  performanceRating: number; // 1-5
  totalSales?: number; // For sales staff
  completedJobSheets?: number; // For technicians
  createdAt: string;
  updatedAt: string;
}

export const StaffRole = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  SALES_PERSON: 'sales_person',
  CASHIER: 'cashier',
  STOCK_KEEPER: 'stock_keeper',
} as const;

export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const Department = {
  MANAGEMENT: 'management',
  SALES: 'sales',
  TECHNICAL: 'technical',
  INVENTORY: 'inventory',
  FINANCE: 'finance',
  CUSTOMER_SERVICE: 'customer_service',
} as const;

export type Department = (typeof Department)[keyof typeof Department];

export const StaffStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
} as const;

export type StaffStatus = (typeof StaffStatus)[keyof typeof StaffStatus];

export interface CreateStaffDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  shopId: number;
  department: Department;
  joiningDate: string;
  salary: number;
  address: string;
  city: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  skills?: string[];
}

export interface UpdateStaffDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  shopId?: number;
  department?: Department;
  status?: StaffStatus;
  salary?: number;
  address?: string;
  city?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  skills?: string[];
  performanceRating?: number;
}

export interface StaffFilters {
  role?: StaffRole;
  status?: StaffStatus;
  department?: Department;
  shopId?: number;
  searchQuery?: string;
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  byRole: {
    superAdmins: number;
    admins: number;
    managers: number;
    technicians: number;
    salesPersons: number;
    others: number;
  };
  byDepartment: {
    management: number;
    sales: number;
    technical: number;
    inventory: number;
    finance: number;
    customerService: number;
  };
  averagePerformanceRating: number;
  totalSalaryExpense: number;
}
