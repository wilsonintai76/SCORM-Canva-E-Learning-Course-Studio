import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml, generateImsManifestXml } from './xml';
import { CourseManifest } from '../types/schema';

test('escapeXml correctly handles XML entities', () => {
  assert.equal(escapeXml('A & B < C > D "quoted" \'single\''), 'A &amp; B &lt; C &gt; D &quot;quoted&quot; &apos;single&apos;');
  assert.equal(escapeXml(''), '');
});

test('generateImsManifestXml creates valid SCORM 1.2 manifest structure', () => {
  const mockManifest: CourseManifest = {
    id: 'COURSE_123',
    title: 'Test & Validate Course',
    description: 'A course for testing <SCORM>',
    version: '1.0.0',
    author: 'Test Author',
    passingScore: 85,
    estimatedMinutes: 15,
    completionCriteria: 'all_pages_and_quiz',
    canvasWidth: 960,
    canvasHeight: 540,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: [],
  };

  const xml = generateImsManifestXml(mockManifest);

  assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('identifier="COURSE_123"'));
  assert.ok(xml.includes('<schema>ADL SCORM</schema>'));
  assert.ok(xml.includes('<schemaversion>1.2</schemaversion>'));
  assert.ok(xml.includes('<title>Test &amp; Validate Course</title>'));
  assert.ok(xml.includes('<adlcp:masteryscore>85</adlcp:masteryscore>'));
  assert.ok(xml.includes('adlcp:scormtype="sco" href="index.html"'));
});
