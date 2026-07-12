import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  Bot,
  Send,
  RefreshCw,
  TrendingUp,
  Package,
  ShoppingCart,
  Wrench,
  Users,
  CreditCard,
  BarChart3,
  Globe,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  Trash2,
  MessageSquare,
  Settings,
  Key,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAIAnalytics, {
  type AnalysisPeriod,
  type QuickAnalysisType,
  type ChatMessage,
} from '../../hooks/useAIAnalytics';
import useAISettings, {
  type AIProvider,
  AI_PROVIDER_LABELS,
  AI_PROVIDER_COLORS,
  AI_PROVIDER_MODELS,
} from '../../hooks/useAISettings';
import { formatCurrency } from '@/utils/currency';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../store/types';

// ─── Markdown-like renderer (no external lib needed) ─────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-indigo-700 mt-5 mb-2 border-b border-indigo-100 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-gray-700">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700 my-0.5">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700 my-0.5">$1</li>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-indigo-700 px-1 rounded text-sm">$1</code>')
    .replace(/\n\n/g, '</p><p class="mb-2 text-gray-700">')
    .replace(/\n/g, '<br/>');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricCard = ({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) => (
  <div className={`rounded-xl border p-3.5 bg-white shadow-sm flex items-start gap-3`}>
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
    </div>
  </div>
);

const AnalysisDisplay = ({
  content,
  isLoading,
}: {
  content: string | null;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="relative">
          <Brain className="w-10 h-10 text-indigo-500 animate-pulse" />
          <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
        </div>
        <p className="text-gray-500 text-sm">AI is analyzing your business data…</p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <Bot className="w-10 h-10 opacity-30" />
        <p className="text-sm">Select an analysis type or ask a question below.</p>
      </div>
    );
  }

  return (
    <div
      className="prose max-w-none text-sm leading-relaxed text-gray-700 p-1"
      dangerouslySetInnerHTML={{ __html: `<p class="mb-2 text-gray-700">${renderMarkdown(content)}</p>` }}
    />
  );
};

const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white/60 backdrop-blur-sm border border-white/30 text-gray-700 rounded-tl-sm shadow-sm'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <div
            dangerouslySetInnerHTML={{
              __html: `<p class="mb-1">${renderMarkdown(message.content)}</p>`,
            }}
          />
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
          <Users className="w-3.5 h-3.5 text-gray-600" />
        </div>
      )}
    </div>
  );
};

// ─── Suggested questions ──────────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  'What are my top 3 priority actions this month?',
  'Which products should I restock urgently?',
  'Why are my WooCommerce orders not converting?',
  'Which staff member needs the most coaching?',
  'What is my most profitable product category?',
  'How can I reduce cancelled sales?',
  'Which branch is underperforming and why?',
  'What payment methods should I add?',
];

const QUICK_ACTIONS: { type: QuickAnalysisType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { type: 'sales', label: 'Sales Analysis', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100 border-green-200' },
  { type: 'inventory', label: 'Inventory Health', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
  { type: 'products', label: 'Best Products', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { type: 'woocommerce', label: 'WooCommerce', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { type: 'staff', label: 'Staff Performance', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
  { type: 'repairs', label: 'Repair Business', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { type: 'customers', label: 'Customer Insights', icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200' },
  { type: 'payments', label: 'Payment Trends', icon: CreditCard, color: 'text-teal-600', bg: 'bg-teal-50 hover:bg-teal-100 border-teal-200' },
];

const PERIOD_OPTIONS: { value: AnalysisPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

type TabType = 'analysis' | 'chat' | 'data' | 'settings';

// ─── Provider card ────────────────────────────────────────────────────────────
const ProviderCard = ({
  provider,
  selected,
  onSelect,
}: {
  provider: AIProvider;
  selected: boolean;
  onSelect: () => void;
}) => {
  const colors = AI_PROVIDER_COLORS[provider];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 min-w-[130px] flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
        selected
          ? `${colors.bg} ${colors.border} ${colors.text} shadow-sm`
          : 'border-white/40 bg-white/30 backdrop-blur-sm text-gray-500 hover:border-white/60'
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${selected ? colors.dot : 'bg-gray-300'}`} />
      <span className="text-xs font-semibold text-center leading-tight">{AI_PROVIDER_LABELS[provider]}</span>
    </button>
  );
};

const AIAnalyticsPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canManageAiSettings = hasPermission(PERMISSIONS.AIANALYTICS_MANAGE);

  const {
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
  } = useAIAnalytics();

  const {
    settings: aiSettings,
    loading: settingsLoading,
    saving: settingsSaving,
    testing: settingsTesting,
    testResult,
    fetchSettings,
    saveSettings,
    deleteSettings,
    testConnection,
  } = useAISettings();

  // Settings form state
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openrouter');
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-4o-mini');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [period, setPeriod] = useState<AnalysisPeriod>('month');
  const [inputMessage, setInputMessage] = useState('');
  const [activeQuick, setActiveQuick] = useState<QuickAnalysisType | 'full' | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load context on mount & period change
  useEffect(() => {
    fetchContext(period).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Load AI settings on mount (manage permission only)
  useEffect(() => {
    if (!canManageAiSettings) return;
    fetchSettings().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageAiSettings]);

  // Sync form with loaded settings
  useEffect(() => {
    if (aiSettings) {
      setSelectedProvider(aiSettings.provider);
      setSelectedModel(aiSettings.model);
    }
  }, [aiSettings]);

  // Reset model to first of list when provider changes
  const handleProviderChange = (p: AIProvider) => {
    setSelectedProvider(p);
    setSelectedModel(AI_PROVIDER_MODELS[p][0] ?? '');
  };

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping, activeTab]);

  const handleFullAnalysis = useCallback(async () => {
    setActiveQuick('full');
    setActiveTab('analysis');
    try {
      await runFullAnalysis(period);
      toast.success('Full analysis complete!');
    } catch {
      toast.error(error || 'Analysis failed. Check your OpenRouter API key.');
    }
  }, [runFullAnalysis, period, error]);

  const handleQuickAnalysis = useCallback(
    async (type: QuickAnalysisType) => {
      setActiveQuick(type);
      setActiveTab('analysis');
      try {
        await runQuickAnalysis(type, period);
      } catch {
        toast.error(error || 'Analysis failed.');
      }
    },
    [runQuickAnalysis, period, error]
  );

  const handleSendMessage = useCallback(async () => {
    const msg = inputMessage.trim();
    if (!msg || isTyping) return;
    setInputMessage('');
    setActiveTab('chat');
    try {
      await sendMessage(msg, period);
    } catch {
      toast.error('Failed to send message.');
    }
  }, [inputMessage, isTyping, sendMessage, period]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestion = (q: string) => {
    setInputMessage(q);
    setActiveTab('chat');
    textareaRef.current?.focus();
  };

  const fmt = (v: unknown) => (v == null ? '—' : Number(v).toLocaleString());
  // const fmtCur = (v: unknown) =>
  //   v == null ? '—' : `$${parseFloat(String(v)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const activeProviderLabel = aiSettings 
    ? AI_PROVIDER_LABELS[aiSettings.provider] 
    : 'System Default';

  return (
    <div className="flex flex-col h-full min-h-0 p-4 sm:p-6 gap-4">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-linear-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-md">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              AI Business Analytics
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                aiSettings
                  ? `${AI_PROVIDER_COLORS[aiSettings.provider].bg} ${AI_PROVIDER_COLORS[aiSettings.provider].text}`
                  : 'bg-indigo-100 text-indigo-700'
              }`}>
                {activeProviderLabel}
              </span>
            </h1>
            <p className="text-sm text-gray-500">
              Real-time AI insights for your organization — sales, inventory, WooCommerce & more.
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as AnalysisPeriod)}
            className="appearance-none border border-white/40 bg-white/30 backdrop-blur-sm text-sm rounded-lg px-3 py-2 pr-8 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ─── Metric Cards ────────────────────────────────────────────────────── */}
      {contextData && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(contextData.sales.total_revenue)}
            sub={`${fmt(contextData.sales.total_sales)} sales`}
            color="bg-green-500"
            icon={TrendingUp}
          />
          <MetricCard
            label="Inventory Value"
            value={formatCurrency(contextData.inventory.total_inventory_value)}
            sub={`${fmt(contextData.inventory.out_of_stock_count)} out of stock`}
            color="bg-orange-500"
            icon={Package}
          />
          {/* <MetricCard
            label="Online Orders"
            value={fmt(contextData.woocommerce.total_woo_orders)}
            sub={formatCurrency(contextData.woocommerce.total_woo_revenue)}
            color="bg-purple-500"
            icon={Globe}
          />
          <MetricCard
            label="Repair Jobs"
            value={fmt(contextData.jobsheets.total)}
            sub={`${fmt(contextData.jobsheets.pending)} pending`}
            color="bg-amber-500"
            icon={Wrench}
          /> */}
          <MetricCard
            label="Low Stock"
            value={fmt(contextData.inventory.low_stock_count)}
            sub="items need reorder"
            color={Number(contextData.inventory.low_stock_count) > 0 ? 'bg-red-500' : 'bg-gray-400'}
            icon={AlertTriangle}
          />
          <MetricCard
            label="Avg Order Value"
            value={fmt(contextData.sales.avg_order_value)}
            sub={`${formatCurrency(contextData.sales.completed_sales)} completed`}
            color="bg-blue-500"
            icon={ShoppingCart}
          />
        </div>
      )}

      {/* ─── Quick Actions ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Full analysis + quick buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleFullAnalysis}
            disabled={isTyping || loading}
            className="flex items-center gap-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isTyping && activeQuick === 'full' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Full Organization Analysis
          </button>
          {QUICK_ACTIONS.map(({ type, label, icon: Icon, color, bg }) => (
            <button
              key={type}
              onClick={() => handleQuickAnalysis(type)}
              disabled={isTyping || loading}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${bg} ${color} ${activeQuick === type ? 'ring-2 ring-offset-1 ring-current' : ''}`}
            >
              {isTyping && activeQuick === type ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-white/20">
        {[
          { id: 'analysis' as TabType, label: 'AI Analysis', icon: Brain },
          { id: 'chat' as TabType, label: `Chat${chatMessages.length ? ` (${chatMessages.length})` : ''}`, icon: MessageSquare },
          { id: 'data' as TabType, label: 'Raw Data', icon: BarChart3 },
          ...(canManageAiSettings
            ? [{ id: 'settings' as TabType, label: 'AI Settings', icon: Settings }]
            : []),
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Analysis tab */}
        {activeTab === 'analysis' && (
          <div className="flex-1 min-h-0 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm overflow-auto p-5">
            <AnalysisDisplay content={analysisResult} isLoading={isTyping && activeTab === 'analysis'} />
          </div>
        )}

        {/* Chat tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {/* Messages area */}
            <div className="flex-1 min-h-0 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20 overflow-auto p-4 space-y-3">
              {chatMessages.length === 0 && !isTyping && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                    <Bot className="w-10 h-10 opacity-30" />
                    <p className="text-sm font-medium">Ask me anything about your business</p>
                    <p className="text-xs">I have access to your real-time sales, inventory, and operations data.</p>
                  </div>
                  {/* Suggested questions */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-center">
                      Suggested Questions
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSuggestion(q)}
                          className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full px-3 py-1.5 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}

              {isTyping && activeTab === 'chat' && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="flex gap-2 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm p-2">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your sales, inventory, products, repairs, WooCommerce… (Enter to send)"
                rows={2}
                className="flex-1 resize-none text-sm text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none px-2 py-1"
                disabled={isTyping}
              />
              <div className="flex flex-col gap-1 justify-end">
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data tab */}
        {activeTab === 'data' && contextData && (
          <div className="flex-1 min-h-0 overflow-auto space-y-4">
            {/* Top Products */}
            <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-white/20 border-b border-white/20 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-700">Top Products by Revenue</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/30 backdrop-blur-sm">
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">#</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Product</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">Category</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">Units</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">Revenue</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contextData.topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-700">
                          {p.product_name}
                          {p.brand && (
                            <span className="ml-1 text-gray-400 font-normal">({p.brand})</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{p.category || '—'}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{fmt(p.units_sold)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-600">
                          {formatCurrency(p.total_revenue)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(p.avg_price)}</td>
                      </tr>
                    ))}
                    {contextData.topProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-400">
                          No sales data for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Staff + Location side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Staff Performance */}
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-white/20 border-b border-white/20 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Staff Performance</h3>
                </div>
                <div className="divide-y divide-white/20">
                  {contextData.staffPerformance.map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-700">{s.staff_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(s.total_revenue)}</p>
                        <p className="text-xs text-gray-400">{fmt(s.total_sales)} sales</p>
                      </div>
                    </div>
                  ))}
                  {contextData.staffPerformance.length === 0 && (
                    <p className="text-center py-4 text-xs text-gray-400">No staff data</p>
                  )}
                </div>
              </div>

              {/* Location Performance */}
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-white/20 border-b border-white/20 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Branch Performance</h3>
                </div>
                <div className="divide-y divide-white/20">
                  {contextData.locationSummary.map((l, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-700">{l.location_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(l.total_revenue)}</p>
                        <p className="text-xs text-gray-400">{fmt(l.total_sales)} sales</p>
                      </div>
                    </div>
                  ))}
                  {contextData.locationSummary.length === 0 && (
                    <p className="text-center py-4 text-xs text-gray-400">No branch data</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-white/20 border-b border-white/20 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-700">Payment Method Breakdown</h3>
              </div>
              <div className="flex flex-wrap gap-3 p-4">
                {contextData.paymentBreakdown.map((p, i) => (
                  <div
                    key={i}
                    className="flex-1 min-w-35 bg-white/30 backdrop-blur-sm rounded-xl border border-white/20 px-4 py-3 text-center"
                  >
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{p.payment_method}</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(p.total_amount)}</p>
                    <p className="text-xs text-gray-400">{fmt(p.count)} transactions</p>
                  </div>
                ))}
                {contextData.paymentBreakdown.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 w-full text-center">No payment data</p>
                )}
              </div>
            </div>

            {/* WooCommerce + Suppliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm p-5 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-semibold text-gray-700">WooCommerce Orders</h3>
                </div>
                {[
                  { label: 'Total Orders', value: fmt(contextData.woocommerce.total_woo_orders) },
                  { label: 'Completed', value: fmt(contextData.woocommerce.completed) },
                  { label: 'Processing', value: fmt(contextData.woocommerce.processing) },
                  { label: 'Pending', value: fmt(contextData.woocommerce.pending) },
                  { label: 'Cancelled', value: fmt(contextData.woocommerce.cancelled) },
                  { label: 'Online Revenue', value: formatCurrency(contextData.woocommerce.total_woo_revenue) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Purchase Orders</h3>
                </div>
                {[
                  { label: 'Total POs', value: fmt(contextData.supplierSummary.total_purchase_orders) },
                  { label: 'Received', value: fmt(contextData.supplierSummary.received) },
                  { label: 'Pending', value: fmt(contextData.supplierSummary.pending_orders) },
                  { label: 'Total PO Value', value: formatCurrency(contextData.supplierSummary.total_po_value) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No context yet */}
        {activeTab === 'data' && !contextData && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <RefreshCw className={`w-8 h-8 ${loading ? 'animate-spin' : 'opacity-30'}`} />
            <p className="text-sm">{loading ? 'Loading data…' : 'No data loaded.'}</p>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && canManageAiSettings && (
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6 py-2">

              {/* Current status */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-sm font-semibold text-gray-800">Current AI Provider</h2>
                </div>
                {settingsLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : aiSettings ? (
                  <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                    AI_PROVIDER_COLORS[aiSettings.provider].bg
                  } ${AI_PROVIDER_COLORS[aiSettings.provider].border}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${AI_PROVIDER_COLORS[aiSettings.provider].dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${AI_PROVIDER_COLORS[aiSettings.provider].text}`}>
                        {AI_PROVIDER_LABELS[aiSettings.provider]}
                      </p>
                      <p className="text-xs text-gray-500 truncate">Model: {aiSettings.model}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-white rounded-full border border-gray-200 text-gray-600">
                      {aiSettings.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-indigo-200 bg-indigo-50">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-indigo-700">System Default</p>
                      <p className="text-xs text-gray-500">Using platform OpenRouter key</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Configure provider */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-800">Configure Your Own API Key</h2>
                </div>

                {/* Provider selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Select Provider</label>
                  <div className="flex flex-wrap gap-2">
                    {(['openrouter', 'openai', 'gemini', 'anthropic', 'grok'] as AIProvider[]).map((p) => (
                      <ProviderCard
                        key={p}
                        provider={p}
                        selected={selectedProvider === p}
                        onSelect={() => handleProviderChange(p)}
                      />
                    ))}
                  </div>
                </div>

                {/* Model selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full border border-gray-200 bg-white text-sm rounded-xl px-3 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {AI_PROVIDER_MODELS[selectedProvider].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* API key input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">API Key</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder={`Paste your ${AI_PROVIDER_LABELS[selectedProvider]} API key…`}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {aiSettings?.hasApiKey && !apiKeyInput && (
                    <p className="text-xs text-gray-400">A key is already saved. Enter a new one to replace it.</p>
                  )}
                  {selectedProvider === 'openrouter' && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      OpenRouter keys start with <code className="font-mono">sk-or-v1-</code>. Do not use Google/Gemini (<code className="font-mono">AIza</code> / <code className="font-mono">AQ.</code>) or OpenAI keys here.
                    </p>
                  )}
                </div>

                {/* Test result */}
                {testResult && (
                  <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm border ${
                    testResult.success
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {testResult.success
                      ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    }
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={settingsTesting || !apiKeyInput.trim()}
                    onClick={async () => {
                      const r = await testConnection(selectedProvider, selectedModel, apiKeyInput);
                      if (r.success) toast.success('Connection test passed!');
                      else toast.error('Connection test failed.');
                    }}
                    className="flex items-center gap-2 border border-gray-200 bg-white text-sm font-medium text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {settingsTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Test Connection
                  </button>

                  <button
                    type="button"
                    disabled={settingsSaving || (!apiKeyInput.trim() && !aiSettings?.hasApiKey)}
                    onClick={async () => {
                      const keyToSave = apiKeyInput.trim() || (aiSettings?.hasApiKey ? '___keep___' : '');
                      if (!keyToSave || keyToSave === '___keep___') {
                        toast.error('Please enter an API key.');
                        return;
                      }
                      const ok = await saveSettings(selectedProvider, selectedModel, keyToSave);
                      if (ok) {
                        toast.success('AI settings saved!');
                        setApiKeyInput('');
                      } else {
                        toast.error('Failed to save settings.');
                      }
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Save Settings
                  </button>

                  {aiSettings && (
                    <button
                      type="button"
                      disabled={settingsSaving}
                      onClick={async () => {
                        const ok = await deleteSettings();
                        if (ok) toast.success('Reverted to system default AI provider.');
                        else toast.error('Failed to remove settings.');
                      }}
                      className="flex items-center gap-2 border border-red-200 bg-red-50 text-red-600 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Use System Default
                    </button>
                  )}
                </div>
              </div>

              {/* Info card */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 space-y-1">
                <p className="font-semibold text-amber-800">About AI Providers</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-700">
                  <li><strong>OpenRouter</strong> — Access many models with one key. <span className="text-amber-600">openrouter.ai</span></li>
                  <li><strong>OpenAI / ChatGPT</strong> — GPT-4o and more. <span className="text-amber-600">platform.openai.com</span></li>
                  <li><strong>Google Gemini</strong> — Gemini 1.5 Pro, Flash. <span className="text-amber-600">aistudio.google.com</span></li>
                  <li><strong>Anthropic Claude</strong> — Claude 3.5 Sonnet &amp; Haiku. <span className="text-amber-600">console.anthropic.com</span></li>
                  <li><strong>Grok (xAI)</strong> — xAI's Grok models. <span className="text-amber-600">console.x.ai</span></li>
                </ul>
                <p className="text-xs text-amber-600 mt-2">Your API key is encrypted at rest using AES-256-GCM and never exposed in the UI.</p>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ─── Setup notice if no AI provider configured ───────────────────────── */}
      {error && (error.includes('OPENROUTER_API_KEY') || error.includes('No AI provider')) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <Settings className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">No AI Provider Configured</p>
            <p className="text-amber-700 mt-1">
              {canManageAiSettings ? (
                <>
                  Go to the{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="underline font-semibold text-amber-800"
                  >
                    AI Settings
                  </button>{' '}
                  tab to add your own API key, or ask an admin to set
                </>
              ) : (
                <>Ask an admin with AI Analytics manage permission to configure an API key, or set</>
              )}{' '}
              <code className="bg-amber-100 px-1 rounded">OPENROUTER_API_KEY=your_key</code> in the backend{' '}
              <code className="bg-amber-100 px-1 rounded">.env</code> as the system default.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsPage;
