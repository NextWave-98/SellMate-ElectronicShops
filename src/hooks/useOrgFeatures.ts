import { useEffect } from 'react';
import useBusinessProfile from './useBusinessProfile';

export function useOrgFeatures() {
  const { businessData, loading, loadBusinessProfile, updatePOSSettings } = useBusinessProfile();

  useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

  return {
    loading,
    loadBusinessProfile,
    updateOrgFeatures: updatePOSSettings,
    staffManagementEnabled: businessData?.staffManagementEnabled ?? true,
    supplierOrdersEnabled: businessData?.supplierOrdersEnabled ?? true,
  };
}

export default useOrgFeatures;
