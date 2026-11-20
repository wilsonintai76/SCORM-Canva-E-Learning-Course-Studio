import test from 'node:test';
import assert from 'node:assert/strict';
import { interpolateVariables } from './variableInterpolator';
import { calculateContrastRatio } from './accessibilityAuditor';
import { snapValueToGrid, calculateSnapping } from './snappingEngine';

test('interpolateVariables: replaces standard tokens', () => {
  const result = interpolateVariables('Welcome, {{userName}}!', [], { userName: 'Sarah Connor' });
  assert.equal(result, 'Welcome, Sarah Connor!');
});

test('interpolateVariables: handles whitespace around variable names', () => {
  const result = interpolateVariables('Your score is {{  quizScore  }}% on {{ completionDate }}.', [
    {
      id: 'v1',
      name: 'quizScore',
      type: 'number',
      defaultValue: '100',
      currentValue: '96',
    },
    {
      id: 'v2',
      name: 'completionDate',
      type: 'string',
      defaultValue: '2026-05-01',
    },
  ]);
  assert.equal(result, 'Your score is 96% on 2026-05-01.');
});

test('interpolateVariables: preserves unmatched tokens without error', () => {
  const input = 'Unknown variable {{unknownVar}} stays verbatim';
  const result = interpolateVariables(input);
  assert.equal(result, input);
});

test('calculateContrastRatio: black on white gives maximum contrast (~21:1)', () => {
  const ratio = calculateContrastRatio('#000000', '#ffffff');
  assert.ok(ratio >= 20.9 && ratio <= 21.1, `Expected ~21:1, got ${ratio}`);
});

test('calculateContrastRatio: identical colors give 1:1 contrast', () => {
  const ratio = calculateContrastRatio('#1e293b', '#1e293b');
  assert.equal(ratio, 1);
});

test('calculateContrastRatio: WCAG AA threshold check for dark slate on white', () => {
  const ratio = calculateContrastRatio('#0f172a', '#ffffff');
  // #0f172a is nearly black, passes WCAG AAA (>= 7.0)
  assert.ok(ratio >= 14.0, `Expected >= 14.0, got ${ratio}`);
});

test('snapValueToGrid: snaps to grid line within threshold', () => {
  const result1 = snapValueToGrid(103, 10, 5);
  assert.equal(result1.didSnap, true);
  assert.equal(result1.val, 100);

  const result2 = snapValueToGrid(107, 10, 5);
  assert.equal(result2.didSnap, true);
  assert.equal(result2.val, 110);
});

test('snapValueToGrid: does not snap when outside threshold', () => {
  const result = snapValueToGrid(105, 20, 3);
  assert.equal(result.didSnap, false);
  assert.equal(result.val, 105);
});

test('calculateSnapping: snaps to page edges when dragged nearby', () => {
  // Near left edge (e.g. x = 4)
  const snapLeft = calculateSnapping(4, 50, 100, 50, [], 960, 540, 10, false, 8);
  assert.equal(snapLeft.x, 0);
  assert.ok(snapLeft.guidesX.some((g: any) => g.label.includes('Page Left')));

  // Near right edge (x = 856 with width 100 on 960 canvas -> x + width = 956, within 4px of 960)
  const snapRight = calculateSnapping(856, 50, 100, 50, [], 960, 540, 10, false, 8);
  assert.equal(snapRight.x, 860); // 860 + 100 = 960
  assert.ok(snapRight.guidesX.some((g: any) => g.label.includes('Page Right')));
});

test('calculateSnapping: aligns to nearby other component', () => {
  const otherNode = { id: 'box1', x: 200, y: 150, width: 300, height: 100, type: 'shape' };

  // Dragging near other component's left edge (x = 203)
  const snapComponent = calculateSnapping(203, 50, 150, 50, [otherNode], 960, 540, 10, false, 8);
  assert.equal(snapComponent.x, 200);
  assert.ok(snapComponent.guidesX.some((g: any) => g.type === 'component'));
});

test('history tracking: pushUndo records history and supports undo and redo', async () => {
  const { globalCourseStore } = await import('../store/courseStore');
  
  const initialTitle = globalCourseStore.getState().course.title;
  assert.ok(initialTitle);

  // Push an undo point and change title
  globalCourseStore.pushUndo();
  assert.ok(globalCourseStore.getState().canUndo);
  assert.ok(globalCourseStore.getState().undoCount >= 1);

  const prevUndoCount = globalCourseStore.getState().undoCount;
  globalCourseStore.updateManifest({ title: 'Changed Course Title For Test' });
  assert.equal(globalCourseStore.getState().course.title, 'Changed Course Title For Test');

  // Trigger Undo
  globalCourseStore.undo();
  assert.equal(globalCourseStore.getState().course.title, initialTitle);
  assert.ok(globalCourseStore.getState().canRedo);
  assert.equal(globalCourseStore.getState().redoCount, 1);

  // Trigger Redo
  globalCourseStore.redo();
  assert.equal(globalCourseStore.getState().course.title, 'Changed Course Title For Test');
  assert.equal(globalCourseStore.getState().redoCount, 0);

  // Revert back so subsequent tests or state remain clean
  globalCourseStore.undo();
  assert.equal(globalCourseStore.getState().course.title, initialTitle);
});

test('alignSelected: vertically and horizontally aligns elements and snaps to baseline', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  const page = globalCourseStore.getState().course.pages[0];
  assert.ok(page);

  // Setup 2 test nodes on page
  const node1 = {
    id: 'test_node_a',
    type: 'shape' as const,
    shapeType: 'rect' as const,
    fill: '#3b82f6',
    opacity: 1,
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    zIndex: 1,
  };
  const node2 = {
    id: 'test_node_b',
    type: 'shape' as const,
    shapeType: 'rect' as const,
    fill: '#10b981',
    opacity: 1,
    x: 400,
    y: 150,
    width: 100,
    height: 80,
    zIndex: 2,
  };

  page.nodes.push(node1, node2);
  globalCourseStore.setSelectedNodeIds(['test_node_a', 'test_node_b']);

  // 1. Align Left: both elements should align to leftmost edge (x = 100)
  globalCourseStore.alignSelected('left');
  assert.equal(node1.x, 100);
  assert.equal(node2.x, 100);

  // 2. Align Top: both elements should align to topmost edge (y = 100)
  globalCourseStore.alignSelected('top');
  assert.equal(node1.y, 100);
  assert.equal(node2.y, 100);

  // 3. Snap to Baseline: bottom edges should align to common maximum baseline
  // node1: height 100, node2: height 80.
  // Move node2 down to y = 200 -> bottom = 280
  node2.y = 200;
  globalCourseStore.alignSelected('baseline');
  // Common baseline is max(node1.y + 100, node2.y + 80) = 280
  assert.equal(node1.y + node1.height, 280);
  assert.equal(node2.y + node2.height, 280);

  // Cleanup test nodes from page
  page.nodes = page.nodes.filter((n) => n.id !== 'test_node_a' && n.id !== 'test_node_b');
  globalCourseStore.setSelectedNodeIds([]);
});

test('validateQuizConfig: detects missing required fields in quiz configurations', async () => {
  const { validateQuizConfig } = await import('./quizValidator');

  // 1. Missing question prompt
  const missingQuestion = validateQuizConfig({
    question: '',
    options: [
      { text: 'A', isCorrect: true, feedback: 'Good' },
      { text: 'B', isCorrect: false, feedback: 'Bad' },
    ],
  });
  assert.equal(missingQuestion.isValid, false);
  assert.ok(missingQuestion.errors.some((e) => e.field === 'question'));

  // 2. Missing correct answer
  const noCorrectAnswer = validateQuizConfig({
    question: 'Which of the following is correct?',
    options: [
      { text: 'Option 1', isCorrect: false, feedback: 'No' },
      { text: 'Option 2', isCorrect: false, feedback: 'No' },
    ],
  });
  assert.equal(noCorrectAnswer.isValid, false);
  assert.ok(noCorrectAnswer.errors.some((e) => e.field === 'correctAnswers'));

  // 3. Missing feedback messages
  const missingFeedback = validateQuizConfig({
    question: 'What is phishing?',
    options: [
      { text: 'Deceptive attack', isCorrect: true, feedback: '' },
      { text: 'Fishing sport', isCorrect: false, feedback: '' },
    ],
  });
  assert.equal(missingFeedback.isValid, false);
  assert.ok(missingFeedback.errors.some((e) => e.field === 'feedback'));

  // 4. Incomplete options (less than 2)
  const singleOption = validateQuizConfig({
    question: 'Is this enough?',
    options: [{ text: 'Only one', isCorrect: true, feedback: 'Explanation' }],
  });
  assert.equal(singleOption.isValid, false);
  assert.ok(singleOption.errors.some((e) => e.field === 'options'));

  // 5. Blank option text
  const blankOptionText = validateQuizConfig({
    question: 'Valid question prompt?',
    options: [
      { text: '', isCorrect: true, feedback: 'Feedback here' },
      { text: 'Valid option', isCorrect: false, feedback: 'Feedback' },
    ],
  });
  assert.equal(blankOptionText.isValid, false);
  assert.ok(blankOptionText.errors.some((e) => e.field === 'options[0].text'));

  // 6. Valid quiz configuration
  const validQuiz = validateQuizConfig({
    question: 'What is the primary purpose of multi-factor authentication?',
    points: 25,
    options: [
      {
        text: 'To require two or more verification factors',
        isCorrect: true,
        feedback: 'Correct! MFA stops 99.9% of automated attacks.',
      },
      {
        text: 'To replace all passwords completely',
        isCorrect: false,
        feedback: 'Incorrect! MFA layers onto authentication.',
      },
    ],
  });
  assert.equal(validQuiz.isValid, true);
  assert.equal(validQuiz.errors.length, 0);
});

test('QUIZ_TEMPLATES: all built-in templates pass SCORM validation', async () => {
  const { QUIZ_TEMPLATES } = await import('../components/sidebar/QuizTemplatesLibrary');
  const { validateQuizConfig } = await import('./quizValidator');

  assert.ok(QUIZ_TEMPLATES.length >= 4);
  QUIZ_TEMPLATES.forEach((tmpl) => {
    const res = validateQuizConfig(tmpl);
    assert.equal(
      res.isValid,
      true,
      `Template "${tmpl.name}" should be valid but failed with: ${res.summary}`
    );
  });
});

test('DARK_THEME_DEFAULT: provides system-standard aesthetics', async () => {
  const { DARK_THEME_DEFAULT } = await import('../context/ThemeContext');
  assert.equal(DARK_THEME_DEFAULT.backgroundColor, '#0f172a');
  assert.equal(DARK_THEME_DEFAULT.primaryColor, '#2563eb');
  assert.equal(DARK_THEME_DEFAULT.fontFamily, 'Inter, sans-serif');
});

test('CommandManager: tracks undo/redo stacks, stack limits, and descriptions', async () => {
  const { CommandManager } = await import('../store/commandManager');
  type Command = import('../store/commandManager').Command;
  const mgr = new CommandManager();

  assert.equal(mgr.canUndo(), false);
  assert.equal(mgr.canRedo(), false);
  assert.equal(mgr.getUndoCount(), 0);
  assert.equal(mgr.getRedoCount(), 0);

  let stateVal = 0;
  const makeCmd = (val: number, label: string): Command => ({
    id: `cmd_${val}`,
    description: label,
    timestamp: Date.now(),
    execute: () => { stateVal = val; },
    undo: () => { stateVal = 0; },
    redo: () => { stateVal = val; },
  });

  // 1. Execute first command
  mgr.execute(makeCmd(10, 'Action 10'));
  assert.equal(stateVal, 10);
  assert.equal(mgr.canUndo(), true);
  assert.equal(mgr.canRedo(), false);
  assert.equal(mgr.getUndoCount(), 1);
  assert.equal(mgr.getLastUndoDescription(), 'Action 10');

  // 2. Execute second command
  mgr.execute(makeCmd(20, 'Action 20'));
  assert.equal(stateVal, 20);
  assert.equal(mgr.getUndoCount(), 2);
  assert.equal(mgr.getLastUndoDescription(), 'Action 20');

  // 3. Undo
  const undoneCmd = mgr.undo();
  assert.equal(undoneCmd?.description, 'Action 20');
  assert.equal(stateVal, 0);
  assert.equal(mgr.canUndo(), true);
  assert.equal(mgr.canRedo(), true);
  assert.equal(mgr.getUndoCount(), 1);
  assert.equal(mgr.getRedoCount(), 1);
  assert.equal(mgr.getLastRedoDescription(), 'Action 20');

  // 4. Redo
  const redoneCmd = mgr.redo();
  assert.equal(redoneCmd?.description, 'Action 20');
  assert.equal(stateVal, 20);
  assert.equal(mgr.canRedo(), false);
  assert.equal(mgr.getUndoCount(), 2);

  // 5. Test max stack size enforcement
  for (let i = 0; i < 70; i++) {
    mgr.execute(makeCmd(i, `Action ${i}`));
  }
  assert.ok(mgr.getUndoCount() <= 60, `Undo stack count should be capped at 60, was ${mgr.getUndoCount()}`);

  // 6. Clear
  mgr.clear();
  assert.equal(mgr.getUndoCount(), 0);
  assert.equal(mgr.canUndo(), false);
});

test('AddNodeCommand, DeleteNodeCommand & UpdateNodeCommand: reverse visual canvas changes', async () => {
  const { AddNodeCommand, DeleteNodeCommand, UpdateNodeCommand } = await import('../store/commandManager');
  type CanvasNode = import('../types/schema').CanvasNode;
  type CourseManifest = import('../types/schema').CourseManifest;

  // Simulated mini course state
  const mockCourse: CourseManifest = {
    id: 'test_manifest',
    title: 'Test Course',
    description: 'Unit testing manifest',
    version: '1.0.0',
    author: 'Test Author',
    passingScore: 80,
    estimatedMinutes: 10,
    completionCriteria: 'all_pages',
    canvasWidth: 960,
    canvasHeight: 540,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [
      {
        id: 'p1',
        title: 'Slide 1',
        width: 960,
        height: 540,
        background: { type: 'color', value: '#ffffff' },
        nodes: [],
      },
    ],
  };

  let notifyCalled = 0;
  const notify = () => { notifyCalled++; };
  let selectedIds: string[] = [];

  const testNode: CanvasNode = {
    id: 'node_alpha',
    type: 'text',
    content: 'Initial text block',
    fontSize: 24,
    fontWeight: 'normal',
    color: '#000000',
    textAlign: 'left',
    x: 100,
    y: 120,
    width: 200,
    height: 50,
    zIndex: 1,
  };

  // 1. AddNodeCommand
  const addCmd = new AddNodeCommand(
    () => mockCourse,
    (c) => { Object.assign(mockCourse, c); },
    () => 0,
    (ids) => { selectedIds = ids; },
    notify,
    testNode,
    'Add text block'
  );

  addCmd.execute();
  assert.equal(mockCourse.pages[0].nodes.length, 1);
  assert.equal(mockCourse.pages[0].nodes[0].id, 'node_alpha');
  assert.deepEqual(selectedIds, ['node_alpha']);

  // Undo add
  addCmd.undo();
  assert.equal(mockCourse.pages[0].nodes.length, 0);

  // Redo add
  addCmd.redo();
  assert.equal(mockCourse.pages[0].nodes.length, 1);

  // 2. UpdateNodeCommand
  const updateCmd = new UpdateNodeCommand(
    () => mockCourse,
    (c) => { Object.assign(mockCourse, c); },
    () => 0,
    notify,
    'node_alpha',
    { x: 100, y: 120 },
    { x: 350, y: 400 },
    'Move text block'
  );

  updateCmd.execute();
  assert.equal(mockCourse.pages[0].nodes[0].x, 350);
  assert.equal(mockCourse.pages[0].nodes[0].y, 400);

  updateCmd.undo();
  assert.equal(mockCourse.pages[0].nodes[0].x, 100);
  assert.equal(mockCourse.pages[0].nodes[0].y, 120);

  updateCmd.redo();
  assert.equal(mockCourse.pages[0].nodes[0].x, 350);
  assert.equal(mockCourse.pages[0].nodes[0].y, 400);

  // 3. DeleteNodeCommand
  const deleteCmd = new DeleteNodeCommand(
    () => mockCourse,
    (c) => { Object.assign(mockCourse, c); },
    () => 0,
    (ids) => { selectedIds = ids; },
    notify,
    ['node_alpha'],
    'Delete text block'
  );

  deleteCmd.execute();
  assert.equal(mockCourse.pages[0].nodes.length, 0);

  deleteCmd.undo();
  assert.equal(mockCourse.pages[0].nodes.length, 1);
  assert.equal(mockCourse.pages[0].nodes[0].id, 'node_alpha');
  assert.equal(mockCourse.pages[0].nodes[0].x, 350);

  deleteCmd.redo();
  assert.equal(mockCourse.pages[0].nodes.length, 0);
});

test('BatchCommand: atomically batches multiple commands and rolls back in reverse order', async () => {
  const { BatchCommand } = await import('../store/commandManager');
  type Command = import('../store/commandManager').Command;

  const executionLog: string[] = [];

  const cmdA: Command = {
    id: 'cmdA',
    description: 'A',
    timestamp: 1,
    execute: () => executionLog.push('execA'),
    undo: () => executionLog.push('undoA'),
    redo: () => executionLog.push('redoA'),
  };

  const cmdB: Command = {
    id: 'cmdB',
    description: 'B',
    timestamp: 2,
    execute: () => executionLog.push('execB'),
    undo: () => executionLog.push('undoB'),
    redo: () => executionLog.push('redoB'),
  };

  const batch = new BatchCommand([cmdA, cmdB], 'Batch A and B');

  // Execute batch
  batch.execute();
  assert.deepEqual(executionLog, ['execA', 'execB']);

  // Undo batch: must undo in reverse order (undoB, then undoA)
  batch.undo();
  assert.deepEqual(executionLog, ['execA', 'execB', 'undoB', 'undoA']);

  // Redo batch: must redo in execution order (redoA, then redoB)
  batch.redo();
  assert.deepEqual(executionLog, ['execA', 'execB', 'undoB', 'undoA', 'redoA', 'redoB']);
});

test('COMPONENT_TEMPLATES: all built-in e-learning component templates are valid and non-empty', async () => {
  const { COMPONENT_TEMPLATES } = await import('../data/componentTemplatesData');
  assert.ok(COMPONENT_TEMPLATES.length >= 8);

  COMPONENT_TEMPLATES.forEach((tmpl) => {
    assert.ok(tmpl.id);
    assert.ok(tmpl.name);
    assert.ok(tmpl.nodes.length > 0, `Template "${tmpl.name}" should contain at least 1 node`);
    tmpl.nodes.forEach((node) => {
      assert.ok(node.type);
      assert.ok(typeof node.x === 'number');
      assert.ok(typeof node.y === 'number');
      assert.ok(node.width > 0);
      assert.ok(node.height > 0);
    });
  });
});

test('groupNodes & ungroupNodes: groups multiple elements under a common groupId and ungroups cleanly', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  // Add 2 test nodes
  const n1 = globalCourseStore.addNode('shape', { x: 50, y: 50 }, { width: 100, height: 80 });
  const n2 = globalCourseStore.addNode('text', { x: 60, y: 60 }, { width: 80, height: 40 });

  globalCourseStore.setSelectedNodeIds([n1.id, n2.id]);
  globalCourseStore.groupNodes();

  const state1 = globalCourseStore.getState();
  const page1 = state1.course.pages[state1.activePageIndex];
  const g1Node1 = page1.nodes.find((n) => n.id === n1.id);
  const g1Node2 = page1.nodes.find((n) => n.id === n2.id);

  assert.ok(g1Node1?.groupId);
  assert.equal(g1Node1?.groupId, g1Node2?.groupId);

  // Now ungroup
  globalCourseStore.ungroupNodes(g1Node1?.groupId);
  const state2 = globalCourseStore.getState();
  const page2 = state2.course.pages[state2.activePageIndex];
  const uNode1 = page2.nodes.find((n) => n.id === n1.id);
  const uNode2 = page2.nodes.find((n) => n.id === n2.id);

  assert.equal(uNode1?.groupId, undefined);
  assert.equal(uNode2?.groupId, undefined);

  // Clean up
  globalCourseStore.deleteNode(n1.id);
  globalCourseStore.deleteNode(n2.id);
});

test('transformGroup: proportionally scales and positions grouped nodes including text fontSize', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  // Create initial group: shape at (100, 100) 200x100, text at (120, 120) 100x40 font 20
  const n1 = globalCourseStore.addNode('shape', { x: 100, y: 100 }, { width: 200, height: 100 });
  const n2 = globalCourseStore.addNode('text', { x: 120, y: 120 }, { width: 100, height: 40, fontSize: 20 } as any);

  const initialBounds = { x: 100, y: 100, width: 200, height: 100 };
  // Scale group 2x in width and height, shifted to (200, 200) -> 400x200
  const newBounds = { x: 200, y: 200, width: 400, height: 200 };

  globalCourseStore.transformGroup([n1.id, n2.id], newBounds, initialBounds, false);

  const state = globalCourseStore.getState();
  const page = state.course.pages[state.activePageIndex];
  const updatedShape = page.nodes.find((n) => n.id === n1.id)!;
  const updatedText = page.nodes.find((n) => n.id === n2.id)! as any;

  assert.equal(updatedShape.x, 200);
  assert.equal(updatedShape.y, 200);
  assert.equal(updatedShape.width, 400);
  assert.equal(updatedShape.height, 200);

  // Text was at relative X offset 20/200 = 0.1 -> 200 + 0.1*400 = 240
  assert.equal(updatedText.x, 240);
  assert.equal(updatedText.y, 240);
  assert.equal(updatedText.width, 200);
  assert.equal(updatedText.height, 80);
  // Font was 20, scaled 2x -> 40
  assert.equal(updatedText.fontSize, 40);

  // Clean up
  globalCourseStore.deleteNode(n1.id);
  globalCourseStore.deleteNode(n2.id);
});

test('scaleGroup: uniform scaleMultiplier scales group around its center', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  const n = globalCourseStore.addNode('shape', { x: 100, y: 100 }, { width: 100, height: 100 });

  // Scale 1.5x
  globalCourseStore.scaleGroup([n.id], 1.5);

  const state = globalCourseStore.getState();
  const page = state.course.pages[state.activePageIndex];
  const scaled = page.nodes.find((node) => node.id === n.id)!;

  assert.equal(scaled.width, 150);
  assert.equal(scaled.height, 150);
  // Center was at (150, 150). With width 150, new X is 150 - 75 = 75
  assert.equal(scaled.x, 75);
  assert.equal(scaled.y, 75);

  globalCourseStore.deleteNode(n.id);
});

test('MyAssets: saveSelectionToMyAssets, addMyAssetToCanvas, rename and delete', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  // Create two elements
  const box = globalCourseStore.addNode('shape', { x: 300, y: 200 }, { width: 120, height: 80 });
  const lbl = globalCourseStore.addNode('text', { x: 310, y: 210 }, { width: 100, height: 30, content: 'Test Badge' } as any);

  // Save to My Assets
  const savedAsset = globalCourseStore.saveSelectionToMyAssets('Compliance Card', 'cards', [box.id, lbl.id]);
  assert.ok(savedAsset);
  assert.equal(savedAsset.name, 'Compliance Card');
  assert.equal(savedAsset.category, 'cards');
  assert.equal(savedAsset.nodes.length, 2);

  // Check normalized coordinates (minX was 300, minY was 200 -> top-left is 0, 0)
  assert.equal(savedAsset.nodes[0].x, 0);
  assert.equal(savedAsset.nodes[0].y, 0);
  assert.equal(savedAsset.nodes[1].x, 10);
  assert.equal(savedAsset.nodes[1].y, 10);

  // Verify asset exists in store state
  const state = globalCourseStore.getState();
  const found = state.myAssets.find((a) => a.id === savedAsset.id);
  assert.ok(found);

  // Rename asset
  globalCourseStore.renameMyAsset(savedAsset.id, 'Updated Compliance Card');
  assert.equal(globalCourseStore.getState().myAssets.find((a) => a.id === savedAsset.id)?.name, 'Updated Compliance Card');

  // Insert asset to canvas at specific location
  const initialNodeCount = globalCourseStore.getState().course.pages[0].nodes.length;
  const insertedNodes = globalCourseStore.addMyAssetToCanvas(savedAsset.id, { x: 500, y: 400 });

  assert.equal(insertedNodes.length, 2);
  // GroupId should be automatically created for multi-node assets
  assert.ok(insertedNodes[0].groupId);
  assert.equal(insertedNodes[0].groupId, insertedNodes[1].groupId);
  assert.notEqual(insertedNodes[0].id, box.id); // Must have unique instantiated IDs

  // Clean up inserted and original nodes
  insertedNodes.forEach((n) => globalCourseStore.deleteNode(n.id));
  globalCourseStore.deleteNode(box.id);
  globalCourseStore.deleteNode(lbl.id);

  // Delete from My Assets
  globalCourseStore.deleteMyAsset(savedAsset.id);
  assert.equal(globalCourseStore.getState().myAssets.some((a) => a.id === savedAsset.id), false);
});

test('calculateSnapping with userGuides: magnetically snaps elements to custom user guides', () => {
  const customUserGuides: any[] = [
    { id: 'g_v1', orientation: 'vertical', position: 350 },
    { id: 'g_h1', orientation: 'horizontal', position: 220 },
  ];

  // Dragging node (width 100, height 50) near vertical guide 350 (rawX = 353, rawY = 50)
  const snapToV = calculateSnapping(
    353,
    50,
    100,
    50,
    [],
    960,
    540,
    10,
    false,
    8,
    customUserGuides
  );
  assert.equal(snapToV.x, 350);
  assert.ok(snapToV.guidesX.some((g: any) => g.type === 'guide' && g.val === 350));

  // Dragging node near horizontal guide 220 (rawX = 100, rawY = 217)
  const snapToH = calculateSnapping(
    100,
    217,
    100,
    50,
    [],
    960,
    540,
    10,
    false,
    8,
    customUserGuides
  );
  assert.equal(snapToH.y, 220);
  assert.ok(snapToH.guidesY.some((g: any) => g.type === 'guide' && g.val === 220));
});

test('canvasGuides store operations: add, update, lock, presets, clear', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  // Clear existing guides first
  globalCourseStore.clearAllGuides();
  const page0 = globalCourseStore.getState().course.pages[0];
  assert.deepEqual(page0.guides || [], []);

  // 1. Add horizontal guide
  const guide1 = globalCourseStore.addGuide('horizontal', 140);
  assert.ok(guide1);
  assert.equal(guide1.orientation, 'horizontal');
  assert.equal(guide1.position, 140);
  assert.equal(globalCourseStore.getState().course.pages[0].guides?.length, 1);

  // 2. Add vertical guide
  const guide2 = globalCourseStore.addGuide('vertical', 480);
  assert.ok(guide2);
  assert.equal(guide2.orientation, 'vertical');
  assert.equal(guide2.position, 480);
  assert.equal(globalCourseStore.getState().course.pages[0].guides?.length, 2);

  // 3. Update guide position
  globalCourseStore.updateGuide(guide1.id, 160);
  const updatedG1 = globalCourseStore.getState().course.pages[0].guides?.find((g) => g.id === guide1.id);
  assert.equal(updatedG1?.position, 160);

  // 4. Toggle lock guide
  globalCourseStore.toggleLockGuide(guide1.id);
  const lockedG1 = globalCourseStore.getState().course.pages[0].guides?.find((g) => g.id === guide1.id);
  assert.equal(lockedG1?.isLocked, true);

  globalCourseStore.toggleLockGuide(guide1.id);
  const unlockedG1 = globalCourseStore.getState().course.pages[0].guides?.find((g) => g.id === guide1.id);
  assert.equal(unlockedG1?.isLocked, false);

  // 5. Delete single guide
  globalCourseStore.deleteGuide(guide1.id);
  assert.equal(globalCourseStore.getState().course.pages[0].guides?.length, 1);
  assert.equal(globalCourseStore.getState().course.pages[0].guides?.[0].id, guide2.id);

  // 6. Test presets: safe-margins (adds 4 margin guides at 40px)
  globalCourseStore.clearAllGuides();
  globalCourseStore.addPresetGuides('safe-margins');
  const safeGuides = globalCourseStore.getState().course.pages[0].guides || [];
  assert.equal(safeGuides.length, 4);
  assert.ok(safeGuides.some((g) => g.orientation === 'horizontal' && g.position === 40));
  assert.ok(safeGuides.some((g) => g.orientation === 'vertical' && g.position === 40));

  // 7. Test presets: center crosshair
  globalCourseStore.clearAllGuides();
  globalCourseStore.addPresetGuides('center');
  const centerGuides = globalCourseStore.getState().course.pages[0].guides || [];
  assert.equal(centerGuides.length, 2);
  assert.ok(centerGuides.some((g) => g.orientation === 'vertical' && g.position === Math.round(960 / 2)));
  assert.ok(centerGuides.some((g) => g.orientation === 'horizontal' && g.position === Math.round(540 / 2)));

  // 8. Test presets: rule-of-thirds
  globalCourseStore.clearAllGuides();
  globalCourseStore.addPresetGuides('rule-of-thirds');
  const thirdsGuides = globalCourseStore.getState().course.pages[0].guides || [];
  assert.equal(thirdsGuides.length, 4);

  // 9. Clear all guides
  globalCourseStore.clearAllGuides();
  assert.equal(globalCourseStore.getState().course.pages[0].guides?.length, 0);
});

test('calculateSnapping tide-snapping: detects equal horizontal and vertical gaps between elements', () => {
  // Node 1: x = 100, width = 100 -> right = 200
  // Node 2: x = 250, width = 100 -> right = 350 (gap between N1 & N2 = 50px)
  const node1 = { id: 'n1', x: 100, y: 100, width: 100, height: 50 };
  const node2 = { id: 'n2', x: 250, y: 100, width: 100, height: 50 };

  // Dragging Node 3 (width = 100) near x = 400 (which is N2.right + 50 = 400)
  const snapResult = calculateSnapping(
    403, // rawX within 3px threshold of 400
    100,
    100,
    50,
    [node1, node2],
    960,
    540,
    10,
    false,
    8
  );

  assert.equal(snapResult.x, 400);
  assert.ok(
    snapResult.guidesX.some(
      (g) => g.type === 'tide-snap' && g.label.includes('Equal Gap')
    )
  );
});

test('courseVariables & quiz score binding: create, update, and evaluate custom state variables', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  // Add custom score variable
  globalCourseStore.addVariable({
    name: 'learnerScore',
    type: 'number',
    defaultValue: '0',
    currentValue: '0',
    description: 'Tracks overall course quiz points',
  });

  const vars = globalCourseStore.getState().course.variables || [];
  const scoreVar = vars.find((v) => v.name === 'learnerScore');
  assert.ok(scoreVar);
  assert.equal(scoreVar.type, 'number');

  // Update variable value with 'add' mode
  globalCourseStore.updateVariableValue(scoreVar.id, 25, 'add');
  assert.equal(
    globalCourseStore.getState().course.variables?.find((v) => v.id === scoreVar.id)?.currentValue,
    '25'
  );

  // Add 15 more points
  globalCourseStore.updateVariableValue(scoreVar.id, 15, 'add');
  assert.equal(
    globalCourseStore.getState().course.variables?.find((v) => v.id === scoreVar.id)?.currentValue,
    '40'
  );

  // Interpolate variable into text node content
  const templateStr = 'Congratulations! Your score is {{learnerScore}} points.';
  const interpolated = interpolateVariables(templateStr, globalCourseStore.getState().course.variables || []);
  assert.equal(interpolated, 'Congratulations! Your score is 40 points.');

  // Clean up
  globalCourseStore.deleteVariable(scoreVar.id);
  assert.equal(
    globalCourseStore.getState().course.variables?.some((v) => v.id === scoreVar.id),
    false
  );
});

test('timeline animation config: element animation entry, emphasis, exit schema state', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  const page = globalCourseStore.getState().course.pages[0];
  assert.ok(page && page.nodes.length > 0);
  const targetNode = page.nodes[0];

  // Apply entry, emphasis, and exit animation configuration
  globalCourseStore.updateNode(targetNode.id, {
    animation: {
      entry: { type: 'slide-in-left', delay: 0.5, duration: 1.0, easing: 'ease-in-out' },
      emphasis: { type: 'bounce', delay: 1.8, duration: 0.8, repeat: 2 },
      exitAnim: { type: 'fade-out', delay: 6.0, duration: 0.6, easing: 'linear' },
    },
  });

  const updated = globalCourseStore.getState().course.pages[0].nodes.find((n) => n.id === targetNode.id);
  assert.ok(updated?.animation?.entry);
  assert.equal(updated?.animation?.entry?.type, 'slide-in-left');
  assert.equal(updated?.animation?.entry?.delay, 0.5);
  assert.equal(updated?.animation?.emphasis?.type, 'bounce');
  assert.equal(updated?.animation?.exitAnim?.type, 'fade-out');
});

test('animationTimeline: evaluates entry/emphasis/exit phases and auto-sequences nodes', async () => {
  const { evaluateNodeAnimationAtTime, computeAutoSequenceAnimations } = await import('./animationTimeline');

  const anim = {
    entry: { type: 'fade-in' as const, delay: 1.0, duration: 1.0 },
    emphasis: { type: 'pulse' as const, delay: 2.5, duration: 1.0 },
    exitAnim: { type: 'fade-out' as const, delay: 5.0, duration: 1.0 },
  };

  assert.equal(evaluateNodeAnimationAtTime(anim, 0.5).phase, 'waiting');
  assert.equal(evaluateNodeAnimationAtTime(anim, 1.5).phase, 'entering');
  assert.equal(evaluateNodeAnimationAtTime(anim, 2.2).phase, 'visible');
  assert.equal(evaluateNodeAnimationAtTime(anim, 3.0).phase, 'emphasizing');
  assert.equal(evaluateNodeAnimationAtTime(anim, 5.5).phase, 'exiting');
  assert.equal(evaluateNodeAnimationAtTime(anim, 6.2).phase, 'exited');

  const mockNodes: any[] = [
    { id: 'b', type: 'text', x: 100, y: 200, width: 100, height: 40, zIndex: 1 },
    { id: 'a', type: 'shape', x: 100, y: 50, width: 100, height: 40, zIndex: 2 },
  ];
  const sequenced = computeAutoSequenceAnimations(mockNodes, 0.5, 0.7);
  // 'a' is higher (y=50) so gets delay 0, 'b' gets delay 0.5
  assert.equal(sequenced['a'].entry?.delay, 0);
  assert.equal(sequenced['b'].entry?.delay, 0.5);
});

test('speakerNotes: persists per-slide notes independently across slide switches', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  globalCourseStore.setActivePage(0);
  globalCourseStore.updateActivePage({ notes: 'Slide 1 intro narration script.' }, false);

  if (globalCourseStore.getState().course.pages.length > 1) {
    globalCourseStore.setActivePage(1);
    globalCourseStore.updateActivePage({ notes: 'Slide 2 instructional guidance.' }, false);

    assert.equal(globalCourseStore.getState().course.pages[0].notes, 'Slide 1 intro narration script.');
    assert.equal(globalCourseStore.getState().course.pages[1].notes, 'Slide 2 instructional guidance.');
  } else {
    assert.equal(globalCourseStore.getState().course.pages[0].notes, 'Slide 1 intro narration script.');
  }
});

test('designTokens: applyGlobalTheme cascades color, typography, and spacing tokens across slides', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  globalCourseStore.applyGlobalTheme(
    {
      primaryColor: '#7c3aed',
      secondaryColor: '#2563eb',
      accentColor: '#22d3ee',
      backgroundColor: '#090d16',
      surfaceColor: '#111827',
      textColor: '#f8fafc',
      fontFamily: 'Poppins, sans-serif',
      headingFontFamily: 'Poppins, sans-serif',
      bodyFontFamily: 'Inter, sans-serif',
      typography: {
        headingSize: 38,
        subheadingSize: 24,
        bodySize: 17,
        lineHeight: 1.5,
      },
      spacing: {
        slideMargin: 48,
        elementGap: 20,
        cardPadding: 18,
        borderRadius: 16,
      },
    },
    {
      applyBackgroundToPages: true,
      applyLogoToPages: false,
      applyTypographyToPages: true,
      applySpacingToPages: true,
    }
  );

  const state = globalCourseStore.getState();
  assert.equal(state.course.theme?.primaryColor, '#7c3aed');
  assert.equal(state.course.theme?.typography?.headingSize, 38);
  assert.equal(state.course.theme?.spacing?.borderRadius, 16);
  assert.equal(state.course.pages[0].background.value, '#090d16');

  const textNode = state.course.pages[0].nodes.find((n) => n.type === 'text') as any;
  if (textNode) {
    assert.equal(textNode.lineHeight, 1.5);
  }
});

test('personalizedVariables: injects score and user_name into slide text templates', () => {
  const vars = [
    { id: 'v_u', name: 'user_name', type: 'string' as const, defaultValue: 'Learner', currentValue: 'Jordan Lee' },
    { id: 'v_s', name: 'score', type: 'number' as const, defaultValue: '0', currentValue: '92' },
  ];
  const output = interpolateVariables('Great job, {{user_name}}! You scored {{score}}%.', vars);
  assert.equal(output, 'Great job, Jordan Lee! You scored 92%.');
});

test('selectionManager: bulk spacing, margin alignment, selection helpers, and group selection', async () => {
  const { globalCourseStore } = await import('../store/courseStore');
  globalCourseStore.setActivePage(0);

  const n1 = globalCourseStore.addNode('shape', { x: 20, y: 120 }, { width: 100, height: 60 });
  const n2 = globalCourseStore.addNode('shape', { x: 300, y: 140 }, { width: 120, height: 60 });
  const n3 = globalCourseStore.addNode('shape', { x: 600, y: 180 }, { width: 80, height: 60 });

  globalCourseStore.setSelectedNodeIds([n1.id, n2.id, n3.id]);
  globalCourseStore.setPrimarySelectedNode(n2.id);
  assert.equal(globalCourseStore.getState().selectedNodeId, n2.id);
  assert.equal(globalCourseStore.getState().selectedNodeIds.length, 3);

  // Align to safe top margin (slideMargin from theme, or default 40)
  const expectedMargin = globalCourseStore.getState().course.theme?.spacing?.slideMargin ?? 40;
  globalCourseStore.alignSelectedToMargins('top');
  const activeIdx = globalCourseStore.getState().activePageIndex;
  const pageAfterMargin = globalCourseStore.getState().course.pages[activeIdx];
  assert.equal(pageAfterMargin.nodes.find((n) => n.id === n1.id)?.y, expectedMargin);
  assert.equal(pageAfterMargin.nodes.find((n) => n.id === n2.id)?.y, expectedMargin);

  // Space evenly horizontally with 20px gap
  globalCourseStore.spaceNodesEvenly('horizontal', 20);
  const spacedPage = globalCourseStore.getState().course.pages[activeIdx];
  const sn1 = spacedPage.nodes.find((n) => n.id === n1.id)!;
  const sn2 = spacedPage.nodes.find((n) => n.id === n2.id)!;
  const sn3 = spacedPage.nodes.find((n) => n.id === n3.id)!;
  assert.equal(sn2.x, sn1.x + sn1.width + 20);
  assert.equal(sn3.x, sn2.x + sn2.width + 20);

  // Group and selectGroupMembers
  globalCourseStore.groupNodes([n1.id, n2.id]);
  const grpId = globalCourseStore.getState().course.pages[activeIdx].nodes.find((n) => n.id === n1.id)?.groupId;
  assert.ok(grpId);
  globalCourseStore.setSelectedNodeId(null);
  globalCourseStore.selectGroupMembers(grpId!);
  assert.deepEqual(
    [...globalCourseStore.getState().selectedNodeIds].sort(),
    [n1.id, n2.id].sort()
  );

  // Clean up test nodes
  globalCourseStore.setSelectedNodeIds([n1.id, n2.id, n3.id]);
  globalCourseStore.deleteSelectedNodes();
  assert.equal(
    globalCourseStore.getState().course.pages[activeIdx].nodes.some((n) => [n1.id, n2.id, n3.id].includes(n.id)),
    false
  );
});

test('resourceLibrary: built-in shapes/icons/patterns, brand tinting, duplication, and pack import', async () => {
  const { globalCourseStore } = await import('../store/courseStore');
  const assets = globalCourseStore.getState().myAssets;

  assert.ok(assets.some((a) => a.category === 'shapes'));
  assert.ok(assets.some((a) => a.category === 'icons'));
  assert.ok(assets.some((a) => a.category === 'patterns'));

  // Insert a branded icon with brand theme tinting enabled
  const shieldIcon = assets.find((a) => a.id === 'res_icon_shield');
  assert.ok(shieldIcon);
  const inserted = globalCourseStore.addMyAssetToCanvas(shieldIcon!.id, { x: 200, y: 200 }, { applyBrandTheme: true });
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].type, 'image');
  assert.ok((inserted[0] as any).url.startsWith('data:image/svg+xml'));

  // Duplicate and clean up
  const dup = globalCourseStore.duplicateMyAsset(shieldIcon!.id);
  assert.ok(dup);
  assert.ok(dup!.name.includes('(Copy)'));
  globalCourseStore.deleteMyAsset(dup!.id);
  globalCourseStore.deleteNode(inserted[0].id);
});

test('slideReorder: computeReorderTargetIndex accurately maps before/after drops', async () => {
  const { computeReorderTargetIndex } = await import('./slideReorder');

  // Pages [0, 1, 2, 3]
  assert.equal(computeReorderTargetIndex(0, 1, 'before'), 0); // no-op
  assert.equal(computeReorderTargetIndex(0, 1, 'after'), 1);  // move 0 -> 1
  assert.equal(computeReorderTargetIndex(0, 3, 'after'), 3);  // move 0 -> 3
  assert.equal(computeReorderTargetIndex(2, 0, 'before'), 0); // move 2 -> 0
  assert.equal(computeReorderTargetIndex(2, 0, 'after'), 1);  // move 2 -> 1
  assert.equal(computeReorderTargetIndex(2, 1, 'after'), 2);  // no-op
  assert.equal(computeReorderTargetIndex(2, 2, 'before'), 2); // no-op
  assert.equal(computeReorderTargetIndex(2, 2, 'after'), 2);  // no-op
});

test('reorderPages: reorders slides, updates activePageIndex, and supports undo/redo', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  const initialPages = globalCourseStore.getState().course.pages.map((p) => p.id);
  assert.ok(initialPages.length >= 2, 'Starter course must have at least 2 slides');

  const firstId = initialPages[0];
  const secondId = initialPages[1];

  globalCourseStore.reorderPages(0, 1);
  const afterMove = globalCourseStore.getState();
  assert.equal(afterMove.course.pages[0].id, secondId);
  assert.equal(afterMove.course.pages[1].id, firstId);
  assert.equal(afterMove.activePageIndex, 1);

  // Undo restores original order
  globalCourseStore.undo();
  const afterUndo = globalCourseStore.getState();
  assert.equal(afterUndo.course.pages[0].id, firstId);
  assert.equal(afterUndo.course.pages[1].id, secondId);

  // Redo re-applies reorder
  globalCourseStore.redo();
  const afterRedo = globalCourseStore.getState();
  assert.equal(afterRedo.course.pages[0].id, secondId);
  assert.equal(afterRedo.course.pages[1].id, firstId);

  // Restore original state
  globalCourseStore.undo();
});

test('quickActions: filters and ranks commands & settings by title, keywords, and category', async () => {
  const { filterQuickActions } = await import('./quickActions');

  const sampleItems = [
    {
      id: 'a',
      category: 'Export' as const,
      title: 'Export PDF Handout',
      subtitle: 'Generate printable handout',
      keywords: ['pdf', 'handout'],
      execute: () => {},
    },
    {
      id: 'b',
      category: 'Settings' as const,
      title: 'Design Tokens Panel',
      subtitle: 'Colors, typography and spacing tokens',
      keywords: ['tokens', 'colors', 'spacing'],
      execute: () => {},
    },
    {
      id: 'c',
      category: 'Settings' as const,
      title: 'Course Settings & Manifest',
      subtitle: 'Passing score and completion rules',
      keywords: ['manifest', 'passing', 'scorm'],
      execute: () => {},
    },
  ];

  // Empty query returns all items
  assert.equal(filterQuickActions(sampleItems, '   ').length, 3);

  // Keyword match finds Design Tokens
  const spacingMatches = filterQuickActions(sampleItems, 'spacing');
  assert.equal(spacingMatches.length, 1);
  assert.equal(spacingMatches[0].id, 'b');

  // Prefix title match ranks above category/keyword matches
  const settingsMatches = filterQuickActions(sampleItems, 'Design');
  assert.equal(settingsMatches.length, 1);
  assert.equal(settingsMatches[0].id, 'b');

  // Category match returns all Settings items
  const catMatches = filterQuickActions(sampleItems, 'Settings');
  assert.equal(catMatches.length, 2);
});

test('courseStore tab navigation: setActiveInspectorTab and setActiveSidebarTab update active panels', async () => {
  const { globalCourseStore } = await import('../store/courseStore');

  globalCourseStore.setActiveInspectorTab('tokens');
  assert.equal(globalCourseStore.getState().activeInspectorTab, 'tokens');

  globalCourseStore.setActiveInspectorTab('course');
  assert.equal(globalCourseStore.getState().activeInspectorTab, 'course');

  globalCourseStore.setActiveSidebarTab('theme');
  assert.equal(globalCourseStore.getState().activeSidebarTab, 'theme');

  // Reset to defaults
  globalCourseStore.setActiveInspectorTab('element');
  globalCourseStore.setActiveSidebarTab('templates');
});

test('hudPosition: clampHudPosition keeps floating HUD bars inside viewport margins', async () => {
  const { clampHudPosition } = await import('./hudPosition');

  // Within bounds stays unchanged
  assert.deepEqual(clampHudPosition(120, 80, 300, 40, 1000, 600), { x: 120, y: 80 });

  // Negative coordinates clamp to margin (8px)
  assert.deepEqual(clampHudPosition(-50, -20, 300, 40, 1000, 600), { x: 8, y: 8 });

  // Overflow beyond bottom-right clamps to container - hudSize - margin
  assert.deepEqual(clampHudPosition(900, 590, 300, 40, 1000, 600), { x: 692, y: 552 });
});

test('canvasTransform: computeResizedBounds transforms all 8 corner and edge handles accurately', async () => {
  const { computeResizedBounds, computeMovedPositions } = await import('./canvasTransform');

  const initialBounds = { x: 100, y: 100, width: 200, height: 100 };

  // East edge expands width only
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 'e', deltaX: 50, deltaY: 40 }),
    { x: 100, y: 100, width: 250, height: 100 }
  );

  // South edge expands height only
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 's', deltaX: 40, deltaY: 30 }),
    { x: 100, y: 100, width: 200, height: 130 }
  );

  // West edge moves x while anchoring right edge (300)
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 'w', deltaX: -25, deltaY: 20 }),
    { x: 75, y: 100, width: 225, height: 100 }
  );

  // North edge moves y while anchoring bottom edge (200)
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 'n', deltaX: 20, deltaY: -30 }),
    { x: 100, y: 70, width: 200, height: 130 }
  );

  // NW corner moves both x and y while anchoring SE corner (300, 200)
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 'nw', deltaX: 20, deltaY: 10 }),
    { x: 120, y: 110, width: 180, height: 90 }
  );

  // NE corner anchors SW corner (100, 200)
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 'ne', deltaX: 40, deltaY: -20 }),
    { x: 100, y: 80, width: 240, height: 120 }
  );

  // SW corner anchors NE corner (300, 100)
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 'sw', deltaX: -20, deltaY: 50 }),
    { x: 80, y: 100, width: 220, height: 150 }
  );

  // SE corner anchors NW corner (100, 100)
  assert.deepEqual(
    computeResizedBounds({ initialBounds, handle: 'se', deltaX: 60, deltaY: 40 }),
    { x: 100, y: 100, width: 260, height: 140 }
  );

  // West edge with grid snapping clamps safely without inverting past minSize
  const clampedWest = computeResizedBounds({
    initialBounds,
    handle: 'w',
    deltaX: 500,
    deltaY: 0,
    minSize: 20,
    snapToGrid: true,
    gridSize: 10,
  });
  assert.equal(clampedWest.width, 20);
  assert.equal(clampedWest.x, 280);

  // Corner SE resize with Shift aspect-ratio lock (2:1 initial ratio -> width 300 gives height 150)
  const lockedRatio = computeResizedBounds({
    initialBounds,
    handle: 'se',
    deltaX: 100,
    deltaY: 10,
    preserveAspectRatio: true,
  });
  assert.deepEqual(lockedRatio, { x: 100, y: 100, width: 300, height: 150 });

  // Multi-node move rounds cleanly to integer coordinates
  const moved = computeMovedPositions({ a: { x: 10, y: 20 }, b: { x: 50, y: 80 } }, 14.6, -5.2);
  assert.deepEqual(moved, { a: { x: 25, y: 15 }, b: { x: 65, y: 75 } });
});

test('courseStore persistence: tracks x/y coordinates and restores positions & selection across sessions', async () => {
  const { CourseStore } = await import('../store/courseStore');

  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => (storageMap.has(k) ? storageMap.get(k)! : null),
    setItem: (k: string, v: string) => {
      storageMap.set(k, String(v));
    },
    removeItem: (k: string) => {
      storageMap.delete(k);
    },
    clear: () => {
      storageMap.clear();
    },
    key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
    get length() {
      return storageMap.size;
    },
  };

  const originalStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = mockLocalStorage;

  try {
    const store1 = new CourseStore();
    if (store1.getState().course.pages.length > 1) {
      store1.setActivePage(1);
    }
    const created = store1.addNode('shape', { x: 120, y: 140 }, { width: 180, height: 90 });

    // Simulate live drag-and-drop + resize sequence followed by commitUndo
    store1.pushUndo('Move and resize shape');
    store1.updateNode(created.id, { x: 345.4, y: 210.6 }, false);
    store1.updateNode(created.id, { x: 420, y: 260, width: 260, height: 140 }, false);
    store1.commitUndo('Move and resize shape');

    // Verify immediate state tracking
    const activeIdx1 = store1.getState().activePageIndex;
    const nodeInStore1 = store1
      .getState()
      .course.pages[activeIdx1].nodes.find((n) => n.id === created.id)!;
    assert.equal(nodeInStore1.x, 420);
    assert.equal(nodeInStore1.y, 260);
    assert.equal(nodeInStore1.width, 260);
    assert.equal(nodeInStore1.height, 140);

    // Instantiate a fresh CourseStore simulating a new browser session / page reload
    const store2 = new CourseStore();
    const state2 = store2.getState();
    assert.equal(state2.activePageIndex, activeIdx1);
    assert.deepEqual(state2.selectedNodeIds, [created.id]);
    assert.equal(state2.selectedNodeId, created.id);

    const restoredNode = state2.course.pages[state2.activePageIndex].nodes.find(
      (n) => n.id === created.id
    )!;
    assert.ok(restoredNode);
    assert.equal(restoredNode.x, 420);
    assert.equal(restoredNode.y, 260);
    assert.equal(restoredNode.width, 260);
    assert.equal(restoredNode.height, 140);

    // Verify Undo on store1 reverts the full committed drag/resize back to (120, 140)
    store1.undo();
    const revertedNode = store1
      .getState()
      .course.pages[activeIdx1].nodes.find((n) => n.id === created.id)!;
    assert.equal(revertedNode.x, 120);
    assert.equal(revertedNode.y, 140);
  } finally {
    if (originalStorage === undefined) {
      delete (globalThis as any).localStorage;
    } else {
      (globalThis as any).localStorage = originalStorage;
    }
  }
});
