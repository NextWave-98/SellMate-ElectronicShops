/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Undo2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAccounting } from '../../../hooks/useAccounting';
import { money, todayISO, monthStart } from './shared';

/** Journal entries: guided quick entry, manual double entry, POS sales import. */
export default function AccountingJournalsPage() {
  const { listAccounts, listJournals, getJournal, createJournal, voidJournal, syncSales } = useAccounting();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);

  const loadAccounts = useCallback(async () => {
    const res = await listAccounts();
    setAccounts((res?.data as any) ?? []);
  }, [listAccounts]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const loadJournals = useCallback(async (toPage = 1) => {
    const res = await listJournals({ page: toPage, limit: 100 });
    const payload: any = res?.data ?? [];
    // The endpoint now pages. Accept the plain array too, so the page still
    // works against a backend that has not been redeployed yet.
    setJournals(Array.isArray(payload) ? payload : (payload.rows ?? []));
    setPagination(Array.isArray(payload) ? null : (payload.pagination ?? null));
    setPage(toPage);
  }, [listJournals]);

  useEffect(() => { loadAccounts(); loadJournals(); }, [loadAccounts, loadJournals]);

  // What is actually IN an entry. The API could always answer this; nothing
  // ever asked it, so a journal was a row with a total and no way to see the
  // two sides that made it.
  const [detail, setDetail] = useState<any>(null);
  const openDetail = async (id: string) => {
    const res = await getJournal(id);
    setDetail(res?.data ?? null);
  };

  // Guided quick entry
  const [quick, setQuick] = useState<any>({ kind: 'SALE', moneyAccountId: '', categoryAccountId: '', amount: '', date: todayISO(), memo: '' });
  const postQuick = async () => {
    const amt = Number(quick.amount);
    if (!amt || !quick.moneyAccountId || !quick.categoryAccountId) return;
    const lines = quick.kind === 'SALE'
      ? [{ accountId: quick.moneyAccountId, debit: amt, credit: 0 }, { accountId: quick.categoryAccountId, debit: 0, credit: amt }]
      : [{ accountId: quick.categoryAccountId, debit: amt, credit: 0 }, { accountId: quick.moneyAccountId, debit: 0, credit: amt }];
    const res = await createJournal({ entryDate: quick.date, memo: quick.memo || (quick.kind === 'SALE' ? 'Sale' : 'Expense'), lines });
    if (res?.success || res?.status) { setQuick({ ...quick, amount: '', memo: '' }); loadJournals(); }
  };
  const importSales = async () => { await syncSales(monthStart(), todayISO()); loadJournals(); };

  // Manual journal entry
  const [showJ, setShowJ] = useState(false);
  const [jHead, setJHead] = useState<any>({ entryDate: todayISO(), memo: '' });
  const [jLines, setJLines] = useState<any[]>([{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }]);
  const totDr = jLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totCr = jLines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = totDr === totCr && totDr > 0;
  const setLine = (i: number, patch: any) => setJLines(jLines.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const submitJournal = async () => {
    const lines = jLines.filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }));
    const res = await createJournal({ entryDate: new Date(jHead.entryDate).toISOString().slice(0, 10), memo: jHead.memo || null, lines });
    if (res?.success || res?.status) {
      setShowJ(false); setJHead({ entryDate: todayISO(), memo: '' });
      setJLines([{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }]);
      loadJournals();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={importSales} disabled={accounts.length === 0} title="Post this month's completed POS sales as a journal entry">Import POS sales</Button>
        <Button variant="outline" onClick={() => loadJournals(page)}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
        <Button onClick={() => setShowJ(true)} disabled={accounts.length === 0}><Plus className="w-4 h-4 mr-1" /> New Entry</Button>
      </div>

      {/* Guided quick entry   no debit/credit knowledge required */}
      {accounts.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40"><CardContent className="p-4 grid gap-3">
          <p className="font-semibold text-sm text-blue-800">Quick Entry <span className="font-normal text-muted-foreground">  record a sale or expense in one step</span></p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
            <div>
              <Label>Type</Label>
              <select className="block w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={quick.kind} onChange={(e) => setQuick({ ...quick, kind: e.target.value, categoryAccountId: '' })}>
                <option value="SALE">Sale / Money In</option>
                <option value="EXPENSE">Expense / Money Out</option>
              </select>
            </div>
            <div>
              <Label>Money (Cash/Bank)</Label>
              <select className="block w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={quick.moneyAccountId} onChange={(e) => setQuick({ ...quick, moneyAccountId: e.target.value })}>
                <option value="">Select</option>
                {accounts.filter((a) => a.type === 'ASSET').map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </select>
            </div>
            <div>
              <Label>{quick.kind === 'SALE' ? 'Income to' : 'Expense as'}</Label>
              <select className="block w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={quick.categoryAccountId} onChange={(e) => setQuick({ ...quick, categoryAccountId: e.target.value })}>
                <option value="">Select</option>
                {accounts.filter((a) => a.type === (quick.kind === 'SALE' ? 'INCOME' : 'EXPENSE')).map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </select>
            </div>
            <div><Label>Amount (Rs)</Label><Input type="number" value={quick.amount} onChange={(e) => setQuick({ ...quick, amount: e.target.value })} /></div>
            <div><Button className="w-full" onClick={postQuick} disabled={!quick.amount || !quick.moneyAccountId || !quick.categoryAccountId}>Post</Button></div>
          </div>
          <Input placeholder="Memo (optional)" value={quick.memo} onChange={(e) => setQuick({ ...quick, memo: e.target.value })} />
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-muted-foreground"><tr>
            <th className="p-3">No.</th><th className="p-3">Date</th><th className="p-3">Memo</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {journals.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="p-3 font-mono text-xs">{j.entryNo}</td><td className="p-3">{j.entryDate}</td>
                <td className="p-3">{j.memo || ' '}</td><td className="p-3 text-right">{money(j.totalDebit)}</td>
                <td className="p-3"><Badge variant={j.status === 'POSTED' ? 'default' : 'outline'} className="text-[10px]">{j.status}</Badge></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" title="View lines" onClick={() => openDetail(j.id)}><Eye className="w-4 h-4 text-gray-500" /></Button>
                  {j.status === 'POSTED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Reverse   posts the opposite entry and keeps this one"
                      onClick={async () => { await voidJournal(j.id); loadJournals(page); }}
                    >
                      <Undo2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {journals.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No journal entries.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadJournals(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => loadJournals(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* What the entry is made of */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.entryNo}   {detail?.entryDate}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3">
              {detail.memo && <p className="text-sm text-muted-foreground">{detail.memo}</p>}
              {detail.reversalOfId && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  This entry reverses another one.
                </p>
              )}
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground text-left">
                  <th className="py-1">Account</th><th className="py-1">Description</th>
                  <th className="py-1 text-right">Debit</th><th className="py-1 text-right">Credit</th>
                </tr></thead>
                <tbody>
                  {(detail.lines ?? []).map((l: any) => (
                    <tr key={l.id} className="border-t">
                      <td className="py-1"><span className="font-mono text-xs">{l.account?.code}</span> {l.account?.name}</td>
                      <td className="py-1 text-muted-foreground">{l.description || ' '}</td>
                      <td className="py-1 text-right">{Number(l.debit) ? money(l.debit) : ''}</td>
                      <td className="py-1 text-right">{Number(l.credit) ? money(l.credit) : ''}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-medium">
                    <td className="py-1" colSpan={2}>Total</td>
                    <td className="py-1 text-right">{money(detail.totalDebit)}</td>
                    <td className="py-1 text-right">{money(detail.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetail(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journal dialog */}
      <Dialog open={showJ} onOpenChange={setShowJ}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={jHead.entryDate} onChange={(e) => setJHead({ ...jHead, entryDate: e.target.value })} /></div>
              <div><Label>Memo</Label><Input value={jHead.memo} onChange={(e) => setJHead({ ...jHead, memo: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              {jLines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select className="col-span-6 h-9 rounded-md border border-input bg-background px-2 text-sm" value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>
                    <option value="">Select account…</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code}   {a.name}</option>)}
                  </select>
                  <Input className="col-span-3" type="number" placeholder="Debit" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: 0 })} />
                  <Input className="col-span-3" type="number" placeholder="Credit" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: 0 })} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setJLines([...jLines, { accountId: '', debit: 0, credit: 0 }])}><Plus className="w-3 h-3 mr-1" /> Add line</Button>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${balanced ? 'text-green-700' : 'text-red-600'}`}>
              <span>Debit {money(totDr)} · Credit {money(totCr)}</span>
              <span>{balanced ? '✓ Balanced' : 'Not balanced'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJ(false)}>Cancel</Button>
            <Button onClick={submitJournal} disabled={!balanced}>Post Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
