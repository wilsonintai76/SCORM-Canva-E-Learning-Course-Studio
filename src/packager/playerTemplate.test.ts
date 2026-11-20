import test from 'node:test';
import assert from 'node:assert/strict';
import { CYBERSECURITY_COURSE } from '../data/templates';
import { generateStandalonePlayerHtml } from './playerTemplate';

const html = generateStandalonePlayerHtml(CYBERSECURITY_COURSE);

test('standalone player ships the SCORM 1.2 runtime API', () => {
  assert.ok(html.includes('LMSSetValue'));
  assert.ok(html.includes('LMSGetValue'));
  assert.ok(html.includes('suspend_data'));
  assert.ok(html.includes('course-manifest'));
});

test('the generated runtime script compiles without syntax errors', () => {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'runtime script not found');
  // Compiles (does not execute) the generated browser script.
  assert.doesNotThrow(() => new Function(match![1]));
});

test('course JSON is safely embedded', () => {
  assert.ok(html.includes('id="course-manifest"'));
  assert.ok(!html.includes('</script></script>'));
});
