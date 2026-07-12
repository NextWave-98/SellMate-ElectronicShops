export interface JobSheet {
  id: number;
  jobNumber: string;
  locationId: string; // Changed from shopId
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
  };

  // Customer details
  customerId?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  // Device details
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  imeiNumber?: string;

  // Job details
  issueDescription: string;
  diagnosisNotes?: string;
  repairNotes?: string;
  priority: JobPriority;
  status: JobSheetStatus;

  // Assignment
  assignedTo?: string;
  assignedToStaffId?: number;

  // Costs
  diagnosisFee: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  advancePayment: number;
  balanceAmount: number;

  // Dates
  receivedDate: string;
  expectedCompletionDate: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;

  // Additional
  accessories?: string[];
  deviceCondition?: string;
  warrantyStatus?: string;
  notes?: string;
}

export const JobSheetStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_PARTS: 'waiting_for_parts',
  READY_FOR_PICKUP: 'ready_for_pickup',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
} as const;

export type JobSheetStatus = (typeof JobSheetStatus)[keyof typeof JobSheetStatus];

export const JobPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type JobPriority = (typeof JobPriority)[keyof typeof JobPriority];

export interface CreateJobSheetDTO {
  locationId: string; // Changed from shopId
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  imeiNumber?: string;
  issueDescription: string;
  priority: JobPriority;
  diagnosisFee: number;
  advancePayment: number;
  expectedCompletionDate: string;
  accessories?: string[];
  deviceCondition?: string;
  warrantyStatus?: string;
  notes?: string;
}

export interface UpdateJobSheetDTO {
  status?: JobSheetStatus;
  assignedToStaffId?: number;
  diagnosisNotes?: string;
  repairNotes?: string;
  partsCost?: number;
  laborCost?: number;
  totalCost?: number;
  advancePayment?: number;
  expectedCompletionDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface JobSheetFilters {
  locationId?: string; // Changed from shopId
  status?: JobSheetStatus;
  priority?: JobPriority;
  assignedToStaffId?: number;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface JobSheetStats {
  totalJobSheets: number;
  pending: number;
  inProgress: number;
  waitingForParts: number;
  readyForPickup: number;
  completed: number;
  cancelled: number;
  onHold: number;

  // Financial
  totalRevenue: number;
  totalAdvancePayments: number;
  totalBalance: number;
  averageJobValue: number;

  // By shop
  topShops: {
    shopId: number;
    shopName: string;
    totalJobs: number;
    completedJobs: number;
    revenue: number;
  }[];

  // By device type
  deviceBreakdown: {
    deviceType: string;
    count: number;
  }[];

  // By priority
  priorityBreakdown: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };

  // Trends
  dailyJobSheets: {
    date: string;
    count: number;
    revenue: number;
  }[];

  // Top technicians
  topTechnicians: {
    staffId: number;
    staffName: string;
    completedJobs: number;
    revenue: number;
  }[];
}

export interface JobSheetSummary {
  todayJobs: number;
  yesterdayJobs: number;
  weekJobs: number;
  monthJobs: number;
  pendingJobs: number;
  overdueJobs: number;
  completionRate: number;
  avgCompletionTime: number;
}
