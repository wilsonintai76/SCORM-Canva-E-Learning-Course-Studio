import { AiProviderId } from './aiSettings';

const KEY_PREFIX = 'scorm_canva_ai_key_';

function webKey(provider: AiProviderId): string {
  return `${KEY_PREFIX}${provider}`;
}

/**
 * API keys are stored in the OS-encrypted desktop secret store.
 * A plain browser has no keychain, so it falls back to localStorage.
 */
export async function loadApiKey(provider: AiProviderId): Promise<string> {
  const bridge = typeof window !== 'undefined' ? window.desktop : undefined;
  if (bridge?.secretGet) {
    try {
      const stored = await bridge.secretGet(provider);
      if (stored) return stored;
    } catch {
      // fall through to web storage
    }
  }

  if (typeof localStorage === 'undefined') return '';
  try {
    return localStorage.getItem(webKey(provider)) ?? '';
  } catch {
    return '';
  }
}

export interface SaveKeyResult {
  ok: boolean;
  encrypted: boolean;
  storedInBrowser: boolean;
}

export async function saveApiKey(provider: AiProviderId, key: string): Promise<SaveKeyResult> {
  const bridge = typeof window !== 'undefined' ? window.desktop : undefined;
  if (bridge?.secretSet) {
    const result = await bridge.secretSet(provider, key);
    return { ok: result.ok, encrypted: Boolean(result.encrypted), storedInBrowser: false };
  }

  if (typeof localStorage !== 'undefined') {
    try {
      if (key) localStorage.setItem(webKey(provider), key);
      else localStorage.removeItem(webKey(provider));
      return { ok: true, encrypted: false, storedInBrowser: true };
    } catch {
      return { ok: false, encrypted: false, storedInBrowser: true };
    }
  }

  return { ok: false, encrypted: false, storedInBrowser: false };
}
