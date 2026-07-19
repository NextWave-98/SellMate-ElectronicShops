/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Smartphone, Tags, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTradeIn } from '../../../hooks/useTradeIn';
import type { TradeInOutletContext } from './shared';

const navItems = [
  { to: '.', end: true, label: 'Trade-Ins', icon: Smartphone },
  { to: 'rules', end: false, label: 'Price Rules', icon: Tags },
];

/** Shared shell for the Trade-In / Buyback sub-pages. */
export default function TradeInLayout() {
  const { getStats } = useTradeIn();
  const [stats, setStats] = useState<any>(null);

  const refreshStats = useCallback(async () => {
    const res = await getStats();
    setStats(res?.data ?? null);
  }, [getStats]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const context: TradeInOutletContext = { refreshStats, stats };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="w-6 h-6" /> Trade-In / Buyback</h1>
          <p className="text-sm text-muted-foreground">Buy used devices, refurbish and resell</p>
        </div>
        <Button variant="outline" onClick={refreshStats}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open Quotes', value: stats?.quoted ?? 0 },
          { label: 'In Pipeline', value: stats?.inPipeline ?? 0 },
          { label: 'Ready for Sale', value: stats?.readyForSale ?? 0 },
          { label: 'Month Buyback Spend', value: `Rs ${Number(stats?.monthBuybackSpend ?? 0).toLocaleString()}` },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {navItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary bg-muted/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`
            }
          >
            <Icon className="w-4 h-4" /> {label}
          </NavLink>
        ))}
      </div>

      <Outlet context={context} />
    </div>
  );
}
