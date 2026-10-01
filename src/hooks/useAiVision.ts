import { useCallback, useState } from 'react';
import { getAccessToken } from '../utils/tokenStorage';

const BASE_URL =
  import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

export interface ExtractedLine {
  name: string;
  brand?: string | null;
  qty: number;
  unit?: string | null;
  barcode?: string | null;
  rawText?: string | null;
}

export interface MatchCandidate {
  productId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  model?: string | null;
  unitPrice: number;
  score: number;
}

export type MatchStatus = 'exact' | 'similar' | 'unmatched';

export interface LineMatch {
  lineIndex: number;
  status: MatchStatus;
  selectedProductId?: string | null;
  candidates: MatchCandidate[];
}

export interface AnalyzeListResult {
  extracted: ExtractedLine[];
  matches: LineMatch[];
}

export interface AnalyzeProductResult {
  name: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  suggestedCategory: string | null;
}

async function postForm<T>(endpoint: string, form: FormData): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

async function postJson<T>(endpoint: string, body: unknown): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export default function useAiVision() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeList = useCallback(async (file: File): Promise<AnalyzeListResult> => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      return await postForm<AnalyzeListResult>('/ai-vision/analyze-list', form);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analyze failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rematchLine = useCallback(
    async (payload: {
      lineIndex: number;
      query: string;
      brand?: string | null;
      barcode?: string | null;
    }): Promise<LineMatch> => {
      setError(null);
      const data = await postJson<{ match: LineMatch }>('/ai-vision/rematch-line', payload);
      return data.match;
    },
    [],
  );

  const analyzeProduct = useCallback(async (file: File): Promise<AnalyzeProductResult> => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      return await postForm<AnalyzeProductResult>('/ai-vision/analyze-product', form);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analyze failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, analyzeList, rematchLine, analyzeProduct };
}

/** Session key for Quick POS cart prefill from AI list scan */
export const AI_POS_PREFILL_KEY = 'gadgetchain_ai_pos_prefill';
