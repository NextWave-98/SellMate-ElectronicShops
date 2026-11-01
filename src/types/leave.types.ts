// Mirrors the /api/leave DTOs (GadgetChain-Manager-backend/src/modules/leave).

export const LEAVE_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'] as const;
export type LeaveRequestStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_DAY_PARTS = ['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'] as const;
export type LeaveDayPart = (typeof LEAVE_DAY_PARTS)[number];

export const LEAVE_CANCELLATION_POLICIES = ['NEVER', 'BEFORE_APPROVAL', 'BEFORE_CONFIRMATION', 'BEFORE_START'] as const;
export type LeaveCancellationPolicy = (typeof LEAVE_CANCELLATION_POLICIES)[number];

export const LEAVE_PRORATION_METHODS = ['NONE', 'MONTHLY', 'DAILY'] as const;
export type LeaveProrationMethod = (typeof LEAVE_PRORATION_METHODS)[number];

export const LEAVE_ENTITLEMENT_MODES = ['YEARLY', 'MONTHLY_BY_DAYS'] as const;
export type LeaveEntitlementMode = (typeof LEAVE_ENTITLEMENT_MODES)[number];

export const LEAVE_LEDGER_TYPES = ['CARRY_FORWARD', 'ADJUSTMENT', 'DEDUCTION', 'RESTORATION'] as const;
export type LeaveLedgerEntryType = (typeof LEAVE_LEDGER_TYPES)[number];

export type LeaveEntitlementSource = 'EMPLOYEE' | 'ROLE' | 'ORGANIZATION' | 'SYSTEM_DEFAULT' | 'NONE';
export type LeaveAccessScope = 'ALL' | 'BRANCH' | 'OWN' | 'NONE';

export interface LeavePermissionFlags {
  view: boolean;
  viewOwn: boolean;
  viewTeam: boolean;
  create: boolean;
  createOwn: boolean;
  edit: boolean;
  cancel: boolean;
  approve: boolean;
  reject: boolean;
  confirm: boolean;
  manageTypes: boolean;
  managePolicies: boolean;
  manageEntitlements: boolean;
  manageBalances: boolean;
  viewReports: boolean;
}

export interface LeaveMeta {
  today: string;
  scope: LeaveAccessScope;
  locationId: string | null;
  leaveYear: number;
  leaveYearLabel: string;
  leaveYearStart: string;
  leaveYearEnd: string;
  enabled: boolean;
  workingDays: number[];
  allowHalfDay: boolean;
  permissions: LeavePermissionFlags;
}

export interface LeaveApprovalStep {
  key: string;
  name: string;
  approverRoleIds: string[];
}

export interface LeaveSettings {
  id: string;
  enabled: boolean;
  leaveYearStartMonth: number;
  leaveYearStartDay: number;
  workingDays: number[];
  countNonWorkingDays: boolean;
  allowWeekendLeave: boolean;
  countHolidays: boolean;
  allowHalfDay: boolean;
  allowNegativeBalance: boolean;
  allowUnpaidLeave: boolean;
  enableCarryForward: boolean;
  maxCarryForwardDays: number | null;
  approvalSteps: LeaveApprovalStep[];
  requireConfirmation: boolean;
  employeeCancellationPolicy: LeaveCancellationPolicy;
  preventPendingOverlap: boolean;
  prorationMethod: LeaveProrationMethod;
  reminderDaysBefore: number;
  entitlementMode: LeaveEntitlementMode;
  monthlyDaysMap: Record<string, number>;
  lastCarryForwardYear: number | null;
  updatedAt: string;
}

export type LeaveSettingsInput = Partial<Omit<LeaveSettings, 'id' | 'lastCarryForwardYear' | 'updatedAt'>>;

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  isPaid: boolean;
  isActive: boolean;
  isUnlimited: boolean;
  defaultDays: number | null;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  attachmentRequiredAfterDays: number | null;
  allowHalfDay: boolean;
  allowCarryForward: boolean;
  maxCarryForwardDays: number | null;
  maxConsecutiveDays: number | null;
  minNoticeDays: number | null;
  minServiceDays: number | null;
  eligibleRoleIds: string[] | null;
  sortOrder: number;
  useMonthlyEntitlement: boolean;
  isSystem: boolean;
}

export type LeaveTypeInput = Omit<LeaveType, 'id' | 'code' | 'isSystem'>;
export type CreateLeaveTypeInput = LeaveTypeInput & { code: string };

export interface LeaveHoliday {
  id: string;
  holidayDate: string;
  name: string;
  locationId: string | null;
  locationName: string | null;
  isActive: boolean;
}

export interface LeaveRole {
  id: string;
  name: string;
}

export interface LeaveEmployee {
  userId: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  locationId: string | null;
  locationName: string | null;
  isActive: boolean;
  joiningDate: string | null;
  staffCode: string | null;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  color: string;
  isPaid: boolean;
  leaveTypeActive: boolean;
  entitlementSource: LeaveEntitlementSource;
  entitlementRuleId: string | null;
  prorated: boolean;
  baseEntitlement: number | null;
  isUnlimited: boolean;
  entitlement: number | null;
  carryForward: number;
  adjustments: number;
  totalAllocated: number | null;
  used: number;
  approved: number;
  pending: number;
  available: number | null;
  availableAfterPending: number | null;
}

export interface LeaveDayBreakdownItem {
  date: string;
  weekday: number;
  isWorkingDay: boolean;
  holidayName: string | null;
  value: number;
  excludedReason: 'NON_WORKING_DAY' | 'HOLIDAY' | null;
}

export interface LeaveDayCalculation {
  calendarDays: number;
  workingDays: number;
  excludedNonWorkingDays: number;
  excludedHolidays: number;
  totalDays: number;
  breakdown: LeaveDayBreakdownItem[];
}

export interface LeaveRequest {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string | null;
  roleId: string | null;
  locationId: string | null;
  locationName: string | null;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  leaveTypeColor: string;
  isPaid: boolean;
  leaveYear: number;
  startDate: string;
  endDate: string;
  dayPart: LeaveDayPart;
  totalDays: number;
  calendarDays: number;
  reason: string | null;
  contactInfo: string | null;
  emergencyContact: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: LeaveRequestStatus;
  currentStep: number;
  currentStepName: string | null;
  approvalSteps: LeaveApprovalStep[];
  requiresConfirmation: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestPermissions {
  canApprove: boolean;
  canReject: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canWithdraw: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  blockedReason: string | null;
}

export type LeaveRequestRow = LeaveRequest & { permissions: LeaveRequestPermissions };

export interface LeaveAction {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  stepIndex: number | null;
  stepName: string | null;
  actorUserId: string | null;
  actorName: string | null;
  comment: string | null;
  createdAt: string;
}

export interface LeaveRequestDetail extends LeaveRequest {
  dayBreakdown: LeaveDayBreakdownItem[];
  actions: LeaveAction[];
  balance: LeaveBalance | null;
  permissions: LeaveRequestPermissions;
}

export interface LeavePreview {
  leaveYear: number;
  leaveYearLabel: string;
  calculation: LeaveDayCalculation;
  balance: LeaveBalance | null;
  attachmentRequired: boolean;
  errors: string[];
  warnings: string[];
}

export interface LeavePreviewInput {
  userId?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  dayPart: LeaveDayPart;
  excludeRequestId?: string;
}

export interface LeaveAttachment {
  url: string;
  publicId: string | null;
  name: string | null;
}

export interface CreateLeaveRequestInput {
  userId?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  dayPart: LeaveDayPart;
  reason?: string | null;
  contactInfo?: string | null;
  emergencyContact?: string | null;
  attachment?: LeaveAttachment | null;
  saveAsDraft?: boolean;
}

export type UpdateLeaveRequestInput = Partial<Omit<CreateLeaveRequestInput, 'userId' | 'saveAsDraft'>>;

export interface MyLeaveOverview {
  leaveYear: number;
  leaveYearLabel: string;
  leaveYearStart: string;
  leaveYearEnd: string;
  today: string;
  settings: Pick<
    LeaveSettings,
    'enabled' | 'workingDays' | 'allowHalfDay' | 'employeeCancellationPolicy' | 'requireConfirmation' | 'approvalSteps'
  >;
  employee: LeaveEmployee;
  balances: LeaveBalance[];
  onLeaveToday: LeaveRequest | null;
  upcoming: LeaveRequest[];
  pending: LeaveRequest[];
  drafts: LeaveRequest[];
}

export interface LeaveCalendarEntry {
  id: string;
  userId: string;
  employeeName: string;
  locationId: string | null;
  locationName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  color: string;
  startDate: string;
  endDate: string;
  dayPart: LeaveDayPart;
  totalDays: number;
  status: LeaveRequestStatus;
}

export interface LeaveCalendarData {
  from: string;
  to: string;
  workingDays: number[];
  entries: LeaveCalendarEntry[];
  /** All matching entries; larger than entries.length when the server capped the response. */
  totalEntries?: number;
  truncated?: boolean;
  holidays: Array<{ date: string; name: string; locationId: string | null }>;
}

export interface LeaveCalendarQuery {
  from: string;
  to: string;
  locationId?: string;
  roleId?: string;
  leaveTypeId?: string;
  userId?: string;
  includePending?: boolean;
}

export interface RoleEntitlement {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  roleId: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
  days: number | null;
  isUnlimited: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
  updatedAt: string;
}

export interface EmployeeEntitlement {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  userId: string;
  employeeName: string;
  days: number | null;
  isUnlimited: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  reason: string | null;
  updatedAt: string;
}

export interface EntitlementFields {
  days?: number | null;
  isUnlimited?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean;
}

export interface CreateRoleEntitlementInput extends EntitlementFields {
  leaveTypeId: string;
  roleId: string;
  locationId?: string | null;
  notes?: string | null;
}
export type UpdateRoleEntitlementInput = Omit<CreateRoleEntitlementInput, 'leaveTypeId' | 'roleId'>;

export interface CreateEmployeeEntitlementInput extends EntitlementFields {
  leaveTypeId: string;
  userId: string;
  reason: string;
}
export type UpdateEmployeeEntitlementInput = Omit<CreateEmployeeEntitlementInput, 'leaveTypeId' | 'userId' | 'reason'> & {
  reason?: string | null;
};

export interface BalanceListRow {
  employee: LeaveEmployee;
  balances: LeaveBalance[];
}

export interface LeaveLedgerEntry {
  id: string;
  userId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveYear: number;
  entryType: LeaveLedgerEntryType;
  days: number;
  leaveRequestId: string | null;
  sourceLeaveYear: number | null;
  reason: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface CreateAdjustmentInput {
  userId: string;
  leaveTypeId: string;
  leaveYear?: number;
  days: number;
  reason: string;
}

export interface CarryForwardResult {
  fromLeaveYear: number;
  toLeaveYear: number;
  dryRun: boolean;
  rows: Array<{
    userId: string;
    employeeName: string;
    leaveTypeId: string;
    leaveTypeName: string;
    available: number;
    carried: number;
    alreadyCarried: boolean;
  }>;
  totalDays: number;
  created: number;
}

export interface LeaveDashboard {
  leaveYear: number;
  leaveYearLabel: string;
  today: string;
  cards: {
    onLeaveToday: number;
    pendingApprovals: number;
    awaitingConfirmation: number;
    upcomingWeek: number;
    daysTakenThisYear: number;
    employees: number;
  };
  byType: Array<{ leaveTypeId: string; name: string; color: string; days: number }>;
  byMonth: Array<{ month: string; days: number }>;
  byStatus: Array<{ status: string; count: number }>;
  todayList: LeaveCalendarEntry[];
  upcomingList: LeaveCalendarEntry[];
}

export interface LeaveReportQuery {
  from: string;
  to: string;
  locationId?: string;
  roleId?: string;
  leaveTypeId?: string;
  userId?: string;
}

export interface LeaveReport {
  from: string;
  to: string;
  totals: { days: number; paidDays: number; unpaidDays: number; employees: number; requests: number };
  byType: Array<{ leaveTypeId: string; name: string; color: string; isPaid: boolean; days: number; requests: number }>;
  byEmployee: Array<{
    userId: string;
    name: string;
    locationName: string | null;
    roleName: string | null;
    days: number;
    paidDays: number;
    unpaidDays: number;
    byType: Record<string, number>;
  }>;
  byBranch: Array<{ locationId: string | null; name: string; days: number; employees: number }>;
  byRole: Array<{ roleId: string | null; name: string; days: number; employees: number }>;
  byMonth: Array<{ month: string; days: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export type AttendanceDayStatus =
  | 'PRESENT'
  | 'CHECKED_IN'
  | 'ON_LEAVE'
  | 'HALF_DAY_LEAVE'
  | 'HOLIDAY'
  | 'NON_WORKING_DAY'
  | 'NOT_CHECKED_IN'
  | 'ABSENT'
  | 'UPCOMING';

export interface DailyAttendanceRow {
  userId: string;
  name: string;
  roleName: string | null;
  locationId: string | null;
  locationName: string | null;
  status: AttendanceDayStatus;
  leaveTypeName: string | null;
  leaveColor: string | null;
  leaveValue: number;
  dayInTime: string | null;
  dayOffTime: string | null;
}

export interface DailyAttendanceStatus {
  date: string;
  isWorkingDay: boolean;
  holidayName: string | null;
  summary: Record<AttendanceDayStatus, number>;
  rows: DailyAttendanceRow[];
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
}
