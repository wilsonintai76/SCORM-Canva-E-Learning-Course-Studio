import test from 'node:test';
import assert from 'node:assert/strict';
import { globalCourseStore } from './courseStore';
import { CYBERSECURITY_COURSE } from '../data/templates';

test('distributeNodes equalizes gaps across three selected nodes', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const page = globalCourseStore.getState().course.pages[0];
  const ids = page.nodes.slice(0, 3).map((node) => node.id);
  globalCourseStore.updateNode(ids[0], { x: 0, y: 0, width: 100, height: 50 }, false);
  globalCourseStore.updateNode(ids[1], { x: 200, y: 0, width: 100, height: 50 }, false);
  globalCourseStore.updateNode(ids[2], { x: 500, y: 0, width: 100, height: 50 }, false);
  globalCourseStore.setSelectedNodeIds(ids);

  globalCourseStore.distributeNodes('horizontal', ids);

  // Span 600px holds 3 x 100px nodes, so each gap is 150px.
  const nodes = globalCourseStore.getState().course.pages[0].nodes;
  assert.equal(nodes.find((node) => node.id === ids[0])?.x, 0);
  assert.equal(nodes.find((node) => node.id === ids[1])?.x, 250);
  assert.equal(nodes.find((node) => node.id === ids[2])?.x, 500);
});

test('distributeNodes leaves fewer than three nodes untouched', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const page = globalCourseStore.getState().course.pages[0];
  const ids = page.nodes.slice(0, 2).map((node) => node.id);
  const before = page.nodes.filter((node) => ids.includes(node.id)).map((node) => node.x);

  globalCourseStore.distributeNodes('horizontal', ids);

  const after = globalCourseStore
    .getState()
    .course.pages[0].nodes.filter((node) => ids.includes(node.id))
    .map((node) => node.x);
  assert.deepEqual(after, before);
});
