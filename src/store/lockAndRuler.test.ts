import test from 'node:test';
import assert from 'node:assert/strict';
import { globalCourseStore } from './courseStore';
import { CYBERSECURITY_COURSE } from '../data/templates';

test('toggleLockNode locks and unlocks canvas nodes', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const page = globalCourseStore.getState().course.pages[0];
  const node = page.nodes[0];

  assert.equal(node.isLocked, undefined);

  // Lock node
  globalCourseStore.toggleLockNode(node.id);
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].isLocked, true);

  // Unlock node
  globalCourseStore.toggleLockNode(node.id);
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].isLocked, false);
});

test('undo and redo revert lock actions', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const node = globalCourseStore.getState().course.pages[0].nodes[0];

  globalCourseStore.toggleLockNode(node.id);
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].isLocked, true);

  // Undo lock
  globalCourseStore.undo();
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].isLocked, undefined);

  // Redo lock
  globalCourseStore.redo();
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].isLocked, true);
});
