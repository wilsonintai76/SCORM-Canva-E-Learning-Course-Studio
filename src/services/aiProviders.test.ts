import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAiSettings } from './aiSettings';
import { buildJsonRequest, extractContent, parseJsonLoose } from './aiProviders';

test('gemini uses generateContent with the key header and JSON mime type', () => {
  const request = buildJsonRequest(
    resolveAiSettings({ provider: 'gemini', model: 'gemini-2.5-flash' }),
    'AIza-test',
    'make a course'
  );
  const body = JSON.parse(request.body);

  assert.equal(
    request.url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
  );
  assert.equal(request.headers['x-goog-api-key'], 'AIza-test');
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.equal(body.contents[0].parts[0].text, 'make a course');
});

test('deepseek uses OpenAI chat completions with a bearer token', () => {
  const request = buildJsonRequest(resolveAiSettings({ provider: 'deepseek' }), 'sk-deep', 'prompt');
  const body = JSON.parse(request.body);

  assert.equal(request.url, 'https://api.deepseek.com/v1/chat/completions');
  assert.equal(request.headers.authorization, 'Bearer sk-deep');
  assert.equal(body.model, 'deepseek-chat');
  assert.deepEqual(body.response_format, { type: 'json_object' });
});

test('ollama targets the local chat API without auth or trailing slash issues', () => {
  const settings = resolveAiSettings({ provider: 'ollama', baseUrl: 'http://localhost:11434/' });
  const request = buildJsonRequest(settings, '', 'prompt');
  const body = JSON.parse(request.body);

  assert.equal(request.url, 'http://localhost:11434/api/chat');
  assert.equal(request.headers.authorization, undefined);
  assert.equal(body.stream, false);
  assert.equal(body.format, 'json');
});

test('openai-compatible omits auth when no key is supplied', () => {
  const settings = resolveAiSettings({
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    model: 'qwen2.5-coder',
  });
  const request = buildJsonRequest(settings, '', 'prompt');

  assert.equal(request.url, 'http://localhost:1234/v1/chat/completions');
  assert.equal(request.headers.authorization, undefined);
});

test('extractContent reads each provider response shape', () => {
  assert.equal(
    extractContent('gemini', { candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] }),
    '{"a":1}'
  );
  assert.equal(extractContent('ollama', { message: { content: '{"b":2}' } }), '{"b":2}');
  assert.equal(extractContent('deepseek', { choices: [{ message: { content: '{"c":3}' } }] }), '{"c":3}');
  assert.equal(extractContent('openai', { choices: [{ message: { content: ' {"d":4} ' } }] }), '{"d":4}');
});

test('provider error envelopes surface as readable errors', () => {
  assert.throws(
    () => extractContent('gemini', { error: { message: 'API key not valid' } }),
    /API key not valid/
  );
});

test('parseJsonLoose tolerates markdown fences and surrounding prose', () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Here you go: {"a":2} — enjoy'), { a: 2 });
  assert.throws(() => parseJsonLoose('   '), /empty/i);
  assert.throws(() => parseJsonLoose('not json at all'), /valid JSON/i);
});
