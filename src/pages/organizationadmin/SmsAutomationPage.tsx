/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import smsAutomationService from '../../services/smsAutomationService';
import type {
  SmsAutomationSettings,
  SmsOutboxItem,
  SmsOutboxStatus,
  SmsOutboxType,
} from '../../services/smsAutomationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import alert from '../../utils/alert';

const STATUS_STYLE: Record<SmsOutboxStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  SKIPPED_NO_GATEWAY: 'bg-orange-100 text-orange-800',
  SKIPPED_DISABLED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const TYPE_LABEL: Record<SmsOutboxType, string> = {
  ORDER_CREATED: 'Order created',
  ORDER_DISPATCHED: 'Order dispatched',
  QUICK_SEND: 'Quick send',
  LEAD_SMS: 'Lead SMS',
};

const PLACEHOLDERS =
  '{customer_name}, {order_no}, {amount}, {business_name}, {tracking_no}';

const SmsAutomationPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SMS_AUTOMATION_MANAGE);
  const canQuickSend = hasPermission(PERMISSIONS.SMS_AUTOMATION_QUICK_SEND);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SmsAutomationSettings | null>(null);

  const [orderCreatedEnabled, setOrderCreatedEnabled] = useState(false);
  const [orderDispatchedEnabled, setOrderDispatchedEnabled] = useState(false);
  const [quickSendEnabled, setQuickSendEnabled] = useState(true);
  const [orderCreatedTemplate, setOrderCreatedTemplate] = useState('');
  const [orderDispatchedTemplate, setOrderDispatchedTemplate] = useState('');

  const [quickTo, setQuickTo] = useState('');
  const [quickMsg, setQuickMsg] = useState('');
  const [sendingQuick, setSendingQuick] = useState(false);

  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  const [outbox, setOutbox] = useState<SmsOutboxItem[]>([]);
  const [outboxPage, setOutboxPage] = useState(1);
  const [outboxTotalPages, setOutboxTotalPages] = useState(1);
  const [outboxStatus, setOutboxStatus] = useState<SmsOutboxStatus | ''>('');
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [skippedNoGateway, setSkippedNoGateway] = useState(0);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await smsAutomationService.getSettings();
      const data = res.data;
      setSettings(data);
      setOrderCreatedEnabled(!!data.orderCreatedEnabled);
      setOrderDispatchedEnabled(!!data.orderDispatchedEnabled);
      setQuickSendEnabled(data.quickSendEnabled !== false);
      setOrderCreatedTemplate(
        data.orderCreatedTemplate || data.defaultTemplates?.orderCreated || '',
      );
      setOrderDispatchedTemplate(
        data.orderDispatchedTemplate || data.defaultTemplates?.orderDispatched || '',
      );
    } catch (err: any) {
      alert.error(err?.message || 'Failed to load SMS automation settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOutbox = useCallback(async (page = 1, status: SmsOutboxStatus | '' = outboxStatus) => {
    try {
      setOutboxLoading(true);
      const res = await smsAutomationService.listOutbox({
        page,
        limit: 20,
        status: status || undefined,
      });
      setOutbox(res.data.items);
      setOutboxPage(res.data.page);
      setOutboxTotalPages(res.data.totalPages || 1);

      // Count SKIPPED_NO_GATEWAY for banner (first page unfiltered snapshot)
      if (!status) {
        const skipped = res.data.items.filter((i) => i.status === 'SKIPPED_NO_GATEWAY').length;
        setSkippedNoGateway(skipped);
      }
    } catch (err: any) {
      alert.error(err?.message || 'Failed to load send history');
    } finally {
      setOutboxLoading(false);
    }
  }, [outboxStatus]);

  useEffect(() => {
    loadSettings();
    loadOutbox(1, '');
  }, []);

  const handleSave = async () => {
    if (!canManage) return;
    try {
      setSaving(true);
      const res = await smsAutomationService.updateSettings({
        orderCreatedEnabled,
        orderDispatchedEnabled,
        quickSendEnabled,
        orderCreatedTemplate: orderCreatedTemplate.trim() || null,
        orderDispatchedTemplate: orderDispatchedTemplate.trim() || null,
      });
      setSettings(res.data);
      alert.success('SMS automation settings saved');
    } catch (err: any) {
      alert.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSend = async () => {
    if (!canQuickSend) return;
    if (!quickTo.trim() || !quickMsg.trim()) {
      alert.error('Phone number and message are required');
      return;
    }
    try {
      setSendingQuick(true);
      await smsAutomationService.quickSend({ to: quickTo.trim(), message: quickMsg.trim() });
      alert.success('SMS queued for sending');
      setQuickMsg('');
      loadOutbox(1, outboxStatus);
    } catch (err: any) {
      alert.error(err?.message || 'Failed to queue SMS');
    } finally {
      setSendingQuick(false);
    }
  };

  const handleTest = async (event: 'ORDER_CREATED' | 'ORDER_DISPATCHED') => {
    if (!canManage) return;
    if (!testPhone.trim()) {
      alert.error('Enter a phone number for the test SMS');
      return;
    }
    try {
      setTesting(true);
      await smsAutomationService.testSend({ to: testPhone.trim(), event });
      alert.success('Test SMS queued');
      loadOutbox(1, outboxStatus);
    } catch (err: any) {
      alert.error(err?.message || 'Failed to queue test SMS');
    } finally {
      setTesting(false);
    }
  };

  const handleRetry = async (id: string) => {
    if (!canManage) return;
    try {
      await smsAutomationService.retryOutbox(id);
      alert.success('Message re-queued');
      loadOutbox(outboxPage, outboxStatus);
    } catch (err: any) {
      alert.error(err?.message || 'Retry failed');
    }
  };

  const handleRetryAll = async () => {
    if (!canManage) return;
    try {
      const res = await smsAutomationService.retryAllOutbox();
      alert.success(`${res.data.requeued} message(s) re-queued`);
      loadOutbox(1, outboxStatus);
    } catch (err: any) {
      alert.error(err?.message || 'Retry all failed');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading SMS automation…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-orange-600" />
            SMS Automation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-notify customers when orders are created or dispatched. Messages queue safely and
            send in the background.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </Button>
        )}
      </div>

      {(skippedNoGateway > 0 || outbox.some((i) => i.status === 'SKIPPED_NO_GATEWAY')) && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-orange-900">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Some messages were skipped because an SMS gateway is not configured.{' '}
              <Link to="/superadmin/communication/settings" className="underline font-medium">
                Configure channel credentials
              </Link>
              , then retry failed messages.
            </span>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={handleRetryAll} className="shrink-0 gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry all
            </Button>
          )}
        </div>
      )}

      {/* Event toggles + templates */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Order created</CardTitle>
                <CardDescription>SMS when a sale / order is placed</CardDescription>
              </div>
              <Switch
                checked={orderCreatedEnabled}
                onCheckedChange={setOrderCreatedEnabled}
                disabled={!canManage}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="tpl-created">Template</Label>
              <Textarea
                id="tpl-created"
                rows={4}
                value={orderCreatedTemplate}
                onChange={(e) => setOrderCreatedTemplate(e.target.value)}
                disabled={!canManage}
                className="mt-1.5 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Placeholders: {PLACEHOLDERS}</p>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                disabled={testing || !orderCreatedEnabled}
                onClick={() => handleTest('ORDER_CREATED')}
              >
                Send test
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Order dispatched</CardTitle>
                <CardDescription>SMS when a courier shipment is released / picked up</CardDescription>
              </div>
              <Switch
                checked={orderDispatchedEnabled}
                onCheckedChange={setOrderDispatchedEnabled}
                disabled={!canManage}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="tpl-dispatched">Template</Label>
              <Textarea
                id="tpl-dispatched"
                rows={4}
                value={orderDispatchedTemplate}
                onChange={(e) => setOrderDispatchedTemplate(e.target.value)}
                disabled={!canManage}
                className="mt-1.5 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Placeholders: {PLACEHOLDERS}</p>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                disabled={testing || !orderDispatchedEnabled}
                onClick={() => handleTest('ORDER_DISPATCHED')}
              >
                Send test
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick send + test phone + quick-send toggle */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Quick Send</CardTitle>
                <CardDescription>Ad-hoc SMS to any customer number</CardDescription>
              </div>
              {canManage && (
                <Switch
                  checked={quickSendEnabled}
                  onCheckedChange={setQuickSendEnabled}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!quickSendEnabled ? (
              <p className="text-sm text-muted-foreground">Quick Send is disabled for this organization.</p>
            ) : (
              <>
                <div>
                  <Label htmlFor="quick-to">Phone</Label>
                  <Input
                    id="quick-to"
                    placeholder="0771234567"
                    value={quickTo}
                    onChange={(e) => setQuickTo(e.target.value)}
                    disabled={!canQuickSend}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="quick-msg">Message</Label>
                  <Textarea
                    id="quick-msg"
                    rows={3}
                    value={quickMsg}
                    onChange={(e) => setQuickMsg(e.target.value)}
                    disabled={!canQuickSend}
                    className="mt-1.5"
                    maxLength={640}
                  />
                </div>
                {canQuickSend && (
                  <Button onClick={handleQuickSend} disabled={sendingQuick} className="gap-2">
                    {sendingQuick ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Queue SMS
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Test phone</CardTitle>
            <CardDescription>
              Number used when you click “Send test” on a template above
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="test-phone">Your mobile</Label>
            <Input
              id="test-phone"
              placeholder="0771234567"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              disabled={!canManage}
              className="mt-1.5 max-w-xs"
            />
            {settings && (
              <p className="text-xs text-muted-foreground mt-3">
                Settings last updated{' '}
                {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : '—'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outbox */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Send history</CardTitle>
              <CardDescription>Queued, sent, failed, and skipped messages</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <NativeSelect
                value={outboxStatus}
                onChange={(e) => {
                  const v = e.target.value as SmsOutboxStatus | '';
                  setOutboxStatus(v);
                  loadOutbox(1, v);
                }}
                className="w-[180px]"
              >
                <NativeSelectOption value="">All statuses</NativeSelectOption>
                {(Object.keys(STATUS_STYLE) as SmsOutboxStatus[]).map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadOutbox(outboxPage, outboxStatus)}
                disabled={outboxLoading}
              >
                <RefreshCw className={`h-4 w-4 ${outboxLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Message</th>
                  <th className="px-3 py-2 font-medium w-[90px]" />
                </tr>
              </thead>
              <tbody>
                {outbox.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No messages yet
                    </td>
                  </tr>
                )}
                {outbox.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.recipient}</td>
                    <td className="px-3 py-2">{TYPE_LABEL[row.type] || row.type}</td>
                    <td className="px-3 py-2">
                      <Badge className={`${STATUS_STYLE[row.status]} border-0 font-normal`}>
                        {row.status === 'SENT' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {row.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                        {(row.status === 'FAILED' || row.status.startsWith('SKIPPED')) && (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {row.status.replace(/_/g, ' ')}
                      </Badge>
                      {row.lastError && (
                        <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={row.lastError}>
                          {row.lastError}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[280px]">
                      <p className="line-clamp-2 text-muted-foreground">{row.message}</p>
                    </td>
                    <td className="px-3 py-2">
                      {canManage &&
                        (row.status === 'FAILED' ||
                          row.status === 'SKIPPED_NO_GATEWAY' ||
                          row.status === 'SKIPPED_DISABLED') && (
                          <Button variant="ghost" size="sm" onClick={() => handleRetry(row.id)}>
                            Retry
                          </Button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {outboxTotalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={outboxPage <= 1 || outboxLoading}
                onClick={() => loadOutbox(outboxPage - 1, outboxStatus)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {outboxPage} / {outboxTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={outboxPage >= outboxTotalPages || outboxLoading}
                onClick={() => loadOutbox(outboxPage + 1, outboxStatus)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsAutomationPage;
