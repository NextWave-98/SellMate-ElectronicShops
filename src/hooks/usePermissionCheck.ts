/**
 * usePermissionCheck Hook
 * Provides utility functions to check permissions for UI elements
 * Uses Redux state for permission management
 */
import { useMemo, useCallback } from 'react';
import { usePermissions } from './usePermissions';
import { BUTTON_PERMISSIONS, type ButtonPermissionKey } from '../config/permissions.config';

interface PermissionCheckResult {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canManage: boolean;
}

/**
 * Hook for checking module-level CRUD permissions
 * 
 * Usage:
 * const permissions = usePermissionCheck('users');
 * if (permissions.canCreate) { ... }
 */
export const usePermissionCheck = (module: string): PermissionCheckResult => {
  const { hasPermission, isSuperAdmin } = usePermissions();

  return useMemo(() => {
    if (isSuperAdmin) {
      return {
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canExport: true,
        canManage: true,
      };
    }

    return {
      canView: hasPermission(`${module}.read`),
      canCreate: hasPermission(`${module}.create`),
      canUpdate: hasPermission(`${module}.update`),
      canDelete: hasPermission(`${module}.delete`),
      canExport: hasPermission(`${module}.export`),
      canManage: hasPermission(`${module}.manage`),
    };
  }, [module, hasPermission, isSuperAdmin]);
};

/**
 * Hook for checking button-specific permissions
 * 
 * Usage:
 * const canCreateUser = useButtonPermission('CREATE_USER');
 */
export const useButtonPermission = (permissionKey: ButtonPermissionKey): boolean => {
  const { hasPermission, isSuperAdmin } = usePermissions();

  return useMemo(() => {
    if (isSuperAdmin) return true;
    const permissionName = BUTTON_PERMISSIONS[permissionKey];
    return hasPermission(permissionName);
  }, [permissionKey, hasPermission, isSuperAdmin]);
};

/**
 * Hook for getting all button permissions at once
 * 
 * Usage:
 * const buttonPerms = useAllButtonPermissions();
 * if (buttonPerms.CREATE_USER) { ... }
 */
export const useAllButtonPermissions = (): Record<ButtonPermissionKey, boolean> => {
  const { hasPermission, isSuperAdmin } = usePermissions();

  return useMemo(() => {
    const result = {} as Record<ButtonPermissionKey, boolean>;
    
    (Object.keys(BUTTON_PERMISSIONS) as ButtonPermissionKey[]).forEach((key) => {
      if (isSuperAdmin) {
        result[key] = true;
      } else {
        result[key] = hasPermission(BUTTON_PERMISSIONS[key]);
      }
    });

    return result;
  }, [hasPermission, isSuperAdmin]);
};

/**
 * Hook for checking multiple permissions at once
 * 
 * Usage:
 * const perms = useMultiplePermissions(['users.create', 'users.update']);
 * // Returns: { 'users.create': true, 'users.update': false }
 */
export const useMultiplePermissions = (permissions: string[]): Record<string, boolean> => {
  const { hasPermission, isSuperAdmin } = usePermissions();

  return useMemo(() => {
    const result: Record<string, boolean> = {};
    
    permissions.forEach((perm) => {
      result[perm] = isSuperAdmin ? true : hasPermission(perm);
    });

    return result;
  }, [permissions, hasPermission, isSuperAdmin]);
};

/**
 * Hook for conditional rendering based on permissions
 * Returns a function that can be used to conditionally render content
 * 
 * Usage:
 * const renderIf = useConditionalRender();
 * return (
 *   <>
 *     {renderIf('users.create', <CreateButton />)}
 *     {renderIf('users.delete', <DeleteButton />, <DisabledDeleteButton />)}
 *   </>
 * );
 */
export const useConditionalRender = () => {
  const { hasPermission, isSuperAdmin } = usePermissions();

  const renderIf = useCallback(
    <T, F>(
      permission: string | string[],
      trueContent: T,
      falseContent?: F,
      requireAll: boolean = false
    ): T | F | null => {
      let hasAccess: boolean;

      if (isSuperAdmin) {
        hasAccess = true;
      } else if (Array.isArray(permission)) {
        hasAccess = requireAll
          ? permission.every((p) => hasPermission(p))
          : permission.some((p) => hasPermission(p));
      } else {
        hasAccess = hasPermission(permission);
      }

      if (hasAccess) {
        return trueContent;
      }
      return falseContent ?? null;
    },
    [hasPermission, isSuperAdmin]
  );

  return renderIf;
};

export default usePermissionCheck;
