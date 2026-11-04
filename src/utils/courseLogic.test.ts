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




