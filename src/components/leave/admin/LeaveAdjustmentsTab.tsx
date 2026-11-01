import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  LEAVE_LEDGER_TYPES,
  type CarryForwardResult,
  type LeaveBalance,
  type LeaveLedgerEntry,
  type Paginated,
} from '@/types/leave.types';
import { formatDate, formatNumber, LEDGER_LABEL } from '../leaveFormat';
import { fromSelect, type LeaveAdminShared } from './shared';
import { EmptyRow, FilterSelect } from './widgets';

const PAGE_SIZE = 25;

export function LeaveAdjustmentsTab({ shared, leaveYear }: { shared: LeaveAdminShared; leaveYear: number }) {
  const { api, meta, types, allTypes, employees } = shared;
  const canAdjust = meta.permissions.manageBalances;

  const [userId, setUserId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<LeaveBalance | null>(null);

  const [ledgerUser, setLedgerUser] = useState('all');
  const [ledgerType, setLedgerType] = useState('all');
  const [entryType, setEntryType] = useState('all');
  const [page, setPage] = useState(1);
  const [ledger, setLedger] = useState<Paginated<LeaveLedgerEntry> | null>(null);

  const [carry, setCarry] = useState<CarryForwardResult | null>(null);
  const [carrying, setCarrying] = useState(false);
  const carryFrom = leaveYear - 1;

  const loadLedger = useCallback(async () => {
    setLedger(
      await api.listLedger({
        leaveYear,
        userId: fromSelect(ledgerUser),
        leaveTypeId: fromSelect(ledgerType),
        entryType: fromSelect(entryType),
        page,
        limit: PAGE_SIZE,
      }),
    );
  }, [api, leaveYear, ledgerUser, ledgerType, entryType, page]);

  useEffect(() => { void loadLedger(); }, [loadLedger]);

  const amount = Number(days);
  const amountValid = days !== '' && Number.isFinite(amount) && amount > 0 && Number.isInteger(amount * 2);

  const submit = async () => {
    setSaving(true);
    const balance = await api.createAdjustment({
      userId,
      leaveTypeId,
      leaveYear,
      days: direction === 'add' ? amount : -amount,
      reason: reason.trim(),
    });
    setSaving(false);
    if (balance) {
      setResult(balance);
      setDays('');
      setReason('');
      void loadLedger();
    }
  };

  const runCarry = async (dryRun: boolean) => {
    setCarrying(true);
    const r = await api.carryForward(carryFrom, dryRun);
    setCarrying(false);
    if (r) {
      setCarry(r);
      if (!dryRun) void loadLedger();
    }
  };

  return (
    <div className="space-y-4">
      {canAdjust && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Adjust a balance ({leaveYear})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Employee</Label>
                  <Select value={userId} onValueChange={(v) => { setUserId(v); setResult(null); }}>
                    <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => <SelectItem key={e.userId} value={e.userId}>{e.name}{e.locationName ? `  ${e.locationName}` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Leave type</Label>
                  <Select value={leaveTypeId} onValueChange={(v) => { setLeaveTypeId(v); setResult(null); }}>
                    <SelectTrigger><SelectValue placeholder="Choose leave type" /></SelectTrigger>
                    <SelectContent>
                      {types.filter((t) => !t.isUnlimited).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Change</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as 'add' | 'remove')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add days</SelectItem>
                      <SelectItem value="remove">Remove days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Days</Label>
                  <Input type="number" min={0.5} step={0.5} value={days} onChange={(e) => setDays(e.target.value)} />
                  {days !== '' && !amountValid && <p className="text-xs text-red-600">Use whole or half days.</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Reason (kept in the audit trail)</Label>
                <Textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-600">
                  {result ? `New balance for ${result.leaveTypeName}: ${formatNumber(result.available)} of ${formatNumber(result.totalAllocated)}` : ''}
                </p>
                <Button onClick={() => void submit()} disabled={saving || !userId || !leaveTypeId || !amountValid || reason.trim().length < 3}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save adjustment
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Carry forward {carryFrom} → {carryFrom + 1}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Moves unused days from a closed leave year into the next one, capped by each leave type and the organization cap.
                Running it again never carries anyone twice. While carry forward is on in Policies, this also runs automatically once a leave year closes.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void runCarry(true)} disabled={carrying}>Preview</Button>
                <Button onClick={() => void runCarry(false)} disabled={carrying || !carry || !carry.dryRun || carry.rows.every((r) => r.alreadyCarried || r.carried <= 0)}>
                  {carrying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Carry forward
                </Button>
              </div>
              {carry && (
                <div className="space-y-2">
                  <p className="text-sm">
                    {carry.dryRun ? 'Preview: ' : 'Done: '}
                    {formatNumber(carry.totalDays)} day(s) for {carry.rows.filter((r) => r.carried > 0 && !r.alreadyCarried).length} balance(s)
                    {!carry.dryRun ? `, ${carry.created} entries created` : ''}.
                  </p>
                  <div className="max-h-56 overflow-y-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Unused</TableHead><TableHead>Carried</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {carry.rows.length === 0 ? <EmptyRow colSpan={4}>Nothing to carry forward.</EmptyRow> : carry.rows.map((r) => (
                          <TableRow key={`${r.userId}-${r.leaveTypeId}`}>
                            <TableCell>{r.employeeName}</TableCell>
                            <TableCell>{r.leaveTypeName}</TableCell>
                            <TableCell>{formatNumber(r.available)}</TableCell>
                            <TableCell>{r.alreadyCarried ? 'Already carried' : formatNumber(r.carried)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Balance ledger ({leaveYear})</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6">
            <FilterSelect label="Employee" value={ledgerUser} onChange={(v) => { setLedgerUser(v); setPage(1); }} options={employees.map((e) => ({ value: e.userId, label: e.name }))} />
            <FilterSelect label="Leave type" value={ledgerType} onChange={(v) => { setLedgerType(v); setPage(1); }} options={allTypes.map((t) => ({ value: t.id, label: t.name }))} />
            <FilterSelect label="Entry" value={entryType} onChange={(v) => { setEntryType(v); setPage(1); }} options={LEAVE_LEDGER_TYPES.map((t) => ({ value: t, label: LEDGER_LABEL[t] }))} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!ledger ? (
                  <EmptyRow colSpan={7}>Loading…</EmptyRow>
                ) : ledger.rows.length === 0 ? (
                  <EmptyRow colSpan={7}>No balance movements.</EmptyRow>
                ) : (
                  ledger.rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(e.createdAt)}</TableCell>
                      <TableCell>{e.employeeName}</TableCell>
                      <TableCell>{e.leaveTypeName}</TableCell>
                      <TableCell>{LEDGER_LABEL[e.entryType]}{e.sourceLeaveYear ? ` from ${e.sourceLeaveYear}` : ''}</TableCell>
                      <TableCell className={`text-right font-medium ${e.days < 0 ? 'text-red-600' : 'text-green-700'}`}>{e.days > 0 ? '+' : ''}{formatNumber(e.days)}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-gray-600">{e.reason ?? '—'}</TableCell>
                      <TableCell className="text-gray-600">{e.createdByName ?? 'System'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {ledger && ledger.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 p-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-gray-500">Page {page} of {ledger.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= ledger.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LeaveAdjustmentsTab;
