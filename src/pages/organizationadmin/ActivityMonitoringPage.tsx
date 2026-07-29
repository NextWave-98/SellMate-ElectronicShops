/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Save } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import activityMonitoringService, {
  ActivityDailyRow,
  ActivitySettings,
  LiveActivityRow,
} from '../../services/activityMonitoringService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import alert from '../../utils/alert';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const LIVE_STATUS_CLASS: Record<LiveActivityRow['status'], string> = {
  ACTIVE: 'bg-green-600 text-white',
  IDLE: 'bg-amber-500 text-white',
  OFFLINE: 'bg-muted text-muted-foreground',
};

const ActivityMonitoringPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.ACTIVITY_MONITORING_MANAGE);
  const canTeam = hasPermission(PERMISSIONS.ACTIVITY_MONITORING_VIEW_TEAM) || canManage;

  const [settings, setSettings] = useState<ActivitySettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [idleThreshold, setIdleThreshold] = useState(5);
  const [timezone, setTimezone] = useState('Asia/Colombo');
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [team, setTeam] = useState<ActivityDailyRow[]>([]);
  const [live, setLive] = useState<LiveActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (canManage) {
        const s = await activityMonitoringService.getSettings();
        setSettings(s.data);
        setEnabled(!!s.data.enabled);
        setIdleThreshold(s.data.idleThresholdMinutes || 5);
        setTimezone(s.data.timezone || 'Asia/Colombo');
      }
      if (canTeam) {
        const [daily, liveRes] = await Promise.all([
          activityMonitoringService.teamDaily({ date }),
          activityMonitoringService.liveStatus(),
        ]);
        setTeam(daily.data || []);
        setLive(liveRes.data || []);
      }
    } catch (err: any) {
      alert.error(err?.message || 'Failed to load activity monitoring');
    } finally {
      setLoading(false);
    }
  }, [canManage, canTeam, date]);

  useEffect(() => {
    load();
  }, [date]);

  /**
   * `enabled` is passed explicitly rather than read from state: React state
   * updates are async, so a preceding setEnabled(true) would not be visible
   * here yet and the toggle would silently save the old value.
   */
  const saveSettings = async (overrides?: {
    enabled?: boolean;
    markEmployeesNotified?: boolean;
  }) => {
    if (!canManage) return;
    try {
      setSaving(true);
      const res = await activityMonitoringService.updateSettings({
        enabled: overrides?.enabled ?? enabled,
        idleThresholdMinutes: idleThreshold,
        timezone,
        ...(overrides?.markEmployeesNotified ? { markEmployeesNotified: true } : {}),
      });
      setSettings(res.data);
      setEnabled(!!res.data.enabled);
      alert.success('Activity settings saved');
    } catch (err: any) {
      alert.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // The backend refuses to enable monitoring until employees are marked as
  // informed, so both flags go up in a single request.
  const enableWithAttestation = async () => {
    if (!settings?.employeesNotifiedAt) {
      const ok = window.confirm(
        'Confirm you have informed employees that activity (mouse/keyboard idle) may be monitored, then enable?',
      );
      if (!ok) return;
      await saveSettings({ enabled: true, markEmployeesNotified: true });
      return;
    }
    await saveSettings({ enabled: true });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-orange-600" />
          Team Activity
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Active vs idle time while staff are logged into SellMate. Opt-in per organization.
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monitoring settings</CardTitle>
            <CardDescription>
              Disabled by default. Inform staff before enabling (compliance).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm">Enable activity monitoring</div>
                <div className="text-xs text-muted-foreground">
                  {settings?.employeesNotifiedAt
                    ? `Employees notified ${new Date(settings.employeesNotifiedAt).toLocaleString()}`
                    : 'Employees not marked as notified yet'}
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={async (v) => {
                  if (v) await enableWithAttestation();
                  else await saveSettings({ enabled: false });
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
              <div>
                <Label>Idle threshold (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  className="mt-1.5"
                  value={idleThreshold}
                  onChange={(e) => setIdleThreshold(Number(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pauses shorter than this still count as working time.
                </p>
              </div>
              <div>
                <Label>Workday timezone</Label>
                <Input
                  className="mt-1.5"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Colombo"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Decides where each day starts and ends in reports.
                </p>
              </div>
            </div>
            <Button onClick={() => saveSettings()} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {canTeam && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Live status</CardTitle>
                  <CardDescription>Who looks active / idle right now</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {live.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live data yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {live.map((row) => (
                    <Badge
                      key={row.staffId}
                      className={`font-normal gap-1.5 ${LIVE_STATUS_CLASS[row.status] ?? ''}`}
                    >
                      <span className="size-1.5 rounded-full bg-current opacity-80" />
                      {row.name || `Staff ${String(row.staffId).slice(0, 8)}`}
                      <span className="opacity-80">
                        · {row.status === 'ACTIVE' ? 'Active' : row.status === 'IDLE' ? `Idle ${row.idleMinutes}m` : 'Offline'}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Daily report</CardTitle>
                  <CardDescription>Active / idle / session minutes per employee</CardDescription>
                </div>
                <Input
                  type="date"
                  className="w-auto"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2">Idle</th>
                    <th className="px-3 py-2">Session</th>
                    <th className="px-3 py-2">Longest idle</th>
                  </tr>
                </thead>
                <tbody>
                  {team.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        No activity recorded for this day
                      </td>
                    </tr>
                  ) : (
                    team.map((row) => (
                      <tr key={`${row.staffId}-${row.activityDate}`} className="border-t">
                        <td className="px-3 py-2">
                          {row.staff?.user?.name || row.staffId.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2">{row.activeMinutes}m</td>
                        <td className="px-3 py-2">{row.idleMinutes}m</td>
                        <td className="px-3 py-2">{row.sessionMinutes}m</td>
                        <td className="px-3 py-2">{row.longestIdleStreakMinutes}m</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ActivityMonitoringPage;
