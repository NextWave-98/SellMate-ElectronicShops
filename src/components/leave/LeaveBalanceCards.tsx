import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { LeaveBalance } from '@/types/leave.types';
import { balanceAvailableLabel, formatNumber, SOURCE_LABEL } from './leaveFormat';

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
  loading?: boolean;
}

/** One card per leave type: available, used, pending and where the entitlement came from. */
export function LeaveBalanceCards({ balances, loading }: LeaveBalanceCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse rounded bg-gray-100" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const visible = balances.filter((b) => b.leaveTypeActive && (b.isUnlimited || (b.totalAllocated ?? 0) > 0 || b.used > 0 || b.pending > 0 || b.approved > 0));
  if (visible.length === 0) {
    return <p className="text-sm text-gray-500">No leave balances for this leave year.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {visible.map((b) => {
        const allocated = b.totalAllocated ?? 0;
        const taken = b.used + b.approved;
        const percent = b.isUnlimited || allocated <= 0 ? 0 : Math.min(100, (taken / allocated) * 100);
        return (
          <Card key={b.leaveTypeId} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: b.color }} aria-hidden="true" />
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-700 leading-tight">{b.leaveTypeName}</p>
                {!b.isPaid && <span className="text-[10px] uppercase tracking-wide text-gray-400">Unpaid</span>}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {balanceAvailableLabel(b)}
                {!b.isUnlimited && <span className="text-sm font-normal text-gray-500"> / {formatNumber(allocated)}</span>}
              </p>
              {!b.isUnlimited && <Progress value={percent} className="h-1.5" />}
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>Used {formatNumber(b.used)}{b.approved > 0 ? ` · Approved ${formatNumber(b.approved)}` : ''}{b.pending > 0 ? ` · Pending ${formatNumber(b.pending)}` : ''}</p>
                {(b.carryForward !== 0 || b.adjustments !== 0) && (
                  <p>
                    {b.carryForward !== 0 ? `Carried ${formatNumber(b.carryForward)}` : ''}
                    {b.carryForward !== 0 && b.adjustments !== 0 ? ' · ' : ''}
                    {b.adjustments !== 0 ? `Adjusted ${b.adjustments > 0 ? '+' : ''}${formatNumber(b.adjustments)}` : ''}
                  </p>
                )}
                <p className="text-gray-400">{SOURCE_LABEL[b.entitlementSource]}{b.prorated ? ' (prorated)' : ''}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default LeaveBalanceCards;
