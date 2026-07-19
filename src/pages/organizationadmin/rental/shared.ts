/** Shared bits for the Vehicle Rental sub-pages. */

export const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

export const statusColor: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  RESERVED: 'bg-amber-100 text-amber-800',
  RENTED: 'bg-blue-100 text-blue-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
  RETIRED: 'bg-gray-200 text-gray-600',
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-sky-100 text-sky-800',
  CHECKED_OUT: 'bg-blue-100 text-blue-800',
  RETURNED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-red-100 text-red-800',
  SCHEDULED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  ACCIDENT: 'bg-red-100 text-red-800',
  SOLD: 'bg-gray-200 text-gray-600',
  OPEN: 'bg-amber-100 text-amber-800',
  SUBMITTED: 'bg-sky-100 text-sky-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-gray-200 text-gray-700',
};

export interface RentalOutletContext {
  /** Reload the stats strip in the layout (call after mutations). */
  refreshStats: () => void;
  stats: any;
}
