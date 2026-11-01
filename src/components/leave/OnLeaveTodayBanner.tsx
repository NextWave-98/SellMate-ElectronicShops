import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLeave } from '@/hooks/useLeave';
import { usePermissions } from '@/hooks/usePermissions';
import type { LeaveRequest } from '@/types/leave.types';
import { formatRange } from './leaveFormat';

/** Shown on the attendance page when the signed-in employee has leave covering today. */
export function OnLeaveTodayBanner() {
  const api = useLeave();
  const { canAccessModule } = usePermissions();
  const { branchCode } = useParams<{ branchCode?: string }>();
  const allowed = canAccessModule('leave');
  const [leave, setLeave] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void api.getMyOverview().then((overview) => {
      if (active) setLeave(overview?.onLeaveToday ?? null);
    });
    return () => { active = false; };
  }, [api, allowed]);

  if (!leave) return null;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="py-4 flex flex-wrap items-center gap-3 text-green-800">
        <Plane className="h-5 w-5" />
        <p className="text-sm font-medium flex-1">
          You are on {leave.leaveTypeName} today ({formatRange(leave.startDate, leave.endDate)}). No check-in is needed.
        </p>
        {branchCode && (
          <Link to={`/${branchCode}/leave?request=${leave.id}`} className="text-sm font-medium underline">View leave</Link>
        )}
      </CardContent>
    </Card>
  );
}
