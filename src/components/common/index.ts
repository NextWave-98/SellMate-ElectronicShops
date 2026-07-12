/**
 * Permission Components Index
 * Central export file for all permission-related components
 */

// Permission Gate Components
export {
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
} from './PermissionGate';

// Permission Button Components
export {
  PermissionButton,
  PermissionLink,
  PermissionIconButton,
  ActionButtons,
} from './PermissionButton';

// Re-export permission configuration
export {
  SUPERADMIN_SIDEBAR_PERMISSIONS,
  BRANCH_SIDEBAR_PERMISSIONS,
  SUPERADMIN_ROUTE_PERMISSIONS,
  BRANCH_ROUTE_PERMISSIONS,
  BUTTON_PERMISSIONS,
  type SidebarPermissionConfig,
  type RoutePermissionConfig,
  type ButtonPermissionKey,
} from '../../config/permissions.config';

// Re-export permission constants from store
export { PERMISSIONS, ROLE_NAMES, ROLE_HIERARCHY } from '../../store/types';
