/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { FileText, BarChart3, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAccounting } from '../../../hooks/useAccounting';
import { money, todayISO, monthStart } from './shared';

/** Financial reports: P&L, balance sheet, trial balance + CSV / print export. */
export default function AccountingReportsPage() {
  const { profitAndLoss, balanceSheet, trialBalance } = useAccounting();

  const [pnl, setPnl] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);
  const [tb, setTb] = useState<any>(null);
  const [rFrom, setRFrom] = useState(monthStart());
  const [rTo, setRTo] = useState(todayISO());
  const runPnl = async () => { const r = await profitAndLoss(rFrom, rTo); setPnl(r?.data ?? null); };
  const runBs = async () => { const r = await balanceSheet(rTo); setBs(r?.data ?? null); };
  const runTb = async () => { const r = await trialBalance(rTo); setTb(r?.data ?? null); };

  const exportCSV = (rows: any[], headers: string[], keys: string[], filename: string) => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const printReports = () => {
    const fmt = (n: any) => `Rs ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    let html = '<h1>Financial Reports</h1>';
    if (pnl) {
      html += `<h2>Profit &amp; Loss (${pnl.from} → ${pnl.to})</h2><table><tr><th>Income</th><th></th></tr>`;
      pnl.income.forEach((r: any) => { html += `<tr><td>${r.name}</td><td style="text-align:right">${fmt(r.amount)}</td></tr>`; });
      html += `<tr><td><b>Total Income</b></td><td style="text-align:right"><b>${fmt(pnl.totalIncome)}</b></td></tr><tr><th>Expenses</th><th></th></tr>`;
      pnl.expense.forEach((r: any) => { html += `<tr><td>${r.name}</td><td style="text-align:right">${fmt(r.amount)}</td></tr>`; });
      html += `<tr><td><b>Total Expenses</b></td><td style="text-align:right"><b>${fmt(pnl.totalExpense)}</b></td></tr><tr><td><b>Net ${pnl.netProfit >= 0 ? 'Profit' : 'Loss'}</b></td><td style="text-align:right"><b>${fmt(pnl.netProfit)}</b></td></tr></table>`;
    }
    if (bs) {
      html += `<h2>Balance Sheet (as of ${bs.asOf || 'today'})</h2><table><tr><th>Assets</th><th></th></tr>`;
      bs.assets.forEach((r: any) => { html += `<tr><td>${r.name}</td><td style="text-align:right">${fmt(r.amount)}</td></tr>`; });
      html += `<tr><td><b>Total Assets</b></td><td style="text-align:right"><b>${fmt(bs.totalAssets)}</b></td></tr><tr><th>Liabilities &amp; Equity</th><th></th></tr>`;
      [...bs.liabilities, ...bs.equity].forEach((r: any) => { html += `<tr><td>${r.name}</td><td style="text-align:right">${fmt(r.amount)}</td></tr>`; });
      html += `<tr><td><b>Total Liabilities + Equity</b></td><td style="text-align:right"><b>${fmt(bs.totalLiabilities + bs.totalEquity)}</b></td></tr></table>`;
    }
    if (tb) {
      html += `<h2>Trial Balance (as of ${tb.asOf || 'today'})</h2><table><tr><th>Account</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th></tr>`;
      tb.rows.forEach((r: any) => { html += `<tr><td>${r.code} ${r.name}</td><td style="text-align:right">${r.debit ? fmt(r.debit) : ''}</td><td style="text-align:right">${r.credit ? fmt(r.credit) : ''}</td></tr>`; });
      html += `<tr><td><b>Total</b></td><td style="text-align:right"><b>${fmt(tb.totalDebit)}</b></td><td style="text-align:right"><b>${fmt(tb.totalCredit)}</b></td></tr></table>`;
    }
    if (!pnl && !bs && !tb) html += '<p>Run a report first (Profit &amp; Loss / Balance Sheet / Trial Balance), then Print / PDF.</p>';
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Financial Reports</title><style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:20px}h2{font-size:15px;margin-top:20px;color:#1e40af}table{width:100%;border-collapse:collapse;margin-top:6px}td,th{padding:4px 6px;border-bottom:1px solid #eee;font-size:12px;text-align:left}</style></head><body>${html}<script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>From</Label><Input type="date" value={rFrom} onChange={(e) => setRFrom(e.target.value)} /></div>
        <div><Label>To / As of</Label><Input type="date" value={rTo} onChange={(e) => setRTo(e.target.value)} /></div>
        <Button variant="outline" onClick={runPnl}><BarChart3 className="w-4 h-4 mr-1" /> Profit & Loss</Button>
        <Button variant="outline" onClick={runBs}><Scale className="w-4 h-4 mr-1" /> Balance Sheet</Button>
        <Button variant="outline" onClick={runTb}><FileText className="w-4 h-4 mr-1" /> Trial Balance</Button>
        <Button variant="outline" onClick={() => tb && exportCSV(tb.rows, ['Code', 'Name', 'Type', 'Debit', 'Credit'], ['code', 'name', 'type', 'debit', 'credit'], 'trial-balance.csv')} disabled={!tb}>Export CSV</Button>
        <Button variant="outline" onClick={printReports}>Print / PDF</Button>
      </div>

      {pnl && (
        <Card><CardContent className="p-4">
          <h3 className="font-bold text-blue-800 mb-2">Profit &amp; Loss ({pnl.from} → {pnl.to})</h3>
          <p className="text-xs font-semibold text-muted-foreground mt-2">INCOME</p>
          {pnl.income.map((r: any) => <div key={r.code} className="flex justify-between text-sm"><span>{r.name}</span><span>{money(r.amount)}</span></div>)}
          <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1"><span>Total Income</span><span>{money(pnl.totalIncome)}</span></div>
          <p className="text-xs font-semibold text-muted-foreground mt-3">EXPENSES</p>
          {pnl.expense.map((r: any) => <div key={r.code} className="flex justify-between text-sm"><span>{r.name}</span><span>{money(r.amount)}</span></div>)}
          <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1"><span>Total Expenses</span><span>{money(pnl.totalExpense)}</span></div>
          <div className={`flex justify-between font-bold border-t mt-2 pt-2 ${pnl.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}><span>Net {pnl.netProfit >= 0 ? 'Profit' : 'Loss'}</span><span>{money(pnl.netProfit)}</span></div>
        </CardContent></Card>
      )}

      {bs && (
        <Card><CardContent className="p-4">
          <h3 className="font-bold text-blue-800 mb-2">Balance Sheet (as of {bs.asOf || 'today'})</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">ASSETS</p>
              {bs.assets.map((r: any) => <div key={r.code} className="flex justify-between text-sm"><span>{r.name}</span><span>{money(r.amount)}</span></div>)}
              <div className="flex justify-between text-sm font-bold border-t mt-1 pt-1"><span>Total Assets</span><span>{money(bs.totalAssets)}</span></div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">LIABILITIES</p>
              {bs.liabilities.map((r: any) => <div key={r.code} className="flex justify-between text-sm"><span>{r.name}</span><span>{money(r.amount)}</span></div>)}
              <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1"><span>Total Liabilities</span><span>{money(bs.totalLiabilities)}</span></div>
              <p className="text-xs font-semibold text-muted-foreground mt-3">EQUITY</p>
              {bs.equity.map((r: any, i: number) => <div key={i} className="flex justify-between text-sm"><span>{r.name}</span><span>{money(r.amount)}</span></div>)}
              <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1"><span>Total Equity</span><span>{money(bs.totalEquity)}</span></div>
            </div>
          </div>
          <p className={`text-xs mt-3 ${bs.balanced ? 'text-green-600' : 'text-red-600'}`}>{bs.balanced ? '✓ Balanced (Assets = Liabilities + Equity)' : '⚠ Not balanced — check entries'}</p>
        </CardContent></Card>
      )}

      {tb && (
        <Card><CardContent className="p-4">
          <h3 className="font-bold text-blue-800 mb-2">Trial Balance (as of {tb.asOf || 'today'})</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground text-left"><th className="py-1">Account</th><th className="py-1 text-right">Debit</th><th className="py-1 text-right">Credit</th></tr></thead>
            <tbody>
              {tb.rows.map((r: any) => <tr key={r.id}><td className="py-1">{r.code} {r.name}</td><td className="py-1 text-right">{r.debit ? money(r.debit) : ''}</td><td className="py-1 text-right">{r.credit ? money(r.credit) : ''}</td></tr>)}
              <tr className="font-bold border-t"><td className="py-1">Total</td><td className="py-1 text-right">{money(tb.totalDebit)}</td><td className="py-1 text-right">{money(tb.totalCredit)}</td></tr>
            </tbody>
          </table>
          <p className={`text-xs mt-2 ${tb.balanced ? 'text-green-600' : 'text-red-600'}`}>{tb.balanced ? '✓ Debits = Credits' : '⚠ Out of balance'}</p>
        </CardContent></Card>
      )}
    </div>
  );
}
