/**
 * The subscription warning: "your payment is due".
 *
 * It appears three days before the due date and stays until the payment is
 * recorded. It is not a modal and it blocks nothing   the whole point is that
 * the shop sees it while there is still time to act, rather than discovering
 * the problem on the morning nobody can log in.
 *
 * ── Why it lives in the layout, not on the dashboard ──────────────────────
 * A cashier does not visit the dashboard; they open the POS and stay there all
 * day. A warning only the owner's dashboard carries is a warning the people
 * actually working the shop never see. So this is mounted in the branch and
 * organization layouts, which means it rides along on every screen   except
 * POS fullscreen, where the layout hides all its chrome on purpose.
 *
 * ── What staff see, and what they do not ──────────────────────────────────
 * Everyone gets the warning and the date access stops, because everyone needs
 * to know the shop is about to stop working. The amount owed and the bank
 * account are shown only to the owner/administrator: a cashier has no use for
 * the shop's subscription fee, and it is not theirs to see. Staff are told to
 * pass it on instead.
 *
 * It renders nothing at all when nothing is due (state OK), when the
 * organization is never billed (EXEMPT), or when the status could not be read.
 * A blocked organization never sees it either, because a blocked organization
 * cannot get past the login screen   that message lives there.
 */
import { AlertTriangle, Clock, Building2 } from 'lucide-react';
import useBillingStatus from '../../hooks/useBillingStatus';
import { usePermissions } from '../../hooks/usePermissions';

const money = (n: number | null | undefined) =>
  n == null
    ? null
    : `Rs. ${Number(n).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

export default function SubscriptionDueBanner() {
  const { status } = useBillingStatus();
  const { isOrganizationAdmin, isSuperAdmin, isAdmin } = usePermissions();

  // Who is allowed to see the amount and the bank account.
  const canSeeBillingDetail = Boolean(isOrganizationAdmin || isSuperAdmin || isAdmin);

  if (!status) return null;
  if (status.state !== 'DUE_SOON' && status.state !== 'OVERDUE') return null;

  const overdue = status.state === 'OVERDUE';
  const amount = money(status.amount);
  const pay = status.payTo;

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 ${
        overdue ? 'border-orange-300 bg-orange-50' : 'border-amber-200 bg-amber-50'
      }`}
      role="status"
    >
      <div className="flex flex-wrap items-start gap-3">
        {overdue ? (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-orange-600" />
        ) : (
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
        )}

        <div className="min-w-[16rem] flex-1 text-sm">
          <p className={`font-semibold ${overdue ? 'text-orange-900' : 'text-amber-900'}`}>
            {overdue ? 'Please pay your subscription payment' : 'Subscription payment due soon'}
          </p>

          {canSeeBillingDetail ? (
            <p className={`mt-1 ${overdue ? 'text-orange-800' : 'text-amber-800'}`}>
              {status.message ||
                (amount ? `${amount} is due on ${status.dueDate}.` : 'A payment is due.')}
            </p>
          ) : (
            <p className={`mt-1 ${overdue ? 'text-orange-800' : 'text-amber-800'}`}>
              {overdue
                ? 'The subscription payment for this shop is overdue.'
                : `The subscription payment for this shop is due${
                    status.dueDate ? ` on ${status.dueDate}` : ' soon'
                  }.`}{' '}
              Please let the shop owner know.
            </p>
          )}

          {status.blockedFrom && (
            <p className={`mt-1 text-xs ${overdue ? 'text-orange-700' : 'text-amber-700'}`}>
              Everyone will be logged out and unable to sign in from{' '}
              {status.blockedFrom}
              {status.daysUntilBlocked != null && status.daysUntilBlocked > 0
                ? ` (${status.daysUntilBlocked} day(s) left)`
                : ''}
              .
            </p>
          )}
        </div>

        {canSeeBillingDetail && pay?.accountNumber && (
          <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-700">
            <p className="flex items-center gap-1 font-semibold text-slate-800">
              <Building2 className="size-3.5" /> Pay to
            </p>
            <p className="mt-0.5">
              {pay.accountName}
              {pay.bank ? ` · ${pay.bank}` : ''}
            </p>
            <p className="font-mono text-sm font-semibold text-slate-900">{pay.accountNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}
