import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_AI_SETTINGS,
  maskApiKey,
  providerInfo,
  resolveAiSettings,
  validateAiSettings,
} from './aiSettings';

test('resolveAiSettings fills provider defaults for a fresh install', () => {
  const settings = resolveAiSettings(null);

  assert.equal(settings.provider, 'gemini');
  assert.equal(settings.baseUrl, DEFAULT_AI_SETTINGS.baseUrl);
  assert.equal(settings.model, DEFAULT_AI_SETTINGS.model);
});

test('switching provider supplies that provider defaults', () => {
  const ollama = resolveAiSettings({ provider: 'ollama' });

  assert.equal(ollama.model, 'llama3.1');
  assert.equal(providerInfo('ollama').requiresKey, false);
  assert.equal(providerInfo('ollama').isLocal, true);
});

test('custom values override defaults', () => {
  const settings = resolveAiSettings({
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    model: 'qwen2.5-coder',
  });

  assert.equal(settings.baseUrl, 'http://localhost:1234/v1');
  assert.equal(settings.model, 'qwen2.5-coder');
});

test('unknown providers fall back instead of crashing', () => {
  const settings = resolveAiSettings({ provider: 'not-a-provider' as never });

  assert.equal(settings.provider, 'gemini');
});

test('cloud providers require a key, local ones do not', () => {
  assert.equal(validateAiSettings(resolveAiSettings({ provider: 'gemini' }), '').ok, false);
  assert.equal(validateAiSettings(resolveAiSettings({ provider: 'deepseek' }), '   ').ok, false);
  assert.equal(validateAiSettings(resolveAiSettings({ provider: 'ollama' }), '').ok, true);
});

test('plain http is only allowed for local endpoints', () => {
  const remote = resolveAiSettings({
    provider: 'openai-compatible',
    baseUrl: 'http://example.com/v1',
    model: 'some-model',
  });
  const local = resolveAiSettings({
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    model: 'some-model',
  });

  assert.equal(validateAiSettings(remote, 'k').ok, false);
  assert.equal(validateAiSettings(local, '').ok, true);
});

test('a missing model or malformed URL is rejected', () => {
  const noModel = { provider: 'ollama' as const, baseUrl: 'http://localhost:11434', model: '   ' };
  const badUrl = { provider: 'ollama' as const, baseUrl: 'not a url', model: 'llama3.1' };

  assert.equal(validateAiSettings(noModel, '').ok, false);
  assert.equal(validateAiSettings(badUrl, '').ok, false);
});

test('maskApiKey never reveals the middle of the key', () => {
  assert.equal(maskApiKey(''), '');
  assert.equal(maskApiKey('short'), '••••••••');
  const masked = maskApiKey('sk-1234567890abcdef');
  assert.ok(masked.startsWith('sk-1'));
  assert.ok(!masked.includes('234567890abc'));
});
