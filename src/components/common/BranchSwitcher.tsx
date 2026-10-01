import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  MapPin,
  Star,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectBranchAsync } from '../../store/authSlice';
import {
  selectAssignedBranches,
  selectIsAdmin,
  selectUser,
  selectUserLocationCode,
} from '../../store/selectors';
import type { AssignedBranch } from '../../store/types';

type BranchSwitcherVariant = 'branch' | 'admin';

interface BranchSwitcherProps {
  /** Visual style to match host navbar */
  variant?: BranchSwitcherVariant;
  /** Fallback label when not on a scoped branch (e.g. admin dashboard) */
  fallbackLabel?: string;
  /** Notify host navbar so it can raise z-index while open */
  onOpenChange?: (open: boolean) => void;
}

function normalizeCode(code?: string | null): string {
  return (code || '').trim().toUpperCase();
}

/**
 * Mid-session branch switcher for users with multiple assigned branches
 * (and admins who can jump between admin dashboard and assigned branches).
 * Dropdown is portaled to document.body so glass dashboard cards cannot cover it.
 */
export default function BranchSwitcher({
  variant = 'branch',
  fallbackLabel = 'Admin Dashboard',
  onOpenChange,
}: BranchSwitcherProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { branchCode: urlBranchCode } = useParams<{ branchCode?: string }>();
  const { applySessionUser } = useAuth();

  const user = useAppSelector(selectUser);
  const assignedBranches = useAppSelector(selectAssignedBranches);
  const tokenLocationCode = useAppSelector(selectUserLocationCode);
  const isAdmin = useAppSelector(selectIsAdmin);

  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 300,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const branches: AssignedBranch[] =
    assignedBranches.length > 0
      ? assignedBranches
      : user?.assignedBranches || [];

  const currentCode = normalizeCode(
    urlBranchCode || tokenLocationCode || user?.locationCode
  );
  const currentBranch =
    branches.find((b) => normalizeCode(b.locationCode) === currentCode) || null;
  const onAdminDashboard = isAdmin && !currentCode && variant === 'admin';

  const canSwitch =
    branches.length > 1 || (isAdmin && branches.length >= 1);

  const label =
    currentCode ||
    currentBranch?.locationCode ||
    currentBranch?.name ||
    fallbackLabel;
  const nameHint =
    currentBranch?.name && normalizeCode(currentBranch.name) !== currentCode
      ? currentBranch.name
      : null;

  const setOpenSafe = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const updateMenuPosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(300, Math.max(rect.width, 260));
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setMenuPos({
      top: rect.bottom + 6,
      left,
      width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('resize', onScrollOrResize);
    // capture scroll from any scrollable ancestor
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpenSafe(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSafe(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goAfterSwitch = (
    nextUser: {
      locationCode?: string | null;
      activeBranch?: { locationCode?: string | null } | null;
      adminMode?: boolean;
    },
    adminMode: boolean
  ) => {
    if (adminMode) {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }
    const code =
      nextUser.locationCode || nextUser.activeBranch?.locationCode || null;
    if (code) {
      navigate(`/${code}/dashboard`, { replace: true });
    } else {
      navigate('/superadmin/dashboard', { replace: true });
    }
  };

  const handleSelectBranch = async (branch: AssignedBranch) => {
    if (busyKey) return;
    if (normalizeCode(branch.locationCode) === currentCode) {
      setOpenSafe(false);
      return;
    }
    setBusyKey(branch.locationId);
    try {
      const result = await dispatch(
        selectBranchAsync({ branchId: branch.locationId, mode: 'branch' })
      ).unwrap();
      applySessionUser(result.user);
      toast.success(`Switched to ${branch.locationCode}`);
      setOpenSafe(false);
      goAfterSwitch(result.user, false);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not switch branch');
    } finally {
      setBusyKey(null);
    }
  };

  const handleAdminDashboard = async () => {
    if (busyKey || !isAdmin) return;
    if (onAdminDashboard) {
      setOpenSafe(false);
      return;
    }
    setBusyKey('__admin__');
    try {
      const result = await dispatch(
        selectBranchAsync({ branchId: null, mode: 'admin' })
      ).unwrap();
      applySessionUser(result.user);
      toast.success('Switched to admin dashboard');
      setOpenSafe(false);
      goAfterSwitch(result.user, true);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not open admin dashboard');
    } finally {
      setBusyKey(null);
    }
  };

  const pillClass =
    variant === 'admin'
      ? 'bg-orange-500/10 border-orange-300/50 text-orange-900'
      : 'bg-blue-500/10 border-blue-300/50 text-[#1e3a8a]';
  const iconClass = variant === 'admin' ? 'text-orange-700' : 'text-[#1e3a8a]';
  const mutedClass = variant === 'admin' ? 'text-orange-500' : 'text-blue-400';

  if (!canSwitch) {
    if (variant === 'admin') return null;
    return (
      <div
        className={`flex items-center gap-1.5 sm:gap-2 border rounded-xl px-2 sm:px-3 py-1.5 min-w-0 ${pillClass}`}
      >
        <Store className={`w-4 h-4 shrink-0 ${iconClass}`} />
        <div className="leading-tight min-w-0">
          <p className={`text-[10px] font-medium uppercase tracking-wide hidden sm:block ${mutedClass}`}>
            Branch
          </p>
          <p className={`text-xs font-bold truncate ${iconClass}`}>{label}</p>
        </div>
      </div>
    );
  }

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 9999,
          }}
          className="rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Switch workspace
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              role="option"
              aria-selected={onAdminDashboard}
              onClick={handleAdminDashboard}
              disabled={!!busyKey}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-orange-50 disabled:opacity-60 ${
                onAdminDashboard ? 'bg-orange-50' : ''
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                {busyKey === '__admin__' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LayoutDashboard className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">
                  Admin Dashboard
                </span>
                <span className="block text-xs text-gray-500">Whole organization</span>
              </span>
              {onAdminDashboard && (
                <Check className="h-4 w-4 text-orange-600 shrink-0" />
              )}
            </button>
          )}

          {isAdmin && branches.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Your branches
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
          )}

          {branches.map((branch) => {
            const code = branch.locationCode || '';
            const active = normalizeCode(code) === currentCode;
            const busy = busyKey === branch.locationId;
            const showName =
              branch.name &&
              normalizeCode(branch.name) !== normalizeCode(code) &&
              branch.name.trim().toLowerCase() !== 'branch';

            return (
              <button
                key={branch.locationId}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleSelectBranch(branch)}
                disabled={!!busyKey}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-blue-50 disabled:opacity-60 ${
                  active ? 'bg-blue-50' : ''
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {code || branch.name || 'Branch'}
                    </span>
                    {branch.isPrimary && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                        <Star className="h-2.5 w-2.5" />
                        Primary
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {showName ? branch.name : 'Assigned branch'}
                    </span>
                  </span>
                </span>
                {active && <Check className="h-4 w-4 text-blue-700 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpenSafe(!open)}
        disabled={!!busyKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch branch"
        className={`flex items-center gap-1.5 sm:gap-2 border rounded-xl px-2 sm:px-3 py-1.5 min-w-0 max-w-[240px] transition hover:brightness-[0.98] disabled:opacity-60 ${pillClass}`}
      >
        <Store className={`w-4 h-4 shrink-0 ${iconClass}`} />
        <div className="leading-tight min-w-0 text-left">
          <p className={`text-[10px] font-medium uppercase tracking-wide hidden sm:block ${mutedClass}`}>
            {onAdminDashboard ? 'Workspace' : 'Branch'}
          </p>
          <p className={`text-xs font-bold truncate ${iconClass}`}>{label}</p>
          {nameHint && (
            <p className={`text-[10px] truncate hidden sm:block ${mutedClass}`}>
              {nameHint}
            </p>
          )}
        </div>
        {busyKey ? (
          <Loader2 className={`w-3.5 h-3.5 shrink-0 animate-spin ${iconClass}`} />
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${iconClass} ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {menu}
    </div>
  );
}
