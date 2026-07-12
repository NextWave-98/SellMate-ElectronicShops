const CLAIM_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PENDING: 'Pending',
};

export function normalizeClaimStatus(status: string): string {
  return status.trim().toUpperCase().replace(/-/g, '_');
}

export function getClaimStatusLabel(status: string): string {
  const normalized = normalizeClaimStatus(status);
  if (CLAIM_STATUS_LABELS[normalized]) {
    return CLAIM_STATUS_LABELS[normalized];
  }
  return normalized
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getClaimStatusBadgeClass(status: string): string {
  switch (normalizeClaimStatus(status)) {
    case 'SUBMITTED':
    case 'PENDING':
      return 'bg-orange-100 text-orange-700';
    case 'UNDER_REVIEW':
      return 'bg-yellow-100 text-yellow-700';
    case 'APPROVED':
      return 'bg-green-100 text-green-700';
    case 'REJECTED':
      return 'bg-red-100 text-red-700';
    case 'IN_PROGRESS':
      return 'bg-purple-100 text-purple-700';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getExpiringWarrantyCount(
  data: { count?: number; warranties?: unknown[] } | unknown[] | null | undefined
): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data.count === 'number') return data.count;
  if (Array.isArray(data.warranties)) return data.warranties.length;
  return 0;
}
