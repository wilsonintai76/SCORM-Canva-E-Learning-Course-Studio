import { CourseManifest } from '../types/schema';

/**
 * Escapes special XML characters
 */
export function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates standard-compliant SCORM 1.2 imsmanifest.xml
 */
export function generateImsManifestXml(manifest: CourseManifest): string {
  const safeId = escapeXml(manifest.id || 'SCORM_COURSE_001');
  const safeTitle = escapeXml(manifest.title || 'Interactive E-Learning Course');
  const safeDescription = escapeXml(manifest.description || 'SCORM 1.2 e-learning course created with SCORM Canva');
  const passingScore = Math.min(100, Math.max(0, manifest.passingScore || 80));

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${safeId}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <adlcp:location>${safeDescription}</adlcp:location>
  </metadata>
  <organizations default="B0">
    <organization identifier="B0">
      <title>${safeTitle}</title>
      <item identifier="ITEM_1" identifierref="RES_1" isvisible="true">
        <title>${safeTitle}</title>
        <adlcp:masteryscore>${passingScore}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
      <file href="course_data.json" />
    </resource>
  </resources>
</manifest>`;
}
