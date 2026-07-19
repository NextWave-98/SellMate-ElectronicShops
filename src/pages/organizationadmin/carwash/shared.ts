/** Shared bits for the Car Wash sub-pages. */

export const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

export const statusColor: Record<string, string> = {
  WAITING: 'bg-amber-100 text-amber-800',
  IN_BAY: 'bg-blue-100 text-blue-800',
  DRYING: 'bg-sky-100 text-sky-800',
  READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-200 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  EXHAUSTED: 'bg-gray-200 text-gray-700',
};

export const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  WAITING: [{ label: 'Start (In Bay)', value: 'IN_BAY' }, { label: 'Cancel', value: 'CANCELLED' }],
  IN_BAY: [{ label: 'Drying', value: 'DRYING' }, { label: 'Ready', value: 'READY' }],
  DRYING: [{ label: 'Ready', value: 'READY' }],
  READY: [{ label: 'Delivered', value: 'DELIVERED' }],
};

export interface CarWashOutletContext {
  refreshStats: () => void;
  stats: any;
}
