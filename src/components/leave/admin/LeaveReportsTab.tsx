import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LeaveReport } from '@/types/leave.types';
import { downloadCsv, formatNumber } from '../leaveFormat';
import { fromSelect, type LeaveAdminShared } from './shared';
import { EmptyRow, FilterSelect } from './widgets';

export function LeaveReportsTab({ shared }: { shared: LeaveAdminShared }) {
  const { api, meta, allTypes, branches, roles } = shared;
  const [from, setFrom] = useState(meta.leaveYearStart);
  const [to, setTo] = useState(meta.leaveYearEnd);
  const [locationId, setLocationId] = useState('all');
  const [roleId, setRoleId] = useState('all');
  const [leaveTypeId, setLeaveTypeId] = useState('all');
  const [report, setReport] = useState<LeaveReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let cancelled = false;
    setLoading(true);
    void api
      .getReport({ from, to, locationId: fromSelect(locationId), roleId: fromSelect(roleId), leaveTypeId: fromSelect(leaveTypeId) })
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [api, from, to, locationId, roleId, leaveTypeId]);

  const types = report?.byType ?? [];

  const exportEmployees = () => {
    if (!report) return;
    downloadCsv(
      `leave-report-${from}-to-${to}.csv`,
      ['Employee', 'Branch', 'Role', 'Total days', 'Paid days', 'Unpaid days', ...types.map((t) => t.name)],
      report.byEmployee.map((e) => [
        e.name, e.locationName, e.roleName, e.days, e.paidDays, e.unpaidDays,
        ...types.map((t) => e.byType[t.leaveTypeId] ?? 0),
      ]),
    );
  };

  const summaryTable = (title: string, rows: Array<{ key: string; name: string; days: number; employees: number }>) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Employees</TableHead><TableHead className="text-right">Days</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <EmptyRow colSpan={3}>No confirmed leave.</EmptyRow> : rows.map((r) => (
              <TableRow key={r.key}><TableCell>{r.name}</TableCell><TableCell className="text-right">{r.employees}</TableCell><TableCell className="text-right">{formatNumber(r.days)}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <FilterSelect label="Leave type" value={leaveTypeId} onChange={setLeaveTypeId} options={allTypes.map((t) => ({ value: t.id, label: t.name }))} />
            {meta.scope === 'ALL' && <FilterSelect label="Branch" value={locationId} onChange={setLocationId} options={branches.map((b) => ({ value: b.id, label: b.name }))} />}
            {roles.length > 0 && <FilterSelect label="Role" value={roleId} onChange={setRoleId} options={roles.map((r) => ({ value: r.id, label: r.name }))} />}
            <Button variant="outline" onClick={exportEmployees} disabled={!report}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
          {from > to && <p className="mt-2 text-xs text-red-600">"From" must be on or before "To".</p>}
          <p className="mt-2 text-xs text-gray-500">Counts confirmed leave day by day inside the range (up to two years).</p>
        </CardContent>
      </Card>

      {loading && !report ? (
        <p className="py-10 text-center text-sm text-gray-400"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading…</p>
      ) : report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ['Total days', formatNumber(report.totals.days)],
              ['Paid days', formatNumber(report.totals.paidDays)],
              ['Unpaid days', formatNumber(report.totals.unpaidDays)],
              ['Employees', report.totals.employees],
              ['Requests', report.totals.requests],
            ].map(([label, value]) => (
              <Card key={label}><CardContent className="pt-6"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Days by month</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} width={32} />
                    <Tooltip />
                    <Bar dataKey="days" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">By leave type</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="text-right">Requests</TableHead><TableHead className="text-right">Days</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {types.length === 0 ? <EmptyRow colSpan={3}>No confirmed leave.</EmptyRow> : types.map((t) => (
                      <TableRow key={t.leaveTypeId}>
                        <TableCell><span className="inline-block h-2 w-2 rounded-full mr-2" style={{ backgroundColor: t.color }} />{t.name}{t.isPaid ? '' : ' (unpaid)'}</TableCell>
                        <TableCell className="text-right">{t.requests}</TableCell>
                        <TableCell className="text-right">{formatNumber(t.days)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {summaryTable('By branch', report.byBranch.map((b) => ({ key: b.locationId ?? 'none', name: b.name, days: b.days, employees: b.employees })))}
            {summaryTable('By role', report.byRole.map((r) => ({ key: r.roleId ?? 'none', name: r.name, days: r.days, employees: r.employees })))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">By employee</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Unpaid</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byEmployee.length === 0 ? <EmptyRow colSpan={5}>No confirmed leave.</EmptyRow> : report.byEmployee.map((e) => (
                      <TableRow key={e.userId}>
                        <TableCell><p className="font-medium">{e.name}</p><p className="text-xs text-gray-500">{e.roleName ?? '—'}</p></TableCell>
                        <TableCell>{e.locationName ?? '—'}</TableCell>
                        <TableCell className="text-right">{formatNumber(e.paidDays)}</TableCell>
                        <TableCell className="text-right">{formatNumber(e.unpaidDays)}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(e.days)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default LeaveReportsTab;
