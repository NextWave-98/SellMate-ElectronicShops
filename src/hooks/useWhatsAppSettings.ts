import { useState, useCallback } from 'react';
import useFetch from './useFetch';

import type { OrgKnowledgeProfile } from '../types/orgKnowledgeProfile';

export type WhatsAppMode = 'AUTO' | 'MANUAL' | 'AI';

export interface WhatsAppReplyTemplate {
  keyword: string;
  reply: string;
}

export interface WhatsAppSettings {
  id: string | null;
  organizationId: string;
  metaPhoneNumberId: string | null;
  metaAccessToken: string;
  metaVerifyToken: string | null;
  metaBusinessAccountId: string | null;
  mode: WhatsAppMode;
  replyTemplates: WhatsAppReplyTemplate[];
  defaultReply: string | null;
  isActive: boolean;
  webhookUrl: string;
  hasAccessToken: boolean;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  isConnected: boolean;
  aiModel: string;
  aiProvider: string;
  useOrgAiSettings: boolean;
  hasOrgAiSettings: boolean;
  aiInstructions: string | null;
  orgKnowledgeProfile: OrgKnowledgeProfile | null;
  replyLanguage: 'si' | 'en' | 'auto';
  aiEnabled: boolean;
  openRouterApiKey: string;
  hasOpenRouterApiKey: boolean;
}

export interface WhatsAppTestResult {
  success: boolean;
  phoneNumber?: string;
  displayName?: string;
  error?: string;
  tokenRefreshed?: boolean;
}

export interface UpdateWhatsAppSettingsPayload {
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaVerifyToken?: string;
  metaBusinessAccountId?: string;
  mode?: WhatsAppMode;
  replyTemplates?: WhatsAppReplyTemplate[];
  defaultReply?: string;
  isActive?: boolean;
}

export default function useWhatsAppSettings(businessId: string | undefined) {
  const { fetchData } = useFetch();
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetchData({
        method: 'GET',
        endpoint: `/organizations/${businessId}/whatsapp-settings`,
        silent: true,
        showToastOnError: false,
      });
      setSettings((res?.data as WhatsAppSettings) ?? null);
    } finally {
      setLoading(false);
    }
  }, [businessId, fetchData]);

  const saveSettings = useCallback(
    async (payload: UpdateWhatsAppSettingsPayload) => {
      if (!businessId) return false;
      setSaving(true);
      try {
        const res = await fetchData({
          method: 'PUT',
          endpoint: `/organizations/${businessId}/whatsapp-settings`,
          data: payload,
          successMessage: 'WhatsApp settings saved successfully.',
        });
        setSettings((res?.data as WhatsAppSettings) ?? null);
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [businessId, fetchData],
  );

  const testConnection = useCallback(async (): Promise<WhatsAppTestResult> => {
    if (!businessId) {
      return { success: false, error: 'Organization not found' };
    }
    setTesting(true);
    try {
      const res = await fetchData({
        method: 'POST',
        endpoint: `/organizations/${businessId}/whatsapp-settings/test`,
        silent: true,
        showToastOnError: false,
      });
      return (res?.data as WhatsAppTestResult) ?? { success: false, error: 'Unknown error' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      return { success: false, error: message };
    } finally {
      setTesting(false);
    }
  }, [businessId, fetchData]);

  const refreshToken = useCallback(async (): Promise<WhatsAppTestResult> => {
    if (!businessId) {
      return { success: false, error: 'Organization not found' };
    }
    setRefreshing(true);
    try {
      const res = await fetchData({
        method: 'POST',
        endpoint: `/organizations/${businessId}/whatsapp-settings/refresh-token`,
        successMessage: 'WhatsApp token refreshed.',
        showToastOnError: true,
      });
      const data = (res?.data as WhatsAppTestResult) ?? { success: false, error: 'Unknown error' };
      if (data.success) await fetchSettings();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Token refresh failed';
      return { success: false, error: message };
    } finally {
      setRefreshing(false);
    }
  }, [businessId, fetchData, fetchSettings]);

  const disconnect = useCallback(async () => {
    if (!businessId) return false;
    setDisconnecting(true);
    try {
      await fetchData({
        method: 'DELETE',
        endpoint: `/organizations/${businessId}/whatsapp-settings/disconnect`,
        successMessage: 'WhatsApp disconnected.',
      });
      setSettings(null);
      await fetchSettings();
      return true;
    } catch {
      return false;
    } finally {
      setDisconnecting(false);
    }
  }, [businessId, fetchData, fetchSettings]);

  return {
    settings,
    loading,
    saving,
    testing,
    disconnecting,
    fetchSettings,
    saveSettings,
    testConnection,
    refreshToken,
    disconnect,
    refreshing,
  };
}
