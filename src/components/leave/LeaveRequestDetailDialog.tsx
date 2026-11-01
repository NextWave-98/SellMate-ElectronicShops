import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Paperclip, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveApi } from '@/hooks/useLeave';
import type { LeaveRequestDetail } from '@/types/leave.types';
import { LeaveStatusBadge, LeaveTypeChip } from './LeaveStatusBadge';
import { DAY_PART_LABEL, formatDate, formatDateTime, formatDays, formatNumber, formatRange } from './leaveFormat';

type PendingAction = 'approve' | 'reject' | 'confirm' | 'cancel' | 'withdraw' | null;

const ACTION_COPY: Record<Exclude<PendingAction, null>, { title: string; label: string; field: string; required: boolean }> = {
  approve: { title: 'Approve leave', label: 'Approve', field: 'Comment (optional)', required: false },
  reject: { title: 'Reject leave', label: 'Reject', field: 'Reason', required: true },
  confirm: { title: 'Confirm leave', label: 'Confirm', field: 'Comment (optional)', required: false },
  cancel: { title: 'Cancel leave', label: 'Cancel leave', field: 'Reason (optional)', required: false },
  withdraw: { title: 'Withdraw request', label: 'Withdraw', field: 'Reason (optional)', required: false },
};

const ACTION_LABEL: Record<string, string> = {
  CREATED: 'Created',
  UPDATED: 'Edited',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  WITHDRAWN: 'Withdrawn',
};

interface LeaveRequestDetailDialogProps {
  requestId: string | null;
  onClose: () => void;
  api: LeaveApi;
  onChanged?: (detail: LeaveRequestDetail) => void;
  onEdit?: (detail: LeaveRequestDetail) => void;
  /** Show who the leave belongs to (management screens). */
  showEmployee?: boolean;
}

export function LeaveRequestDetailDialog({ requestId, onClose, api, onChanged, onEdit, showEmployee }: LeaveRequestDetailDialogProps) {
  const [detail, setDetail] = useState<LeaveRequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setDetail(await api.getRequest(id));
    setLoading(false);
  }, [api]);

  useEffect(() => {
    setPending(null);
    setNote('');
    if (requestId) void load(requestId);
    else setDetail(null);
  }, [requestId, load]);

  const run = async () => {
    if (!detail || !pending) return;
    setBusy(true);
    const text = note.trim();
    const result =
      pending === 'approve' ? await api.approveRequest(detail.id, text)
      : pending === 'reject' ? await api.rejectRequest(detail.id, text)
      : pending === 'confirm' ? await api.confirmRequest(detail.id, text)
      : await api.cancelRequest(detail.id, text);
    setBusy(false);
    if (result) {
      setDetail(result);
      setPending(null);
      setNote('');
      onChanged?.(result);
    }
  };

  const submitDraft = async () => {
    if (!detail) return;
    setBusy(true);
    const result = await api.submitRequest(detail.id);
    setBusy(false);
    if (result) {
      setDetail(result);
      onChanged?.(result);
    }
  };

  const p = detail?.permissions;
  const steps = detail?.approvalSteps ?? [];

  return (
    <Dialog open={!!requestId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Leave request</DialogTitle>
        </DialogHeader>

        <DialogBody>
        {loading || !detail ? (
          <div className="py-10 flex justify-center text-gray-400">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'This request could not be loaded.'}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                {showEmployee && (
                  <p className="font-semibold text-gray-900">
                    {detail.employeeName}
                    {detail.locationName && <span className="font-normal text-gray-500"> · {detail.locationName}</span>}
                  </p>
                )}
                <LeaveTypeChip name={detail.leaveTypeName} color={detail.leaveTypeColor} />
                <p className="text-sm text-gray-700">
                  {formatRange(detail.startDate, detail.endDate)} · {formatDays(detail.totalDays)}
                  {detail.dayPart !== 'FULL_DAY' ? ` · ${DAY_PART_LABEL[detail.dayPart]}` : ''}
                  {!detail.isPaid ? ' · Unpaid' : ''}
                </p>
              </div>
              <LeaveStatusBadge status={detail.status} stepName={detail.currentStepName} />
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-gray-500">Reason</dt><dd className="whitespace-pre-wrap">{detail.reason || '—'}</dd></div>
              <div><dt className="text-gray-500">Leave year</dt><dd>{detail.leaveYear}</dd></div>
              <div><dt className="text-gray-500">Contact while on leave</dt><dd>{detail.contactInfo || '—'}</dd></div>
              <div><dt className="text-gray-500">Emergency contact</dt><dd>{detail.emergencyContact || '—'}</dd></div>
              {detail.attachmentUrl && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Attachment</dt>
                  <dd>
                    <a href={detail.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 underline">
                      <Paperclip className="h-4 w-4" /> {detail.attachmentName || 'View attachment'}
                    </a>
                  </dd>
                </div>
              )}
              {detail.rejectionReason && (
                <div className="sm:col-span-2"><dt className="text-gray-500">Rejection reason</dt><dd className="text-red-700">{detail.rejectionReason}</dd></div>
              )}
              {detail.cancellationReason && (
                <div className="sm:col-span-2"><dt className="text-gray-500">Cancellation reason</dt><dd>{detail.cancellationReason}</dd></div>
              )}
            </dl>

            {detail.balance && (
              <div className="rounded-lg border p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                <p><span className="text-gray-500">Allocated:</span> {detail.balance.isUnlimited ? 'Unlimited' : formatNumber(detail.balance.totalAllocated)}</p>
                <p><span className="text-gray-500">Used:</span> {formatNumber(detail.balance.used)}</p>
                <p><span className="text-gray-500">Pending:</span> {formatNumber(detail.balance.pending)}</p>
                <p><span className="text-gray-500">Available:</span> {detail.balance.isUnlimited ? 'Unlimited' : formatNumber(detail.balance.available)}</p>
              </div>
            )}

            {steps.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Approval</p>
                <ol className="flex flex-wrap gap-2 text-xs">
                  {steps.map((s, i) => {
                    const done =
                      i < detail.currentStep ||
                      detail.status === 'APPROVED' ||
                      detail.status === 'CONFIRMED';
                    const rejected = detail.status === 'REJECTED' && i === detail.currentStep;
                    return (
                      <li key={s.key} className="flex items-center gap-1 rounded-full border px-2 py-1">
                        {rejected ? <XCircle className="h-3.5 w-3.5 text-red-600" /> : done ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5 text-gray-400" />}
                        {s.name}
                      </li>
                    );
                  })}
                  {detail.requiresConfirmation && (
                    <li className="flex items-center gap-1 rounded-full border px-2 py-1">
                      {detail.status === 'CONFIRMED' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5 text-gray-400" />}
                      Final confirmation
                    </li>
                  )}
                </ol>
                {p?.blockedReason && <p className="text-xs text-gray-500 mt-2">{p.blockedReason}</p>}
              </div>
            )}

            {detail.dayBreakdown.length > 0 && detail.dayBreakdown.length <= 62 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600">Day-by-day breakdown</summary>
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {detail.dayBreakdown.map((d) => (
                    <li key={d.date} className="flex justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                      <span>{formatDate(d.date)}</span>
                      <span className={d.value > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {d.value > 0 ? formatDays(d.value) : d.holidayName ? `Holiday: ${d.holidayName}` : 'Non-working day'}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Timeline</p>
              <ol className="relative border-l border-gray-200 ml-2 space-y-3">
                {detail.actions.map((a) => (
                  <li key={a.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" aria-hidden="true" />
                    <p className="text-sm">
                      <strong>{ACTION_LABEL[a.action] ?? a.action}</strong>
                      {a.stepName ? ` (${a.stepName})` : ''} by {a.actorName ?? 'System'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateTime(a.createdAt)}</p>
                    {a.comment && <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.comment}</p>}
                  </li>
                ))}
              </ol>
            </div>

            {pending && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="font-medium text-sm">{ACTION_COPY[pending].title}</p>
                <Label htmlFor="leave-action-note">{ACTION_COPY[pending].field}</Label>
                <Textarea id="leave-action-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setPending(null)} disabled={busy}>Back</Button>
                  <Button
                    size="sm"
                    variant={pending === 'reject' || pending === 'cancel' || pending === 'withdraw' ? 'destructive' : 'default'}
                    onClick={() => void run()}
                    disabled={busy || (ACTION_COPY[pending].required && !note.trim())}
                  >
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {ACTION_COPY[pending].label}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        </DialogBody>

        {detail && !pending && (
          <DialogFooter className="flex-wrap gap-2">
            {p?.canEdit && onEdit && (detail.status === 'DRAFT' || detail.status === 'PENDING') && (
              <Button variant="outline" onClick={() => onEdit(detail)} disabled={busy}>Edit</Button>
            )}
            {p?.canSubmit && <Button onClick={() => void submitDraft()} disabled={busy}>Submit</Button>}
            {p?.canWithdraw && <Button variant="outline" onClick={() => setPending('withdraw')}>Withdraw</Button>}
            {p?.canCancel && <Button variant="outline" onClick={() => setPending('cancel')}>Cancel leave</Button>}
            {p?.canReject && <Button variant="destructive" onClick={() => setPending('reject')}>Reject</Button>}
            {p?.canApprove && <Button onClick={() => setPending('approve')}>Approve</Button>}
            {p?.canConfirm && <Button onClick={() => setPending('confirm')}>Confirm</Button>}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LeaveRequestDetailDialog;
