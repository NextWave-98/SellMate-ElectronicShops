import { useCallback, useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import { LEAVE_STATUSES, type LeaveRequestRow, type Paginated } from '@/types/leave.types';
import { LeaveStatusBadge, LeaveTypeChip } from '../LeaveStatusBadge';
import { downloadCsv, formatDate, formatNumber, formatRange, STATUS_LABEL } from '../leaveFormat';
import { fromSelect, type LeaveAdminShared } from './shared';
import { EmptyRow, FilterSelect } from './widgets';

const PAGE_SIZE = 25;

interface LeaveRequestsTabProps {
  shared: LeaveAdminShared;
  leaveYear: number;
  /** Bumped by the page whenever a request changes elsewhere. */
  version: number;
}

export function LeaveRequestsTab({ shared, leaveYear, version }: LeaveRequestsTabProps) {
  const { api, meta, allTypes, branches, roles, openRequest } = shared;
  const [status, setStatus] = useState(meta.permissions.approve || meta.permissions.confirm ? 'ACTIONABLE' : 'all');
  const [leaveTypeId, setLeaveTypeId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [roleId, setRoleId] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<LeaveRequestRow> | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const query = useCallback(
    (p: number, limit: number) => ({
      status: fromSelect(status),
      leaveTypeId: fromSelect(leaveTypeId),
      locationId: fromSelect(locationId),
      roleId: fromSelect(roleId),
      from: from || undefined,
      to: to || undefined,
      leaveYear: from || to ? undefined : leaveYear,
      search: debouncedSearch.trim() || undefined,
      page: p,
      limit,
    }),
    [status, leaveTypeId, locationId, roleId, from, to, leaveYear, debouncedSearch],
  );

  useEffect(() => {
    let cancelled = false;
    setData(null);
    void api.listRequests(query(page, PAGE_SIZE)).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [api, query, page, version]);

  const exportCsv = async () => {
    const all = await api.listRequests(query(1, 200));
    if (!all) return;
    downloadCsv(
      `leave-requests-${leaveYear}.csv`,
      ['Employee', 'Branch', 'Leave type', 'Paid', 'Start', 'End', 'Days', 'Status', 'Submitted'],
      all.rows.map((r) => [
        r.employeeName, r.locationName, r.leaveTypeName, r.isPaid ? 'Yes' : 'No', r.startDate, r.endDate,
        r.totalDays, STATUS_LABEL[r.status], r.submittedAt?.slice(0, 10) ?? '',
      ]),
    );
  };

  const statusOptions = [
    ...(meta.permissions.approve || meta.permissions.confirm ? [{ value: 'ACTIONABLE', label: 'Needs action' }] : []),
    ...LEAVE_STATUSES.filter((s) => s !== 'DRAFT').map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
            <div className="space-y-1 xl:col-span-2">
              <Label className="text-xs text-gray-500">Search employee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name or email" />
              </div>
            </div>
            <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statusOptions} />
            <FilterSelect label="Leave type" value={leaveTypeId} onChange={(v) => { setLeaveTypeId(v); setPage(1); }} options={allTypes.map((t) => ({ value: t.id, label: t.name }))} />
            {meta.scope === 'ALL' && (
              <FilterSelect label="Branch" value={locationId} onChange={(v) => { setLocationId(v); setPage(1); }} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            )}
            {roles.length > 0 && (
              <FilterSelect label="Role" value={roleId} onChange={(v) => { setRoleId(v); setPage(1); }} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
            )}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 p-3">
            <p className="text-sm text-gray-500">{data ? `${data.total} request${data.total === 1 ? '' : 's'}` : 'Loading…'}</p>
            <Button variant="outline" size="sm" onClick={() => void exportCsv()}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data ? (
                  <EmptyRow colSpan={7}>Loading…</EmptyRow>
                ) : data.rows.length === 0 ? (
                  <EmptyRow colSpan={7}>No leave requests match these filters.</EmptyRow>
                ) : (
                  data.rows.map((r) => {
                    const actionable = r.permissions.canApprove || r.permissions.canConfirm;
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => openRequest(r.id)}>
                        <TableCell>
                          <p className="font-medium">{r.employeeName}</p>
                          <p className="text-xs text-gray-500">{r.locationName ?? '—'}</p>
                        </TableCell>
                        <TableCell><LeaveTypeChip name={r.leaveTypeName} color={r.leaveTypeColor} /></TableCell>
                        <TableCell className="whitespace-nowrap">{formatRange(r.startDate, r.endDate)}</TableCell>
                        <TableCell>{formatNumber(r.totalDays)}</TableCell>
                        <TableCell><LeaveStatusBadge status={r.status} stepName={r.currentStepName} /></TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500">{formatDate(r.submittedAt ?? r.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant={actionable ? 'default' : 'outline'} onClick={(e) => { e.stopPropagation(); openRequest(r.id); }}>
                            {r.permissions.canApprove ? 'Review' : r.permissions.canConfirm ? 'Confirm' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 p-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-gray-500">Page {page} of {data.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LeaveRequestsTab;
