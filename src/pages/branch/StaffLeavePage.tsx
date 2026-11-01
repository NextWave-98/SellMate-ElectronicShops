import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, ListChecks, Plane, Plus, RefreshCw, ScrollText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveBalanceCards } from '@/components/leave/LeaveBalanceCards';
import { LeaveCalendar } from '@/components/leave/LeaveCalendar';
import { LeaveRequestDetailDialog } from '@/components/leave/LeaveRequestDetailDialog';
import { LeaveRequestFormDialog } from '@/components/leave/LeaveRequestFormDialog';
import { LeaveStatusBadge, LeaveTypeChip } from '@/components/leave/LeaveStatusBadge';
import { formatDate, formatDays, formatNumber, formatRange, LEDGER_LABEL, localTodayIso, STATUS_LABEL } from '@/components/leave/leaveFormat';
import { useLeave } from '@/hooks/useLeave';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  LEAVE_STATUSES,
  type LeaveLedgerEntry,
  type LeaveMeta,
  type LeaveRequest,
  type LeaveRequestDetail,
  type LeaveType,
  type MyLeaveOverview,
  type Paginated,
} from '@/types/leave.types';

const PAGE_SIZE = 15;

export default function StaffLeavePage() {
  useNoIndex();
  const api = useLeave();
  const { branchCode } = useParams<{ branchCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [meta, setMeta] = useState<LeaveMeta | null>(null);
  const [leaveYear, setLeaveYear] = useState<number | null>(null);
  const [overview, setOverview] = useState<MyLeaveOverview | null>(null);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [history, setHistory] = useState<Paginated<LeaveRequest> | null>(null);
  const [ledger, setLedger] = useState<Paginated<LeaveLedgerEntry> | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequestDetail | null>(null);

  const selectedId = searchParams.get('request');
  const selectRequest = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('request', id);
    else next.delete('request');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    void Promise.all([api.getMeta(), api.listTypes()]).then(([m, t]) => {
      setMeta(m);
      setLeaveYear(m?.leaveYear ?? null);
      setTypes(t ?? []);
    });
  }, [api]);

  const loadOverview = useCallback(async () => {
    if (leaveYear === null) return;
    setLoading(true);
    setOverview(await api.getMyOverview(leaveYear));
    setLoading(false);
  }, [api, leaveYear]);

  const loadHistory = useCallback(async () => {
    if (leaveYear === null) return;
    setHistory(
      await api.getMyRequests({ leaveYear, status: statusFilter === 'all' ? undefined : statusFilter, page, limit: PAGE_SIZE }),
    );
  }, [api, leaveYear, statusFilter, page]);

  const loadLedger = useCallback(async () => {
    if (leaveYear === null) return;
    setLedger(await api.getMyLedger({ leaveYear, page: 1, limit: 100 }));
  }, [api, leaveYear]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);
  useEffect(() => { void loadLedger(); }, [loadLedger]);

  const refresh = () => {
    void loadOverview();
    void loadHistory();
    void loadLedger();
  };

  const today = meta?.today ?? overview?.today ?? localTodayIso();
  const canRequest = !!meta?.permissions.createOwn && meta.enabled;
  const canManage =
    !!meta &&
    (meta.permissions.viewTeam || meta.permissions.approve || meta.permissions.confirm || meta.permissions.manageTypes ||
      meta.permissions.managePolicies || meta.permissions.manageEntitlements || meta.permissions.manageBalances || meta.permissions.viewReports);

  if (meta && !meta.permissions.viewOwn) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-10 text-center text-gray-500">You do not have access to leave.</CardContent></Card>
      </div>
    );
  }

  const openList = (title: string, rows: LeaveRequest[], empty: string) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">{empty}</p>
        ) : (
          rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => selectRequest(r.id)}
              className="flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left hover:bg-gray-50"
            >
              <div className="min-w-0">
                <LeaveTypeChip name={r.leaveTypeName} color={r.leaveTypeColor} />
                <p className="text-xs text-gray-500">{formatRange(r.startDate, r.endDate)} · {formatDays(r.totalDays)}</p>
              </div>
              <LeaveStatusBadge status={r.status} stepName={r.currentStepName} />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leave</h1>
          <p className="text-gray-500 text-sm mt-1">
            {overview ? `Leave year ${overview.leaveYearLabel} (${formatDate(overview.leaveYearStart)} – ${formatDate(overview.leaveYearEnd)})` : 'Balances, requests and history'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {meta && (
            <Select value={String(leaveYear ?? meta.leaveYear)} onValueChange={(v) => { setLeaveYear(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[meta.leaveYear - 2, meta.leaveYear - 1, meta.leaveYear, meta.leaveYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          {canManage && branchCode && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/${branchCode}/team-leave`}><Users className="h-4 w-4 mr-2" />Team leave</Link>
            </Button>
          )}
          {canRequest && (
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Request leave
            </Button>
          )}
        </div>
      </div>

      {meta && !meta.enabled && (
        <Card><CardContent className="py-4 text-sm text-amber-800 bg-amber-50">Leave requests are currently turned off for your organization.</CardContent></Card>
      )}

      {overview?.onLeaveToday && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex items-center gap-3 text-green-800">
            <Plane className="h-5 w-5" />
            <p className="text-sm">
              You are on {overview.onLeaveToday.leaveTypeName} today ({formatRange(overview.onLeaveToday.startDate, overview.onLeaveToday.endDate)}).
            </p>
          </CardContent>
        </Card>
      )}

      <LeaveBalanceCards balances={overview?.balances ?? []} loading={loading && !overview} />

      <Tabs defaultValue="requests">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max min-w-full sm:w-auto">
            <TabsTrigger value="requests"><ListChecks className="h-4 w-4 mr-2" />Requests</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-2" />Calendar</TabsTrigger>
            <TabsTrigger value="history"><ScrollText className="h-4 w-4 mr-2" />Balance history</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {openList('Pending approval', overview?.pending ?? [], 'Nothing waiting for approval.')}
            {openList('Upcoming leave', overview?.upcoming ?? [], 'No upcoming leave.')}
            {openList('Drafts', overview?.drafts ?? [], 'No drafts.')}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">All requests</CardTitle>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {LEAVE_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!history ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">Loading…</TableCell></TableRow>
                    ) : history.rows.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">No leave requests.</TableCell></TableRow>
                    ) : (
                      history.rows.map((r) => (
                        <TableRow key={r.id} className="cursor-pointer" onClick={() => selectRequest(r.id)}>
                          <TableCell><LeaveTypeChip name={r.leaveTypeName} color={r.leaveTypeColor} /></TableCell>
                          <TableCell className="whitespace-nowrap">{formatRange(r.startDate, r.endDate)}</TableCell>
                          <TableCell>{formatNumber(r.totalDays)}</TableCell>
                          <TableCell><LeaveStatusBadge status={r.status} stepName={r.currentStepName} /></TableCell>
                          <TableCell className="whitespace-nowrap text-gray-500">{formatDate(r.submittedAt ?? r.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {history && history.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 p-3">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="text-sm text-gray-500">Page {page} of {history.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= history.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          {overview && (
            <LeaveCalendar api={api} today={today} filters={{ userId: overview.employee.userId }} onSelect={selectRequest} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ledger?.rows ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">No balance movements this leave year.</TableCell></TableRow>
                    ) : (
                      ledger?.rows.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(e.createdAt)}</TableCell>
                          <TableCell>{e.leaveTypeName}</TableCell>
                          <TableCell>{LEDGER_LABEL[e.entryType]}</TableCell>
                          <TableCell className={`text-right font-medium ${e.days < 0 ? 'text-red-600' : 'text-green-700'}`}>
                            {e.days > 0 ? '+' : ''}{formatNumber(e.days)}
                          </TableCell>
                          <TableCell className="text-gray-600">{e.reason ?? '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="p-3 text-xs text-gray-500">
                Your entitlement comes from your organization&apos;s leave policy; this list shows every change on top of it.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeaveRequestFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        api={api}
        types={types}
        allowHalfDay={meta?.allowHalfDay ?? true}
        today={today}
        existing={editing}
        onSaved={(detail) => { refresh(); selectRequest(detail.id); }}
      />

      <LeaveRequestDetailDialog
        requestId={formOpen ? null : selectedId}
        onClose={() => selectRequest(null)}
        api={api}
        onChanged={refresh}
        onEdit={(detail) => { setEditing(detail); setFormOpen(true); }}
      />
    </div>
  );
}
