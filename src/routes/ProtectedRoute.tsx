import { Navigate, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  allowedRoles?: number[];
  unauthorizedRedirect?: string;
}

const ProtectedRoute = ({
  children,
  redirectTo = '/login',
  allowedRoles,
  unauthorizedRedirect = '/unauthorized'
}: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const { branchCode } = useParams<{ branchCode?: string }>();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check if role-based access control is enabled
  if (allowedRoles && allowedRoles.length > 0) {
    // Map role name to role ID for comparison
    // Note: Backend uses 'ADMIN' for super admin, 'MANAGER' for branch managers
    const roleNameToId: Record<string, number> = {
      'SUPERADMIN': ROLES.SUPER_ADMIN,
      'ADMIN': ROLES.SUPER_ADMIN, // Backend ADMIN maps to frontend SUPER_ADMIN
      'MANAGER': ROLES.MANAGER,
      'STAFF': ROLES.ADMIN, // Backend STAFF maps to frontend ADMIN
      'USER': ROLES.USER,
    };
    const userRoleName = user?.role?.name?.toUpperCase();
    const userRoleId = userRoleName ? roleNameToId[userRoleName] : undefined;

    // Debug logging (remove in production)
    if (import.meta.env.DEV) {
      console.log('ProtectedRoute - User role check:', {
        userRoleName,
        userRoleId,
        allowedRoles,
        hasAccess: userRoleId && allowedRoles.includes(userRoleId),
      });
    }

    // If user has no role or role is not in allowed list
    if (!userRoleId || !allowedRoles.includes(userRoleId)) {
      // Redirect to their branch dashboard if they have a location assigned
      if (user?.locationCode) {
        return <Navigate to={`/${user.locationCode}/dashboard`} replace />;
      }
      return <Navigate to={unauthorizedRedirect} replace />;
    }
  }

  // Branch validation: Ensure branch managers can only access their own branch
  // ADMIN and SUPERADMIN can access any branch
  const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'SUPERADMIN';
  if (branchCode && user?.branchCode && !isSuperAdmin) {
    // If the URL branchCode doesn't match user's branchCode
    if (branchCode !== user.branchCode) {
      // Redirect to their correct branch dashboard
      return <Navigate to={`/${user.branchCode}/dashboard`} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
