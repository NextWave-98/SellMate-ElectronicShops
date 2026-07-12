/**
 * withPermission Higher-Order Component
 * Wraps a component with permission checking
 */
import type { ReactNode, ComponentType } from 'react';
import { PermissionRoute } from './PermissionRoute';

interface WithPermissionOptions {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  fallback?: ReactNode;
}

/**
 * withPermission HOC
 * Wraps a component with permission checking
 * 
 * Usage:
 * const ProtectedComponent = withPermission(MyComponent, { permission: 'users.read' });
 */
export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithPermissionOptions
) {
  const ComponentWithPermission = (props: P) => {
    return (
      <PermissionRoute {...options}>
        <WrappedComponent {...props} />
      </PermissionRoute>
    );
  };

  ComponentWithPermission.displayName = `withPermission(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithPermission;
}

export default withPermission;
