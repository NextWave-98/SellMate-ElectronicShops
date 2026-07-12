/**
 * PermissionButton Component
 * A button component that only renders if user has the required permission
 * Uses Redux for permission state management
 */
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { ButtonPermissionKey } from '../../config/permissions.config';
import { BUTTON_PERMISSIONS } from '../../config/permissions.config';

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean; // Show disabled button instead of hiding
  disabledTooltip?: string;
}

interface SinglePermissionProps extends BaseButtonProps {
  permission: string;
  permissions?: never;
  requireAnyPermission?: never;
  permissionKey?: never;
}

interface MultiplePermissionsProps extends BaseButtonProps {
  permission?: never;
  permissions: string[];
  requireAnyPermission?: boolean;
  permissionKey?: never;
}

interface PermissionKeyProps extends BaseButtonProps {
  permission?: never;
  permissions?: never;
  requireAnyPermission?: never;
  permissionKey: ButtonPermissionKey;
}

type PermissionButtonProps = SinglePermissionProps | MultiplePermissionsProps | PermissionKeyProps;

/**
 * PermissionButton - Button that checks permissions before rendering
 * 
 * Usage Examples:
 * 1. Single permission:
 *    <PermissionButton permission="users.create">Create User</PermissionButton>
 * 
 * 2. Multiple permissions (ALL required):
 *    <PermissionButton permissions={['users.create', 'users.update']}>Manage Users</PermissionButton>
 * 
 * 3. Multiple permissions (ANY required):
 *    <PermissionButton permissions={['users.create', 'users.update']} requireAnyPermission>Manage Users</PermissionButton>
 * 
 * 4. Using permission key:
 *    <PermissionButton permissionKey="CREATE_USER">Create User</PermissionButton>
 * 
 * 5. Show disabled button:
 *    <PermissionButton permission="users.delete" showDisabled disabledTooltip="You don't have permission">Delete</PermissionButton>
 */
export const PermissionButton = ({
  children,
  fallback = null,
  showDisabled = false,
  disabledTooltip = "You don't have permission to perform this action",
  permission,
  permissions,
  requireAnyPermission = false,
  permissionKey,
  className = '',
  disabled,
  ...buttonProps
}: PermissionButtonProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();

  // Check permission based on props
  let hasAccess = false;

  if (isSuperAdmin) {
    // Super admins always have access
    hasAccess = true;
  } else if (permissionKey) {
    // Use predefined permission key
    const permissionName = BUTTON_PERMISSIONS[permissionKey];
    hasAccess = hasPermission(permissionName);
  } else if (permission) {
    // Single permission check
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    hasAccess = requireAnyPermission 
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);
  } else {
    // No permission specified, allow access
    hasAccess = true;
  }

  // If user doesn't have access
  if (!hasAccess) {
    // Show disabled button if requested
    if (showDisabled) {
      return (
        <button
          {...buttonProps}
          className={`${className} opacity-50 cursor-not-allowed`}
          disabled
          title={disabledTooltip}
        >
          {children}
        </button>
      );
    }
    // Otherwise show fallback or nothing
    return <>{fallback}</>;
  }

  // User has access, render the button
  return (
    <button {...buttonProps} className={className} disabled={disabled}>
      {children}
    </button>
  );
};

/**
 * PermissionLink - An anchor tag that checks permissions before rendering
 */
interface PermissionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAnyPermission?: boolean;
  permissionKey?: ButtonPermissionKey;
  fallback?: ReactNode;
}

export const PermissionLink = ({
  children,
  permission,
  permissions,
  requireAnyPermission = false,
  permissionKey,
  fallback = null,
  ...linkProps
}: PermissionLinkProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();

  let hasAccess = false;

  if (isSuperAdmin) {
    hasAccess = true;
  } else if (permissionKey) {
    const permissionName = BUTTON_PERMISSIONS[permissionKey];
    hasAccess = hasPermission(permissionName);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAnyPermission 
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <a {...linkProps}>{children}</a>;
};

/**
 * PermissionIconButton - Icon button with permission check
 */
interface PermissionIconButtonProps extends BaseButtonProps {
  icon: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAnyPermission?: boolean;
  permissionKey?: ButtonPermissionKey;
}

export const PermissionIconButton = ({
  icon,
  children,
  permission,
  permissions,
  requireAnyPermission = false,
  permissionKey,
  fallback = null,
  showDisabled = false,
  disabledTooltip = "You don't have permission",
  className = '',
  ...buttonProps
}: PermissionIconButtonProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();

  let hasAccess = false;

  if (isSuperAdmin) {
    hasAccess = true;
  } else if (permissionKey) {
    const permissionName = BUTTON_PERMISSIONS[permissionKey];
    hasAccess = hasPermission(permissionName);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAnyPermission 
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    if (showDisabled) {
      return (
        <button
          {...buttonProps}
          className={`${className} opacity-50 cursor-not-allowed`}
          disabled
          title={disabledTooltip}
        >
          {icon}
          {children}
        </button>
      );
    }
    return <>{fallback}</>;
  }

  return (
    <button {...buttonProps} className={className}>
      {icon}
      {children}
    </button>
  );
};

/**
 * ActionButtons - Pre-configured action buttons with permission checks
 */
interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewPermission?: string;
  editPermission?: string;
  deletePermission?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ActionButtons = ({
  onView,
  onEdit,
  onDelete,
  viewPermission,
  editPermission,
  deletePermission,
  className = '',
  size = 'sm',
}: ActionButtonsProps) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onView && (
        <PermissionButton
          permission={viewPermission || ''}
          onClick={onView}
          className={`${sizeClasses[size]} bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors`}
        >
          View
        </PermissionButton>
      )}
      {onEdit && (
        <PermissionButton
          permission={editPermission || ''}
          onClick={onEdit}
          className={`${sizeClasses[size]} bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors`}
        >
          Edit
        </PermissionButton>
      )}
      {onDelete && (
        <PermissionButton
          permission={deletePermission || ''}
          onClick={onDelete}
          className={`${sizeClasses[size]} bg-red-500 hover:bg-red-600 text-white rounded transition-colors`}
        >
          Delete
        </PermissionButton>
      )}
    </div>
  );
};

export default PermissionButton;
