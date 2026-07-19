/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
  const { listAccounts, seedChart, createAccount, updateAccount, generalLedger } = useAccounting();
  const [accounts, setAccounts] = useState<any[]>([]);

  const loadAccounts = useCallback(async () => {
    const res = await listAccounts();
    setAccounts((res?.data as any) ?? []);
  }, [listAccounts]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const [showAcc, setShowAcc] = useState(false);
  const [accForm, setAccForm] = useState<any>({ code: '', name: '', type: 'ASSET', openingBalance: 0 });
  const submitAccount = async () => {
    if (!accForm.code || !accForm.name) return;
    const res = await createAccount({ ...accForm, openingBalance: Number(accForm.openingBalance) || 0 });
    if (res?.success || res?.status) { setShowAcc(false); setAccForm({ code: '', name: '', type: 'ASSET', openingBalance: 0 }); loadAccounts(); }
  };
  const seed = async () => { await seedChart(); loadAccounts(); };
  const toggleAccount = async (a: any) => { await updateAccount(a.id, { isActive: !a.isActive }); loadAccounts(); };

  // Ledger drill-down (current month by default)
  const [ledger, setLedger] = useState<any>(null);
  const openLedger = async (a: any) => { const r = await generalLedger(a.id, monthStart(), todayISO()); setLedger(r?.data ?? null); };

  return (
    <div className="space-y-3">
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
                <td className="p-3"><button onClick={() => toggleAccount(a)} className={`text-xs px-2 py-0.5 rounded ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{a.isActive ? 'Active' : 'Inactive'}</button></td></tr>
            ))}
            {accounts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No accounts yet — seed the default chart to start.</td></tr>}
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

      {/* General ledger dialog */}
      <Dialog open={!!ledger} onOpenChange={(o) => !o && setLedger(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ledger — {ledger?.account?.code} {ledger?.account?.name}</DialogTitle></DialogHeader>
          {ledger && (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground text-left"><th className="py-1">Date</th><th className="py-1">Entry</th><th className="py-1 text-right">Debit</th><th className="py-1 text-right">Credit</th><th className="py-1 text-right">Balance</th></tr></thead>
              <tbody>
                <tr className="text-xs text-muted-foreground"><td className="py-1" colSpan={4}>Opening balance</td><td className="py-1 text-right">{money(ledger.openingBalance)}</td></tr>
                {ledger.rows.map((r: any, i: number) => (
                  <tr key={i} className="border-t"><td className="py-1">{r.date}</td><td className="py-1 font-mono text-xs">{r.entryNo}</td><td className="py-1 text-right">{r.debit ? money(r.debit) : ''}</td><td className="py-1 text-right">{r.credit ? money(r.credit) : ''}</td><td className="py-1 text-right">{money(r.balance)}</td></tr>
                ))}
                {ledger.rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No transactions in this date range.</td></tr>}
              </tbody>
            </table>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setLedger(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
