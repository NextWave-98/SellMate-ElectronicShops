/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback } from 'react';
import useFetch from './useFetch';

export type IndustryType = 'ELECTRONICS' | 'CLOTHING' | 'GENERAL';

export interface BusinessProfileData {
  id?: string;
  name: string;
  logo: string;
  address: string;
  telephone: string;
  email: string;
  city?: string;
  postalCode?: string;
  district?: string;
  industryType?: IndustryType;
  reportIncludeJobsheet?: boolean;
  reportIncludeSupplierPayment?: boolean;
  posAutoPrintOnSale?: boolean;
  posAutoCashDrawer?: boolean;
  posDefaultFormat?: '80mm' | '58mm' | 'a4';
  sameBarcodeSameInventory?: boolean;
  courierStockAdjustmentOnly?: boolean;
  centralizedInventoryEnabled?: boolean;
  centralInventoryLocationId?: string;
  posStaffDiscountHidden?: boolean;
  posDefaultDiscountType?: 'FIXED' | 'PERCENTAGE';
  posDefaultDiscountValue?: number;
  staffManagementEnabled?: boolean;
  supplierOrdersEnabled?: boolean;
  website?: string;
  whatsappGroupLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

const useBusinessProfile = () => {
  const [businessData, setBusinessData] = useState<BusinessProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const { fetchData: fetchBusiness } = useFetch('/business');
  const { fetchData: updateBusinessFetch, loading: updatingBusiness } = useFetch();

  // Load business profile data
  const loadBusinessProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchBusiness({  method: 'GET', silent:true, });
      if (response?.success && response.data) {
        setBusinessData(response.data as BusinessProfileData);
      }
    } catch (error) {
      console.error('Failed to load business profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update business profile
  const updateBusinessProfile = async (formData: FormData) => {
    try {
      const response = await updateBusinessFetch({
        method: 'PUT',
        endpoint: '/business',
        data: formData,
        contentType: 'multipart/form-data',
      });

      if (response?.success) {
        await loadBusinessProfile(); // Reload business profile data
        return { success: true, message: 'Business profile updated successfully!' };
      }

      return { success: false, message: response?.message || 'Failed to update business profile' };
    } catch (error) {
      console.error('Error updating business profile:', error);
      return { success: false, message: 'Failed to update business profile' };
    }
  };

  // Update org-level POS settings
  const updatePOSSettings = async (settings: {
    posAutoPrintOnSale?: boolean;
    posAutoCashDrawer?: boolean;
    posDefaultFormat?: '80mm' | '58mm' | 'a4';
    whatsappGroupLink?: string;
    sameBarcodeSameInventory?: boolean;
    courierStockAdjustmentOnly?: boolean;
    centralizedInventoryEnabled?: boolean;
    centralInventoryLocationId?: string;
    posStaffDiscountHidden?: boolean;
    posDefaultDiscountType?: 'FIXED' | 'PERCENTAGE';
    posDefaultDiscountValue?: number;
    staffManagementEnabled?: boolean;
    supplierOrdersEnabled?: boolean;
  }) => {
    try {
      const response = await updateBusinessFetch({
        method: 'PUT',
        endpoint: '/business',
        data: settings,
      });

      if (response?.success) {
        await loadBusinessProfile();
        return { success: true, message: 'POS settings updated successfully!' };
      }

      return { success: false, message: response?.message || 'Failed to update POS settings' };
    } catch (error) {
      console.error('Error updating POS settings:', error);
      return { success: false, message: 'Failed to update POS settings' };
    }
  };

  // Update report settings (JSON, no file upload needed)
  const updateReportSettings = async (settings: { reportIncludeJobsheet?: boolean; reportIncludeSupplierPayment?: boolean }) => {
    try {
      const response = await updateBusinessFetch({
        method: 'PUT',
        endpoint: '/business',
        data: settings,
      });

      if (response?.success) {
        await loadBusinessProfile();
        return { success: true, message: 'Report settings updated successfully!' };
      }

      return { success: false, message: response?.message || 'Failed to update report settings' };
    } catch (error) {
      console.error('Error updating report settings:', error);
      return { success: false, message: 'Failed to update report settings' };
    }
  };

  return {
    businessData,
    loading,
    updatingBusiness,
    loadBusinessProfile,
    updateBusinessProfile,
    updatePOSSettings,
    updateReportSettings,
  };
};

export default useBusinessProfile;
