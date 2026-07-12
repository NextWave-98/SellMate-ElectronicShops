/**
 * Protected Route Component (Redux Version)
 * Route guard that handles authentication, authorization, and permission checks
 * 
 * Role Hierarchy:
 * - SUPER_ADMIN: Platform owner (1-2 users), can manage ALL organizations
 * - ADMIN: Organization administrator, manages their OWN business
 * - MANAGER: Branch/Location manager
 * - STAFF: Regular staff
 */
import { Navigate, useParams, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthInitialized,
  selectUser,
  selectUserRole,
  selectUserLocationCode,
  selectIsSuperAdmin,
  selectIsAdmin,
  selectPermissionNames,
} from '../store/selectors';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  unauthorizedRedirect?: string;
  // Role-based access (legacy support)
  allowedRoles?: number[];
  // New: Role names support
  allowedRoleNames?: string[];
  // Require SUPER_ADMIN only (for organization management)
  requireSuperAdmin?: boolean;
  // Require organization admin or higher
  requireAdmin?: boolean;
  // Permission-based access
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAnyPermission?: boolean; // If true, user needs any of requiredPermissions; if false, needs all
  // Module-based access
  requiredModule?: string;
}

// Legacy role ID mapping for backward compatibility
const LEGACY_ROLES = {
  SUPER_ADMIN: 1,  // Platform owner
  ADMIN: 2,        // Organization admin
  MANAGER: 3,
  USER: 4,
} as const;

const ProtectedRoute = ({
  children,
  redirectTo = '/login',
  unauthorizedRedirect = '/unauthorized',
  allowedRoles,
  allowedRoleNames,
  requireSuperAdmin = false,
  requireAdmin = false,
  requiredPermission,
  requiredPermissions,
  requireAnyPermission = false,
  requiredModule,
}: ProtectedRouteProps) => {
  // Redux selectors
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const loading = useAppSelector(selectAuthLoading);
  const initialized = useAppSelector(selectAuthInitialized);
  const user = useAppSelector(selectUser);
  const userRole = useAppSelector(selectUserRole);
  const userLocationCode = useAppSelector(selectUserLocationCode);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const isAdmin = useAppSelector(selectIsAdmin);
  const permissions = useAppSelector(selectPermissionNames);

  // Get branch code from URL params
  const { branchCode } = useParams<{ branchCode?: string }>();
  const location = useLocation();

  // Show loading state while checking authentication
  if (!initialized || loading) {
    console.log('[ProtectedRoute] Loading state:', { initialized, loading });
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
  if (!isAuthenticated || !user) {
    console.log('[ProtectedRoute] Not authenticated:', { isAuthenticated, user, location: location.pathname });
    // Save the intended destination for redirect after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  
  // Log successful authentication

  // Check if SUPER_ADMIN is required (for organization management features)
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  // Check if any admin role is required
  if (requireAdmin && !isAdmin) {
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  // SUPER_ADMIN bypasses all other permission checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check legacy role-based access (for backward compatibility)
  if (allowedRoles && allowedRoles.length > 0) {
    // Convert user role name to legacy role ID for comparison
    const userRoleName = userRole?.toUpperCase();
    let userRoleId: number | undefined;

    // Properly map role names to IDs
    if (userRoleName === 'SUPER_ADMIN') {
      userRoleId = LEGACY_ROLES.SUPER_ADMIN;
    } else if (userRoleName === 'ADMIN') {
      userRoleId = LEGACY_ROLES.ADMIN;
    } else if (userRoleName === 'MANAGER') {
      userRoleId = LEGACY_ROLES.MANAGER;
    } else if (userRoleName === 'STAFF') {
      userRoleId = LEGACY_ROLES.ADMIN;
    } else {
      userRoleId = LEGACY_ROLES.USER;
    }

    if (import.meta.env.DEV) {
      console.log('ProtectedRoute - Legacy role check:', {
        userRoleName,
        userRoleId,
        allowedRoles,
        hasAccess: userRoleId && allowedRoles.includes(userRoleId),
      });
    }

    if (!userRoleId || !allowedRoles.includes(userRoleId)) {
      // Redirect to their branch dashboard if they have a location assigned
      if (userLocationCode) {
        return <Navigate to={`/${userLocationCode}/dashboard`} replace />;
      }
      return <Navigate to={unauthorizedRedirect} replace />;
    }
  }

  // Check role names access
  if (allowedRoleNames && allowedRoleNames.length > 0) {
    const hasAllowedRole = allowedRoleNames.some(
      (role) => role.toUpperCase() === userRole?.toUpperCase()
    );

    if (!hasAllowedRole) {
      // Redirect to their branch dashboard if they have a location assigned
      if (userLocationCode) {
        return <Navigate to={`/${userLocationCode}/dashboard`} replace />;
      }
      return <Navigate to={unauthorizedRedirect} replace />;
    }
  }

  // Check single permission
  if (requiredPermission) {
    if (!permissions.includes(requiredPermission)) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermissions = requireAnyPermission
      ? requiredPermissions.some((perm) => permissions.includes(perm))
      : requiredPermissions.every((perm) => permissions.includes(perm));

    if (!hasPermissions) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
  }

  // Check module access
  if (requiredModule) {
    const hasModuleAccess = permissions.some((perm) => 
      perm.startsWith(`${requiredModule}.`)
    );

    if (!hasModuleAccess) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
  }

  // Branch validation: Ensure users can only access their own branch
  // Super admins and admins can access any branch
  if (branchCode && userLocationCode && !isSuperAdmin) {
    if (branchCode !== userLocationCode) {
      // Redirect to their correct branch dashboard
      return <Navigate to={`/${userLocationCode}/dashboard`} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// Export legacy roles for backward compatibility
export { LEGACY_ROLES as ROLES };
