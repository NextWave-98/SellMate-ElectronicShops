/**
 * usePermissions Hook
 * React hook for checking permissions and roles in components
 * 
 * Role Hierarchy:
 * - SUPER_ADMIN: Platform owner (1-2 users), manages ALL organizations
 * - ADMIN: Organization administrator, manages their OWN business
 * - MANAGER: Branch/Location manager
 * - STAFF: Regular staff
 */
import { useMemo, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  selectUser,
  selectUserRole,
  selectPermissionNames,
  selectIsSuperAdmin,
  selectIsOrganizationAdmin,
  selectIsAdmin,
  selectIsManager,
  selectIsStaff,
  selectCanManageOrganizations,
  selectUserLocationCode,
  selectUserBusinessId,
  selectIsSubscriptionActive,
  selectSubscriptionLimits,
} from '../store/selectors';
import { PERMISSIONS, ROLE_NAMES } from '../store/types';

/**
 * Hook for checking user permissions and roles
 */
export const usePermissions = () => {
  const user = useAppSelector(selectUser);
  const roleName = useAppSelector(selectUserRole);
  const permissionNames = useAppSelector(selectPermissionNames);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const isOrganizationAdmin = useAppSelector(selectIsOrganizationAdmin);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isManager = useAppSelector(selectIsManager);
  const isStaff = useAppSelector(selectIsStaff);
  const canManageOrganizations = useAppSelector(selectCanManageOrganizations);
  const locationCode = useAppSelector(selectUserLocationCode);
  const businessId = useAppSelector(selectUserBusinessId);
  const isSubscriptionActive = useAppSelector(selectIsSubscriptionActive);
  const subscriptionLimits = useAppSelector(selectSubscriptionLimits);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permissionName: string): boolean => {
      // Super admins have all permissions
      if (isSuperAdmin) return true;
      return permissionNames.includes(permissionName);
    },
    [permissionNames, isSuperAdmin]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (isSuperAdmin) return true;
      return permissions.some((perm) => permissionNames.includes(perm));
    },
    [permissionNames, isSuperAdmin]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (isSuperAdmin) return true;
      return permissions.every((perm) => permissionNames.includes(perm));
    },
    [permissionNames, isSuperAdmin]
  );

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!roleName) return false;
      return roleName.toUpperCase() === role.toUpperCase();
    },
    [roleName]
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!roleName) return false;
      return roles.some((role) => role.toUpperCase() === roleName.toUpperCase());
    },
    [roleName]
  );

  /**
   * Check if user can access a specific module
   * Treats known aliases as equivalent (e.g. courier <-> couriers)
   */
  const canAccessModule = useCallback(
    (module: string): boolean => {
      if (isSuperAdmin) return true;
      const aliases: Record<string, string[]> = {
        courier: ['courier', 'couriers'],
        couriers: ['couriers', 'courier'],
      };
      const modules = aliases[module] ?? [module];
      return modules.some((mod) =>
        permissionNames.some((perm) => perm.startsWith(`${mod}.`)),
      );
    },
    [permissionNames, isSuperAdmin]
  );

  /** Courier sidebar + WooCommerce + dashboard courier widgets share this gate */
  const hasCourierAccess = useCallback((): boolean => {
    return isSuperAdmin || canAccessModule('couriers');
  }, [isSuperAdmin, canAccessModule]);

  /**
   * Check if user can perform an action on a module
   */
  const canPerformAction = useCallback(
    (module: string, action: string): boolean => {
      return hasPermission(`${module}.${action}`);
    },
    [hasPermission]
  );

  /**
   * Check if user can access a specific branch/location
   */
  const canAccessLocation = useCallback(
    (targetLocationCode: string): boolean => {
      // Super admins can access all locations
      if (isSuperAdmin) return true;
      // Users can only access their own location
      return locationCode === targetLocationCode;
    },
    [isSuperAdmin, locationCode]
  );

  /**
   * Get all available permissions for the user
   */
  const getAvailablePermissions = useCallback((): string[] => {
    return permissionNames;
  }, [permissionNames]);

  /**
   * Check if feature is available based on subscription
   */
  const hasFeature = useCallback(
    (featureName: string): boolean => {
      if (isSuperAdmin) return true;
      if (!isSubscriptionActive) return false;
      return subscriptionLimits.features.includes(featureName);
    },
    [isSuperAdmin, isSubscriptionActive, subscriptionLimits.features]
  );

  const canViewPurchaseOrderCosts = useCallback((): boolean => {
    if (isSuperAdmin || isAdmin || isManager) return true;
    return hasPermission('purchaseorders.viewcost');
  }, [isSuperAdmin, isAdmin, isManager, hasPermission]);

  return useMemo(
    () => ({
      // User info
      user,
      roleName,
      permissions: permissionNames,
      locationCode,
      businessId,

      // Role checks
      isSuperAdmin,
      isOrganizationAdmin,
      isAdmin,
      isManager,
      isStaff,
      canManageOrganizations,

      // Permission functions
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      canAccessModule,
      hasCourierAccess,
      canPerformAction,
      canAccessLocation,
      getAvailablePermissions,

      // Subscription
      isSubscriptionActive,
      subscriptionLimits,
      hasFeature,
      canViewPurchaseOrderCosts,

      // Pre-defined permission constants
      PERMISSIONS,
      ROLE_NAMES,
    }),
    [
      user,
      roleName,
      permissionNames,
      locationCode,
      businessId,
      isSuperAdmin,
      isOrganizationAdmin,
      isAdmin,
      isManager,
      isStaff,
      canManageOrganizations,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      canAccessModule,
      hasCourierAccess,
      canPerformAction,
      canAccessLocation,
      getAvailablePermissions,
      isSubscriptionActive,
      subscriptionLimits,
      hasFeature,
      canViewPurchaseOrderCosts,
    ]
  );
};

export default usePermissions;
