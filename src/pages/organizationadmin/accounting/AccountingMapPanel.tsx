/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAccounting } from '../../../hooks/useAccounting';
import { money } from './shared';

type Kind = 'pendingAr' | 'pendingAp' | 'sales';

const TABS: { id: Kind; label: string }[] = [
  { id: 'pendingAr', label: 'Pending AR' },
  { id: 'pendingAp', label: 'Pending AP' },
  { id: 'sales', label: 'Sales' },
];

export default function AccountingMapPanel({ onMapped }: { onMapped?: () => void }) {
  const { listMapCandidates, mapToLedger } = useAccounting();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [tab, setTab] = useState<Kind>('pendingAr');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMapCandidates();
      setData(res?.data ?? null);
      setSelected({});
    } finally {
      setLoading(false);
    }
  }, [listMapCandidates]);

  useEffect(() => { load(); }, [load]);

  const rows: any[] = data?.[tab] || [];
  const selectable = rows.filter((row) => !row.mapped && row.postable !== false);
  const selectedIds = useMemo(
    () => rows.filter((row) => selected[row.id] && !row.mapped && row.postable !== false).map((row) => row.id),
    [rows, selected],
  );

  const toggleAll = () => {
    const allOn = selectable.length > 0 && selectable.every((row) => selected[row.id]);
    setSelected((prev) => {
      const next = { ...prev };
      for (const row of selectable) next[row.id] = !allOn;
      return next;
    });
  };

  const mapSelected = async () => {
    if (!selectedIds.length) return;
    setMapping(true);
    try {
      const body = tab === 'pendingAp'
        ? { purchaseOrderIds: selectedIds }
        : { saleIds: selectedIds };
      const res = await mapToLedger(body);
      const payload: any = res?.data;
      if (payload) {
        const failed = [
          ...(payload.sales || []),
          ...(payload.purchaseOrders || []),
        ].filter((row: any) => row.error);
        if (failed.length) {
          toast.error(failed[0].error);
        }
      }
      await load();
      onMapped?.();
    } finally {
      setMapping(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-sm text-blue-900">Map to ledger</p>
            <p className="text-xs text-muted-foreground">
              Pending customer balances go to AR aging, pending supplier balances go to AP aging, and each sale can be posted on its own. Already posted rows are left as they are.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading || mapping}>Refresh</Button>
            <Button size="sm" onClick={mapSelected} disabled={!selectedIds.length || mapping}>
              {mapping ? 'Mapping…' : `Map selected (${selectedIds.length})`}
            </Button>
          </div>
        </div>

        <div className="flex gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setTab(item.id); setSelected({}); }}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === item.id ? 'bg-blue-700 text-white' : 'bg-white text-gray-700 border'}`}
            >
              {item.label}
              {data ? ` (${(data[item.id] || []).length})` : ''}
            </button>
          ))}
        </div>

        {data?.salesLimited && tab === 'sales' && (
          <p className="text-xs text-amber-800">Showing the 400 most recent sales.</p>
        )}

        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 w-8">
                  <input type="checkbox" checked={selectable.length > 0 && selectable.every((row) => selected[row.id])} onChange={toggleAll} />
                </th>
                <th className="p-2">{tab === 'pendingAp' ? 'PO' : 'Sale'}</th>
                <th className="p-2">{tab === 'pendingAp' ? 'Supplier' : 'Customer'}</th>
                <th className="p-2">Date</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">Balance</th>
                <th className="p-2">Ledger</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nothing to map.</td></tr>
              )}
              {!loading && rows.map((row) => {
                const disabled = !!row.mapped || row.postable === false;
                return (
                  <tr key={row.id} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={!!selected[row.id] && !disabled}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))}
                      />
                    </td>
                    <td className="p-2 font-mono text-xs">{row.saleNumber || row.poNumber}</td>
                    <td className="p-2">{row.customerName || row.supplierName}</td>
                    <td className="p-2">{row.date ? String(row.date).slice(0, 10) : '—'}</td>
                    <td className="p-2 text-right">{money(row.totalAmount)}</td>
                    <td className="p-2 text-right">{money(row.balanceDue)}</td>
                    <td className="p-2 text-xs">
                      {row.mapped ? 'Mapped' : row.postable === false ? 'Not received' : 'Not mapped'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
