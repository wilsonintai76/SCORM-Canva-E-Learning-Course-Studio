import { triggerDownloadBlob } from '../packager/zipPackager';

export type SaveOutcome = 'native' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Saves through the desktop Save dialog when the app runs in Electron,
 * and falls back to a normal browser download otherwise.
 */
export async function saveBlobWithDialog(blob: Blob, filename: string): Promise<SaveOutcome> {
  const bridge = typeof window !== 'undefined' ? window.desktop : undefined;
  if (!bridge?.saveFile) {
    triggerDownloadBlob(blob, filename);
    return 'downloaded';
  }

  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const result = await bridge.saveFile(filename, bytes);
    if (result.error) return 'failed';
    return result.canceled ? 'cancelled' : 'native';
  } catch (error) {
    console.error('Native save failed, falling back to download', error);
    triggerDownloadBlob(blob, filename);
    return 'downloaded';
  }
}

export async function saveDataUrlWithDialog(dataUrl: string, filename: string): Promise<SaveOutcome> {
  const response = await fetch(dataUrl);
  return saveBlobWithDialog(await response.blob(), filename);
}

export function saveTextWithDialog(text: string, filename: string, mime = 'application/json'): Promise<SaveOutcome> {
  return saveBlobWithDialog(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}
