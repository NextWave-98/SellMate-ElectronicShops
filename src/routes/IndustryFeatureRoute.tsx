import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useBusinessContext } from '../context/BusinessContext';
import { usePermissions } from '../hooks/usePermissions';
import { industryAllowsFeature, type IndustryFeature } from '../utils/industryFeatures';

interface IndustryFeatureRouteProps {
  children: ReactNode;
  feature: IndustryFeature;
  unauthorizedRedirect?: string;
}

/**
 * Blocks routes when the organization's industry type does not support the feature.
 * Jobsheets + warranty: ELECTRONICS and GENERAL. Clothing: hidden.
 */
export function IndustryFeatureRoute({
  children,
  feature,
  unauthorizedRedirect = '/unauthorized',
}: IndustryFeatureRouteProps) {
  const location = useLocation();
  const { industryType } = useBusinessContext();
  const { isSuperAdmin } = usePermissions();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!industryAllowsFeature(industryType, feature)) {
    return <Navigate to={unauthorizedRedirect} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default IndustryFeatureRoute;
