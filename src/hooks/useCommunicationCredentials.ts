import { useState, useCallback } from 'react';
import useFetch from './useFetch';

interface CommunicationCredential {
  id: string;
  businessId: string;
  provider: string;
  channel: string;
  strategy: string;
  isActive: boolean;
  monthlyQuota: number | null;
  currentMonthUsage: number;
  quotaResetDate: string | null;
  costPerUnit: number | null;
  totalCost: number;
  isValidated: boolean;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateCredentialPayload {
  provider: string;
  channel: string;
  strategy: string;
  monthlyQuota?: number;
  costPerUnit?: number;
  credentials?: any;
}

interface UpdateCredentialPayload {
  strategy?: string;
  monthlyQuota?: number | null;
  costPerUnit?: number | null;
  credentials?: any;
}

export const useCommunicationCredentials = () => {
  const [credentials, setCredentials] = useState<CommunicationCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const { fetchData } = useFetch();

  // Fetch all credentials for a business
  const fetchCredentials = useCallback(async (businessId: string, channel?: string) => {
    setLoading(true);
    try {
      const channelParam = channel && channel !== 'ALL' ? `?channel=${channel}` : '';
      const response = await fetchData({
        endpoint: `/api/communication-credentials/businesses/${businessId}${channelParam}`,
        method: 'GET',
        silent: true,
      });

      if (response?.data) {
        setCredentials(response.data as CommunicationCredential[]);
        return response.data as CommunicationCredential[];
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Get single credential
  const getCredential = useCallback(async (credentialId: string) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}`,
      method: 'GET',
      silent: true,
    });

    if (response?.data) {
      return response.data as CommunicationCredential;
    }
    return null;
  }, [fetchData]);

  // Create new credential
  const createCredential = useCallback(async (
    businessId: string,
    payload: CreateCredentialPayload
  ) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/businesses/${businessId}`,
      method: 'POST',
      data: payload,
    });

    return response?.success || false;
  }, [fetchData]);

  // Update credential
  const updateCredential = useCallback(async (
    credentialId: string,
    payload: UpdateCredentialPayload
  ) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}`,
      method: 'PUT',
      data: payload,
    });

    return response?.success || false;
  }, [fetchData]);

  // Delete credential
  const deleteCredential = useCallback(async (credentialId: string) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}`,
      method: 'DELETE',
    });

    return response?.success || false;
  }, [fetchData]);

  // Toggle credential active status
  const toggleCredential = useCallback(async (credentialId: string) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}/toggle`,
      method: 'PATCH',
    });

    return response?.success || false;
  }, [fetchData]);

  // Validate credential
  const validateCredential = useCallback(async (credentialId: string) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}/validate`,
      method: 'POST',
    });

    if (response?.data) {
      return response.data as { isValid: boolean; message: string };
    }
    return { isValid: false, message: 'Validation failed' };
  }, [fetchData]);

  // Reset quota
  const resetQuota = useCallback(async (credentialId: string) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}/reset-quota`,
      method: 'POST',
    });

    return response?.success || false;
  }, [fetchData]);

  // Get usage statistics
  const getUsageStats = useCallback(async (credentialId: string) => {
    const response = await fetchData({
      endpoint: `/api/communication-credentials/${credentialId}/usage`,
      method: 'GET',
      silent: true,
    });

    if (response?.data) {
      return response.data as {
        currentMonthUsage: number;
        monthlyQuota: number | string;
        quotaRemaining: number | string;
        usagePercentage: string;
        totalCost: number;
        costPerUnit: number | null;
        quotaResetDate: string | null;
        isQuotaExceeded: boolean;
      };
    }
    return null;
  }, [fetchData]);

  return {
    credentials,
    loading,
    fetchCredentials,
    getCredential,
    createCredential,
    updateCredential,
    deleteCredential,
    toggleCredential,
    validateCredential,
    resetQuota,
    getUsageStats,
  };
};

export default useCommunicationCredentials;
