import React from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '../ui/badge';

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  badge: string | null;
  costPer1kTokens: string;
}

export interface AIProviderGroup {
  provider: string;
  providerId?: string;
  models: AIModelOption[];
}

export type AIProviderId = 'openrouter' | 'openai' | 'gemini' | 'anthropic' | 'grok';

interface AIModelSelectorProps {
  models: AIProviderGroup[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  selectedProvider: AIProviderId;
  onSelectProvider: (id: AIProviderId) => void;
  useOrgAiSettings: boolean;
  onUseOrgAiSettingsChange: (v: boolean) => void;
  hasOrgAiSettings: boolean;
  openRouterKey: string;
  onOpenRouterKeyChange: (v: string) => void;
  keyDirty: boolean;
  onKeyDirtyChange: (v: boolean) => void;
  maskedKey: string;
  hasOwnKey: boolean;
  onClearKey: () => void;
}

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  anthropic: 'Anthropic',
  grok: 'Grok (xAI)',
};

const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  selectedProvider,
  onSelectProvider,
  useOrgAiSettings,
  onUseOrgAiSettingsChange,
  hasOrgAiSettings,
  openRouterKey,
  onOpenRouterKeyChange,
  keyDirty,
  onKeyDirtyChange,
  maskedKey,
  hasOwnKey,
  onClearKey,
}) => {
  const [showKey, setShowKey] = React.useState(false);

  const visibleGroups = models.filter(
    (g) => !g.providerId || g.providerId === selectedProvider,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <Label className="text-sm font-medium">API key source</Label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="keySource"
            checked={useOrgAiSettings}
            onChange={() => onUseOrgAiSettingsChange(true)}
            disabled={!hasOrgAiSettings}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-sm">Use AI Analytics settings</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use the provider & API key from{' '}
              <Link to="/superadmin/ai-analytics" className="text-primary underline">
                AI Analytics → AI Settings
              </Link>
              {hasOrgAiSettings ? ' (configured ✓)' : ' (not configured yet)'}
            </p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="keySource"
            checked={!useOrgAiSettings}
            onChange={() => onUseOrgAiSettingsChange(false)}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-sm">WhatsApp-specific API key</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter your own key below, or leave blank to use the platform key.
            </p>
          </div>
        </label>
      </div>

      {!useOrgAiSettings && (
        <div className="rounded-lg border p-4 space-y-3">
          <Label>Provider (for your API key)</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PROVIDER_LABELS) as AIProviderId[]).map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={selectedProvider === id ? 'default' : 'outline'}
                onClick={() => onSelectProvider(id)}
              >
                {PROVIDER_LABELS[id]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {visibleGroups.map((group) => (
        <div key={group.provider} className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {group.provider}
          </h3>
          <div className="space-y-3">
            {group.models.map((model) => (
              <label
                key={model.id}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedModelId === model.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="aiModel"
                  checked={selectedModelId === model.id}
                  onChange={() => {
                    onSelectModel(model.id);
                    if (group.providerId) onSelectProvider(group.providerId as AIProviderId);
                  }}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{model.name}</span>
                    {model.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {model.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{model.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cost: {model.costPer1kTokens}/1k tokens
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      {!useOrgAiSettings && (
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <Label>Your {PROVIDER_LABELS[selectedProvider]} API Key (optional)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Billing goes to your account. Leave blank to use the platform OpenRouter key.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type={showKey && keyDirty ? 'text' : 'password'}
              value={keyDirty ? openRouterKey : maskedKey}
              onChange={(e) => {
                onOpenRouterKeyChange(e.target.value);
                onKeyDirtyChange(true);
              }}
              placeholder={hasOwnKey ? 'Enter new key to replace' : 'Paste API key...'}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowKey((v) => !v)}
              disabled={!keyDirty}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {hasOwnKey && (
              <Button type="button" variant="outline" onClick={onClearKey}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIModelSelector;
