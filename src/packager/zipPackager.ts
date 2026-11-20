import JSZip from 'jszip';
import { CourseManifest } from '../types/schema';
import { generateImsManifestXml } from './xml';
import { generateStandalonePlayerHtml } from './playerTemplate';
import { extractScormMedia } from '../media/mediaStore';

export async function packageCourseToScormZip(manifest: CourseManifest): Promise<Blob> {
  const zip = new JSZip();
  const { manifest: exported, files: mediaFiles } = await extractScormMedia(manifest);

  // 1. imsmanifest.xml
  const imsXml = generateImsManifestXml(exported);
  zip.file('imsmanifest.xml', imsXml);

  // 2. index.html standalone runtime player
  const playerHtml = generateStandalonePlayerHtml(exported);
  zip.file('index.html', playerHtml);

  // 3. course_data.json
  zip.file('course_data.json', JSON.stringify(exported, null, 2));

  // 4. media/ files referenced by the slides
  for (const file of mediaFiles) {
    zip.file(file.path, file.bytes);
  }

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
