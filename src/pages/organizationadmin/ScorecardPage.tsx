/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, RefreshCw, Save } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import scorecardService, { currentPeriod } from '../../services/scorecardService';
import type { EmployeeScorecard, ScorecardSettings } from '../../services/scorecardService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import alert from '../../utils/alert';

function KpiBlock({
  title,
  points,
  max,
  detail,
}: {
  title: string;
  points: number;
  max: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
        <div className="text-2xl font-semibold">
          {Number(points).toFixed(0)}
          <span className="text-sm font-normal text-muted-foreground"> / {max}</span>
        </div>
        <div className="text-sm text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

const ScorecardPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SCORECARD_MANAGE);
  const canFinalize = hasPermission(PERMISSIONS.SCORECARD_FINALIZE);
  const canTeam = hasPermission(PERMISSIONS.SCORECARD_VIEW_TEAM) || canManage;
  const canOwn = hasPermission(PERMISSIONS.SCORECARD_VIEW_OWN) || canTeam;

  const [period, setPeriod] = useState(currentPeriod());
  const [settings, setSettings] = useState<ScorecardSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mine, setMine] = useState<EmployeeScorecard | null>(null);
  const [board, setBoard] = useState<EmployeeScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (canManage) {
        const s = await scorecardService.getSettings();
        setSettings(s.data);
        setEnabled(!!s.data.enabled);
      }
      if (canOwn) {
        try {
          const me = await scorecardService.myCard(period);
          setMine(me.data);
        } catch {
          setMine(null);
        }
      }
      if (canTeam) {
        const lb = await scorecardService.leaderboard(period);
        setBoard(lb.data || []);
      }
    } catch (err: any) {
      alert.error(err?.message || 'Failed to load scorecard');
    } finally {
      setLoading(false);
    }
  }, [period, canManage, canOwn, canTeam]);

  useEffect(() => {
    load();
  }, [period]);

  const saveEnabled = async (v: boolean) => {
    if (!canManage) return;
    try {
      setSaving(true);
      setEnabled(v);
      const res = await scorecardService.updateSettings({ enabled: v });
      setSettings(res.data);
      alert.success(v ? 'Scorecard enabled' : 'Scorecard disabled');
    } catch (err: any) {
      alert.error(err?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const recompute = async () => {
    if (!canManage) return;
    try {
      setSaving(true);
      await scorecardService.recompute(period);
      alert.success('Scorecard recomputed');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Recompute failed');
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!canFinalize) return;
    if (!window.confirm(`Finalize ${period}? Snapshots will be frozen for allowances.`)) return;
    try {
      setSaving(true);
      await scorecardService.finalize(period);
      alert.success('Period finalized');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Finalize failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Performance Scorecard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Confirmation, delivery, billing, and discipline   live scores and monthly ranking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            className="w-auto"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Admin controls</CardTitle>
            <CardDescription>
              Toggle the feature and close the month when ready. KPI bands are stored in settings
              (seed from the employee scorecard doc before go-live).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-4">
              <Switch checked={enabled} onCheckedChange={saveEnabled} disabled={saving} />
              <Label>Enabled</Label>
            </div>
            <Button variant="outline" onClick={recompute} disabled={saving}>
              Recompute
            </Button>
            {canFinalize && (
              <Button onClick={finalize} disabled={saving} className="gap-1">
                <Save className="h-4 w-4" />
                Finalize month
              </Button>
            )}
            {settings && !settings.enabled && (
              <Badge variant="secondary">Feature off   scores not visible to staff</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {mine && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">My scorecard</h2>
              <p className="text-sm text-muted-foreground">
                Total {Number(mine.totalScore).toFixed(0)} / 100
                {mine.rank != null ? ` · Rank #${mine.rank}` : ''}
                {mine.tier ? ` · ${mine.tier}` : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Expected allowance</div>
              <div className="text-xl font-semibold">
                Rs. {Number(mine.allowanceAmount || 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiBlock
              title="Confirmation"
              points={mine.confirmationPoints}
              max={35}
              detail={`${mine.ordersConfirmed}/${mine.leadsAssigned} · ${mine.confirmationRate ?? 0}%`}
            />
            <KpiBlock
              title="Delivery"
              points={mine.deliveryPoints}
              max={30}
              detail={`${mine.parcelsDelivered} delivered · ${mine.deliveryRate ?? 0}%`}
            />
            <KpiBlock
              title="Billing"
              points={mine.billingPoints}
              max={20}
              detail={`Rs. ${Number(mine.billingAmount || 0).toLocaleString()}`}
            />
            <KpiBlock
              title="Discipline"
              points={mine.disciplinePoints}
              max={15}
              detail={`Penalties −${Number(mine.penaltyPoints || 0)}`}
            />
          </div>
        </div>
      )}

      {canTeam && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leaderboard · {period}</CardTitle>
            <CardDescription>Team ranking for the selected month</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Confirm</th>
                  <th className="px-3 py-2">Delivery</th>
                  <th className="px-3 py-2">Billing</th>
                  <th className="px-3 py-2">Discipline</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Tier</th>
                </tr>
              </thead>
              <tbody>
                {board.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      No scores yet for this period
                    </td>
                  </tr>
                ) : (
                  board.map((row, idx) => (
                    <tr key={row.id || row.staffId} className="border-t">
                      <td className="px-3 py-2">{row.rank ?? idx + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.staff?.user?.name || row.staffId.slice(0, 8)}
                        {row.isEmployeeOfMonth && (
                          <Badge className="ml-2" variant="default">
                            EoM
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">{Number(row.confirmationPoints).toFixed(0)}</td>
                      <td className="px-3 py-2">{Number(row.deliveryPoints).toFixed(0)}</td>
                      <td className="px-3 py-2">{Number(row.billingPoints).toFixed(0)}</td>
                      <td className="px-3 py-2">{Number(row.disciplinePoints).toFixed(0)}</td>
                      <td className="px-3 py-2 font-semibold">{Number(row.totalScore).toFixed(0)}</td>
                      <td className="px-3 py-2">{row.tier || ' '}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScorecardPage;
