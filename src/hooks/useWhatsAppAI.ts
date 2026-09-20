import { useState, useCallback, useEffect, useRef } from 'react';
import whatsappService from '../services/whatsappService';
import alert from '../utils/alert';
import type { AIProviderGroup, AIProviderId } from '../components/WhatsApp/AIModelSelector';
import type { WhatsAppMode } from './useWhatsAppSettings';
import {
  EMPTY_ORG_KNOWLEDGE,
  normalizeOrgKnowledge,
  toOrgKnowledgePayload,
  type OrgKnowledgeProfile,
} from '../types/orgKnowledgeProfile';

export type ReplyLanguage = 'si' | 'en' | 'auto';

export interface AiTestResult {
  reply: string;
  model: string;
  modelName: string;
  responseTimeMs: number;
  usingOwnKey: boolean;
}

const INSTRUCTION_TEMPLATES: Record<string, Partial<OrgKnowledgeProfile>> = {
  Pharmacy: {
    about: 'We are a licensed pharmacy serving our local community.',
    servicesOffered: 'Medicine dispensing, prescription fulfillment, over-the-counter products, home delivery.',
    productsOverview: 'Medicines, vitamins, health supplements, personal care items.',
    businessHours: 'Mon–Sat 8:00 AM – 8:00 PM, Sun 9:00 AM – 2:00 PM',
    policies: 'Prescription required for scheduled drugs. No medical diagnoses via chat.',
  },
  Clothing: {
    about: 'We are a clothing and apparel retail store.',
    servicesOffered: 'In-store shopping, size guidance, exchanges.',
    productsOverview: 'Men\'s, women\'s, and children\'s clothing, accessories.',
    policies: 'Exchange within 7 days with receipt. Items must be unworn with tags.',
  },
  'Repair Shop': {
    about: 'We are a mobile and PC repair service center.',
    servicesOffered: 'Screen repair, battery replacement, software fixes, device diagnostics.',
    productsOverview: 'Phone accessories, spare parts, refurbished devices.',
    policies: 'Repairs include 30-day warranty on parts and labor.',
  },
  General: {
    about: 'We are a local retail business focused on quality products and friendly service.',
    servicesOffered: 'In-store sales, customer support, product advice.',
    productsOverview: 'See our live product catalog   prices and stock are always from our system.',
  },
};

export default function useWhatsAppAI(businessId: string | undefined) {
  const businessIdRef = useRef(businessId);
  businessIdRef.current = businessId;

  const [models, setModels] = useState<AIProviderGroup[]>([]);
  const [mode, setMode] = useState<WhatsAppMode | 'AI'>('MANUAL');
  const [aiModel, setAiModel] = useState('nex-agi/nex-n2-pro:free');
  const [aiProvider, setAiProvider] = useState<AIProviderId>('openrouter');
  const [useOrgAiSettings, setUseOrgAiSettings] = useState(false);
  const [hasOrgAiSettings, setHasOrgAiSettings] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [orgKnowledge, setOrgKnowledge] = useState<OrgKnowledgeProfile>({ ...EMPTY_ORG_KNOWLEDGE });
  const [replyLanguage, setReplyLanguage] = useState<ReplyLanguage>('auto');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [keyDirty, setKeyDirty] = useState(false);
  const [maskedKey, setMaskedKey] = useState('sk-or-••••');
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);

  const testMessageRef = useRef(testMessage);
  testMessageRef.current = testMessage;

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;

    whatsappService
      .getAiModels(businessId)
      .then((res) => {
        if (cancelled) return;
        const data = (res as { data?: AIProviderGroup[] }).data;
        setModels(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const loadFromSettings = useCallback(
    (settings: {
      mode: WhatsAppMode | 'AI';
      aiModel?: string;
      aiProvider?: string;
      useOrgAiSettings?: boolean;
      hasOrgAiSettings?: boolean;
      aiInstructions?: string | null;
      orgKnowledgeProfile?: OrgKnowledgeProfile | null;
      replyLanguage?: ReplyLanguage;
      aiEnabled?: boolean;
      openRouterApiKey?: string;
      hasOpenRouterApiKey?: boolean;
    }) => {
      setMode(settings.mode);
      setAiModel(settings.aiModel ?? 'nex-agi/nex-n2-pro:free');
      setAiProvider((settings.aiProvider as AIProviderId) ?? 'openrouter');
      setUseOrgAiSettings(settings.useOrgAiSettings ?? false);
      setHasOrgAiSettings(settings.hasOrgAiSettings ?? false);
      setAiInstructions(settings.aiInstructions ?? '');
      setOrgKnowledge(normalizeOrgKnowledge(settings.orgKnowledgeProfile));
      setReplyLanguage(settings.replyLanguage ?? 'auto');
      setAiEnabled(settings.aiEnabled ?? settings.mode === 'AI');
      setMaskedKey(settings.openRouterApiKey ?? 'sk-or-••••');
      setHasOwnKey(settings.hasOpenRouterApiKey ?? false);
      setOpenRouterKey('');
      setKeyDirty(false);
    },
    [],
  );

  const updateOrgKnowledge = (field: keyof OrgKnowledgeProfile, value: string) => {
    setOrgKnowledge((prev) => ({ ...prev, [field]: value }));
  };

  const applyTemplate = (name: keyof typeof INSTRUCTION_TEMPLATES) => {
    const template = INSTRUCTION_TEMPLATES[name];
    setOrgKnowledge((prev) => ({
      ...prev,
      ...template,
    }));
  };

  const saveAiConfig = useCallback(async () => {
    const orgId = businessIdRef.current;
    if (!orgId) return false;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        mode: mode === 'AI' ? 'AI' : mode,
        aiModel,
        aiProvider,
        useOrgAiSettings,
        aiInstructions,
        orgKnowledgeProfile: toOrgKnowledgePayload(orgKnowledge),
        replyLanguage,
        aiEnabled: mode === 'AI' ? true : aiEnabled,
      };
      if (keyDirty && openRouterKey.trim()) {
        payload.openRouterApiKey = openRouterKey.trim();
      }
      await whatsappService.saveAiConfig(orgId, payload);
      alert.success('AI settings saved.');
      setKeyDirty(false);
      setOpenRouterKey('');
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, aiModel, aiProvider, useOrgAiSettings, aiInstructions, orgKnowledge, replyLanguage, aiEnabled, keyDirty, openRouterKey]);

  const testAiReply = useCallback(async () => {
    const orgId = businessIdRef.current;
    const msg = testMessageRef.current.trim();
    if (!orgId || !msg) return;

    setTesting(true);
    setTestResult(null);
    try {
      const res = await whatsappService.testAiReply(orgId, msg);
      setTestResult((res as { data: AiTestResult }).data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI test failed';
      alert.error(message);
    } finally {
      setTesting(false);
    }
  }, []);

  const clearOwnKey = () => {
    setOpenRouterKey('');
    setKeyDirty(false);
    setHasOwnKey(false);
    setMaskedKey('sk-or-••••');
  };

  return {
    models,
    mode,
    setMode,
    aiModel,
    setAiModel,
    aiProvider,
    setAiProvider,
    useOrgAiSettings,
    setUseOrgAiSettings,
    hasOrgAiSettings,
    aiInstructions,
    setAiInstructions,
    orgKnowledge,
    updateOrgKnowledge,
    replyLanguage,
    setReplyLanguage,
    aiEnabled,
    setAiEnabled,
    openRouterKey,
    setOpenRouterKey,
    keyDirty,
    setKeyDirty,
    maskedKey,
    hasOwnKey,
    saving,
    testing,
    testMessage,
    setTestMessage,
    testResult,
    loadFromSettings,
    applyTemplate,
    saveAiConfig,
    testAiReply,
    clearOwnKey,
    instructionTemplates: Object.keys(INSTRUCTION_TEMPLATES),
  };
}
