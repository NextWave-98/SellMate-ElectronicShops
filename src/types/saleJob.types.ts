// Sale Job (POS work order) types — mirrors backend SaleJob model.

export type JobStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'QUALITY_CHECK'
  | 'READY_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type Priority = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SaleJobType = 'PHOTO_FRAME' | 'GRAPHIC_DESIGN' | 'PRINTING' | 'CUSTOM' | 'OTHER';

export const SALE_JOB_TYPE_LABELS: Record<SaleJobType, string> = {
  PHOTO_FRAME: 'Photo Frame',
  GRAPHIC_DESIGN: 'Graphic Design',
  PRINTING: 'Printing',
  CUSTOM: 'Custom',
  OTHER: 'Other',
};

export interface SaleJob {
  id: string;
  jobNumber: string;
  saleId?: string | null;
  locationId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  createdById: string;
  assignedToId?: string | null;
  jobType: SaleJobType;
  title: string;
  description?: string | null;
  attachmentsUrl?: string[] | null;
  status: JobStatus;
  priority: Priority;
  dueDate?: string | null;
  completedAt?: string | null;
  completedById?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone?: string; email?: string };
  location?: { id: string; name: string };
  assignedTo?: { id: string; name: string; email?: string };
  createdBy?: { id: string; name: string };
  sale?: { id: string; saleNumber: string; totalAmount?: number };
  statusHistory?: SaleJobStatusHistory[];
}

export interface SaleJobStatusHistory {
  id: string;
  fromStatus?: JobStatus | null;
  toStatus: JobStatus;
  changedById?: string | null;
  changedAt: string;
  remarks?: string | null;
  changedBy?: { id: string; name: string };
}

export interface CreateSaleJobData {
  saleId?: string | null;
  locationId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  jobType: SaleJobType;
  title: string;
  description?: string | null;
  attachmentsUrl?: string[] | null;
  priority?: Priority;
  dueDate?: string;
  assignedToId?: string | null;
}

export interface SaleJobListResponse {
  data: SaleJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
