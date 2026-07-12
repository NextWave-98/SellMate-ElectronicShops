/**
 * Role IDs for legacy compatibility
 * @deprecated Use ROLE_NAMES from store/types.ts instead
 * 
 * Role Hierarchy:
 * - SUPER_ADMIN (1): Platform owner (1-2 users), manages ALL organizations
 * - ADMIN (2): Organization administrator, manages their OWN business
 * - MANAGER (3): Branch/Location manager within an organization
 * - USER (4): Staff with limited permissions
 */
export const ROLES = {
  SUPER_ADMIN: 1,  // Platform owner - can manage ALL organizations
  ADMIN: 2,        // Organization admin - manages their OWN business
  MANAGER: 3,      // Branch manager
  USER: 4,         // Staff
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];

export const ROLE_NAMES: Record<RoleId, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Organization Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.USER]: 'Staff',
};

export const getRoleName = (roleId: number): string => {
  return ROLE_NAMES[roleId as RoleId] || 'Unknown';
};

/**
 * Backend Role Names
 * These match the actual role names used in the backend
 */
export const BACKEND_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',  // Platform level - no businessId
  ADMIN: 'ADMIN',              // Organization level - has businessId
  MANAGER: 'MANAGER',          // Branch level
  STAFF: 'STAFF',              // Staff level
} as const;

export type BackendRoleName = typeof BACKEND_ROLES[keyof typeof BACKEND_ROLES];

/**
 * Map frontend role IDs to backend role names
 */
export const roleIdToBackendName: Record<RoleId, BackendRoleName> = {
  [ROLES.SUPER_ADMIN]: BACKEND_ROLES.SUPER_ADMIN,
  [ROLES.ADMIN]: BACKEND_ROLES.ADMIN,
  [ROLES.MANAGER]: BACKEND_ROLES.MANAGER,
  [ROLES.USER]: BACKEND_ROLES.STAFF,
};

/**
 * Map backend role names to frontend role IDs
 */
export const backendNameToRoleId: Record<string, RoleId> = {
  [BACKEND_ROLES.SUPER_ADMIN]: ROLES.SUPER_ADMIN,
  [BACKEND_ROLES.ADMIN]: ROLES.ADMIN,
  [BACKEND_ROLES.MANAGER]: ROLES.MANAGER,
  [BACKEND_ROLES.STAFF]: ROLES.USER,
};

/**
 * Check if a role can access platform-level features
 * Only SUPER_ADMIN can manage organizations
 */
export const canAccessPlatformFeatures = (roleId: RoleId): boolean => {
  return roleId === ROLES.SUPER_ADMIN;
};

/**
 * Check if a role is admin level (SUPER_ADMIN or ADMIN)
 */
export const isAdminRole = (roleId: RoleId): boolean => {
  return roleId === ROLES.SUPER_ADMIN || roleId === ROLES.ADMIN;
};
