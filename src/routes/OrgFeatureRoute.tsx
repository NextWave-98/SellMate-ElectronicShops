import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import useOrgFeatures from '../hooks/useOrgFeatures';

/** Organization feature flags that can guard a route. */
export type OrgFeature = 'warranty';

interface OrgFeatureRouteProps {
  children: ReactNode;
  feature: OrgFeature;
  unauthorizedRedirect?: string;
}

/**
 * Blocks a route when the organization has not switched the feature on.
 *
 * This is the per-organization sibling of `IndustryFeatureRoute`. The difference
 * matters: industry type is something the organization *is*, while this is
 * something it *chose*. Warranty moved from the first to the second   a clothing
 * shop that sells warrantied goods can now switch it on, and an electronics shop
 * that does not want the clutter can leave it off.
 *
 * Two deliberate decisions here:
 *
 *   · While the profile is still loading we render nothing rather than the page.
 *     Showing the feature and then yanking it away is worse than a blank moment,
 *     and the flag defaults to off.
 *
 *   · Platform super-admins pass through, exactly as they do in
 *     `IndustryFeatureRoute`   they support customers and need to see what the
 *     customer sees. An organization's OWN admin does not get that bypass: for
 *     them the switch is real.
 */
export function OrgFeatureRoute({
  children,
  feature,
  unauthorizedRedirect = '/unauthorized',
}: OrgFeatureRouteProps) {
  const location = useLocation();
  const { isSuperAdmin } = usePermissions();
  const { loading, warrantyEnabled } = useOrgFeatures();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (loading) {
    return null;
  }

  const enabled = feature === 'warranty' ? warrantyEnabled : true;

  if (!enabled) {
    return <Navigate to={unauthorizedRedirect} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default OrgFeatureRoute;
