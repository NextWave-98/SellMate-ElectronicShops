import { useState, useCallback } from 'react';
import useFetch from './useFetch';

export type AIProvider = 'openrouter' | 'openai' | 'gemini' | 'anthropic' | 'grok';

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI / ChatGPT',
  gemini: 'Google Gemini',
  anthropic: 'Anthropic Claude',
  grok: 'Grok (xAI)',
};

export const AI_PROVIDER_COLORS: Record<AIProvider, { bg: string; text: string; border: string; dot: string }> = {
  openrouter: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', dot: 'bg-violet-500' },
  openai:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  gemini:     { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  anthropic:  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  grok:       { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-400', dot: 'bg-gray-600' },
};

export const AI_PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openrouter: [
    'nex-agi/nex-n2-pro:free',
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-2.0-flash-001',
    'google/gemini-pro',
    'x-ai/grok-2',
    'meta-llama/llama-3.3-70b-instruct',
    'mistralai/mistral-7b-instruct',
  ],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ],
  grok: ['grok-2-latest', 'grok-beta', 'grok-vision-beta'],
};

export interface AISettings {
  id: string;
  businessId: string;
  provider: AIProvider;
  model: string;
  isActive: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

export default function useAISettings() {
  const { fetchData } = useFetch();

  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchData({ method: 'GET', endpoint: '/ai-settings' });
      setSettings((res?.data?.settings as AISettings) ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load AI settings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  const saveSettings = useCallback(
    async (provider: AIProvider, model: string, apiKey: string) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetchData({
          method: 'POST',
          endpoint: '/ai-settings',
          data: { provider, model, apiKey },
        });
        setSettings((res?.data?.settings as AISettings) ?? null);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save AI settings';
        setError(msg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchData],
  );

  const deleteSettings = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await fetchData({ method: 'DELETE', endpoint: '/ai-settings' });
      setSettings(null);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove AI settings';
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchData]);

  const testConnection = useCallback(
    async (provider: AIProvider, model: string, apiKey: string): Promise<TestResult> => {
      setTesting(true);
      setTestResult(null);
      setError(null);
      try {
        const res = await fetchData({
          method: 'POST',
          endpoint: '/ai-settings/test',
          data: { provider, model, apiKey },
        });
        const result = res?.data as TestResult;
        setTestResult(result);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Connection test failed';
        const result: TestResult = { success: false, message: msg, latencyMs: 0 };
        setTestResult(result);
        return result;
      } finally {
        setTesting(false);
      }
    },
    [fetchData],
  );

  return {
    settings,
    loading,
    saving,
    testing,
    error,
    testResult,
    fetchSettings,
    saveSettings,
    deleteSettings,
    testConnection,
  };
}
