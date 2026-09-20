/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Pencil, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAccounting, ACCOUNT_TYPES } from '../../../hooks/useAccounting';
import { money, todayISO, monthStart } from './shared';

/** Chart of accounts + ledger drill-down. */
export default function AccountingAccountsPage() {
  const {
    listAccounts, seedChart, createAccount, updateAccount, generalLedger,
    openingBalanceState, balanceOpeningBalances, getAutoPost, setAutoPost,
  } = useAccounting();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [opening, setOpening] = useState<any>(null);
  const [autoPost, setAutoPostState] = useState<any>(null);

  const loadAccounts = useCallback(async () => {
    const res = await listAccounts();
    setAccounts((res?.data as any) ?? []);
    const ob = await openingBalanceState();
    setOpening(ob?.data ?? null);
    const ap = await getAutoPost();
    setAutoPostState(ap?.data ?? null);
  }, [listAccounts, openingBalanceState, getAutoPost]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const [showAcc, setShowAcc] = useState(false);
  const [accForm, setAccForm] = useState<any>({ code: '', name: '', type: 'ASSET', openingBalance: 0 });
  const submitAccount = async () => {
    if (!accForm.code || !accForm.name) return;
    const res = await createAccount({ ...accForm, openingBalance: Number(accForm.openingBalance) || 0 });
    if (res?.success || res?.status) { setShowAcc(false); setAccForm({ code: '', name: '', type: 'ASSET', openingBalance: 0 }); loadAccounts(); }
  };
  const seed = async () => { await seedChart(); loadAccounts(); };

  // Editing an account, not just switching it off. Type is the one field the
  // API refuses once the account has postings   changing it would flip which
  // side of the books every past entry reads on.
  const [editing, setEditing] = useState<any>(null);
  const saveEdit = async () => {
    if (!editing) return;
    const patch: any = {
      code: editing.code, name: editing.name,
      openingBalance: Number(editing.openingBalance) || 0,
    };
    if (editing.type !== editing._originalType) patch.type = editing.type;
    const res = await updateAccount(editing.id, patch);
    if (res?.success || res?.status) { setEditing(null); loadAccounts(); }
  };

  const fixOpening = async () => { await balanceOpeningBalances(); loadAccounts(); };
  const toggleAutoPost = async () => {
    const res = await setAutoPost(!autoPost?.enabled);
    if (res?.success || res?.status) loadAccounts();
  };
  const toggleAccount = async (a: any) => { await updateAccount(a.id, { isActive: !a.isActive }); loadAccounts(); };

  // Ledger drill-down. The dates are the user's to change, and the running
  // balance now starts from what the account was worth the day before the
  // period rather than from its opening balance alone.
  const [ledger, setLedger] = useState<any>(null);
  const [ledgerAccount, setLedgerAccount] = useState<any>(null);
  const [lFrom, setLFrom] = useState(monthStart());
  const [lTo, setLTo] = useState(todayISO());
  const loadLedger = async (a: any, from = lFrom, to = lTo) => {
    const r = await generalLedger(a.id, from, to);
    setLedgerAccount(a);
    setLedger(r?.data ?? null);
  };
  const openLedger = async (a: any) => { await loadLedger(a); };

  return (
    <div className="space-y-3">
      {opening && !opening.balanced && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-medium">Opening balances are out by {money(Math.abs(opening.imbalance))}.</p>
            <p className="text-xs mt-0.5">
              Journal entries always balance on their own, so this is what makes the
              trial balance disagree. Putting the difference into Opening Balance
              Equity is the normal way to close it.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fixOpening}>Balance it</Button>
        </div>
      )}

      {autoPost && autoPost.hasChartOfAccounts && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <Zap className={`w-4 h-4 shrink-0 ${autoPost.enabled ? 'text-green-600' : 'text-gray-400'}`} />
          <div className="flex-1 text-sm">
            <p className="font-medium">
              {autoPost.enabled ? 'Sales post to the ledger as they happen' : 'Sales are not posted automatically'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {autoPost.enabled
                ? 'Each completed sale writes its own entry: money in, revenue, tax, and the cost of what was sold.'
                : 'Switch on to have each sale post its own entry. Existing sales are left exactly as they are.'}
            </p>
          </div>
          <Button size="sm" variant={autoPost.enabled ? 'outline' : 'default'} onClick={toggleAutoPost}>
            {autoPost.enabled ? 'Switch off' : 'Switch on'}
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{accounts.length} accounts</p>
        <div className="flex gap-2">
          {accounts.length === 0 && <Button variant="outline" onClick={seed}>Seed default chart</Button>}
          <Button variant="outline" onClick={loadAccounts}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button onClick={() => setShowAcc(true)}><Plus className="w-4 h-4 mr-1" /> New Account</Button>
        </div>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-muted-foreground"><tr>
            <th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3 text-right">Opening</th><th className="p-3">Status</th>
          </tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t"><td className="p-3 font-mono text-xs"><button className="text-blue-600 underline" onClick={() => openLedger(a)}>{a.code}</button></td><td className="p-3">{a.name}</td>
                <td className="p-3"><Badge variant="outline" className="text-[10px]">{a.type}</Badge></td>
                <td className="p-3 text-right">{money(a.openingBalance)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAccount(a)} className={`text-xs px-2 py-0.5 rounded ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{a.isActive ? 'Active' : 'Inactive'}</button>
                    <button title="Edit account" onClick={() => setEditing({ ...a, _originalType: a.type })} className="text-gray-400 hover:text-gray-700">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td></tr>
            ))}
            {accounts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No accounts yet   seed the default chart to start.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Account dialog */}
      <Dialog open={showAcc} onOpenChange={setShowAcc}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={accForm.code} onChange={(e) => setAccForm({ ...accForm, code: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={accForm.type} onChange={(e) => setAccForm({ ...accForm, type: e.target.value })}>
                  {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Name *</Label><Input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} /></div>
            <div><Label>Opening Balance</Label><Input type="number" value={accForm.openingBalance} onChange={(e) => setAccForm({ ...accForm, openingBalance: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcc(false)}>Cancel</Button>
            <Button onClick={submitAccount} disabled={!accForm.code || !accForm.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit account */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <select
                    className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  >
                    {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>Opening Balance</Label>
                <Input type="number" value={editing.openingBalance ?? 0} onChange={(e) => setEditing({ ...editing, openingBalance: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Changing the type is refused once the account has posted entries   every
                one of them would move to the other side of the books. Renaming or
                renumbering is always safe: posting finds these accounts by their role,
                not by their code.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General ledger dialog */}
      <Dialog open={!!ledger} onOpenChange={(o) => !o && setLedger(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ledger   {ledger?.account?.code} {ledger?.account?.name}</DialogTitle></DialogHeader>
          <div className="flex items-end gap-2 flex-wrap">
            <div><Label className="text-xs">From</Label><Input type="date" value={lFrom} onChange={(e) => setLFrom(e.target.value)} className="h-9" /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={lTo} onChange={(e) => setLTo(e.target.value)} className="h-9" /></div>
            <Button size="sm" variant="outline" onClick={() => ledgerAccount && loadLedger(ledgerAccount, lFrom, lTo)}>Apply</Button>
          </div>
          {ledger && (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground text-left"><th className="py-1">Date</th><th className="py-1">Entry</th><th className="py-1 text-right">Debit</th><th className="py-1 text-right">Credit</th><th className="py-1 text-right">Balance</th></tr></thead>
              <tbody>
                <tr className="text-xs text-muted-foreground">
                  <td className="py-1" colSpan={4}>
                    Balance brought forward
                    {ledger.from ? ` (opening ${money(ledger.openingBalance)} + activity before ${ledger.from})` : ''}
                  </td>
                  <td className="py-1 text-right font-medium">{money(ledger.broughtForward ?? ledger.openingBalance)}</td>
                </tr>
                {ledger.rows.map((r: any, i: number) => (
                  <tr key={i} className="border-t"><td className="py-1">{r.date}</td><td className="py-1 font-mono text-xs">{r.entryNo}</td><td className="py-1 text-right">{r.debit ? money(r.debit) : ''}</td><td className="py-1 text-right">{r.credit ? money(r.credit) : ''}</td><td className="py-1 text-right">{money(r.balance)}</td></tr>
                ))}
                {ledger.rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No transactions in this date range.</td></tr>}
                {ledger.rows.length > 0 && (
                  <tr className="border-t font-medium">
                    <td className="py-1" colSpan={4}>Closing balance</td>
                    <td className="py-1 text-right">{money(ledger.closingBalance)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setLedger(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
