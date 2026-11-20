export type AiProviderId = 'gemini' | 'deepseek' | 'openai' | 'ollama' | 'openai-compatible';

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;
  description: string;
  baseUrl: string;
  model: string;
  requiresKey: boolean;
  /** Local providers run on the user's machine and keep working offline. */
  isLocal: boolean;
}

export interface AiSettings {
  provider: AiProviderId;
  baseUrl: string;
  model: string;
}

export const AI_SETTINGS_STORAGE_KEY = 'scorm_canva_ai_settings';

export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Free tier available — best structured output for course generation.',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
    requiresKey: true,
    isLocal: false,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Low-cost API with strong reasoning. OpenAI-compatible.',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    requiresKey: true,
    isLocal: false,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT models via an OpenAI API key.',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    requiresKey: true,
    isLocal: false,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    description: 'Runs fully offline on this machine. No API key needed.',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
    requiresKey: false,
    isLocal: true,
  },
  {
    id: 'openai-compatible',
    label: 'Custom endpoint',
    description: 'Any OpenAI-compatible server: LM Studio, vLLM, Azure, OpenRouter.',
    baseUrl: 'http://localhost:1234/v1',
    model: '',
    requiresKey: false,
    isLocal: false,
  },
];

export function providerInfo(id: AiProviderId): AiProviderInfo {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'gemini',
  baseUrl: providerInfo('gemini').baseUrl,
  model: providerInfo('gemini').model,
};

/** Fills in provider defaults so a partially configured install still works. */
export function resolveAiSettings(partial?: Partial<AiSettings> | null): AiSettings {
  const provider = (partial?.provider ?? DEFAULT_AI_SETTINGS.provider) as AiProviderId;
  const known = AI_PROVIDERS.some((p) => p.id === provider);
  const info = providerInfo(known ? provider : DEFAULT_AI_SETTINGS.provider);
  const baseUrl = typeof partial?.baseUrl === 'string' && partial.baseUrl.trim() ? partial.baseUrl.trim() : info.baseUrl;
  const model = typeof partial?.model === 'string' && partial.model.trim() ? partial.model.trim() : info.model;
  return { provider: info.id, baseUrl, model };
}

export function isLocalEndpoint(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
  } catch {
    return false;
  }
}

export interface AiSettingsValidation {
  ok: boolean;
  error?: string;
}

export function validateAiSettings(settings: AiSettings, apiKey: string): AiSettingsValidation {
  const info = providerInfo(settings.provider);

  try {
    const url = new URL(settings.baseUrl);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalEndpoint(settings.baseUrl))) {
      return { ok: false, error: 'Use https:// for remote providers, or http:// only for a local server.' };
    }
  } catch {
    return { ok: false, error: 'Enter a valid base URL, e.g. https://api.deepseek.com/v1' };
  }

  if (!settings.model.trim()) {
    return { ok: false, error: 'Enter a model name, e.g. gpt-4o-mini or llama3.1' };
  }

  if (info.requiresKey && !apiKey.trim()) {
    return { ok: false, error: `${info.label} requires an API key.` };
  }

  return { ok: true };
}

export function loadAiSettings(): AiSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_AI_SETTINGS };
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    return resolveAiSettings(raw ? (JSON.parse(raw) as Partial<AiSettings>) : null);
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

/** Provider, model and URL are not secrets, so they live in plain storage. */
export function saveAiSettings(settings: AiSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      AI_SETTINGS_STORAGE_KEY,
      JSON.stringify({ provider: settings.provider, baseUrl: settings.baseUrl, model: settings.model })
    );
  } catch {
    // ignore quota errors — settings are not critical
  }
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return trimmed ? '••••••••' : '';
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
