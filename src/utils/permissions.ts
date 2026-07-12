import type { User } from '../context/AuthContext';
import type { User as ReduxUser } from '../store/types';

type AnyUser = User | ReduxUser | null;

/**
 * Check if user has a specific permission
 */
export const hasPermission = (user: AnyUser, permissionName: string): boolean => {
  if (!user || !user.role?.permissions) {
    return false;
  }

  return user.role.permissions.some((perm) => perm.name === permissionName);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (user: AnyUser, permissionNames: string[]): boolean => {
  if (!user || !user.role?.permissions) {
    return false;
  }

  return permissionNames.some((permName) =>
    user.role.permissions.some((perm) => perm.name === permName)
  );
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (user: AnyUser, permissionNames: string[]): boolean => {
  if (!user || !user.role?.permissions) {
    return false;
  }

  return permissionNames.every((permName) =>
    user.role.permissions.some((perm) => perm.name === permName)
  );
};

/**
 * Check if user has a specific role
 */
export const hasRole = (user: AnyUser, roleName: string): boolean => {
  if (!user || !user.role?.name) {
    return false;
  }

  return user.role.name.toUpperCase() === roleName.toUpperCase();
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user: AnyUser, roleNames: string[]): boolean => {
  if (!user || !user.role?.name) {
    return false;
  }

  const userRole = user.role.name.toUpperCase();
  return roleNames.some((role) => role.toUpperCase() === userRole);
};

/**
 * Check if user is any type of admin (ADMIN or SUPER_ADMIN)
 * @deprecated Use isAnyAdmin or specific role checks instead
 */
export const isAdmin = (user: AnyUser): boolean => {
  return hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
};

/**
 * Check if user is SUPER_ADMIN (Platform owner - highest level)
 * SUPER_ADMIN can manage all organizations and has no businessId
 */
export const isSuperAdmin = (user: AnyUser): boolean => {
  return hasRole(user, 'SUPER_ADMIN');
};

/**
 * Check if user is Organization Admin (ADMIN role)
 * ADMIN manages their own organization/business
 */
export const isOrganizationAdmin = (user: AnyUser): boolean => {
  return hasRole(user, 'ADMIN');
};

/**
 * Check if user is any type of admin (SUPER_ADMIN or Organization ADMIN)
 */
export const isAnyAdmin = (user: AnyUser): boolean => {
  return hasRole(user, 'SUPER_ADMIN') || hasRole(user, 'ADMIN');
};

/**
 * Check if user is branch manager
 */
export const isBranchManager = (user: AnyUser): boolean => {
  return hasRole(user, 'MANAGER');
};

/**
 * Check if user can access a specific module
 */
export const canAccessModule = (user: AnyUser, moduleName: string): boolean => {
  if (!user || !user.role?.permissions) {
    return false;
  }

  // Super admins have access to all modules
  if (isSuperAdmin(user)) {
    return true;
  }

  return user.role.permissions.some((perm) => perm.module === moduleName || perm.name.startsWith(`${moduleName}.`));
};

/**
 * Check if user can perform an action on a module
 */
export const canPerformAction = (user: AnyUser, module: string, action: string): boolean => {
  return hasPermission(user, `${module}.${action}`);
};

