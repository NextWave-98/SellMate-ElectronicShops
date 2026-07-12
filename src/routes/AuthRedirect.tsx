/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AuthRedirect Component
 * Redirects authenticated users to their appropriate dashboard
 * Used when user is on login page but already authenticated
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAuthenticated,
  selectAuthInitialized,
  selectUser,
  selectUserRole,
  selectRequiresBranchSelection,
} from '../store/selectors';

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const initialized = useAppSelector(selectAuthInitialized);
  const user = useAppSelector(selectUser);
  const userRole = useAppSelector(selectUserRole);
  const requiresBranchSelection = useAppSelector(selectRequiresBranchSelection);
  const location = useLocation();

  // Wait for auth to initialize
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and on login page, redirect to dashboard
  // But allow navigation to home page from login (don't force dashboard redirect from home)
  if (isAuthenticated && user && (location.pathname === '/login' || location.pathname === '/admin/login')) {
    const roleName = userRole?.toUpperCase();

    // If a branch still needs to be chosen, go to the selection screen first
    if (requiresBranchSelection) {
      return <Navigate to="/select-branch" replace />;
    }

    // Check if there's a saved "from" location they were trying to access
    const from = (location.state as any)?.from?.pathname;

    // If they were trying to access a specific page (not home or login), redirect there
    if (from && from !== '/' && from !== '/login' && from !== '/admin/login') {
      return <Navigate to={from} replace />;
    }

    // Otherwise, redirect to their appropriate dashboard
    if (roleName === 'ADMIN' || roleName === 'SUPER_ADMIN' || roleName === 'SUPERADMIN') {
      return <Navigate to="/superadmin/dashboard" replace />;
    } else if (user.locationCode) {
      return <Navigate to={`/${user.locationCode}/dashboard`} replace />;
    }
  }

  return <>{children}</>;
};

export default AuthRedirect;
