import { useState, useCallback } from 'react';
import useFetch from './useFetch';
import Cookies from 'js-cookie';
import type {
  Organization,
  OrganizationListResponse,
  OrganizationFilters,
  CreateOrganizationDTO,
  CreateOrganizationResponse,
} from '../types/organization.types';

// Get the super admin secret from environment or config
const getSuperAdminSecret = () => {
  return import.meta.env.VITE_SUPER_ADMIN_SECRET || Cookies.get('superAdminSecret') || '';
};

export const useOrganization = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationsFetch = useFetch<OrganizationListResponse>('/organizations');
  const organizationByIdFetch = useFetch<Organization>('/organizations/:id');
  const createOrganizationFetch = useFetch<CreateOrganizationResponse>('/organizations');
  const toggleStatusFetch = useFetch<{ message: string }>('/organizations/:id/status');

  /**
   * Get super admin headers for organization management
   */
  const getSuperAdminHeaders = useCallback(() => {
    return {
      'X-Super-Admin-Secret': getSuperAdminSecret(),
    };
  }, []);

  /**
   * List all organizations (Super Admin Only)
   */
  const listOrganizations = useCallback(
    async (filters?: OrganizationFilters) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();

        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
        if (filters?.subscriptionStatus) queryParams.append('subscriptionStatus', filters.subscriptionStatus);
        if (filters?.limit) queryParams.append('limit', filters.limit.toString());
        if (filters?.offset) queryParams.append('offset', filters.offset.toString());

        const endpoint = queryParams.toString()
          ? `/organizations?${queryParams.toString()}`
          : '/organizations';

        const response = await organizationsFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint,
          headers: getSuperAdminHeaders(),
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch organizations';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getSuperAdminHeaders]
  );

  /**
   * Get organization details by ID (Super Admin Only)
   */
  const getOrganizationDetails = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await organizationByIdFetch.fetchData({
          method: 'GET',
          silent: true,
          endpoint: `/organizations/${id}`,
          headers: getSuperAdminHeaders(),
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch organization details';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getSuperAdminHeaders]
  );

  /**
   * Create new organization (Super Admin Only)
   */
  const createOrganization = useCallback(
    async (data: CreateOrganizationDTO) => {
      setLoading(true);
      setError(null);
      try {
        const response = await createOrganizationFetch.fetchData({
          method: 'POST',
          endpoint: '/organizations',
          data,
          headers: getSuperAdminHeaders(),
          successMessage: 'Organization created successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create organization';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getSuperAdminHeaders]
  );

  /**
   * Suspend or activate organization (Super Admin Only)
   */
  const toggleOrganizationStatus = useCallback(
    async (id: string, isActive: boolean, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await toggleStatusFetch.fetchData({
          method: 'PATCH',
          endpoint: `/organizations/${id}/status`,
          data: { isActive, reason },
          headers: getSuperAdminHeaders(),
          successMessage: isActive ? 'Organization activated successfully' : 'Organization suspended successfully',
        });
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update organization status';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getSuperAdminHeaders]
  );

  /**
   * Set super admin secret in cookies
   */
  const setSuperAdminSecret = useCallback((secret: string) => {
    Cookies.set('superAdminSecret', secret, { expires: 1 }); // Expires in 1 day
  }, []);

  return {
    loading,
    error,
    listOrganizations,
    getOrganizationDetails,
    createOrganization,
    toggleOrganizationStatus,
    setSuperAdminSecret,
    isLoading: organizationsFetch.loading || organizationByIdFetch.loading || createOrganizationFetch.loading || toggleStatusFetch.loading || loading,
  };
};

export default useOrganization;
