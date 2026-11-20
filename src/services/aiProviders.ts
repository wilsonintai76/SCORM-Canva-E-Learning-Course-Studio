import { AiProviderId, AiSettings, isLocalEndpoint, providerInfo } from './aiSettings';

export interface AiHttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** Local models can take minutes to emit a full course, so they get a longer budget. */
export const REMOTE_TIMEOUT_MS = 120000;
export const LOCAL_TIMEOUT_MS = 300000;

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

const OPENAI_FAMILY: AiProviderId[] = ['deepseek', 'openai', 'openai-compatible'];

/** Builds the provider-specific HTTP call. Pure so it can be asserted in tests. */
export function buildJsonRequest(
  settings: AiSettings,
  apiKey: string,
  prompt: string
): AiHttpRequest {
  const model = settings.model.trim();
  const key = apiKey.trim();

  if (settings.provider === 'gemini') {
    return {
      url: joinUrl(settings.baseUrl, `/models/${encodeURIComponent(model)}:generateContent`),
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    };
  }

  if (settings.provider === 'ollama') {
    return {
      url: joinUrl(settings.baseUrl, '/api/chat'),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json',
        options: { temperature: 0.7 },
      }),
    };
  }

  if (OPENAI_FAMILY.includes(settings.provider)) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (key) headers.authorization = `Bearer ${key}`;
    return {
      url: joinUrl(settings.baseUrl, '/chat/completions'),
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    };
  }

  throw new Error(`Unsupported AI provider: ${settings.provider}`);
}

function readPath(value: unknown, path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Pulls the assistant text out of each provider's response envelope. */
export function extractContent(provider: AiProviderId, payload: unknown): string {
  const errorMessage = readPath(payload, ['error', 'message']);
  if (typeof errorMessage === 'string' && errorMessage) {
    throw new Error(errorMessage);
  }

  if (provider === 'gemini') {
    const parts = readPath(payload, ['candidates', '0', 'content', 'parts']);
    if (Array.isArray(parts)) {
      return parts
        .map((part) => (typeof readPath(part, ['text']) === 'string' ? (readPath(part, ['text']) as string) : ''))
        .join('')
        .trim();
    }
    return '';
  }

  if (provider === 'ollama') {
    const content = readPath(payload, ['message', 'content']);
    return typeof content === 'string' ? content.trim() : '';
  }

  const content = readPath(payload, ['choices', '0', 'message', 'content']);
  return typeof content === 'string' ? content.trim() : '';
}

/** Models sometimes wrap JSON in markdown fences despite instructions. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('The AI returned an empty response.');

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the outermost JSON object.
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('The AI response was not valid JSON.');
  }
}

export interface AiTransportResult {
  status: number;
  text: string;
}

export interface AiTransportRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers: Record<string, string>;
  body: string;
  timeoutMs?: number;
}

/** Sends the request through the desktop proxy when available, otherwise plain fetch. */
export async function sendAiRequest(request: AiHttpRequest, timeoutMs = REMOTE_TIMEOUT_MS): Promise<AiTransportResult> {
  const bridge = typeof window !== 'undefined' ? window.desktop : undefined;

  if (bridge?.aiRequest) {
    const result = await bridge.aiRequest({
      url: request.url,
      method: 'POST',
      headers: request.headers,
      body: request.body,
      timeoutMs,
    });
    return { status: result.status, text: result.text };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      signal: controller?.signal,
    });
    return { status: response.status, text: await response.text() };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Lists locally installed Ollama models so the UI can offer real names. */
export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/tags`;
  const bridge = typeof window !== 'undefined' ? window.desktop : undefined;

  let text = '';
  if (bridge?.aiRequest) {
    const result = await bridge.aiRequest({ url, method: 'GET', headers: {}, body: '', timeoutMs: 8000 });
    if (result.status < 200 || result.status >= 300) return [];
    text = result.text;
  } else {
    const response = await fetch(url);
    if (!response.ok) return [];
    text = await response.text();
  }

  try {
    const parsed = JSON.parse(text) as { models?: { name?: unknown }[] };
    return (parsed.models ?? [])
      .map((model) => (typeof model.name === 'string' ? model.name : ''))
      .filter((name) => name.length > 0);
  } catch {
    return [];
  }
}

export async function requestGeneratedJson(
  settings: AiSettings,
  apiKey: string,
  prompt: string
): Promise<unknown> {
  const request = buildJsonRequest(settings, apiKey, prompt);
  const timeoutMs = isLocalEndpoint(settings.baseUrl) ? LOCAL_TIMEOUT_MS : REMOTE_TIMEOUT_MS;
  const { status, text } = await sendAiRequest(request, timeoutMs);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  if (status < 200 || status >= 300) {
    const message =
      (payload && typeof payload === 'object'
        ? readPath(payload, ['error', 'message'])
        : null) || text.slice(0, 300) || `HTTP ${status}`;
    throw new Error(`${providerInfo(settings.provider).label} request failed (${status}): ${message}`);
  }

  if (!payload) throw new Error('The AI endpoint returned a non-JSON response.');

  const content = extractContent(settings.provider, payload);
  return parseJsonLoose(content);
}
