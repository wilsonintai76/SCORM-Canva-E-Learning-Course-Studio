import { contextBridge, ipcRenderer } from 'electron';

export type SaveFileResult = { canceled: boolean; filePath?: string; error?: string };
export type OpenCourseResult = { filePath: string; text: string } | null;
export type AppPaths = {
  userData: string;
  courses: string;
  exports: string;
  media: string;
  documents: string;
  appVersion: string;
  isPackaged: boolean;
};

const bridge = {
  isDesktop: true as const,
  platform: process.platform,
  saveFile: (defaultName: string, data: Uint8Array): Promise<SaveFileResult> =>
    ipcRenderer.invoke('desktop:save-file', { defaultName, data }),
  openCourseJson: (): Promise<OpenCourseResult> => ipcRenderer.invoke('desktop:open-course-json'),
  mediaPut: (id: string, bytes: Uint8Array, mime: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('desktop:media-put', { id, bytes, mime }),
  mediaGet: (id: string): Promise<{ bytes: Uint8Array; mime: string } | null> =>
    ipcRenderer.invoke('desktop:media-get', id),
  aiRequest: (payload: {
    url: string;
    method?: 'GET' | 'POST';
    headers: Record<string, string>;
    body: string;
    timeoutMs?: number;
  }): Promise<{ status: number; text: string }> => ipcRenderer.invoke('desktop:ai-request', payload),
  secretSet: (provider: string, key: string): Promise<{ ok: boolean; encrypted?: boolean; error?: string }> =>
    ipcRenderer.invoke('desktop:secret-set', { provider, key }),
  secretGet: (provider: string): Promise<string> => ipcRenderer.invoke('desktop:secret-get', provider),
  getPaths: (): Promise<AppPaths> => ipcRenderer.invoke('desktop:get-paths'),
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('desktop:menu', listener);
    return () => {
      ipcRenderer.removeListener('desktop:menu', listener);
    };
  },
};

contextBridge.exposeInMainWorld('desktop', bridge);
