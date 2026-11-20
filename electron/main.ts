import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const APP_NAME = 'SCORM Canva Studio';
const WINDOW_BACKGROUND = '#0f172a';
const DEV_SERVER_URL = process.env.ELECTRON_START_URL ?? '';

// Keep the userData folder name stable between `npm run desktop` and the installed build.
app.setName(APP_NAME);

const DATA_DIRS = ['courses', 'exports', 'media', 'logs'] as const;

let mainWindow: BrowserWindow | null = null;

/** Creates the writable folders the app expects on first launch (never at install time). */
function ensureDataDirs(): void {
  const root = app.getPath('userData');
  for (const dir of DATA_DIRS) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
}

function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? '';
  return url.startsWith('file://') || (DEV_SERVER_URL !== '' && url.startsWith(DEV_SERVER_URL));
}

function assertTrustedSender(event: Electron.IpcMainInvokeEvent): void {
  if (!isTrustedSender(event)) {
    throw new Error('Blocked IPC request from an untrusted frame');
  }
}

const DIALOG_FILTERS: Record<string, Electron.FileFilter> = {
  '.zip': { name: 'SCORM package', extensions: ['zip'] },
  '.json': { name: 'Course definition', extensions: ['json'] },
  '.pdf': { name: 'PDF document', extensions: ['pdf'] },
  '.html': { name: 'HTML page', extensions: ['html'] },
  '.csv': { name: 'CSV file', extensions: ['csv'] },
  '.txt': { name: 'Text file', extensions: ['txt'] },
};

function sanitizeFileName(name: string): string {
  const base = path
    .basename(name)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/^\.+/, '')
    .trim();
  return (base || 'export').slice(0, 120);
}

type SaveFilePayload = { defaultName?: unknown; data?: unknown };
type SaveResult = { canceled: boolean; filePath?: string; error?: string };

async function handleSaveFile(event: Electron.IpcMainInvokeEvent, payload: SaveFilePayload): Promise<SaveResult> {
  assertTrustedSender(event);

  const bytes = payload?.data;
  if (!(bytes instanceof Uint8Array)) {
    return { canceled: true, error: 'Invalid file payload' };
  }

  const suggestedName = sanitizeFileName(String(payload?.defaultName ?? 'export.zip'));
  const extension = path.extname(suggestedName).toLowerCase();
  const options: Electron.SaveDialogOptions = {
    title: 'Save export',
    defaultPath: path.join(app.getPath('documents'), suggestedName),
    filters: DIALOG_FILTERS[extension]
      ? [DIALOG_FILTERS[extension], { name: 'All files', extensions: ['*'] }]
      : [{ name: 'All files', extensions: ['*'] }],
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  };

  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) return { canceled: true };

  await fs.promises.writeFile(result.filePath, Buffer.from(bytes));
  return { canceled: false, filePath: result.filePath };
}

type OpenResult = { filePath: string; text: string } | null;

async function handleOpenCourseJson(event: Electron.IpcMainInvokeEvent): Promise<OpenResult> {
  assertTrustedSender(event);

  const options: Electron.OpenDialogOptions = {
    title: 'Open course definition',
    defaultPath: path.join(app.getPath('documents')),
    filters: [DIALOG_FILTERS['.json']],
    properties: ['openFile'],
  };

  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const stats = await fs.promises.stat(filePath);
  if (stats.size > 50 * 1024 * 1024) {
    throw new Error('Course definition is too large (limit is 50 MB)');
  }

  return { filePath, text: await fs.promises.readFile(filePath, 'utf8') };
}

const MEDIA_ID_PATTERN = /^[a-f0-9]{8,64}\.[a-z0-9]{2,5}$/i;

const MEDIA_MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  weba: 'audio/webm',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

function mediaDirectory(): string {
  return path.join(app.getPath('userData'), 'media');
}

type MediaPutPayload = { id?: unknown; bytes?: unknown };

async function handleMediaPut(
  event: Electron.IpcMainInvokeEvent,
  payload: MediaPutPayload
): Promise<{ ok: boolean; error?: string }> {
  assertTrustedSender(event);

  const id = String(payload?.id ?? '');
  if (!MEDIA_ID_PATTERN.test(id)) return { ok: false, error: 'Invalid media id' };

  const bytes = payload?.bytes;
  if (!(bytes instanceof Uint8Array)) return { ok: false, error: 'Invalid media payload' };
  if (bytes.byteLength > 512 * 1024 * 1024) return { ok: false, error: 'Media file is too large' };

  const directory = mediaDirectory();
  await fs.promises.mkdir(directory, { recursive: true });
  await fs.promises.writeFile(path.join(directory, id), Buffer.from(bytes));
  return { ok: true };
}

async function handleMediaGet(
  event: Electron.IpcMainInvokeEvent,
  id: unknown
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  assertTrustedSender(event);

  const mediaId = String(id ?? '');
  if (!MEDIA_ID_PATTERN.test(mediaId)) return null;

  try {
    const bytes = await fs.promises.readFile(path.join(mediaDirectory(), mediaId));
    const extension = path.extname(mediaId).slice(1).toLowerCase();
    return {
      bytes: new Uint8Array(bytes),
      mime: MEDIA_MIME_BY_EXT[extension] ?? 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

const AI_REQUEST_TIMEOUT_MS = 300000;
const AI_ALLOWED_HOSTS = new Set([
  'generativelanguage.googleapis.com',
  'api.deepseek.com',
  'api.openai.com',
  'openrouter.ai',
]);

function isLocalEndpointUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host.endsWith('.local');
  } catch {
    return false;
  }
}

function isAllowedAiUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (isLocalEndpointUrl(rawUrl)) {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  return url.protocol === 'https:' && AI_ALLOWED_HOSTS.has(url.hostname.toLowerCase());
}

type AiRequestPayload = {
  url?: unknown;
  method?: unknown;
  headers?: unknown;
  body?: unknown;
  timeoutMs?: unknown;
};

/**
 * Proxies provider calls so local models (Ollama, LM Studio) are reachable
 * despite browser CORS rules, and keeps the key out of any page context.
 */
async function handleAiRequest(event: Electron.IpcMainInvokeEvent, payload: AiRequestPayload) {
  assertTrustedSender(event);

  const url = String(payload?.url ?? '');
  if (!isAllowedAiUrl(url)) {
    return { status: 0, text: 'Blocked: this endpoint is not on the allowed provider list.' };
  }

  const method = String(payload?.method ?? 'POST').toUpperCase();
  // GET is only ever used for local model discovery.
  if (method === 'GET' && !isLocalEndpointUrl(url)) {
    return { status: 0, text: 'Blocked: GET requests are limited to local endpoints.' };
  }
  if (method !== 'POST' && method !== 'GET') {
    return { status: 0, text: 'Blocked: unsupported HTTP method.' };
  }

  const headers: Record<string, string> = {};
  if (payload?.headers && typeof payload.headers === 'object') {
    for (const [key, value] of Object.entries(payload.headers as Record<string, unknown>)) {
      if (typeof value === 'string') headers[key] = value;
    }
  }

  const timeoutMs = Math.min(Number(payload?.timeoutMs) || AI_REQUEST_TIMEOUT_MS, AI_REQUEST_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'POST' && typeof payload?.body === 'string' ? payload.body : undefined,
      signal: controller.signal,
    });
    return { status: response.status, text: await response.text() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    return { status: 0, text: message };
  } finally {
    clearTimeout(timer);
  }
}

function secretsFilePath(): string {
  return path.join(app.getPath('userData'), 'ai-keys.json');
}

function readSecretFile(): Record<string, string> {
  try {
    const raw = fs.readFileSync(secretsFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSecretFile(data: Record<string, string>): void {
  const file = secretsFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
}

/** API keys are encrypted at rest with the OS keychain-backed safeStorage. */
async function handleSecretSet(event: Electron.IpcMainInvokeEvent, payload: { provider?: unknown; key?: unknown }) {
  assertTrustedSender(event);
  const provider = String(payload?.provider ?? '');
  const key = String(payload?.key ?? '');
  if (!/^[a-z-]{2,32}$/.test(provider)) return { ok: false, error: 'Invalid provider' };

  const data = readSecretFile();
  if (!key) {
    delete data[provider];
  } else if (safeStorage.isEncryptionAvailable()) {
    data[provider] = `enc:${safeStorage.encryptString(key).toString('base64')}`;
  } else {
    data[provider] = `raw:${key}`;
  }
  writeSecretFile(data);
  return { ok: true, encrypted: safeStorage.isEncryptionAvailable() };
}

async function handleSecretGet(event: Electron.IpcMainInvokeEvent, provider: unknown) {
  assertTrustedSender(event);
  const name = String(provider ?? '');
  if (!/^[a-z-]{2,32}$/.test(name)) return '';

  const stored = readSecretFile()[name];
  if (!stored) return '';

  try {
    if (stored.startsWith('enc:')) {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    }
    if (stored.startsWith('raw:')) return stored.slice(4);
  } catch {
    return '';
  }
  return '';
}

function registerIpcHandlers(): void {
  ipcMain.handle('desktop:save-file', handleSaveFile);
  ipcMain.handle('desktop:open-course-json', handleOpenCourseJson);
  ipcMain.handle('desktop:media-put', handleMediaPut);
  ipcMain.handle('desktop:media-get', handleMediaGet);
  ipcMain.handle('desktop:ai-request', handleAiRequest);
  ipcMain.handle('desktop:secret-set', handleSecretSet);
  ipcMain.handle('desktop:secret-get', handleSecretGet);
  ipcMain.handle('desktop:get-paths', (event) => {
    assertTrustedSender(event);
    const userData = app.getPath('userData');
    return {
      userData,
      courses: path.join(userData, 'courses'),
      exports: path.join(userData, 'exports'),
      media: path.join(userData, 'media'),
      documents: app.getPath('documents'),
      appVersion: app.getVersion(),
      isPackaged: app.isPackaged,
    };
  });
}

/** Blocks in-app navigation away from the bundle and sends real links to the system browser. */
function registerNavigationGuards(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) void shell.openExternal(url);
      return { action: 'deny' };
    });

    contents.on('will-navigate', (navigationEvent, url) => {
      const isAppUrl = url.startsWith('file://') || (DEV_SERVER_URL !== '' && url.startsWith(DEV_SERVER_URL));
      if (isAppUrl) return;
      navigationEvent.preventDefault();
      if (/^https?:/i.test(url)) void shell.openExternal(url);
    });
  });
}

async function showAboutDialog(): Promise<void> {
  const userData = app.getPath('userData');
  await dialog.showMessageBox({
    type: 'info',
    title: `About ${APP_NAME}`,
    message: APP_NAME,
    detail: [
      `Version ${app.getVersion()}`,
      `Electron ${process.versions.electron} · Chromium ${process.versions.chrome}`,
      '',
      `Course files: ${path.join(userData, 'courses')}`,
      `Media library: ${path.join(userData, 'media')}`,
      `Exports: ${path.join(userData, 'exports')}`,
    ].join('\n'),
    buttons: ['OK'],
  });
}

function buildApplicationMenu(): void {
  const sendMenuAction = (action: string) => mainWindow?.webContents.send('desktop:menu', action);

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Course', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('new-course') },
        { type: 'separator' },
        { label: 'Open Course (.json)…', accelerator: 'CmdOrCtrl+O', click: () => sendMenuAction('open-course') },
        { label: 'Save Course…', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('save-course') },
        { type: 'separator' },
        { label: 'Save Snapshot…', accelerator: 'CmdOrCtrl+Alt+S', click: () => sendMenuAction('save-version') },
        {
          label: 'Export SCORM Package (.zip)…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => sendMenuAction('export-scorm'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [{ label: `About ${APP_NAME}`, click: () => void showAboutDialog() }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: WINDOW_BACKGROUND,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (DEV_SERVER_URL !== '') {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    ensureDataDirs();
    registerNavigationGuards();
    registerIpcHandlers();
    buildApplicationMenu();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
