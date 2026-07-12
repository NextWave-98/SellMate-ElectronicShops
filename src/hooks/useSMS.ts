import { useCallback } from 'react';
import useFetch from './useFetch';

// SMS Types
export interface SendBulkSameSMSData {
  to: string[];
  msg: string;
  senderID?: string;
}

export interface SendBulkDifferentSMSData {
  msgList: Array<{
    to: string;
    msg: string;
  }>;
  senderID?: string;
}

export interface SMSResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  cost?: number;
  credits?: number;
  deliveryWarning?: boolean;
}

/**
 * Custom hook for managing SMS operations
 * Integrates with backend SMS APIs using useFetch
 */
const useSMS = () => {
  const { fetchData: baseFetchData } = useFetch();

  /**
   * Send bulk SMS with same message
   * POST /sms/send-bulk-same
   */
  const sendBulkSameSMS = useCallback(
    async (smsData: SendBulkSameSMSData, silent = false) => {
      return await baseFetchData({
        endpoint: '/sms/send-bulk-same',
        method: 'POST',
        data: smsData,
        silent,
        successMessage: 'Bulk SMS sent successfully',
      });
    },
    [baseFetchData]
  );

  /**
   * Send bulk SMS with different messages
   * POST /sms/send-bulk-different
   */
  const sendBulkDifferentSMS = useCallback(
    async (smsData: SendBulkDifferentSMSData, silent = false) => {
      return await baseFetchData({
        endpoint: '/sms/send-bulk-different',
        method: 'POST',
        data: smsData,
        silent,
        successMessage: 'Bulk SMS sent successfully',
      });
    },
    [baseFetchData]
  );

  /**
   * Check SMS balance
   * GET /sms/balance
   */
  const checkSMSBalance = useCallback(
    async (silent = true) => {
      return await baseFetchData({
        endpoint: '/sms/balance',
        method: 'GET',
        silent,
      });
    },
    [baseFetchData]
  );

  return {
    sendBulkSameSMS,
    sendBulkDifferentSMS,
    checkSMSBalance,
  };
};

export default useSMS;