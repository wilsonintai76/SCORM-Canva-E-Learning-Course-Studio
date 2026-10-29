import test from 'node:test';
import assert from 'node:assert/strict';
import { globalCourseStore } from './courseStore';
import { CYBERSECURITY_COURSE } from '../data/templates';

test('setSnapToGrid and setGridSize update state properly', () => {
  globalCourseStore.setSnapToGrid(true);
  assert.equal(globalCourseStore.getState().isSnapToGridEnabled, true);

  globalCourseStore.setGridSize(20);
  assert.equal(globalCourseStore.getState().gridSize, 20);

  globalCourseStore.setSnapToGrid(false);
  assert.equal(globalCourseStore.getState().isSnapToGridEnabled, false);
});

test('groupNodes and ungroupNodes bind and unbind multiple nodes', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const page = globalCourseStore.getState().course.pages[0];
  const node1 = page.nodes[0];
  const node2 = page.nodes[1];

  assert.ok(node1 && node2);
  assert.equal(node1.groupId, undefined);
  assert.equal(node2.groupId, undefined);

  // Group node1 and node2
  globalCourseStore.groupNodes([node1.id, node2.id]);

  const updatedNodes = globalCourseStore.getState().course.pages[0].nodes;
  const g1 = updatedNodes[0].groupId;
  const g2 = updatedNodes[1].groupId;

  assert.ok(g1 && g1.startsWith('group_'));
  assert.equal(g1, g2);

  // Ungroup nodes
  globalCourseStore.ungroupNodes(g1);
  const ungroupedNodes = globalCourseStore.getState().course.pages[0].nodes;
  assert.equal(ungroupedNodes[0].groupId, undefined);
  assert.equal(ungroupedNodes[1].groupId, undefined);
});

test('undo and redo revert group and ungroup actions', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const page = globalCourseStore.getState().course.pages[0];
  const node1 = page.nodes[0];
  const node2 = page.nodes[1];

  // Action: Group
  globalCourseStore.groupNodes([node1.id, node2.id]);
  const assignedGroup = globalCourseStore.getState().course.pages[0].nodes[0].groupId;
  assert.ok(assignedGroup);

  // Undo group
  globalCourseStore.undo();
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].groupId, undefined);

  // Redo group
  globalCourseStore.redo();
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].groupId, assignedGroup);
});
