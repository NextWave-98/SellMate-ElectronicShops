import { Badge } from '@/components/ui/badge';
import type { LeaveRequestStatus } from '@/types/leave.types';
import { STATUS_CLASS, STATUS_LABEL } from './leaveFormat';

export function LeaveStatusBadge({ status, stepName }: { status: LeaveRequestStatus; stepName?: string | null }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
      {status === 'PENDING' && stepName ? ` · ${stepName}` : ''}
    </Badge>
  );
}

export function LeaveTypeChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
      {name}
    </span>
  );
}

export default LeaveStatusBadge;
