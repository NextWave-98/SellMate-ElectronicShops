/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Phone, MessageSquare, StickyNote, RefreshCw, Send } from 'lucide-react';
import leadFormsService from '../../services/leadFormsService';
import type { CallOutcome, LeadInteraction } from '../../services/leadFormsService';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { NativeSelect, NativeSelectOption } from '../ui/native-select';
import alert from '../../utils/alert';

interface Props {
  leadId: string;
  phone: string | null;
}

const OUTCOMES: CallOutcome[] = ['ANSWERED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL', 'WRONG_NUMBER'];

const LeadInteractionPanel: React.FC<Props> = ({ leadId, phone }) => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.LEAD_INTERACTIONS_MANAGE);
  const canView =
    canManage ||
    hasPermission(PERMISSIONS.LEAD_INTERACTIONS_VIEW) ||
    hasPermission(PERMISSIONS.FACEBOOK_LEADS_VIEW);

  const [items, setItems] = useState<LeadInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [sms, setSms] = useState('');
  const [callOutcome, setCallOutcome] = useState<CallOutcome>('ANSWERED');
  const [callNote, setCallNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setLoading(true);
      const res = await leadFormsService.listInteractions(leadId);
      setItems(res.data || []);
    } catch (err: any) {
      // Older backends / missing perms — keep panel quiet
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, [leadId, canView]);

  useEffect(() => {
    load();
  }, [leadId]);

  const addNote = async () => {
    if (!canManage || !note.trim()) return;
    try {
      setBusy(true);
      await leadFormsService.logInteraction(leadId, {
        type: 'NOTE',
        content: note.trim(),
      });
      setNote('');
      alert.success('Note logged');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Failed to log note');
    } finally {
      setBusy(false);
    }
  };

  const sendSms = async () => {
    if (!canManage || !sms.trim()) return;
    if (!phone) {
      alert.error('Lead has no phone number');
      return;
    }
    try {
      setBusy(true);
      await leadFormsService.sendSms(leadId, sms.trim());
      setSms('');
      alert.success('SMS queued');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Failed to send SMS');
    } finally {
      setBusy(false);
    }
  };

  const startCall = async () => {
    if (!canManage) return;
    if (!phone) {
      alert.error('Lead has no phone number');
      return;
    }
    try {
      setBusy(true);
      const res = await leadFormsService.getCallPayload(leadId);
      const uri = res.data.telUri;
      if (uri) window.open(uri, '_self');
      alert.info('Dialer opened — log the call outcome below');
    } catch (err: any) {
      alert.error(err?.message || 'Failed to start call');
    } finally {
      setBusy(false);
    }
  };

  const logCall = async () => {
    if (!canManage) return;
    try {
      setBusy(true);
      await leadFormsService.logInteraction(leadId, {
        type: 'CALL',
        direction: 'OUTBOUND',
        callOutcome,
        content: callNote.trim() || null,
      });
      setCallNote('');
      alert.success('Call logged');
      load();
    } catch (err: any) {
      alert.error(err?.message || 'Failed to log call');
    } finally {
      setBusy(false);
    }
  };

  if (!canView) return null;

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Interactions</h3>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {canManage && (
        <div className="space-y-3 rounded-md border p-3 bg-muted/20">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={startCall} disabled={busy || !phone}>
              <Phone className="h-3.5 w-3.5 mr-1" />
              Call
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <Label className="text-xs">Call outcome</Label>
              <NativeSelect
                className="mt-1 w-full"
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value as CallOutcome)}
              >
                {OUTCOMES.map((o) => (
                  <NativeSelectOption key={o} value={o}>
                    {o.replace(/_/g, ' ')}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Button size="sm" variant="secondary" onClick={logCall} disabled={busy}>
              Log call
            </Button>
          </div>
          <Input
            placeholder="Optional call summary"
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
          />

          <div>
            <Label className="text-xs flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> SMS
            </Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              placeholder="Message to lead…"
              maxLength={640}
            />
            <Button size="sm" className="mt-1 gap-1" onClick={sendSms} disabled={busy || !phone}>
              <Send className="h-3.5 w-3.5" />
              Queue SMS
            </Button>
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1">
              <StickyNote className="h-3 w-3" /> Note
            </Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Follow-up note…"
            />
            <Button size="sm" className="mt-1" variant="secondary" onClick={addNote} disabled={busy}>
              Save note
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">No interactions yet.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-md border px-2.5 py-2 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="font-normal">
                {item.type}
                {item.callOutcome ? ` · ${item.callOutcome}` : ''}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            {item.content && <p className="text-foreground/90 whitespace-pre-wrap">{item.content}</p>}
            {item.staff?.user?.name && (
              <p className="text-muted-foreground">by {item.staff.user.name}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadInteractionPanel;
