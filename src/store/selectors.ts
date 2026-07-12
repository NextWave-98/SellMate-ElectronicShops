/**
 * Auth Selectors
 * Memoized selectors for auth state and permission checks
 */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Permission } from './types';
import type { Organization } from '../types/organization.types';
import { ROLE_NAMES } from './types';

// Base selectors
export const selectAuthState = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectAuthInitialized = (state: RootState) => state.auth.initialized;
export const selectRequiresBranchSelection = (state: RootState) => state.auth.requiresBranchSelection;
export const selectAssignedBranches = (state: RootState) => state.auth.assignedBranches;

// User role selectors
export const selectUserRole = createSelector(
  [selectUser],
  (user): string | null => user?.role?.name || null
);

export const selectUserRoleId = createSelector(
  [selectUser],
  (user): string | null => user?.role?.id || null
);

// User permissions selector
export const selectUserPermissions = createSelector(
  [selectUser],
  (user): Permission[] => user?.role?.permissions || []
);

// Get permission names as array
export const selectPermissionNames = createSelector(
  [selectUserPermissions],
  (permissions): string[] => permissions.map((p) => p.name)
);

// Organization selectors
export const selectOrganizationState = (state: RootState) => state.organization;
export const selectOrganizations = (state: RootState) => state.organization.organizations;
export const selectOrganizationLoading = (state: RootState) => state.organization.loading;
export const selectOrganizationError = (state: RootState) => state.organization.error;
export const selectOrganizationInitialized = (state: RootState) => state.organization.initialized;

// Get first organization (for auto-selection)
export const selectFirstOrganization = createSelector(
  [selectOrganizations],
  (organizations): Organization | null => organizations.length > 0 ? organizations[0] : null
);

export const selectUserLocationCode = createSelector(
  [selectUser],
  (user): string | null => user?.locationCode || user?.location?.locationCode || user?.branchCode || null
);

// Business selectors
export const selectUserBusiness = createSelector(
  [selectUser],
  (user) => user?.business || null
);

export const selectUserBusinessId = createSelector(
  [selectUser],
  (user): string | null => user?.businessId || null
);

// Role check selectors
/**
 * Check if user is SUPER_ADMIN (Platform owner - 1-2 users only)
 * SUPER_ADMIN has NO businessId and can manage all organizations
 */
export const selectIsSuperAdmin = createSelector(
  [selectUserRole],
  (role): boolean => role === ROLE_NAMES.SUPER_ADMIN
);

/**
 * Check if user is Organization Admin (ADMIN role)
 * ADMIN has businessId and manages their own organization
 */
export const selectIsOrganizationAdmin = createSelector(
  [selectUserRole],
  (role): boolean => role === ROLE_NAMES.ADMIN
);

/**
 * Check if user is any type of admin (SUPER_ADMIN or ADMIN)
 * Use this for shared admin functionality
 */
export const selectIsAdmin = createSelector(
  [selectUserRole],
  (role): boolean => 
    role === ROLE_NAMES.ADMIN || 
    role === ROLE_NAMES.SUPER_ADMIN
);

/**
 * Check if user can manage organizations (SUPER_ADMIN only)
 */
export const selectCanManageOrganizations = selectIsSuperAdmin;

export const selectIsManager = createSelector(
  [selectUserRole],
  (role): boolean => role === ROLE_NAMES.MANAGER
);

export const selectIsStaff = createSelector(
  [selectUserRole],
  (role): boolean => role === ROLE_NAMES.STAFF
);

// Check if user can access admin routes
export const selectCanAccessAdmin = createSelector(
  [selectIsAuthenticated, selectIsSuperAdmin],
  (isAuthenticated, isSuperAdmin): boolean => isAuthenticated && isSuperAdmin
);

// Check if user can access branch routes
export const selectCanAccessBranch = createSelector(
  [selectIsAuthenticated, selectUserRole],
  (isAuthenticated, role): boolean => {
    if (!isAuthenticated || !role) return false;
    const allowedRoles: string[] = [ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.MANAGER, ROLE_NAMES.STAFF];
    return allowedRoles.includes(role);
  }
);

// Factory selector for checking specific permission
export const makeSelectHasPermission = (permissionName: string) =>
  createSelector(
    [selectPermissionNames],
    (permissions): boolean => permissions.includes(permissionName)
  );

// Factory selector for checking any of given permissions
export const makeSelectHasAnyPermission = (permissionNames: string[]) =>
  createSelector(
    [selectPermissionNames],
    (permissions): boolean => 
      permissionNames.some((name) => permissions.includes(name))
  );

// Factory selector for checking all given permissions
export const makeSelectHasAllPermissions = (permissionNames: string[]) =>
  createSelector(
    [selectPermissionNames],
    (permissions): boolean => 
      permissionNames.every((name) => permissions.includes(name))
  );

// Factory selector for checking specific role
export const makeSelectHasRole = (roleName: string) =>
  createSelector(
    [selectUserRole],
    (role): boolean => role?.toUpperCase() === roleName.toUpperCase()
  );

// Factory selector for checking any of given roles
export const makeSelectHasAnyRole = (roleNames: string[]) =>
  createSelector(
    [selectUserRole],
    (role): boolean => {
      if (!role) return false;
      return roleNames.some((name) => name.toUpperCase() === role.toUpperCase());
    }
  );

// Subscription selectors
export const selectUserSubscription = createSelector(
  [selectUser],
  (user) => user?.subscription || null
);

export const selectSubscriptionPlan = createSelector(
  [selectUserSubscription],
  (subscription): string | null => subscription?.planType || null
);

export const selectSubscriptionStatus = createSelector(
  [selectUserSubscription],
  (subscription): string | null => subscription?.status || null
);

export const selectIsSubscriptionActive = createSelector(
  [selectUserSubscription],
  (subscription): boolean => {
    if (!subscription) return false;
    return subscription.status === 'ACTIVE' || subscription.status === 'TRIAL';
  }
);

// Check subscription limits
export const selectSubscriptionLimits = createSelector(
  [selectUserSubscription],
  (subscription) => ({
    maxLocations: subscription?.maxLocations || 0,
    maxUsers: subscription?.maxUsers || 0,
    maxProducts: subscription?.maxProducts || 0,
    features: subscription?.features || [],
  })
);
