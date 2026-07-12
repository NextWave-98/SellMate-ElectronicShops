import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, Loader2, Star, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectBranchAsync } from '../../store/authSlice';
import {
  selectUser,
  selectIsAuthenticated,
  selectAuthInitialized,
  selectAssignedBranches,
} from '../../store/selectors';
import type { AssignedBranch, User } from '../../store/types';

const BranchSelectPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const initialized = useAppSelector(selectAuthInitialized);
  const assignedBranches = useAppSelector(selectAssignedBranches);

  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  const branches: AssignedBranch[] = assignedBranches?.length
    ? assignedBranches
    : user?.assignedBranches || [];
  const isAdmin = !!user?.isAdmin;

  // Guard: if not authenticated once init has settled, go to login
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  const goToDestination = (selectedUser: User, adminMode: boolean) => {
    if (adminMode) {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }
    const code = selectedUser?.locationCode || selectedUser?.activeBranch?.locationCode;
    if (code) {
      navigate(`/${code}/dashboard`, { replace: true });
    } else {
      navigate('/superadmin/dashboard', { replace: true });
    }
  };

  const handleSelectBranch = async (branch: AssignedBranch) => {
    if (submittingKey) return;
    setSubmittingKey(branch.locationId);
    try {
      const result = await dispatch(
        selectBranchAsync({ branchId: branch.locationId, mode: 'branch' })
      ).unwrap();
      toast.success(`Signed in to ${branch.name}`);
      goToDestination(result.user as User, false);
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Could not select that branch';
      toast.error(message);
      setSubmittingKey(null);
    }
  };

  const handleAdminDashboard = async () => {
    if (submittingKey) return;
    setSubmittingKey('__admin__');
    try {
      const result = await dispatch(
        selectBranchAsync({ branchId: null, mode: 'admin' })
      ).unwrap();
      toast.success('Opening admin dashboard');
      goToDestination(result.user as User, true);
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Could not open admin dashboard';
      toast.error(message);
      setSubmittingKey(null);
    }
  };

  return (
    <AuthSplitLayout
      badge="Choose where to work"
      title={`Welcome${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
      subtitle={
        isAdmin
          ? 'Open your admin dashboard or jump straight into one of your branches.'
          : 'Select the branch you want to sign in to.'
      }
    >
      <div className="space-y-3">
        {isAdmin && (
          <button
            type="button"
            onClick={handleAdminDashboard}
            disabled={!!submittingKey}
            className="flex w-full items-center gap-3 rounded-xl border border-orange-300/80 bg-orange-50/70 px-4 py-3 text-left transition hover:bg-orange-100/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
              {submittingKey === '__admin__' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LayoutDashboard className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">Admin Dashboard</span>
              <span className="block text-xs text-gray-600">Manage the whole organization</span>
            </span>
          </button>
        )}

        {isAdmin && branches.length > 0 && (
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
              or a branch
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        )}

        {branches.length === 0 && !isAdmin && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-700">
            You are not assigned to any branch yet. Please contact your administrator.
          </div>
        )}

        {branches.map((branch) => {
          const busy = submittingKey === branch.locationId;
          return (
            <button
              key={branch.locationId}
              type="button"
              onClick={() => handleSelectBranch(branch)}
              disabled={!!submittingKey}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-orange-300 hover:bg-orange-50/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-orange-600">
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">{branch.name}</span>
                  {branch.isPrimary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      <Star className="h-3 w-3" /> Primary
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {branch.locationCode}
                  {branch.address ? ` · ${branch.address}` : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </AuthSplitLayout>
  );
};

export default BranchSelectPage;
