import { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import type { BalanceListRow, LeaveBalance, LeaveType, Paginated } from '@/types/leave.types';
import { balanceAvailableLabel, downloadCsv, formatNumber, SOURCE_LABEL } from '../leaveFormat';
import { fromSelect, type LeaveAdminShared } from './shared';
import { EmptyRow, FilterSelect } from './widgets';

const PAGE_SIZE = 25;

type BalancePage = Paginated<BalanceListRow> & { leaveYear: number; types: LeaveType[] };

function cell(b: LeaveBalance | undefined) {
  if (!b) return <span className="text-gray-300">—</span>;
  if (b.isUnlimited) return <span className="text-gray-500">Unlimited</span>;
  const available = b.available ?? 0;
  return (
    <div title={`${SOURCE_LABEL[b.entitlementSource]} · allocated ${formatNumber(b.totalAllocated)} · used ${formatNumber(b.used)} · approved ${formatNumber(b.approved)} · pending ${formatNumber(b.pending)}`}>
      <span className={`font-medium ${available < 0 ? 'text-red-600' : ''}`}>{balanceAvailableLabel(b)}</span>
      <span className="text-xs text-gray-400"> / {formatNumber(b.totalAllocated)}</span>
      {b.pending > 0 && <p className="text-[11px] text-amber-600">{formatNumber(b.pending)} pending</p>}
    </div>
  );
}

export function LeaveBalancesTab({ shared, leaveYear }: { shared: LeaveAdminShared; leaveYear: number }) {
  const { api, meta, branches, roles } = shared;
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('all');
  const [roleId, setRoleId] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BalancePage | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    void api
      .listBalances({
        leaveYear,
        search: debouncedSearch.trim() || undefined,
        locationId: fromSelect(locationId),
        roleId: fromSelect(roleId),
        page,
        limit: PAGE_SIZE,
      })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [api, leaveYear, debouncedSearch, locationId, roleId, page]);

  const types = data?.types ?? [];

  const exportCsv = async () => {
    const all = await api.listBalances({
      leaveYear,
      search: debouncedSearch.trim() || undefined,
      locationId: fromSelect(locationId),
      roleId: fromSelect(roleId),
      page: 1,
      limit: 200,
    });
    if (!all) return;
    const header = ['Employee', 'Email', 'Branch', 'Role'];
    for (const t of all.types) header.push(`${t.name} allocated`, `${t.name} used`, `${t.name} pending`, `${t.name} available`);
    downloadCsv(
      `leave-balances-${leaveYear}.csv`,
      header,
      all.rows.map((r) => {
        const row: Array<string | number | null> = [r.employee.name, r.employee.email, r.employee.locationName, r.employee.roleName];
        for (const t of all.types) {
          const b = r.balances.find((x) => x.leaveTypeId === t.id);
          row.push(
            b?.isUnlimited ? 'Unlimited' : b?.totalAllocated ?? null,
            b ? b.used + b.approved : null,
            b?.pending ?? null,
            b?.isUnlimited ? 'Unlimited' : b?.available ?? null,
          );
        }
        return row;
      }),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Search employee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name, email or staff ID" />
              </div>
            </div>
            {meta.scope === 'ALL' && (
              <FilterSelect label="Branch" value={locationId} onChange={(v) => { setLocationId(v); setPage(1); }} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            )}
            {roles.length > 0 && (
              <FilterSelect label="Role" value={roleId} onChange={(v) => { setRoleId(v); setPage(1); }} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
            )}
            <Button variant="outline" onClick={() => void exportCsv()}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Employee</TableHead>
                  {types.map((t) => (
                    <TableHead key={t.id} className="whitespace-nowrap">
                      <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data ? (
                  <EmptyRow colSpan={types.length + 1}>Loading…</EmptyRow>
                ) : data.rows.length === 0 ? (
                  <EmptyRow colSpan={types.length + 1}>No employees found.</EmptyRow>
                ) : (
                  data.rows.map((r) => (
                    <TableRow key={r.employee.userId}>
                      <TableCell>
                        <p className="font-medium">{r.employee.name}{!r.employee.isActive && <span className="text-xs text-gray-400"> (inactive)</span>}</p>
                        <p className="text-xs text-gray-500">{[r.employee.roleName, r.employee.locationName].filter(Boolean).join(' · ') || '—'}</p>
                      </TableCell>
                      {types.map((t) => <TableCell key={t.id}>{cell(r.balances.find((b) => b.leaveTypeId === t.id))}</TableCell>)}
                    </TableRow>
                  ))
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
          <p className="p-3 text-xs text-gray-500">Available = allocated (entitlement + carried forward + adjustments) − used − approved. Hover a balance for details.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default LeaveBalancesTab;
