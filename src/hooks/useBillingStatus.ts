/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This organization's own subscription billing state.
 *
 * Read-only and deliberately quiet: it never toasts and never redirects, so a
 * billing endpoint that is missing (an older backend) or momentarily failing
 * costs nothing   the banner simply does not appear. The dashboard must not
 * break because a payment reminder could not be fetched.
 *
 * Note the states this can return but the banner must ignore: OK means nothing
 * is due, and EXEMPT means this organization is never billed at all.
 */
import { useCallback, useEffect, useState } from 'react';
import useFetch from './useFetch';

export type BillingState = 'EXEMPT' | 'OK' | 'DUE_SOON' | 'OVERDUE' | 'BLOCKED';

export interface BillingStatus {
  state: BillingState;
  blocked: boolean;
  daysUntilDue: number | null;
  blockedFrom: string | null;
  daysUntilBlocked: number | null;
  message: string | null;
  amount: number | null;
  dueDate: string | null;
  invoiceNumber: string | null;
  payTo?: {
    accountName?: string;
    accountNumber?: string;
    bank?: string;
    branch?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    note?: string;
  };
}

export function useBillingStatus() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const { execute, loading } = useFetch<any>('', {
    method: 'GET',
    silent: true,
    showToastOnError: false,
    noRedirect: true,
  });

  const load = useCallback(async () => {
    try {
      const res = await execute('/subscriptions/billing-status', {
        method: 'GET',
        silent: true,
        showToastOnError: false,
        noRedirect: true,
      });
      setStatus((res?.data as BillingStatus) ?? null);
    } catch {
      // Deliberately swallowed. No banner is the correct outcome of a failure
      // here; an error toast on the dashboard is not.
      setStatus(null);
    }
  }, [execute]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, loading, reload: load };
}

export default useBillingStatus;
