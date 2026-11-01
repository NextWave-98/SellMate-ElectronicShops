/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAccounting } from '../../../hooks/useAccounting';
import { money, todayISO } from './shared';

/** Minimal bank reconciliation: statement lines matched to cash/bank journal lines. */
export default function AccountingBankReconPage() {
  const {
    listAccounts,
    listBankStatements,
    createBankStatement,
    matchBankLine,
    unmatchedJournalLines,
  } = useAccounting();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [statements, setStatements] = useState<any[]>([]);
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [statementDate, setStatementDate] = useState(todayISO());
  const [openingBalance, setOpeningBalance] = useState('0');
  const [closingBalance, setClosingBalance] = useState('0');
  const [lineDate, setLineDate] = useState(todayISO());
  const [lineDesc, setLineDesc] = useState('');
  const [lineAmount, setLineAmount] = useState('');
  const [pendingLines, setPendingLines] = useState<any[]>([]);
  const [selectedStmt, setSelectedStmt] = useState<any>(null);

  const cashBank = accounts.filter(
    (a) => a.type === 'ASSET' && (a.systemKey === 'CASH' || a.systemKey === 'BANK' || a.code === '1000' || a.code === '1010'),
  );

  const loadAccounts = useCallback(async () => {
    const res = await listAccounts();
    const list = (res?.data as any) ?? [];
    setAccounts(list);
    if (!accountId) {
      const bank = list.find((a: any) => a.systemKey === 'BANK' || a.code === '1010');
      if (bank) setAccountId(bank.id);
    }
  }, [listAccounts, accountId]);

  const loadStatements = useCallback(async () => {
    if (!accountId) return;
    const res = await listBankStatements(accountId);
    setStatements((res?.data as any) ?? []);
  }, [listBankStatements, accountId]);

  const loadUnmatched = useCallback(async () => {
    if (!accountId) return;
    const res = await unmatchedJournalLines(accountId);
    setUnmatched((res?.data as any) ?? []);
  }, [unmatchedJournalLines, accountId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadStatements(); loadUnmatched(); }, [loadStatements, loadUnmatched]);

  const addPendingLine = () => {
    const amount = Number(lineAmount);
    if (!amount || !lineDate) return;
    setPendingLines([...pendingLines, { lineDate, description: lineDesc, amount }]);
    setLineDesc('');
    setLineAmount('');
  };

  const createStmt = async () => {
    if (!accountId || pendingLines.length === 0) return;
    const res = await createBankStatement({
      accountId,
      statementDate,
      openingBalance: Number(openingBalance) || 0,
      closingBalance: Number(closingBalance) || 0,
      lines: pendingLines,
    });
    if (res?.success || res?.status) {
      setPendingLines([]);
      loadStatements();
      loadUnmatched();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label>Cash / Bank account</Label>
          <select
            className="block w-full min-w-[220px] h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Select</option>
            {cashBank.map((a) => (
              <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
            ))}
          </select>
        </div>
        <Button variant="outline" onClick={() => { loadStatements(); loadUnmatched(); }}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm text-orange-800">New statement</p>
          <div className="grid sm:grid-cols-4 gap-2">
            <div><Label>Statement date</Label><Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></div>
            <div><Label>Opening</Label><Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} /></div>
            <div><Label>Closing</Label><Input type="number" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-4 gap-2 items-end">
            <div><Label>Line date</Label><Input type="date" value={lineDate} onChange={(e) => setLineDate(e.target.value)} /></div>
            <div><Label>Description</Label><Input value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} /></div>
            <div><Label>Amount (+ in / − out)</Label><Input type="number" value={lineAmount} onChange={(e) => setLineAmount(e.target.value)} /></div>
            <Button variant="outline" onClick={addPendingLine}><Plus className="w-4 h-4 mr-1" /> Add line</Button>
          </div>
          {pendingLines.length > 0 && (
            <ul className="text-sm space-y-1">
              {pendingLines.map((l, i) => (
                <li key={i} className="flex justify-between border-b py-1">
                  <span>{l.lineDate} · {l.description || '—'}</span>
                  <span>{money(l.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={createStmt} disabled={!accountId || pendingLines.length === 0}>Create statement</Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-bold text-orange-800 text-sm">Statements</h3>
            {statements.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-full text-left text-sm border rounded p-2 ${selectedStmt?.id === s.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                onClick={() => setSelectedStmt(s)}
              >
                <div className="flex justify-between">
                  <span>{s.statementDate}</span>
                  <span className="text-muted-foreground">{(s.lines || []).length} lines</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Open {money(s.openingBalance)} → Close {money(s.closingBalance)}
                </div>
              </button>
            ))}
            {statements.length === 0 && <p className="text-sm text-muted-foreground">No statements for this account.</p>}

            {selectedStmt && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Statement lines  match to journal</p>
                {(selectedStmt.lines || []).map((line: any) => (
                  <div key={line.id} className="border rounded p-2 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>{line.lineDate} · {line.description || '—'}</span>
                      <span>{money(line.amount)}</span>
                    </div>
                    {line.journalLineId ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await matchBankLine(line.id, null);
                          await loadStatements();
                          const refreshed = (await listBankStatements(accountId))?.data as any[];
                          setSelectedStmt(refreshed?.find((x) => x.id === selectedStmt.id) || null);
                          loadUnmatched();
                        }}
                      >
                        <Unlink className="w-3.5 h-3.5 mr-1" /> Clear match
                      </Button>
                    ) : (
                      <select
                        className="w-full h-8 rounded border px-2 text-xs"
                        defaultValue=""
                        onChange={async (e) => {
                          const jlId = e.target.value;
                          if (!jlId) return;
                          await matchBankLine(line.id, jlId);
                          const refreshed = (await listBankStatements(accountId))?.data as any[];
                          setSelectedStmt(refreshed?.find((x) => x.id === selectedStmt.id) || null);
                          loadUnmatched();
                        }}
                      >
                        <option value="">Match to journal line…</option>
                        {unmatched.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.entryDate} {u.entryNo} · {money(u.signedAmount)} · {u.memo || u.description || ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-bold text-orange-800 text-sm flex items-center gap-1">
              <Link2 className="w-4 h-4" /> Unmatched ledger lines
            </h3>
            {unmatched.map((u) => (
              <div key={u.id} className="flex justify-between text-sm border-b py-1">
                <span className="text-xs">{u.entryDate} {u.entryNo} · {u.memo || u.description || '—'}</span>
                <span>{money(u.signedAmount)}</span>
              </div>
            ))}
            {unmatched.length === 0 && (
              <p className="text-sm text-muted-foreground">All journal lines for this account are matched (or none exist).</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
