import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveAdjustmentsTab } from '@/components/leave/admin/LeaveAdjustmentsTab';
import { LeaveBalancesTab } from '@/components/leave/admin/LeaveBalancesTab';
import { LeaveEntitlementsTab } from '@/components/leave/admin/LeaveEntitlementsTab';
import { LeaveOverviewTab } from '@/components/leave/admin/LeaveOverviewTab';
import { LeaveReportsTab } from '@/components/leave/admin/LeaveReportsTab';
import { LeaveRequestsTab } from '@/components/leave/admin/LeaveRequestsTab';
import { LeaveSettingsTab } from '@/components/leave/admin/LeaveSettingsTab';
import { LeaveTypesTab } from '@/components/leave/admin/LeaveTypesTab';
import type { LeaveAdminShared, LeaveBranch } from '@/components/leave/admin/shared';
import { FilterSelect } from '@/components/leave/admin/widgets';
import { LeaveCalendar } from '@/components/leave/LeaveCalendar';
import { LeaveRequestDetailDialog } from '@/components/leave/LeaveRequestDetailDialog';
import { LeaveRequestFormDialog } from '@/components/leave/LeaveRequestFormDialog';
import { useLeave } from '@/hooks/useLeave';
import { useNoIndex } from '@/hooks/useNoIndex';
import type { LeaveEmployee, LeaveMeta, LeaveRequestDetail, LeaveRole, LeaveType } from '@/types/leave.types';

type TabId =
  | 'overview' | 'requests' | 'calendar' | 'balances' | 'types' | 'policies'
  | 'roles' | 'overrides' | 'adjustments' | 'reports' | 'settings';

const TAB_LABEL: Record<TabId, string> = {
  overview: 'Overview',
  requests: 'Requests',
  calendar: 'Calendar',
  balances: 'Balances',
  types: 'Leave Types',
  policies: 'Policies',
  roles: 'Role Entitlements',
  overrides: 'Employee Overrides',
  adjustments: 'Adjustments',
  reports: 'Reports',
  settings: 'Settings',
};

function visibleTabs(meta: LeaveMeta): TabId[] {
  const p = meta.permissions;
  const team = p.viewTeam;
  const tabs: Array<[TabId, boolean]> = [
    ['overview', team],
    ['requests', team],
    ['calendar', team],
    ['balances', team],
    ['types', p.manageTypes || p.view],
    ['policies', p.managePolicies || p.view],
    ['roles', p.manageEntitlements || p.view],
    ['overrides', p.manageEntitlements || p.view],
    ['adjustments', p.manageBalances || p.view],
    ['reports', p.viewReports],
    ['settings', p.managePolicies || p.view],
  ];
  return tabs.filter(([, allowed]) => allowed).map(([id]) => id);
}

export default function LeaveManagementPage() {
  useNoIndex();
  const api = useLeave();
  const { branchCode } = useParams<{ branchCode?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [meta, setMeta] = useState<LeaveMeta | null>(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [allTypes, setAllTypes] = useState<LeaveType[]>([]);
  const [roles, setRoles] = useState<LeaveRole[]>([]);
  const [employees, setEmployees] = useState<LeaveEmployee[]>([]);
  const [leaveYear, setLeaveYear] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequestDetail | null>(null);
  const [calendarBranch, setCalendarBranch] = useState('all');
  const [calendarType, setCalendarType] = useState('all');

  const reloadTypes = useCallback(() => {
    void api.listTypes(true).then((t) => setAllTypes(t ?? []));
  }, [api]);

  useEffect(() => {
    void api.getMeta().then((m) => {
      setMeta(m);
      setMetaLoaded(true);
      if (!m) return;
      setLeaveYear(m.leaveYear);
      reloadTypes();
      const p = m.permissions;
      if (p.viewTeam || p.view || p.viewReports || p.manageTypes || p.managePolicies || p.manageEntitlements || p.manageBalances) {
        void api.listRoles().then((r) => setRoles(r ?? []));
      }
      if (p.viewTeam) void api.lookupEmployees({ limit: 500 }).then((e) => setEmployees(e ?? []));
    });
  }, [api, reloadTypes]);

  const branches = useMemo<LeaveBranch[]>(() => {
    const map = new Map<string, string>();
    for (const e of employees) if (e.locationId && e.locationName) map.set(e.locationId, e.locationName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const selectedId = searchParams.get('request');
  const setParam = useCallback((key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const openRequest = useCallback((id: string) => setParam('request', id), [setParam]);

  const shared = useMemo<LeaveAdminShared | null>(() => (meta ? {
    api,
    meta,
    types: allTypes.filter((t) => t.isActive),
    allTypes,
    roles,
    employees,
    branches,
    reloadTypes,
    openRequest,
  } : null), [api, meta, allTypes, roles, employees, branches, reloadTypes, openRequest]);

  if (!metaLoaded) return <p className="p-6 text-center text-sm text-gray-400">Loading…</p>;

  if (!meta || !shared) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-10 text-center text-gray-500">Leave management is not available for your account.</CardContent></Card>
      </div>
    );
  }

  const tabs = visibleTabs(meta);
  if (tabs.length === 0) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-10 text-center text-gray-500">You do not have permission to manage leave.</CardContent></Card>
      </div>
    );
  }

  const requestedTab = searchParams.get('tab') as TabId | null;
  const tab = requestedTab && tabs.includes(requestedTab) ? requestedTab : tabs[0];
  const year = leaveYear ?? meta.leaveYear;
  const refresh = () => setVersion((v) => v + 1);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Requests, balances and leave policy{meta.scope === 'BRANCH' ? ' for your branch' : ''} · leave year {meta.leaveYearLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={String(year)} onValueChange={(v) => setLeaveYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[meta.leaveYear - 2, meta.leaveYear - 1, meta.leaveYear, meta.leaveYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          {branchCode && meta.permissions.viewOwn && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/${branchCode}/leave`}><User className="h-4 w-4 mr-2" />My leave</Link>
            </Button>
          )}
          {(meta.permissions.create || meta.permissions.createOwn) && meta.enabled && (
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />New request
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParam('tab', v)}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max min-w-full sm:w-auto">
            {tabs.map((id) => <TabsTrigger key={id} value={id}>{TAB_LABEL[id]}</TabsTrigger>)}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          {tab === 'overview' && <LeaveOverviewTab key={`${year}-${version}`} shared={shared} leaveYear={year} />}
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          {tab === 'requests' && <LeaveRequestsTab shared={shared} leaveYear={year} version={version} />}
        </TabsContent>
        <TabsContent value="calendar" className="mt-4 space-y-3">
          {tab === 'calendar' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {meta.scope === 'ALL' && (
                  <FilterSelect label="Branch" value={calendarBranch} onChange={setCalendarBranch} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
                )}
                <FilterSelect label="Leave type" value={calendarType} onChange={setCalendarType} options={allTypes.map((t) => ({ value: t.id, label: t.name }))} />
              </div>
              <LeaveCalendar
                key={version}
                api={api}
                today={meta.today}
                showEmployee
                onSelect={openRequest}
                filters={{
                  locationId: calendarBranch === 'all' ? undefined : calendarBranch,
                  leaveTypeId: calendarType === 'all' ? undefined : calendarType,
                }}
              />
            </>
          )}
        </TabsContent>
        <TabsContent value="balances" className="mt-4">
          {tab === 'balances' && <LeaveBalancesTab key={version} shared={shared} leaveYear={year} />}
        </TabsContent>
        <TabsContent value="types" className="mt-4">
          {tab === 'types' && <LeaveTypesTab shared={shared} />}
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          {tab === 'policies' && <LeaveSettingsTab shared={shared} section="policies" />}
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          {tab === 'roles' && <LeaveEntitlementsTab shared={shared} kind="role" />}
        </TabsContent>
        <TabsContent value="overrides" className="mt-4">
          {tab === 'overrides' && <LeaveEntitlementsTab shared={shared} kind="employee" />}
        </TabsContent>
        <TabsContent value="adjustments" className="mt-4">
          {tab === 'adjustments' && <LeaveAdjustmentsTab key={version} shared={shared} leaveYear={year} />}
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          {tab === 'reports' && <LeaveReportsTab shared={shared} />}
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          {tab === 'settings' && <LeaveSettingsTab shared={shared} section="settings" />}
        </TabsContent>
      </Tabs>

      <LeaveRequestFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        api={api}
        types={shared.types}
        allowHalfDay={meta.allowHalfDay}
        today={meta.today}
        employees={meta.permissions.create && !editing ? employees : undefined}
        existing={editing}
        onSaved={(detail) => { refresh(); openRequest(detail.id); }}
      />

      <LeaveRequestDetailDialog
        requestId={formOpen ? null : selectedId}
        onClose={() => setParam('request', null)}
        api={api}
        showEmployee
        onChanged={refresh}
        onEdit={(detail) => { setEditing(detail); setFormOpen(true); }}
      />
    </div>
  );
}
