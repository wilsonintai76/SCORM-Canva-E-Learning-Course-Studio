import JSZip from 'jszip';
import { CourseManifest } from '../types/schema';
import { generateImsManifestXml } from '../packager/xml';
import { generateStandalonePlayerHtml } from '../packager/playerTemplate';

export interface ScormValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalPages: number;
    totalQuizzes: number;
    totalPoints: number;
    passingScore: number;
    manifestId: string;
  };
}

export interface ScormBundleFileEntry {
  path: string;
  size: number;
  type: string;
}

export interface ScormBundlePackageResult {
  blob: Blob;
  filename: string;
  files: ScormBundleFileEntry[];
  totalSize: number;
  compressedSize: number;
  imsManifestXml: string;
}

/**
 * Validates course manifest structure for SCORM 1.2 LMS compliance
 */
export function validateCourseForScorm(manifest: CourseManifest): ScormValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest.id || !manifest.id.trim()) {
    errors.push('Course identifier (manifest id) is required for SCORM 1.2.');
  }

  if (!manifest.title || !manifest.title.trim()) {
    errors.push('Course title cannot be empty.');
  }

  if (!manifest.pages || manifest.pages.length === 0) {
    errors.push('Course must contain at least one slide/page.');
  }

  let totalQuizzes = 0;
  let totalPoints = 0;

  (manifest.pages || []).forEach((p, pIdx) => {
    if (!p.title) {
      warnings.push(`Slide ${pIdx + 1} has no title.`);
    }

    (p.nodes || []).forEach((n, nIdx) => {
      if (n.type === 'quiz') {
        totalQuizzes++;
        totalPoints += n.points || 10;
        const hasCorrect = (n.options || []).some((o) => o.isCorrect);
        if (!hasCorrect) {
          errors.push(`Quiz on slide ${pIdx + 1} ("${n.question.slice(0, 30)}...") has no correct answer marked.`);
        }
        if (!n.options || n.options.length < 2) {
          errors.push(`Quiz on slide ${pIdx + 1} must have at least 2 answer choices.`);
        }
      }
    });
  });

  if (totalQuizzes === 0 && manifest.completionCriteria.includes('quiz')) {
    warnings.push('Completion rule requires passing quiz, but course contains no quiz elements.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalPages: manifest.pages?.length || 0,
      totalQuizzes,
      totalPoints,
      passingScore: manifest.passingScore || 80,
      manifestId: manifest.id || 'SCORM_001',
    },
  };
}

/**
 * Bundles current project data into a SCORM 1.2 compliant ZIP package
 */
export async function bundleCourseToScormZip(
  manifest: CourseManifest
): Promise<ScormBundlePackageResult> {
  const zip = new JSZip();
  const fileEntries: ScormBundleFileEntry[] = [];

  // 1. imsmanifest.xml (SCORM 1.2 Root Manifest)
  const imsXml = generateImsManifestXml(manifest);
  zip.file('imsmanifest.xml', imsXml);
  fileEntries.push({
    path: 'imsmanifest.xml',
    size: new Blob([imsXml]).size,
    type: 'text/xml',
  });

  // 2. index.html (Self-contained HTML5 Player runtime)
  const playerHtml = generateStandalonePlayerHtml(manifest);
  zip.file('index.html', playerHtml);
  fileEntries.push({
    path: 'index.html',
    size: new Blob([playerHtml]).size,
    type: 'text/html',
  });

  // 3. course_data.json (Clean structured course manifest JSON)
  const courseJson = JSON.stringify(manifest, null, 2);
  zip.file('course_data.json', courseJson);
  fileEntries.push({
    path: 'course_data.json',
    size: new Blob([courseJson]).size,
    type: 'application/json',
  });

  // 4. SCORM 1.2 schema definition references
  const imscpRootXsd = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2" elementFormDefault="qualified"></xs:schema>`;
  zip.file('imscp_rootv1p1p2.xsd', imscpRootXsd);
  fileEntries.push({
    path: 'imscp_rootv1p1p2.xsd',
    size: new Blob([imscpRootXsd]).size,
    type: 'text/xml',
  });

  const adlcpXsd = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.adlnet.org/xsd/adlcp_rootv1p2" elementFormDefault="qualified"></xs:schema>`;
  zip.file('adlcp_rootv1p2.xsd', adlcpXsd);
  fileEntries.push({
    path: 'adlcp_rootv1p2.xsd',
    size: new Blob([adlcpXsd]).size,
    type: 'text/xml',
  });

  const totalRawSize = fileEntries.reduce((acc, f) => acc + f.size, 0);

  // Generate standard zip binary blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const safeFilename = `${manifest.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'scorm_course'}_v1.2.zip`;

  return {
    blob: zipBlob,
    filename: safeFilename,
    files: fileEntries,
    totalSize: totalRawSize,
    compressedSize: zipBlob.size,
    imsManifestXml: imsXml,
  };
}
