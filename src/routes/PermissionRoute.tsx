/**
 * Permission Protected Route Component
 * Route guard that checks specific permissions before rendering content
 * Works alongside ProtectedRouteRedux for role-based access
 */
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionRouteProps {
  children: ReactNode;
  /** Single permission required to access this route */
  permission?: string;
  /** Multiple permissions - user needs ANY or ALL based on requireAll */
  permissions?: string[];
  /** If true, requires ALL permissions; if false, requires ANY (default: false) */
  requireAll?: boolean;
  /** Module that user needs any permission in */
  module?: string;
  /** Redirect path when permission denied (default: /unauthorized) */
  unauthorizedRedirect?: string;
  /** Fallback component to render instead of redirecting */
  fallback?: ReactNode;
  /** Loading component while checking permissions */
  loadingComponent?: ReactNode;
}

/**
 * PermissionRoute - Wrap routes that require specific permissions
 * 
 * Usage Examples:
 * 
 * 1. Single permission:
 * <PermissionRoute permission="users.create">
 *   <CreateUserPage />
 * </PermissionRoute>
 * 
 * 2. Any of multiple permissions:
 * <PermissionRoute permissions={['users.create', 'users.update']}>
 *   <UserManagement />
 * </PermissionRoute>
 * 
 * 3. All permissions required:
 * <PermissionRoute permissions={['users.create', 'users.update']} requireAll>
 *   <FullUserManagement />
 * </PermissionRoute>
 * 
 * 4. Module access:
 * <PermissionRoute module="users">
 *   <UsersSection />
 * </PermissionRoute>
 * 
 * 5. With custom fallback:
 * <PermissionRoute permission="admin.panel" fallback={<AccessDenied />}>
 *   <AdminPanel />
 * </PermissionRoute>
 */
export const PermissionRoute = ({
  children,
  permission,
  permissions,
  requireAll = false,
  module,
  unauthorizedRedirect = '/unauthorized',
  fallback,
  loadingComponent,
}: PermissionRouteProps) => {
  const location = useLocation();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    isSuperAdmin,
    user,
  } = usePermissions();

  // Show loading if user data isn't ready yet
  if (!user) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Super admins bypass all permission checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  let hasAccess = true;

  // Check module access
  if (module) {
    hasAccess = canAccessModule(module);
  }

  // Check single permission
  if (hasAccess && permission) {
    hasAccess = hasPermission(permission);
  }

  // Check multiple permissions
  if (hasAccess && permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  // If user doesn't have access
  if (!hasAccess) {
    // Show fallback component if provided
    if (fallback) {
      return <>{fallback}</>;
    }
    // Otherwise redirect to unauthorized page
    return <Navigate to={unauthorizedRedirect} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PermissionRoute;
