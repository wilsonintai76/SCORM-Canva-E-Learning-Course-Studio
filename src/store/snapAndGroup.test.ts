import test from 'node:test';
import assert from 'node:assert/strict';
import { globalCourseStore } from './courseStore';
import { CYBERSECURITY_COURSE } from '../data/templates';
import { calculateSnapping, computeCompositeBounds } from '../utils/snappingEngine';

test('setSnapToGrid, setSmartGuidesEnabled, and setGridSize update state properly', () => {
  globalCourseStore.setSnapToGrid(true);
  assert.equal(globalCourseStore.getState().isSnapToGridEnabled, true);

  globalCourseStore.setSmartGuidesEnabled(false);
  assert.equal(globalCourseStore.getState().isSmartGuidesEnabled, false);

  globalCourseStore.setSmartGuidesEnabled(true);
  assert.equal(globalCourseStore.getState().isSmartGuidesEnabled, true);

  globalCourseStore.setGridSize(20);
  assert.equal(globalCourseStore.getState().gridSize, 20);

  globalCourseStore.setSnapToGrid(false);
  assert.equal(globalCourseStore.getState().isSnapToGridEnabled, false);
});

test('groupNodes and ungroupNodes bind and unbind GroupedObject metadata and node groupIds', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const page = globalCourseStore.getState().course.pages[0];
  const node1 = page.nodes[0];
  const node2 = page.nodes[1];

  assert.ok(node1 && node2);
  assert.equal(node1.groupId, undefined);
  assert.equal(node2.groupId, undefined);

  // Group node1 and node2 into a named GroupedObject
  const createdGroup = globalCourseStore.groupNodes([node1.id, node2.id], 'Hero Callout Cluster');
  assert.ok(createdGroup);
  assert.equal(createdGroup.name, 'Hero Callout Cluster');

  const updatedPage = globalCourseStore.getState().course.pages[0];
  const g1 = updatedPage.nodes[0].groupId;
  const g2 = updatedPage.nodes[1].groupId;

  assert.ok(g1 && g1.startsWith('group_'));
  assert.equal(g1, g2);
  assert.ok(updatedPage.groups?.some((g) => g.id === g1 && g.name === 'Hero Callout Cluster'));

  // Rename GroupedObject
  globalCourseStore.renameGroup(g1!, 'Updated Hero Cluster');
  assert.equal(
    globalCourseStore.getState().course.pages[0].groups?.find((g) => g.id === g1)?.name,
    'Updated Hero Cluster'
  );

  // Ungroup nodes
  globalCourseStore.ungroupNodes(g1);
  const ungroupedPage = globalCourseStore.getState().course.pages[0];
  assert.equal(ungroupedPage.nodes[0].groupId, undefined);
  assert.equal(ungroupedPage.nodes[1].groupId, undefined);
  assert.equal(ungroupedPage.groups?.length || 0, 0);
});

test('GroupedObject supports simultaneous moveGroup, scaleGroup, and deep-selection without ungrouping', () => {
  globalCourseStore.loadCourse(CYBERSECURITY_COURSE);
  const n1 = globalCourseStore.addNode('shape', { x: 100, y: 100 }, { width: 100, height: 80 });
  const n2 = globalCourseStore.addNode('text', { x: 220, y: 120 }, { width: 120, height: 40, fontSize: 16 } as any);

  const grp = globalCourseStore.groupNodes([n1.id, n2.id], 'Card Group');
  assert.ok(grp);

  // Simultaneous movement
  globalCourseStore.moveGroup(grp!.id, 40, 25);
  let page = globalCourseStore.getState().course.pages[0];
  let m1 = page.nodes.find((n) => n.id === n1.id)!;
  let m2 = page.nodes.find((n) => n.id === n2.id)!;
  assert.equal(m1.x, 140);
  assert.equal(m1.y, 125);
  assert.equal(m2.x, 260);
  assert.equal(m2.y, 145);

  // Simultaneous proportional scaling
  globalCourseStore.scaleGroup(grp!.id, 1.5);
  page = globalCourseStore.getState().course.pages[0];
  m1 = page.nodes.find((n) => n.id === n1.id)!;
  m2 = page.nodes.find((n) => n.id === n2.id)!;
  assert.ok(m1.width > 100);
  assert.ok(m2.width > 120);

  // Deep-selection of individual member preserves group membership
  globalCourseStore.deepSelectNode(n2.id);
  let state = globalCourseStore.getState();
  assert.deepEqual(state.selectedNodeIds, [n2.id]);
  assert.equal(state.deepSelectedNodeId, n2.id);
  assert.equal(state.deepSelectedGroupId, grp!.id);
  assert.equal(state.course.pages[0].nodes.find((n) => n.id === n2.id)?.groupId, grp!.id);

  // Moving deep-selected node individually only shifts that child
  const m1BeforeX = m1.x;
  globalCourseStore.updateNode(n2.id, { x: m2.x + 15 });
  page = globalCourseStore.getState().course.pages[0];
  assert.equal(page.nodes.find((n) => n.id === n1.id)?.x, m1BeforeX);
  assert.equal(page.nodes.find((n) => n.id === n2.id)?.x, m2.x + 15);

  // Exit deep-selection restores full group selection
  globalCourseStore.exitDeepSelect();
  state = globalCourseStore.getState();
  assert.equal(state.deepSelectedNodeId, null);
  assert.equal(state.deepSelectedGroupId, null);
  assert.deepEqual([...state.selectedNodeIds].sort(), [n1.id, n2.id].sort());
});

test('calculateSnapping aligns single and composite GroupedObject bounds to Smart Guides and Grid', () => {
  const otherNodes = [
    { id: 'target_1', x: 200, y: 120, width: 140, height: 80, type: 'shape' },
  ];

  // Composite bounds check for a 2-node group
  const bounds = computeCompositeBounds([
    { x: 50, y: 50, width: 80, height: 60 },
    { x: 110, y: 80, width: 90, height: 70 },
  ]);
  assert.deepEqual(bounds, { x: 50, y: 50, width: 150, height: 100 });

  // Smart Guide component edge alignment (left edge ~203 snaps to 200)
  const componentSnap = calculateSnapping(
    203,
    124,
    150,
    100,
    otherNodes,
    960,
    540,
    20,
    true,
    8,
    [],
    true
  );
  assert.equal(componentSnap.x, 200);
  assert.equal(componentSnap.y, 120);
  assert.equal(componentSnap.guidesX[0]?.type, 'component');
  assert.equal(componentSnap.guidesY[0]?.type, 'component');

  // Grid snapping when Smart Guides are disabled
  const gridOnlySnap = calculateSnapping(
    207,
    133,
    100,
    60,
    otherNodes,
    960,
    540,
    20,
    true,
    8,
    [],
    false
  );
  assert.equal(gridOnlySnap.x, 200);
  assert.equal(gridOnlySnap.y, 140);
  assert.equal(gridOnlySnap.guidesX[0]?.type, 'grid');
  assert.equal(gridOnlySnap.guidesY[0]?.type, 'grid');
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
  assert.equal(globalCourseStore.getState().course.pages[0].groups?.length || 0, 0);

  // Redo group
  globalCourseStore.redo();
  assert.equal(globalCourseStore.getState().course.pages[0].nodes[0].groupId, assignedGroup);
  assert.equal(globalCourseStore.getState().course.pages[0].groups?.length, 1);
});
