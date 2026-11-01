import { useCallback, useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { useBusinessContext } from '../context/BusinessContext';
import { industryAllowsFeature } from '../utils/industryFeatures';
import { SUPERADMIN_SIDEBAR_PERMISSIONS, type SidebarPermissionConfig } from '../config/permissions.config';

export interface AdminOrgFeatureFlags {
  staffManagementEnabled?: boolean;
  supplierOrdersEnabled?: boolean;
  warrantyEnabled?: boolean;
}

/**
 * Shared visibility rules for the organization admin area. The sidebar,
 * dashboard widgets and header all go through this so that anything hidden
 * in the sidebar is also hidden everywhere else.
 */
export const useAdminNavAccess = (orgFeatures?: AdminOrgFeatureFlags | null) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule, hasCourierAccess, isSuperAdmin, hasAnyRole } = usePermissions();
  const { industryType } = useBusinessContext();

  // Fail-closed: missing config hides the item. Intentionally open items
  // (e.g. dashboard) must have an explicit entry with no requirements.
  const checkConfig = useCallback(
    (config: SidebarPermissionConfig | undefined): boolean => {
      if (!config) return false;
      if (isSuperAdmin) return true;
      if (config.allowedRoles?.length && !hasAnyRole(config.allowedRoles)) return false;
      if (config.requiredModule && !canAccessModule(config.requiredModule)) return false;
      if (config.requiredPermission && !hasPermission(config.requiredPermission)) return false;
      if (config.requiredPermissions?.length) {
        const ok = config.requireAnyPermission
          ? hasAnyPermission(config.requiredPermissions)
          : hasAllPermissions(config.requiredPermissions);
        if (!ok) return false;
      }
      return true;
    },
    [isSuperAdmin, hasAnyRole, canAccessModule, hasPermission, hasAnyPermission, hasAllPermissions],
  );

  const isFeatureAllowed = useCallback(
    (id: string): boolean => {
      if (id === 'staff' && orgFeatures?.staffManagementEnabled === false) return false;
      if (id === 'suppliers' && orgFeatures?.supplierOrdersEnabled === false) return false;
      if (id === 'goods-receipts' && orgFeatures?.supplierOrdersEnabled === false) return false;
      if (id === 'jobsheets' && !industryAllowsFeature(industryType, 'jobsheets')) return false;
      if (id === 'parts' && !industryAllowsFeature(industryType, 'parts')) return false;
      if (id === 'trade-ins' && !industryAllowsFeature(industryType, 'tradein')) return false;
      // Warranty is an organization setting now, not an industry trait.
      // `=== false` is not enough here: the flag defaults to OFF, so an
      // undefined value (profile still loading, or an older API) must hide it
      // rather than show a menu the organization never enabled.
      if (id === 'warranty' && orgFeatures?.warrantyEnabled !== true) return false;
      // Courier + WooCommerce are tied: no courier access → hide both
      if ((id === 'courier' || id === 'woocommerce' || id === 'woocommerce-orders') && !hasCourierAccess()) {
        return false;
      }
      return true;
    },
    [orgFeatures, industryType, hasCourierAccess],
  );

  // A nested item (e.g. `inventory` under `stock`) is only visible when every
  // ancestor is visible too, matching how the sidebar renders it.
  const canSee = useCallback(
    (id: string): boolean => {
      const findPath = (list: SidebarPermissionConfig[]): SidebarPermissionConfig[] | null => {
        for (const config of list) {
          if (config.id === id) return [config];
          if (config.children?.length) {
            const childPath = findPath(config.children);
            if (childPath) return [config, ...childPath];
          }
        }
        return null;
      };
      const path = findPath(SUPERADMIN_SIDEBAR_PERMISSIONS);
      if (!path) return false;
      return path.every((config) => isFeatureAllowed(config.id) && checkConfig(config));
    },
    [isFeatureAllowed, checkConfig],
  );

  return useMemo(() => ({ checkConfig, isFeatureAllowed, canSee }), [checkConfig, isFeatureAllowed, canSee]);
};

export default useAdminNavAccess;
