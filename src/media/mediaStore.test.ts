import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CourseManifest } from '../types/schema';
import {
  __setMediaBackendForTests,
  addMediaBlob,
  adoptInlineMedia,
  dehydrateManifest,
  extractScormMedia,
  hydrateManifest,
  isMediaRef,
  mediaIdOf,
} from './mediaStore';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function memoryBackend() {
  const stored = new Map<string, { bytes: Uint8Array; mime: string }>();
  return {
    stored,
    async put(id: string, bytes: Uint8Array, mime: string) {
      stored.set(id, { bytes, mime });
    },
    async get(id: string) {
      return stored.get(id) ?? null;
    },
  };
}

function makeCourse(imageUrl: string): CourseManifest {
  return {
    id: 'course_1',
    title: 'Media test',
    pages: [
      {
        id: 'p1',
        title: 'Slide 1',
        width: 960,
        height: 540,
        background: { type: 'color', value: '#ffffff' },
        nodes: [{ id: 'n1', type: 'image', x: 0, y: 0, width: 10, height: 10, url: imageUrl }],
      },
    ],
  } as unknown as CourseManifest;
}

beforeEach(() => {
  __setMediaBackendForTests(memoryBackend());
});

test('addMediaBlob returns a media reference instead of an inline payload', async () => {
  const bytes = Buffer.from(PNG_BASE64, 'base64');
  const media = await addMediaBlob(new Blob([bytes], { type: 'image/png' }));

  assert.ok(isMediaRef(media.ref));
  assert.match(mediaIdOf(media.ref), /^[a-f0-9]{32}\.png$/);
  assert.equal(media.size, bytes.byteLength);
  assert.ok(!media.url.startsWith('media://'), 'render URL should be a blob URL');
});

test('course JSON stores references, not base64 payloads', async () => {
  const bytes = Buffer.from(PNG_BASE64, 'base64');
  const media = await addMediaBlob(new Blob([bytes], { type: 'image/png' }));

  const persisted = dehydrateManifest(makeCourse(media.url));
  const serialized = JSON.stringify(persisted);

  assert.equal((persisted.pages[0].nodes[0] as { url: string }).url, media.ref);
  assert.ok(!serialized.includes('base64'), 'no inline media should remain in the JSON');
  assert.ok(serialized.length < 2000, 'persisted course should stay small');
});

test('hydrateManifest restores a renderable URL from a stored reference', async () => {
  const bytes = Buffer.from(PNG_BASE64, 'base64');
  const original = await addMediaBlob(new Blob([bytes], { type: 'image/png' }));
  const persisted = dehydrateManifest(makeCourse(original.url));

  const hydrated = await hydrateManifest(persisted);
  const url = (hydrated.pages[0].nodes[0] as { url: string }).url;

  assert.equal(isMediaRef(url), false);
  assert.ok(String(url).startsWith('blob:'));
  const stored = await addMediaBlob(new Blob([bytes], { type: 'image/png' }));
  assert.equal(mediaIdOf(stored.ref), mediaIdOf(original.ref), 'identical bytes share one id');
});

test('legacy inline data URLs are adopted into the store', async () => {
  const course = makeCourse(`data:image/png;base64,${PNG_BASE64}`);

  await adoptInlineMedia(course);
  const persisted = dehydrateManifest(course);

  assert.ok(isMediaRef((persisted.pages[0].nodes[0] as { url: string }).url));
});

test('references without stored bytes are left untouched', async () => {
  const missing = 'media://deadbeefdeadbeefdeadbeefdeadbeef.png';
  const hydrated = await hydrateManifest(makeCourse(missing));

  assert.equal((hydrated.pages[0].nodes[0] as { url: string }).url, missing);
});

test('SCORM export writes images as media files and keeps narration inline', async () => {
  const imageBytes = Buffer.from(PNG_BASE64, 'base64');
  const audioBytes = Buffer.from('fake-audio', 'utf8');
  const image = await addMediaBlob(new Blob([imageBytes], { type: 'image/png' }));
  const audio = await addMediaBlob(new Blob([audioBytes], { type: 'audio/mpeg' }));

  const course = makeCourse(image.url);
  course.pages[0].audioNarration = { audioUrl: audio.url, name: 'narration', duration: 3 };

  const { manifest, files } = await extractScormMedia(course);

  assert.equal((manifest.pages[0].nodes[0] as { url: string }).url, `media/${mediaIdOf(image.ref)}`);
  const imageFile = files.find((file) => file.path === `media/${mediaIdOf(image.ref)}`);
  assert.ok(imageFile, 'image should be packaged as a file');
  assert.equal(imageFile?.bytes.byteLength, imageBytes.byteLength);
  assert.match(manifest.pages[0].audioNarration?.audioUrl ?? '', /^data:audio\/mpeg;base64,/);
});
