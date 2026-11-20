import { AudioNarration, CanvasNode, CourseManifest, Page } from '../types/schema';

/** Narration objects in the wild use either `audioUrl` (schema) or a legacy `dataUrl` key. */
type LooseNarration = AudioNarration & { dataUrl?: string };

function narrationUrl(narration: LooseNarration | undefined): string | undefined {
  if (!narration) return undefined;
  return narration.audioUrl || narration.dataUrl;
}

function mapNarration(narration: LooseNarration, map: (url: string) => string): AudioNarration {
  const url = narrationUrl(narration);
  if (!url) return narration;
  const next = map(url);
  if (next === url) return narration;
  const copy: LooseNarration = { ...narration, audioUrl: next };
  if (narration.dataUrl !== undefined) copy.dataUrl = next;
  return copy;
}

/**
 * Media lives outside the course JSON. The course stores a short `media://<id>` reference;
 * bytes live in a media store (files under Electron userData, IndexedDB in a browser).
 * Components keep working with ordinary object URLs, so nothing in the canvas had to change.
 */
export const MEDIA_REF_SCHEME = 'media://';

export interface MediaBytes {
  bytes: Uint8Array;
  mime: string;
}

export interface MediaBackend {
  put(id: string, bytes: Uint8Array, mime: string): Promise<void>;
  get(id: string): Promise<MediaBytes | null>;
}

export interface StoredMedia {
  ref: string;
  url: string;
  size: number;
  mime: string;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const MIME_BY_EXT: Record<string, string> = Object.entries(EXT_BY_MIME).reduce(
  (acc, [mime, ext]) => {
    if (!acc[ext]) acc[ext] = mime;
    return acc;
  },
  {} as Record<string, string>
);

const urlToRef = new Map<string, string>();
const refToUrl = new Map<string, string>();
const refMeta = new Map<string, { size: number; mime: string }>();

let backendOverride: MediaBackend | null = null;
let cachedBackend: MediaBackend | null = null;
let objectUrlSeq = 0;

export function isMediaRef(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.startsWith(MEDIA_REF_SCHEME);
}

export function mediaIdOf(ref: string): string {
  return isMediaRef(ref) ? ref.slice(MEDIA_REF_SCHEME.length) : ref;
}

export function mimeForExtension(extension: string): string {
  return MIME_BY_EXT[extension.toLowerCase()] ?? 'application/octet-stream';
}

export function __setMediaBackendForTests(backend: MediaBackend | null): void {
  backendOverride = backend;
  cachedBackend = null;
  urlToRef.clear();
  refToUrl.clear();
  refMeta.clear();
}

function memoryBackend(): MediaBackend {
  const store = new Map<string, MediaBytes>();
  return {
    async put(id, bytes, mime) {
      store.set(id, { bytes, mime });
    },
    async get(id) {
      return store.get(id) ?? null;
    },
  };
}

function electronBackend(): MediaBackend | null {
  const bridge = typeof window !== 'undefined' ? window.desktop : undefined;
  if (!bridge?.mediaPut || !bridge?.mediaGet) return null;
  return {
    put: async (id, bytes, mime) => {
      await bridge.mediaPut(id, bytes, mime);
    },
    get: (id) => bridge.mediaGet(id),
  };
}

function indexedDbBackend(): MediaBackend | null {
  if (typeof indexedDB === 'undefined') return null;
  let dbPromise: Promise<IDBDatabase> | null = null;
  const open = () => {
    if (!dbPromise) {
      dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('scorm-canva-media', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('media')) {
            db.createObjectStore('media', { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  };
  return {
    async put(id, bytes, mime) {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('media', 'readwrite');
        tx.objectStore('media').put({ id, bytes, mime });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async get(id) {
      const db = await open();
      return new Promise<MediaBytes | null>((resolve, reject) => {
        const tx = db.transaction('media', 'readonly');
        const request = tx.objectStore('media').get(id);
        request.onsuccess = () => {
          const row = request.result as { bytes: Uint8Array; mime: string } | undefined;
          resolve(row ? { bytes: row.bytes, mime: row.mime } : null);
        };
        request.onerror = () => reject(request.error);
      });
    },
  };
}

function getBackend(): MediaBackend {
  if (backendOverride) return backendOverride;
  if (!cachedBackend) {
    cachedBackend = electronBackend() ?? indexedDbBackend() ?? memoryBackend();
  }
  return cachedBackend;
}

function createObjectUrl(bytes: Uint8Array, mime: string): string {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: mime }));
  }
  objectUrlSeq += 1;
  return `blob:inline/${objectUrlSeq}`;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // FNV-1a fallback for environments without SubtleCrypto.
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').repeat(4);
}

async function contentId(bytes: Uint8Array, mime: string): Promise<string> {
  const digest = await sha256Hex(bytes);
  const ext = EXT_BY_MIME[mime] ?? 'bin';
  return `${digest.slice(0, 32)}.${ext}`;
}

export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const comma = dataUrl.indexOf(',');
  const header = comma >= 0 ? dataUrl.slice(0, comma) : '';
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  const mimeMatch = /^data:([^;,]+)/.exec(header);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  if (!/;base64/i.test(header)) {
    const encoded = new TextEncoder().encode(decodeURIComponent(payload));
    return { bytes: encoded, mime };
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return `data:${mime || 'application/octet-stream'};base64,${btoa(binary)}`;
}

function register(ref: string, url: string, size: number, mime: string): void {
  urlToRef.set(url, ref);
  urlToRef.set(ref, ref);
  refToUrl.set(ref, url);
  refMeta.set(ref, { size, mime });
}

/** Stores bytes and returns a `media://` reference plus a ready-to-render object URL. */
export async function addMediaBlob(blob: Blob): Promise<StoredMedia> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = blob.type || 'application/octet-stream';
  const id = await contentId(bytes, mime);
  await getBackend().put(id, bytes, mime);
  const ref = MEDIA_REF_SCHEME + id;
  const url = refToUrl.get(ref) ?? createObjectUrl(bytes, mime);
  register(ref, url, bytes.byteLength, mime);
  return { ref, url, size: bytes.byteLength, mime };
}

/** Adopts an existing `data:` URL into the store and returns its reference. */
export async function adoptDataUrl(dataUrl: string): Promise<string> {
  const known = urlToRef.get(dataUrl);
  if (known) return known;
  const { bytes, mime } = dataUrlToBytes(dataUrl);
  const id = await contentId(bytes, mime);
  await getBackend().put(id, bytes, mime);
  const ref = MEDIA_REF_SCHEME + id;
  urlToRef.set(dataUrl, ref);
  urlToRef.set(ref, ref);
  refMeta.set(ref, { size: bytes.byteLength, mime });
  if (!refToUrl.has(ref)) refToUrl.set(ref, createObjectUrl(bytes, mime));
  return ref;
}

export async function readMedia(refOrUrl: string): Promise<MediaBytes | null> {
  const ref = urlToRef.get(refOrUrl) ?? (isMediaRef(refOrUrl) ? refOrUrl : null);
  if (!ref) return null;
  return getBackend().get(mediaIdOf(ref));
}

/** Reference for any URL we know about, including raw `media://` refs. */
export function refForUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const direct = urlToRef.get(url);
  if (direct) return direct;
  return isMediaRef(url) ? url : null;
}

export async function resolveRef(ref: string): Promise<string | null> {
  const cached = refToUrl.get(ref);
  if (cached) return cached;
  const stored = await readMedia(ref);
  if (!stored) return null;
  const url = createObjectUrl(stored.bytes, stored.mime);
  refToUrl.set(ref, url);
  urlToRef.set(url, ref);
  refMeta.set(ref, { size: stored.bytes.byteLength, mime: stored.mime });
  return url;
}

export function sizeForUrl(url: string | null | undefined): number {
  const ref = refForUrl(url);
  if (!ref) return 0;
  return refMeta.get(ref)?.size ?? 0;
}

function mapPageUrls(page: Page, map: (url: string) => string): Page {
  const nodes = page.nodes.map((node: CanvasNode) => {
    if (node.type === 'image' && node.url) {
      const next = map(node.url);
      return next === node.url ? node : { ...node, url: next };
    }
    return node;
  });
  const narration = page.audioNarration as LooseNarration | undefined;
  const nextNarration = narration ? mapNarration(narration, map) : narration;
  if (nodes.every((node, index) => node === page.nodes[index]) && nextNarration === narration) {
    return page;
  }
  return { ...page, nodes, audioNarration: nextNarration };
}

export function collectMediaUrls(manifest: CourseManifest): string[] {
  const urls: string[] = [];
  manifest.pages.forEach((page) => {
    page.nodes.forEach((node) => {
      if (node.type === 'image' && node.url) urls.push(node.url);
    });
    if (page.audioNarration) {
      const url = narrationUrl(page.audioNarration as LooseNarration);
      if (url) urls.push(url);
    }
  });
  return urls;
}

export function collectNodeMediaUrls(nodes: CanvasNode[]): string[] {
  const urls: string[] = [];
  nodes.forEach((node) => {
    if (node.type === 'image' && node.url) urls.push(node.url);
  });
  return urls;
}

/** Swaps every `media://` reference for a renderable object URL. */
export async function hydrateManifest(manifest: CourseManifest): Promise<CourseManifest> {
  const refs = Array.from(new Set(collectMediaUrls(manifest).filter(isMediaRef)));
  if (refs.length === 0) return manifest;
  const resolved = new Map<string, string>();
  await Promise.all(
    refs.map(async (ref) => {
      const url = await resolveRef(ref);
      if (url) resolved.set(ref, url);
    })
  );
  if (resolved.size === 0) return manifest;
  return {
    ...manifest,
    pages: manifest.pages.map((page) => mapPageUrls(page, (url) => resolved.get(url) ?? url)),
  };
}

export async function hydrateNodes(nodes: CanvasNode[]): Promise<CanvasNode[]> {
  const refs = Array.from(new Set(collectNodeMediaUrls(nodes).filter(isMediaRef)));
  if (refs.length === 0) return nodes;
  const resolved = new Map<string, string>();
  await Promise.all(
    refs.map(async (ref) => {
      const url = await resolveRef(ref);
      if (url) resolved.set(ref, url);
    })
  );
  return nodes.map((node) => {
    if (node.type !== 'image' || !node.url) return node;
    const next = resolved.get(node.url);
    return next ? { ...node, url: next } : node;
  });
}

/** Replaces render-time URLs with compact references ready for JSON persistence. */
export function dehydrateManifest(manifest: CourseManifest): CourseManifest {
  return {
    ...manifest,
    pages: manifest.pages.map((page) => mapPageUrls(page, (url) => refForUrl(url) ?? url)),
  };
}

export function dehydrateNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((node) => {
    if (node.type !== 'image' || !node.url) return node;
    const ref = refForUrl(node.url);
    return ref && ref !== node.url ? { ...node, url: ref } : node;
  });
}

/** Turns any leftover inline `data:` URLs into stored references (legacy projects). */
export async function adoptInlineMedia(manifest: CourseManifest): Promise<void> {
  const inline = Array.from(new Set(collectMediaUrls(manifest).filter((url) => url.startsWith('data:'))));
  for (const dataUrl of inline) {
    try {
      await adoptDataUrl(dataUrl);
    } catch (error) {
      console.warn('Unable to move inline media into the media store', error);
    }
  }
}

export async function adoptInlineNodes(nodes: CanvasNode[]): Promise<void> {
  const inline = Array.from(
    new Set(collectNodeMediaUrls(nodes).filter((url) => url.startsWith('data:')))
  );
  for (const dataUrl of inline) {
    try {
      await adoptDataUrl(dataUrl);
    } catch (error) {
      console.warn('Unable to move inline asset media into the media store', error);
    }
  }
}

/** Produces a self-contained copy (inline data URLs) for portable JSON backups. */
export async function inlineManifestMedia(manifest: CourseManifest): Promise<CourseManifest> {
  const urls = Array.from(new Set(collectMediaUrls(manifest)));
  const inlined = new Map<string, string>();
  for (const url of urls) {
    if (url.startsWith('data:')) continue;
    const stored = await readMedia(url);
    if (!stored) continue;
    inlined.set(url, bytesToDataUrl(stored.bytes, stored.mime));
  }
  if (inlined.size === 0) return manifest;
  return {
    ...manifest,
    pages: manifest.pages.map((page) => mapPageUrls(page, (url) => inlined.get(url) ?? url)),
  };
}

export interface ScormMediaFile {
  path: string;
  bytes: Uint8Array;
  mime: string;
}

/**
 * Externalises slide imagery into `media/<file>` entries for the SCORM package.
 * Narration audio stays inline because the standalone player embeds the course JSON.
 */
export async function extractScormMedia(
  manifest: CourseManifest
): Promise<{ manifest: CourseManifest; files: ScormMediaFile[] }> {
  const files = new Map<string, ScormMediaFile>();
  const imagePaths = new Map<string, string>();
  const narrationInline = new Map<string, string>();

  for (const url of Array.from(new Set(collectMediaUrls(manifest)))) {
    const stored = url.startsWith('data:') ? dataUrlToBytes(url) : await readMedia(url);
    if (!stored) continue;
    const ref = refForUrl(url);
    const id = ref ? mediaIdOf(ref) : await contentId(stored.bytes, stored.mime);
    const path = `media/${id}`;
    files.set(path, { path, bytes: stored.bytes, mime: stored.mime });
    imagePaths.set(url, path);
    narrationInline.set(url, bytesToDataUrl(stored.bytes, stored.mime));
  }

  const pages = manifest.pages.map((page) => {
    const nodes = page.nodes.map((node: CanvasNode) => {
      if (node.type !== 'image' || !node.url) return node;
      const next = imagePaths.get(node.url);
      return next ? { ...node, url: next } : node;
    });
    const narration = page.audioNarration as LooseNarration | undefined;
    const narrationValue = narrationUrl(narration);
    const nextNarration =
      narration && narrationValue && narrationInline.has(narrationValue)
        ? mapNarration(narration, (url) => narrationInline.get(url) ?? url)
        : narration;
    return { ...page, nodes, audioNarration: nextNarration };
  });

  return { manifest: { ...manifest, pages }, files: Array.from(files.values()) };
}
