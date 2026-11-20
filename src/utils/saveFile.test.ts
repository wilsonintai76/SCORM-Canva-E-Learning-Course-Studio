import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { saveBlobWithDialog, saveTextWithDialog } from './saveFile';

type SaveCall = { filename: string; bytes: Uint8Array };

function stubDesktop(behaviour: { canceled?: boolean; error?: string; throw?: Error } = {}) {
  const calls: SaveCall[] = [];
  const bridge = {
    saveFile: async (filename: string, bytes: Uint8Array) => {
      if (behaviour.throw) throw behaviour.throw;
      calls.push({ filename, bytes });
      return behaviour.canceled
        ? { canceled: true, error: behaviour.error }
        : { canceled: false, filePath: `C:\\out\\${filename}`, error: behaviour.error };
    },
  };
  (globalThis as unknown as { window: unknown }).window = { desktop: bridge };
  return calls;
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

test('routes saves through the desktop bridge instead of a browser download', async () => {
  const calls = stubDesktop();
  const blob = new Blob([new TextEncoder().encode('course-bytes')], { type: 'application/zip' });

  const outcome = await saveBlobWithDialog(blob, 'course_v1.2.zip');

  assert.equal(outcome, 'native');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].filename, 'course_v1.2.zip');
  assert.equal(new TextDecoder().decode(calls[0].bytes), 'course-bytes');
});

test('reports cancellation without writing anything', async () => {
  const calls = stubDesktop({ canceled: true });

  const outcome = await saveBlobWithDialog(new Blob(['x']), 'course.json');

  assert.equal(outcome, 'cancelled');
  assert.equal(calls.length, 1, 'the dialog request still reaches the bridge');
});

test('surfaces handler errors as failures', async () => {
  stubDesktop({ error: 'Invalid file payload' });

  const outcome = await saveBlobWithDialog(new Blob(['x']), 'course.zip');

  assert.equal(outcome, 'failed');
});

test('saveTextWithDialog sends utf-8 encoded json', async () => {
  const calls = stubDesktop();

  await saveTextWithDialog('{"a":1}', 'project_backup.json');

  assert.equal(calls[0].filename, 'project_backup.json');
  assert.equal(new TextDecoder().decode(calls[0].bytes), '{"a":1}');
});
