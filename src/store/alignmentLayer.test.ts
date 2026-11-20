import test from 'node:test';
import assert from 'node:assert/strict';
import { globalCourseStore } from './courseStore';
import { CYBERSECURITY_COURSE } from '../data/templates';

test('alignNode centers and aligns elements correctly', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const page = globalCourseStore.getState().course.pages[0];
  const node = page.nodes[0]; // width: 140, height: 32

  // Align Left -> X = 0
  globalCourseStore.alignNode(node.id, 'left');
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].x, 0);

  // Align Center-X -> X = (960 - 140) / 2 = 410
  globalCourseStore.alignNode(node.id, 'center-x');
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].x, 410);

  // Align Right -> X = 960 - 140 = 820
  globalCourseStore.alignNode(node.id, 'right');
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].x, 820);

  // Align Top -> Y = 0
  globalCourseStore.alignNode(node.id, 'top');
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].y, 0);

  // Align Center-Y -> Y = (540 - 32) / 2 = 254
  globalCourseStore.alignNode(node.id, 'center-y');
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].y, 254);
});

test('moveUp and moveDown shift layer zIndex properly', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const node = globalCourseStore.getState().course.pages[0].nodes[0];
  const initialZ = node.zIndex || 1;

  globalCourseStore.moveUp(node.id);
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].zIndex, initialZ + 1);

  globalCourseStore.moveDown(node.id);
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].zIndex, initialZ);
});

test('undo and redo revert alignment and layer changes', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const initialX = globalCourseStore.getState().course.pages[0].nodes[0].x;

  globalCourseStore.alignNode(globalCourseStore.getState().course.pages[0].nodes[0].id, 'left');
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].x, 0);

  // Undo reverts to initial X
  globalCourseStore.undo();
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].x, initialX);

  // Redo re-applies Left alignment
  globalCourseStore.redo();
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].x, 0);
});

test('bringToFront and sendToBack maintain strict zIndex ordering across multiple elements', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const nodes = globalCourseStore.getState().course.pages[0].nodes;
  assert.ok(nodes.length >= 3);

  const first = nodes[0];
  const second = nodes[1];
  const third = nodes[2];

  // Bring first to front -> strictly greater than every other node
  globalCourseStore.bringToFront(first.id);
  const afterFront = globalCourseStore.getState().course.pages[0].nodes;
  const firstAfterFront = afterFront.find((n) => n.id === first.id)!;
  const maxOtherAfterFront = Math.max(
    ...afterFront.filter((n) => n.id !== first.id).map((n) => n.zIndex ?? 1)
  );
  assert.ok((firstAfterFront.zIndex ?? 1) > maxOtherAfterFront);

  // Send second to back, then send third to back -> third must stay strictly behind second even at 0
  globalCourseStore.sendToBack(second.id);
  globalCourseStore.sendToBack(third.id);
  const afterBack = globalCourseStore.getState().course.pages[0].nodes;
  const thirdAfterBack = afterBack.find((n) => n.id === third.id)!;
  const minOtherAfterBack = Math.min(
    ...afterBack.filter((n) => n.id !== third.id).map((n) => n.zIndex ?? 1)
  );
  assert.ok((thirdAfterBack.zIndex ?? 1) < minOtherAfterBack);

  // Moving forward from zIndex 0 increments cleanly to 1
  globalCourseStore.moveUp(third.id);
  const thirdAfterMoveUp = globalCourseStore
    .getState()
    .course.pages[0].nodes.find((n) => n.id === third.id)!;
  assert.equal(thirdAfterMoveUp.zIndex, 1);
});
