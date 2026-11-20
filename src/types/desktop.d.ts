type DesktopSaveFileResult = { canceled: boolean; filePath?: string; error?: string };
type DesktopOpenCourseResult = { filePath: string; text: string } | null;
type DesktopAppPaths = {
  userData: string;
  courses: string;
  exports: string;
  documents: string;
  appVersion: string;
  isPackaged: boolean;
};

/** Bridge exposed by electron/preload.ts. Absent when the UI runs in a plain browser. */
interface DesktopBridge {
  readonly isDesktop: true;
  readonly platform: string;
  saveFile(defaultName: string, data: Uint8Array): Promise<DesktopSaveFileResult>;
  openCourseJson(): Promise<DesktopOpenCourseResult>;
  mediaPut(id: string, bytes: Uint8Array, mime: string): Promise<{ ok: boolean; error?: string }>;
  mediaGet(id: string): Promise<{ bytes: Uint8Array; mime: string } | null>;
  aiRequest(payload: {
    url: string;
    method?: 'GET' | 'POST';
    headers: Record<string, string>;
    body: string;
    timeoutMs?: number;
  }): Promise<{ status: number; text: string }>;
  secretSet(provider: string, key: string): Promise<{ ok: boolean; encrypted?: boolean; error?: string }>;
  secretGet(provider: string): Promise<string>;
  getPaths(): Promise<DesktopAppPaths>;
  onMenuAction(callback: (action: string) => void): () => void;
}

interface Window {
  desktop?: DesktopBridge;
}
