import { useState, useCallback } from 'react';
import useFetch from './useFetch';

export type AnalysisPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';
export type QuickAnalysisType =
  | 'sales'
  | 'inventory'
  | 'woocommerce'
  | 'products'
  | 'staff'
  | 'repairs'
  | 'customers'
  | 'payments';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalyticsContextData {
  business: { name: string; businessType?: string };
  period: { label: string; start: string; end: string };
  sales: {
    total_sales: number;
    total_revenue: number;
    avg_order_value: number;
    completed_sales: number;
    cancelled_sales: number;
    refunded_sales: number;
    total_discounts: number;
  };
  inventory: {
    total_inventory_records: number;
    total_stock_qty: number;
    total_available_qty: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_inventory_value: number;
  };
  jobsheets: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    repair_revenue: number;
  };
  topProducts: Array<{
    product_name: string;
    brand: string;
    category: string;
    units_sold: number;
    total_revenue: number;
    avg_price: number;
  }>;
  topCustomers: Array<{
    customer_name: string;
    total_orders: number;
    total_spent: number;
  }>;
  staffPerformance: Array<{
    staff_name: string;
    total_sales: number;
    total_revenue: number;
  }>;
  locationSummary: Array<{
    location_name: string;
    total_sales: number;
    total_revenue: number;
  }>;
  paymentBreakdown: Array<{
    payment_method: string;
    count: number;
    total_amount: number;
  }>;
  woocommerce: {
    total_woo_orders: number;
    completed: number;
    processing: number;
    pending: number;
    cancelled: number;
    refunded: number;
    total_woo_revenue: number;
  };
  supplierSummary: {
    total_purchase_orders: number;
    received: number;
    pending_orders: number;
    total_po_value: number;
  };
}

export const useAIAnalytics = () => {
  const { loading, error, fetchData } = useFetch();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [contextData, setContextData] = useState<AnalyticsContextData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // ─── Fetch data context ───────────────────────────────────────────────────
  const fetchContext = useCallback(async (period: AnalysisPeriod = 'month') => {
    const result = await fetchData({
      method: 'GET',
      endpoint: `/ai-analytics/context?period=${period}`,
      silent: true,
    });
    if (result?.data) {
      setContextData(result.data as AnalyticsContextData);
    }
    return result?.data as AnalyticsContextData | null;
  }, [fetchData]);

  // ─── Full organization analysis ───────────────────────────────────────────
  const runFullAnalysis = useCallback(async (period: AnalysisPeriod = 'month') => {
    setAnalysisResult(null);
    setIsTyping(true);
    try {
      const result = await fetchData({
        method: 'POST',
        endpoint: '/ai-analytics/analyze',
        data: { period },
        silent: true,
      });
      const analysis = ((result as Record<string, unknown>)?.data as Record<string, unknown>)?.analysis as string | null;
      if (analysis) setAnalysisResult(analysis);
      return analysis;
    } finally {
      setIsTyping(false);
    }
  }, [fetchData]);

  // ─── Quick targeted analysis ──────────────────────────────────────────────
  const runQuickAnalysis = useCallback(async (type: QuickAnalysisType, period: AnalysisPeriod = 'month') => {
    setAnalysisResult(null);
    setIsTyping(true);
    try {
      const result = await fetchData({
        method: 'POST',
        endpoint: '/ai-analytics/quick',
        data: { type, period },
        silent: true,
      });
      const analysis = ((result as Record<string, unknown>)?.data as Record<string, unknown>)?.analysis as string | null;
      if (analysis) setAnalysisResult(analysis);
      return analysis;
    } finally {
      setIsTyping(false);
    }
  }, [fetchData]);

  // ─── Chat ─────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (userMessage: string, period: AnalysisPeriod = 'month') => {
      const newMessage: ChatMessage = { role: 'user', content: userMessage };
      const updated = [...chatMessages, newMessage];
      setChatMessages(updated);
      setIsTyping(true);

      try {
        const result = await fetchData({
          method: 'POST',
          endpoint: '/ai-analytics/chat',
          data: { messages: updated, period },
          silent: true,
        });
        const aiMessage = ((result as Record<string, unknown>)?.data as Record<string, unknown>)?.message as ChatMessage | null;
        if (aiMessage) {
          setChatMessages((prev) => [...prev, aiMessage]);
        }
        return aiMessage;
      } finally {
        setIsTyping(false);
      }
    },
    [chatMessages, fetchData]
  );

  const clearChat = useCallback(() => {
    setChatMessages([]);
    setAnalysisResult(null);
  }, []);

  return {
    loading,
    error,
    isTyping,
    chatMessages,
    contextData,
    analysisResult,
    fetchContext,
    runFullAnalysis,
    runQuickAnalysis,
    sendMessage,
    clearChat,
    setAnalysisResult,
  };
};

export default useAIAnalytics;
