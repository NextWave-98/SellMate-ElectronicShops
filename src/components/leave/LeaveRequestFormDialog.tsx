import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/useDebounce';
import type { LeaveApi } from '@/hooks/useLeave';
import type {
  LeaveAttachment,
  LeaveDayPart,
  LeaveEmployee,
  LeavePreview,
  LeaveRequestDetail,
  LeaveType,
} from '@/types/leave.types';
import { DAY_PART_LABEL, formatDays, formatNumber } from './leaveFormat';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface LeaveRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: LeaveApi;
  types: LeaveType[];
  allowHalfDay: boolean;
  today: string;
  /** Present when the caller may file leave for other employees. */
  employees?: LeaveEmployee[];
  /** Edit an existing draft or pending request. */
  existing?: LeaveRequestDetail | null;
  onSaved: (detail: LeaveRequestDetail) => void;
}

interface FormState {
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  dayPart: LeaveDayPart;
  reason: string;
  contactInfo: string;
  emergencyContact: string;
  attachment: LeaveAttachment | null;
}

function initialState(existing: LeaveRequestDetail | null | undefined, today: string): FormState {
  return {
    userId: existing?.userId ?? '',
    leaveTypeId: existing?.leaveTypeId ?? '',
    startDate: existing?.startDate ?? today,
    endDate: existing?.endDate ?? today,
    dayPart: existing?.dayPart ?? 'FULL_DAY',
    reason: existing?.reason ?? '',
    contactInfo: existing?.contactInfo ?? '',
    emergencyContact: existing?.emergencyContact ?? '',
    attachment: existing?.attachmentUrl
      ? { url: existing.attachmentUrl, publicId: null, name: existing.attachmentName }
      : null,
  };
}

export function LeaveRequestFormDialog({
  open,
  onOpenChange,
  api,
  types,
  allowHalfDay,
  today,
  employees,
  existing,
  onSaved,
}: LeaveRequestFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(existing, today));
  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialState(existing, today));
      setPreview(null);
    }
  }, [open, existing, today]);

  const activeTypes = useMemo(() => types.filter((t) => t.isActive || t.id === existing?.leaveTypeId), [types, existing]);
  const type = activeTypes.find((t) => t.id === form.leaveTypeId) ?? null;
  const singleDay = form.startDate === form.endDate;
  const halfDayAllowed = allowHalfDay && !!type?.allowHalfDay && singleDay;
  const dayPart: LeaveDayPart = halfDayAllowed ? form.dayPart : 'FULL_DAY';
  const filingForOthers = !!employees && !existing;

  const previewKey = useDebounce(
    JSON.stringify({ t: form.leaveTypeId, s: form.startDate, e: form.endDate, p: dayPart, u: form.userId }),
    400,
  );

  useEffect(() => {
    if (!open) return;
    const { t, s, e, p, u } = JSON.parse(previewKey) as { t: string; s: string; e: string; p: LeaveDayPart; u: string };
    if (!t || !s || !e || s > e) {
      setPreview(null);
      setPreviewing(false);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    api
      .preview({
        leaveTypeId: t,
        startDate: s,
        endDate: e,
        dayPart: p,
        userId: u || undefined,
        excludeRequestId: existing?.id,
      })
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .finally(() => {
        if (!cancelled) setPreviewing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewKey, open, api, existing?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('Attachments can be at most 10 MB');
      return;
    }
    setUploading(true);
    const uploaded = await api.uploadAttachment(file);
    setUploading(false);
    if (uploaded) set('attachment', uploaded);
    else toast.error('The attachment could not be uploaded');
  };

  const datesInvalid = form.startDate > form.endDate;
  const attachmentMissing = !!preview?.attachmentRequired && !form.attachment;
  const blocked = datesInvalid || !form.leaveTypeId || !preview || preview.errors.length > 0 || attachmentMissing;

  const save = async (asDraft: boolean) => {
    setSaving(true);
    const payload = {
      leaveTypeId: form.leaveTypeId,
      startDate: form.startDate,
      endDate: form.endDate,
      dayPart,
      reason: form.reason.trim() || null,
      contactInfo: form.contactInfo.trim() || null,
      emergencyContact: form.emergencyContact.trim() || null,
      attachment: form.attachment,
    };
    let result: LeaveRequestDetail | null;
    if (existing) {
      result = await api.updateRequest(existing.id, payload);
      if (result && !asDraft && result.status === 'DRAFT') result = await api.submitRequest(existing.id);
    } else {
      result = await api.createRequest({ ...payload, userId: form.userId || undefined, saveAsDraft: asDraft });
    }
    setSaving(false);
    if (result) {
      onSaved(result);
      onOpenChange(false);
    }
  };

  const balance = preview?.balance ?? null;
  const remaining =
    balance && !balance.isUnlimited && balance.availableAfterPending !== null && preview
      ? balance.availableAfterPending - preview.calculation.totalDays
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit leave request' : 'Request leave'}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 py-1">
          {filingForOthers && (
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select value={form.userId || 'self'} onValueChange={(v) => set('userId', v === 'self' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Myself</SelectItem>
                  {employees?.map((e) => (
                    <SelectItem key={e.userId} value={e.userId}>
                      {e.name}{e.locationName ? `  ${e.locationName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Leave type</Label>
            <Select value={form.leaveTypeId} onValueChange={(v) => set('leaveTypeId', v)}>
              <SelectTrigger><SelectValue placeholder="Choose a leave type" /></SelectTrigger>
              <SelectContent>
                {activeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.isPaid ? '' : ' (unpaid)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {type?.description && <p className="text-xs text-gray-500">{type.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>From</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((f) => ({ ...f, startDate: value, endDate: f.endDate < value ? value : f.endDate }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={form.endDate} min={form.startDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>
          {datesInvalid && <p className="text-xs text-red-600">The end date must be on or after the start date.</p>}

          {halfDayAllowed && (
            <div className="space-y-1">
              <Label>Duration</Label>
              <Select value={dayPart} onValueChange={(v) => set('dayPart', v as LeaveDayPart)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DAY_PART_LABEL) as LeaveDayPart[]).map((p) => (
                    <SelectItem key={p} value={p}>{DAY_PART_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-lg border bg-gray-50 p-3 text-sm space-y-2" aria-live="polite">
            {previewing ? (
              <p className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</p>
            ) : preview ? (
              <>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <p><span className="text-gray-500">Days charged:</span> <strong>{formatDays(preview.calculation.totalDays)}</strong></p>
                  <p><span className="text-gray-500">Leave year:</span> {preview.leaveYearLabel}</p>
                  {balance && (
                    <p>
                      <span className="text-gray-500">Balance after:</span>{' '}
                      <strong className={remaining !== null && remaining < 0 ? 'text-red-600' : ''}>
                        {balance.isUnlimited ? 'Unlimited' : formatNumber(remaining)}
                      </strong>
                    </p>
                  )}
                </div>
                {(preview.calculation.excludedNonWorkingDays > 0 || preview.calculation.excludedHolidays > 0) && (
                  <p className="text-xs text-gray-500">
                    Not charged: {preview.calculation.excludedNonWorkingDays} non-working day(s)
                    {preview.calculation.excludedHolidays > 0 ? `, ${preview.calculation.excludedHolidays} holiday(s)` : ''}
                    {preview.calculation.breakdown
                      .filter((d) => d.holidayName)
                      .map((d) => ` · ${d.holidayName}`)
                      .join('')}
                  </p>
                )}
                {preview.errors.map((msg) => (
                  <p key={msg} className="flex items-start gap-2 text-red-600"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{msg}</p>
                ))}
                {preview.warnings.map((msg) => (
                  <p key={msg} className="flex items-start gap-2 text-amber-700"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{msg}</p>
                ))}
              </>
            ) : (
              <p className="text-gray-500">Choose a leave type and dates to see how many days will be charged.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Reason</Label>
            <Textarea rows={3} maxLength={2000} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact while on leave</Label>
              <Input maxLength={160} value={form.contactInfo} onChange={(e) => set('contactInfo', e.target.value)} placeholder="Phone or email" />
            </div>
            <div className="space-y-1">
              <Label>Emergency contact</Label>
              <Input maxLength={160} value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Name and phone" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Attachment{preview?.attachmentRequired ? ' (required)' : ''}</Label>
            {form.attachment ? (
              <div className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 text-gray-500" />
                <a href={form.attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate">
                  {form.attachment.name || 'Attachment'}
                </a>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => set('attachment', null)} aria-label="Remove attachment">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*,application/pdf"
                disabled={uploading}
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            )}
            {uploading && <p className="text-xs text-gray-500">Uploading…</p>}
            {attachmentMissing && <p className="text-xs text-red-600">This leave type needs a supporting document.</p>}
          </div>
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Close</Button>
          {(!existing || existing.status === 'DRAFT') && (
            <Button variant="secondary" onClick={() => void save(true)} disabled={saving || uploading || !form.leaveTypeId || datesInvalid}>
              Save draft
            </Button>
          )}
          <Button onClick={() => void save(false)} disabled={saving || uploading || blocked}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existing && existing.status !== 'DRAFT' ? 'Save changes' : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LeaveRequestFormDialog;
