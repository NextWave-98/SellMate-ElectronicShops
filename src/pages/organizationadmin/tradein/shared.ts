/** Shared bits for the Trade-In / Buyback sub-pages. */

export const selectCls =
  'w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

export const GRADES = ['A', 'B', 'C', 'D'] as const;

export const statusColor: Record<string, string> = {
  QUOTED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-sky-100 text-sky-800',
  REJECTED: 'bg-red-100 text-red-800',
  REFURBISHING: 'bg-blue-100 text-blue-800',
  READY_FOR_SALE: 'bg-green-100 text-green-800',
  SOLD: 'bg-gray-200 text-gray-700',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NEXT_ACTIONS: Record<string, { label: string; status: string; variant?: any }[]> = {
  QUOTED: [
    { label: 'Accept (Buy)', status: 'ACCEPTED' },
    { label: 'Reject', status: 'REJECTED', variant: 'destructive' },
  ],
  ACCEPTED: [{ label: 'Send to Refurb', status: 'REFURBISHING' }, { label: 'Ready for Sale', status: 'READY_FOR_SALE' }],
  REFURBISHING: [{ label: 'Ready for Sale', status: 'READY_FOR_SALE' }],
  READY_FOR_SALE: [{ label: 'Mark Sold', status: 'SOLD' }],
};

export interface TradeInOutletContext {
  refreshStats: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any;
}
