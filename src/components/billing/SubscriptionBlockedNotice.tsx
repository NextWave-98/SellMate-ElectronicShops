/**
 * "You are locked out, and here is exactly how to get back in."
 *
 * Shown on the login screen when the server refuses a login with
 * code BILLING_BLOCKED. A 403 that says only "access denied" leaves the
 * customer with no move except to phone somebody, possibly out of hours, while
 * their shop cannot take a sale. So this shows what is owed, when it was due,
 * and the bank account to pay it into   everything needed to fix it without a
 * conversation.
 *
 * Every field is optional on purpose. If the server ever sends a block without
 * the detail, the notice degrades to the plain message rather than rendering
 * "Rs. null".
 */
import { Lock, Building2 } from 'lucide-react';
import type { BillingBlock } from '../../store/types';

interface Props {
  block: BillingBlock;
  message?: string | null;
}

const money = (n: number | null | undefined) =>
  n == null
    ? null
    : `Rs. ${Number(n).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

export default function SubscriptionBlockedNotice({ block, message }: Props) {
  const pay = block.payTo;
  const amount = money(block.amount);

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-red-200 bg-red-50">
      <div className="flex items-start gap-3 px-4 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-red-600" />
        <div className="text-sm text-red-700">
          <p className="font-semibold">Access suspended   subscription unpaid</p>
          <p className="mt-1">
            {message || 'Access is blocked until the subscription payment is received.'}
          </p>
          <ul className="mt-2 space-y-0.5">
            {amount && (
              <li>
                Amount due: <span className="font-semibold">{amount}</span>
              </li>
            )}
            {block.dueDate && <li>Due date: {block.dueDate}</li>}
            {block.blockedFrom && <li>Suspended since: {block.blockedFrom}</li>}
            {block.invoiceNumber && <li>Invoice: {block.invoiceNumber}</li>}
          </ul>
        </div>
      </div>

      {pay?.accountNumber && (
        <div className="border-t border-red-200 bg-white/70 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 size-4 shrink-0 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-800">Pay to</p>
              <p className="mt-1">
                {pay.accountName}
                {pay.bank ? ` · ${pay.bank}` : ''}
                {pay.branch ? ` (${pay.branch})` : ''}
              </p>
              <p className="font-mono text-base font-semibold tracking-wide text-slate-900">
                {pay.accountNumber}
              </p>
              {(pay.phone || pay.whatsapp || pay.email) && (
                <p className="mt-1 text-slate-600">
                  {[pay.phone, pay.whatsapp, pay.email].filter(Boolean).join(' · ')}
                </p>
              )}
              {pay.note && <p className="mt-1 text-xs text-slate-500">{pay.note}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
