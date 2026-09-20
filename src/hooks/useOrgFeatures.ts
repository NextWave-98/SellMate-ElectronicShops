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
    // Warranty defaults to FALSE, unlike the flags above. It is hidden for every
    // organization until one deliberately turns it on, so an undefined value  
    // an old API response, a profile that has not loaded yet   must mean hidden
    // rather than briefly flashing a menu the organization never asked for.
    warrantyEnabled: businessData?.warrantyEnabled ?? false,
    warrantyAutoGenerate: businessData?.warrantyAutoGenerate ?? true,
  };
}

export default useOrgFeatures;
