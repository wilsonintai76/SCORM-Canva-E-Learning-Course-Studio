import JSZip from 'jszip';
import { CourseManifest } from '../types/schema';
import { generateImsManifestXml } from './xml';
import { generateStandalonePlayerHtml } from './playerTemplate';

export async function packageCourseToScormZip(manifest: CourseManifest): Promise<Blob> {
  const zip = new JSZip();

  // 1. imsmanifest.xml
  const imsXml = generateImsManifestXml(manifest);
  zip.file('imsmanifest.xml', imsXml);

  // 2. index.html standalone runtime player
  const playerHtml = generateStandalonePlayerHtml(manifest);
  zip.file('index.html', playerHtml);

  // 3. course_data.json
  zip.file('course_data.json', JSON.stringify(manifest, null, 2));

  // Generate standard zip binary blob
  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return content;
}

export function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
