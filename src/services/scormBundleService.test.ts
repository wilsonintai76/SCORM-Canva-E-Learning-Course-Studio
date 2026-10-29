import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseForScorm, bundleCourseToScormZip } from './scormBundleService';
import { CourseManifest, QuizNode } from '../types/schema';

const mockCourse: CourseManifest = {
  id: 'COURSE_VAL_001',
  title: 'Validation & Packaging Test Course',
  description: 'Test description',
  version: '1.2.0',
  author: 'Instructor',
  passingScore: 80,
  estimatedMinutes: 10,
  completionCriteria: 'all_pages_and_quiz',
  canvasWidth: 960,
  canvasHeight: 540,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pages: [
    {
      id: 'p1',
      title: 'Slide 1',
      width: 960,
      height: 540,
      background: { type: 'color', value: '#ffffff' },
      nodes: [
        {
          id: 'q1',
          type: 'quiz',
          x: 100,
          y: 100,
          width: 600,
          height: 300,
          quizType: 'single',
          question: 'Is SCORM 1.2 supported?',
          options: [
            { id: 'o1', text: 'Yes', isCorrect: true },
            { id: 'o2', text: 'No', isCorrect: false },
          ],
          points: 50,
          showFeedbackImmediately: true,
          zIndex: 1,
        },
      ],
    },
  ],
};

test('validateCourseForScorm passes for valid course with quiz', () => {
  const result = validateCourseForScorm(mockCourse);
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.summary.totalPages, 1);
  assert.equal(result.summary.totalQuizzes, 1);
  assert.equal(result.summary.totalPoints, 50);
});

test('validateCourseForScorm catches missing identifier or quiz without correct answer', () => {
  const invalidCourse: CourseManifest = {
    ...mockCourse,
    id: '',
    pages: [
      {
        ...mockCourse.pages[0],
        nodes: [
          {
            ...(mockCourse.pages[0].nodes[0] as QuizNode),
            options: [
              { id: 'o1', text: 'Opt 1', isCorrect: false },
              { id: 'o2', text: 'Opt 2', isCorrect: false },
            ],
          },
        ],
      },
    ],
  };

  const result = validateCourseForScorm(invalidCourse);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.includes('identifier')));
  assert.ok(result.errors.some((e) => e.includes('no correct answer')));
});

test('bundleCourseToScormZip produces ZIP with imsmanifest.xml, index.html, and schemas', async () => {
  const bundle = await bundleCourseToScormZip(mockCourse);
  assert.ok(bundle.blob instanceof Blob);
  assert.ok(bundle.compressedSize > 0);
  assert.ok(bundle.filename.endsWith('.zip'));

  const paths = bundle.files.map((f) => f.path);
  assert.ok(paths.includes('imsmanifest.xml'));
  assert.ok(paths.includes('index.html'));
  assert.ok(paths.includes('course_data.json'));
  assert.ok(paths.includes('imscp_rootv1p1p2.xsd'));
  assert.ok(paths.includes('adlcp_rootv1p2.xsd'));
});
