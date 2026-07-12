/**
 * Permission Gate Components
 * Components for conditional rendering based on permissions and roles
 */
import type { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RequirePermissionProps extends PermissionGateProps {
  permission: string;
}

interface RequireAnyPermissionProps extends PermissionGateProps {
  permissions: string[];
}

interface RequireAllPermissionsProps extends PermissionGateProps {
  permissions: string[];
}

interface RequireRoleProps extends PermissionGateProps {
  role: string;
}

interface RequireAnyRoleProps extends PermissionGateProps {
  roles: string[];
}

interface RequireModuleAccessProps extends PermissionGateProps {
  module: string;
}

interface RequireFeatureProps extends PermissionGateProps {
  feature: string;
}

/**
 * Component that renders children only if user has the specified permission
 */
export const RequirePermission = ({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children if user has any of the specified permissions
 */
export const RequireAnyPermission = ({
  permissions,
  children,
  fallback = null,
}: RequireAnyPermissionProps) => {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children if user has all specified permissions
 */
export const RequireAllPermissions = ({
  permissions,
  children,
  fallback = null,
}: RequireAllPermissionsProps) => {
  const { hasAllPermissions } = usePermissions();
  return hasAllPermissions(permissions) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children only if user has the specified role
 */
export const RequireRole = ({
  role,
  children,
  fallback = null,
}: RequireRoleProps) => {
  const { hasRole } = usePermissions();
  return hasRole(role) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children if user has any of the specified roles
 */
export const RequireAnyRole = ({
  roles,
  children,
  fallback = null,
}: RequireAnyRoleProps) => {
  const { hasAnyRole } = usePermissions();
  return hasAnyRole(roles) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children only if user is super admin
 * SUPER_ADMIN = Platform owner (1-2 users) who can manage ALL organizations
 */
export const RequireSuperAdmin = ({
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { isSuperAdmin } = usePermissions();
  return isSuperAdmin ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children only if user is organization admin
 * ADMIN = Organization administrator who manages their OWN business
 */
export const RequireOrganizationAdmin = ({
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { isOrganizationAdmin } = usePermissions();
  return isOrganizationAdmin ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children only if user is any type of admin (SUPER_ADMIN or ADMIN)
 */
export const RequireAdmin = ({
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { isAdmin } = usePermissions();
  return isAdmin ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children only if user can manage organizations
 * This is SUPER_ADMIN only - for platform-level organization management
 */
export const RequireOrganizationManagement = ({
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { canManageOrganizations } = usePermissions();
  return canManageOrganizations ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children only if user is manager
 */
export const RequireManager = ({
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { isManager } = usePermissions();
  return isManager ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children if user can access the specified module
 */
export const RequireModuleAccess = ({
  module,
  children,
  fallback = null,
}: RequireModuleAccessProps) => {
  const { canAccessModule } = usePermissions();
  return canAccessModule(module) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children if feature is available in subscription
 */
export const RequireFeature = ({
  feature,
  children,
  fallback = null,
}: RequireFeatureProps) => {
  const { hasFeature } = usePermissions();
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component that renders children if subscription is active
 */
export const RequireActiveSubscription = ({
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { isSubscriptionActive } = usePermissions();
  return isSubscriptionActive ? <>{children}</> : <>{fallback}</>;
};

/**
 * Export all components
 */
export default {
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
  RequireRole,
  RequireAnyRole,
  RequireSuperAdmin,
  RequireOrganizationAdmin,
  RequireAdmin,
  RequireOrganizationManagement,
  RequireManager,
  RequireModuleAccess,
  RequireFeature,
  RequireActiveSubscription,
};
