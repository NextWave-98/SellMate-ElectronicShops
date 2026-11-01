import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthRedux } from './useAuthRedux';

/** Shared nav paths for Facebook / Lead Forms pages (admin + branch). */
export function useLeadFormsNav() {
  const { branchCode } = useParams<{ branchCode?: string }>();
  const { user } = useAuthRedux();

  return useMemo(() => {
    const isBranch = Boolean(branchCode);
    const base = isBranch
      ? `/${branchCode}/facebook-leads`
      : '/superadmin/facebook-leads';

    const lockedBranchId =
      (isBranch
        ? (user as { locationId?: string | null; branchId?: string | null } | null)
            ?.locationId ||
          (user as { locationId?: string | null; branchId?: string | null } | null)?.branchId
        : null) || null;

    return {
      isBranch,
      branchCode: branchCode ?? null,
      lockedBranchId,
      inbox: base,
      forms: `${base}/forms`,
      webForms: `${base}/web-forms`,
      settings: `${base}/settings`,
    };
  }, [branchCode, user]);
}
