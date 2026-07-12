/**
 * useAuthRedux Hook
 * React hook for auth operations using Redux
 * 
 * Role Hierarchy:
 * - SUPER_ADMIN: Platform owner (1-2 users), manages ALL organizations
 * - ADMIN: Organization administrator, manages their OWN business
 * - MANAGER: Branch/Location manager
 * - STAFF: Regular staff
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loginAsync,
  logoutAsync,
  refreshTokenAsync,
  initializeAuthAsync,
  clearError,
  resetAuth,
} from '../store/authSlice';
import {
  selectIsAuthenticated,
  selectUser,
  selectAuthLoading,
  selectAuthError,
  selectAuthInitialized,
  selectUserLocationCode,
  selectIsSuperAdmin,
  selectIsOrganizationAdmin,
  selectIsAdmin,
  selectIsManager,
  selectIsStaff,
  selectCanManageOrganizations,
  selectUserRole,
  selectPermissionNames,
} from '../store/selectors';

/**
 * Hook for authentication operations
 */
export const useAuthRedux = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Selectors
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const initialized = useAppSelector(selectAuthInitialized);
  const locationCode = useAppSelector(selectUserLocationCode);
  const userRole = useAppSelector(selectUserRole);
  const permissions = useAppSelector(selectPermissionNames);
  
  // Role selectors
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const isOrganizationAdmin = useAppSelector(selectIsOrganizationAdmin);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isManager = useAppSelector(selectIsManager);
  const isStaff = useAppSelector(selectIsStaff);
  const canManageOrganizations = useAppSelector(selectCanManageOrganizations);

  /**
   * Login user
   * Routes based on role:
   * - SUPER_ADMIN: /superadmin/dashboard (platform management)
   * - ADMIN: /admin/dashboard (organization management) - TODO: create admin routes
   * - MANAGER/STAFF: /:branchCode/dashboard (branch operations)
   */
  const login = useCallback(
    async (email: string, password: string) => {
      const result = await dispatch(loginAsync({ email, password })).unwrap();
      
      // Navigate based on user role
      const userRoleName = result.user.role?.name?.toUpperCase();
      
      if (userRoleName === 'SUPER_ADMIN') {
        // Platform owner - full access to all organizations
        navigate('/superadmin/dashboard');
      } else if (userRoleName === 'ADMIN') {
        // Organization admin - manages their own business
        // TODO: Create separate /admin routes for organization admins
        // For now, redirect to superadmin dashboard but with limited access
        navigate('/superadmin/dashboard');
      } else {
        // Branch users (MANAGER, STAFF)
        const branchCode = result.user.locationCode || 
                          result.user.location?.locationCode || 
                          result.user.branchCode;
        if (branchCode) {
          navigate(`/${branchCode}/dashboard`);
        } else {
          navigate('/unauthorized');
        }
      }
      
      return result;
    },
    [dispatch, navigate]
  );

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    await dispatch(logoutAsync());
    navigate('/login');
  }, [dispatch, navigate]);

  /**
   * Refresh token
   */
  const refreshToken = useCallback(async () => {
    try {
      await dispatch(refreshTokenAsync()).unwrap();
      return true;
    } catch {
      return false;
    }
  }, [dispatch]);

  /**
   * Initialize auth from stored data
   */
  const initializeAuth = useCallback(async () => {
    try {
      await dispatch(initializeAuthAsync()).unwrap();
      return true;
    } catch {
      return false;
    }
  }, [dispatch]);

  /**
   * Clear auth error
   */
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Force reset auth state
   */
  const forceLogout = useCallback(() => {
    dispatch(resetAuth());
    navigate('/login');
  }, [dispatch, navigate]);

  /**
   * Get redirect path based on user role
   */
  const getDefaultRedirectPath = useCallback(() => {
    if (isSuperAdmin) {
      return '/superadmin/dashboard';
    }
    if (isOrganizationAdmin) {
      // TODO: Create /admin routes for organization admins
      return '/superadmin/dashboard';
    }
    if (locationCode) {
      return `/${locationCode}/dashboard`;
    }
    return '/login';
  }, [isSuperAdmin, isOrganizationAdmin, locationCode]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permissionName: string): boolean => {
    return permissions.includes(permissionName);
  }, [permissions]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.some((name) => permissions.includes(name));
  }, [permissions]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.every((name) => permissions.includes(name));
  }, [permissions]);

  return {
    // State
    isAuthenticated,
    user,
    loading,
    error,
    initialized,
    locationCode,
    userRole,
    permissions,
    
    // Role checks
    isSuperAdmin,
    isOrganizationAdmin,
    isAdmin,
    isManager,
    isStaff,
    canManageOrganizations,

    // Actions
    login,
    logout,
    refreshToken,
    initializeAuth,
    clearAuthError,
    forceLogout,

    // Helpers
    getDefaultRedirectPath,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

export default useAuthRedux;
