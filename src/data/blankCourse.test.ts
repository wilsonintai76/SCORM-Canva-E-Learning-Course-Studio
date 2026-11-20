import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankCourse } from './blankCourse';
import { CYBERSECURITY_COURSE } from './templates';
import { validateCourseForScorm } from '../services/scormBundleService';

test('a blank course is immediately valid for SCORM export', () => {
  const course = createBlankCourse();
  const validation = validateCourseForScorm(course);

  assert.equal(validation.isValid, true, JSON.stringify(validation.errors));
  assert.equal(validation.summary.totalPages, 1);
  assert.equal(course.pages[0].nodes.length, 0);
});

test('each blank course gets a unique id so LMS attempts stay separate', () => {
  const first = createBlankCourse();
  const second = createBlankCourse();

  assert.notEqual(first.id, second.id);
  assert.notEqual(first.pages[0].id, second.pages[0].id);
});

test('template copies are independent of the source manifest', () => {
  const copy = createBlankCourse({ template: CYBERSECURITY_COURSE });
  copy.pages[0].title = 'Changed';

  assert.notEqual(copy.id, CYBERSECURITY_COURSE.id);
  assert.notEqual(CYBERSECURITY_COURSE.pages[0].title, 'Changed');
  assert.equal(copy.pages.length, CYBERSECURITY_COURSE.pages.length);
  assert.equal(copy.comments?.length, 0);
});

test('titles fall back to a sensible default', () => {
  assert.equal(createBlankCourse({ title: '   ' }).title, 'Untitled Course');
  assert.equal(createBlankCourse({ title: 'Onboarding 101' }).title, 'Onboarding 101');
});
