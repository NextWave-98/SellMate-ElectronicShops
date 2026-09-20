/** Shared bits for the Garage / Workshop sub-pages. */

export const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

export const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SENT: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-200 text-gray-600',
  CONVERTED: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export interface EstItem {
  itemType: 'PART' | 'LABOR' | 'OUTWORK' | 'OTHER';
  description: string;
  /** PART lines: stocked product issued from inventory when the estimate becomes a job */
  productId?: string | null;
  quantity: number;
  laborHours?: number;
  unitPrice: number;
}

export interface GarageOutletContext {
  refreshStats: () => void;
  stats: any;
}
