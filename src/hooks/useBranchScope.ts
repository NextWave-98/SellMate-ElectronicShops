import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectBranchAsync } from '../store/authSlice';
import {
  selectUser,
  selectAssignedBranches,
  selectUserLocationCode,
  selectIsAdmin,
} from '../store/selectors';
import { useLocation } from './useLocation';

function normalizeCode(code?: string | null): string {
  return (code || '').trim().toUpperCase();
}

/**
 * Keeps the JWT branch scope in sync with the URL page code (e.g. /MOO0001/dashboard).
 * Re-issues a scoped token via /auth/select-branch when the URL page differs from the token.
 */
export function useBranchScope() {
  const { branchCode } = useParams<{ branchCode: string }>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const assignedBranches = useAppSelector(selectAssignedBranches);
  const tokenLocationCode = useAppSelector(selectUserLocationCode);
  const isAdmin = useAppSelector(selectIsAdmin);
  const { getAllLocations } = useLocation();

  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!branchCode || !user) {
      setReady(true);
      setSyncing(false);
      return;
    }

    const urlCode = normalizeCode(branchCode);
    const tokenCode = normalizeCode(tokenLocationCode);

    if (urlCode === tokenCode) {
      setReady(true);
      setSyncing(false);
      setError(null);
      syncKeyRef.current = null;
      return;
    }

    const syncKey = `${user.id}:${urlCode}`;
    if (syncKeyRef.current === syncKey) return;
    syncKeyRef.current = syncKey;

    setReady(false);
    setSyncing(true);
    setError(null);

    const branches = assignedBranches.length > 0 ? assignedBranches : user.assignedBranches || [];
    const match = branches.find((b) => normalizeCode(b.locationCode) === urlCode);

    const syncWithBranchId = (branchId: string) =>
      dispatch(selectBranchAsync({ branchId, mode: 'branch' }))
        .unwrap()
        .then(() => {
          setReady(true);
          setError(null);
        })
        .catch((err: unknown) => {
          setError(typeof err === 'string' ? err : 'Could not switch to this page');
          setReady(true);
        })
        .finally(() => {
          setSyncing(false);
        });

    if (match) {
      syncWithBranchId(match.locationId);
      return;
    }

    if (!isAdmin) {
      setError('You are not assigned to this page');
      setReady(true);
      setSyncing(false);
      return;
    }

    // Admin fallback: resolve branchCode → branchId via locations list
    let cancelled = false;
    getAllLocations()
      .then((res: any) => {
        if (cancelled) return;
        const list: any[] =
          res?.data?.locations ??
          res?.data?.branches ??
          (Array.isArray(res?.data) ? res.data : []);
        const loc = list.find((l) => normalizeCode(l.locationCode) === urlCode);
        if (!loc?.id) {
          setError('Branch not found');
          setReady(true);
          setSyncing(false);
          return;
        }
        return syncWithBranchId(loc.id);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not switch to this page');
        setReady(true);
        setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchCode, tokenLocationCode, user, assignedBranches, isAdmin, dispatch, getAllLocations]);

  const isAligned =
    !branchCode ||
    normalizeCode(branchCode) === normalizeCode(tokenLocationCode);

  return {
    branchCode,
    locationId: user?.locationId ?? null,
    locationCode: tokenLocationCode,
    ready: ready && isAligned,
    syncing,
    error,
    isAligned,
  };
}

export default useBranchScope;
