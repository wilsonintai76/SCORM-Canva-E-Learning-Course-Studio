import test from 'node:test';
import assert from 'node:assert/strict';
import { SLIDE_LAYOUTS } from './slideLayouts';

test('SLIDE_LAYOUTS provides intro, content, quiz, and conclusion categories', () => {
  const categories = new Set(SLIDE_LAYOUTS.map((l) => l.category));
  assert.ok(categories.has('intro'));
  assert.ok(categories.has('content'));
  assert.ok(categories.has('quiz'));
  assert.ok(categories.has('conclusion'));
});

test('every slide layout has valid background and non-empty nodes', () => {
  assert.ok(SLIDE_LAYOUTS.length >= 4);

  SLIDE_LAYOUTS.forEach((layout) => {
    assert.ok(layout.id.length > 0);
    assert.ok(layout.title.length > 0);
    assert.ok(layout.background.value.length > 0);
    assert.ok(layout.nodes.length > 0);

    // Verify node properties
    layout.nodes.forEach((node) => {
      assert.ok(['text', 'image', 'quiz', 'shape', 'callout'].includes(node.type));
      assert.ok(typeof node.x === 'number' && node.x >= 0);
      assert.ok(typeof node.y === 'number' && node.y >= 0);
      assert.ok(typeof node.width === 'number' && node.width > 0);
      assert.ok(typeof node.height === 'number' && node.height > 0);
    });
  });
});
