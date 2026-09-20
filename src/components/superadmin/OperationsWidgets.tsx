/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Truck, ListChecks, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAppointment } from '../../hooks/useAppointment';
import { useTowing } from '../../hooks/useTowing';
import { useCrm } from '../../hooks/useCrm';

/**
 * Self-contained dashboard widget row for the newer modules
 * (appointments, towing, CRM). Each widget only appears if its module
 * responds (i.e. the org has access)   otherwise it stays hidden.
 */
export default function OperationsWidgets() {
  const appt = useAppointment();
  const towing = useTowing();
  const crm = useCrm();
  const navigate = useNavigate();

  const [apptStats, setApptStats] = useState<any>(null);
  const [towStats, setTowStats] = useState<any>(null);
  const [crmStats, setCrmStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try { const r = await appt.getStats(); if (r?.data) setApptStats(r.data); } catch { /* no access */ }
      try { const r = await towing.getStats(); if (r?.data) setTowStats(r.data); } catch { /* no access */ }
      try { const r = await crm.getStats(); if (r?.data) setCrmStats(r.data); } catch { /* no access */ }
    })();
  }, [appt, towing, crm]);

  const widgets: any[] = [];
  if (apptStats) {
    widgets.push({ key: 'appt', icon: CalendarDays, label: "Today's Appointments", value: apptStats.today ?? 0, sub: `${apptStats.pendingRequests ?? 0} online requests`, color: 'text-blue-700', to: '/superadmin/appointments' });
  }
  if (towStats) {
    widgets.push({ key: 'tow', icon: Truck, label: 'Active Towing Jobs', value: towStats.active ?? 0, sub: `${towStats.completedToday ?? 0} completed today`, color: 'text-indigo-700', to: '/superadmin/towing' });
  }
  if (crmStats) {
    widgets.push({ key: 'crm', icon: ListChecks, label: 'Open CRM Tasks', value: crmStats.open ?? 0, sub: crmStats.overdue > 0 ? `${crmStats.overdue} overdue` : 'none overdue', color: 'text-purple-700', overdue: crmStats.overdue > 0, to: '/superadmin/crm-tasks' });
  }

  if (widgets.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {widgets.map((w) => {
        const Icon = w.icon;
        return (
          <Card key={w.key} className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(w.to)}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center"><Icon className={`w-6 h-6 ${w.color}`} /></div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{w.label}</p>
                <p className={`text-2xl font-bold ${w.color}`}>{w.value}</p>
                <p className={`text-xs flex items-center gap-1 ${w.overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {w.overdue && <AlertTriangle className="w-3 h-3" />}{w.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
