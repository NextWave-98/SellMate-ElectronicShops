export interface ModelBadge {
  icon: string;
  name: string;
  color: 'purple' | 'green' | 'blue' | 'orange' | 'gray';
}

const BADGES: Record<string, ModelBadge> = {
  'anthropic/claude-haiku-4-5': { icon: '🤖', name: 'Claude Haiku', color: 'purple' },
  'anthropic/claude-sonnet-4-5': { icon: '🤖', name: 'Claude Sonnet', color: 'purple' },
  'openai/gpt-4o-mini': { icon: '🟢', name: 'GPT-4o Mini', color: 'green' },
  'openai/gpt-4o': { icon: '🟢', name: 'GPT-4o', color: 'green' },
  'google/gemini-flash-1.5': { icon: '🔵', name: 'Gemini Flash', color: 'blue' },
  'google/gemini-pro-1.5': { icon: '🔵', name: 'Gemini Pro', color: 'blue' },
  'x-ai/grok-beta': { icon: '⚡', name: 'Grok', color: 'orange' },
};

const COLOR_CLASSES: Record<ModelBadge['color'], string> = {
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-gray-100 text-gray-700',
};

export function getModelBadge(aiModel: string | null): ModelBadge | null {
  if (!aiModel) return null;
  return BADGES[aiModel] ?? { icon: '🤖', name: 'AI', color: 'gray' };
}

export function getModelBadgeClasses(color: ModelBadge['color']): string {
  return COLOR_CLASSES[color];
}
