/**
 * WCAG 2.1 Accessibility Auditor for SCORM Canva Slides
 */
import { CourseManifest, CanvasNode, TextNode, ImageNode, QuizNode } from '../types/schema';
import { hexToRgb } from './colorPaletteGenerator';

export interface AccessibilityIssue {
  id: string;
  pageId: string;
  pageTitle: string;
  pageIndex: number;
  nodeId?: string;
  nodeType?: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  wcagCriterion: string; // e.g. "1.1.1 Non-text Content (Level A)"
  autoFixType?: 'add_alt' | 'fix_contrast' | 'increase_font_size';
  suggestedFix?: string | number;
}

export interface AccessibilityAuditResult {
  score: number; // 0 to 100
  wcagLevel: 'AAA' | 'AA' | 'A' | 'Fail';
  totalChecks: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: AccessibilityIssue[];
  passedChecks: string[];
}

// Calculate relative luminance for an sRGB component
function getLuminanceComponent(c: number): number {
  const srgb = c / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

// Calculate WCAG relative luminance
export function calculateLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const r = getLuminanceComponent(rgb.r);
  const g = getLuminanceComponent(rgb.g);
  const b = getLuminanceComponent(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio between two hex colors: (L1 + 0.05) / (L2 + 0.05)
export function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = calculateLuminance(color1);
  const l2 = calculateLuminance(color2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

// Extract base color from slide background definition (color or gradient)
export function getSlideBackgroundColor(bg: { type: string; value: string }): string {
  if (bg.type === 'color' && bg.value.startsWith('#')) {
    return bg.value;
  }
  // If gradient, extract first hex code found or fallback
  const hexMatch = bg.value.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
  if (hexMatch) {
    return hexMatch[0];
  }
  return '#0f172a'; // default dark slate
}

// Run audit on full course
export function auditCourseAccessibility(course: CourseManifest): AccessibilityAuditResult {
  const issues: AccessibilityIssue[] = [];
  const passedChecks: string[] = [];
  let totalChecks = 0;

  course.pages.forEach((page, pageIndex) => {
    const pageBgColor = getSlideBackgroundColor(page.background);

    // 1. Check slide has title
    totalChecks++;
    if (!page.title || page.title.trim().length === 0) {
      issues.push({
        id: `issue_page_title_${page.id}`,
        pageId: page.id,
        pageTitle: `Slide ${pageIndex + 1}`,
        pageIndex,
        severity: 'warning',
        title: 'Missing Slide Title',
        description: 'Each slide should have a descriptive title for screen reader navigation.',
        recommendation: 'Add a clear slide title in the Slide Inspector.',
        wcagCriterion: '2.4.2 Page Titled (Level A)',
      });
    }

    // 2. Audit each canvas node
    page.nodes.forEach((node) => {
      // IMAGE CHECKS
      if (node.type === 'image') {
        const img = node as ImageNode;
        totalChecks++;
        if (!img.alt || img.alt.trim().length === 0) {
          issues.push({
            id: `issue_alt_${img.id}`,
            pageId: page.id,
            pageTitle: page.title || `Slide ${pageIndex + 1}`,
            pageIndex,
            nodeId: img.id,
            nodeType: 'image',
            severity: 'critical',
            title: 'Missing Image Alt Text',
            description: 'Image has no alternative text description, making it inaccessible to screen readers.',
            recommendation: 'Provide descriptive alt text conveying the educational purpose of this graphic.',
            wcagCriterion: '1.1.1 Non-text Content (Level A)',
            autoFixType: 'add_alt',
            suggestedFix: 'Educational course illustration',
          });
        } else if (img.alt.toLowerCase() === 'image' || img.alt.toLowerCase() === 'photo') {
          issues.push({
            id: `issue_alt_generic_${img.id}`,
            pageId: page.id,
            pageTitle: page.title || `Slide ${pageIndex + 1}`,
            pageIndex,
            nodeId: img.id,
            nodeType: 'image',
            severity: 'warning',
            title: 'Generic Image Alt Text',
            description: `Alt text "${img.alt}" is too vague for visually impaired learners.`,
            recommendation: 'Replace generic labels with specific educational context.',
            wcagCriterion: '1.1.1 Non-text Content (Level A)',
          });
        }
      }

      // TEXT CHECKS
      if (node.type === 'text') {
        const text = node as TextNode;

        // Font Size check
        totalChecks++;
        if (text.fontSize < 12) {
          issues.push({
            id: `issue_font_size_${text.id}`,
            pageId: page.id,
            pageTitle: page.title || `Slide ${pageIndex + 1}`,
            pageIndex,
            nodeId: text.id,
            nodeType: 'text',
            severity: 'warning',
            title: 'Small Font Size',
            description: `Font size is ${text.fontSize}px, which may be difficult for learners with visual impairments to read.`,
            recommendation: 'Increase font size to at least 14px or 16px.',
            wcagCriterion: '1.4.4 Resize Text (Level AA)',
            autoFixType: 'increase_font_size',
            suggestedFix: 14,
          });
        }

        // Color Contrast check
        totalChecks++;
        const bg = text.backgroundColor && text.backgroundColor.startsWith('#')
          ? text.backgroundColor
          : pageBgColor;
        const textCol = text.color && text.color.startsWith('#') ? text.color : '#ffffff';
        const ratio = calculateContrastRatio(textCol, bg);
        const minRatio = text.fontSize >= 18 || (text.fontSize >= 14 && text.fontWeight === 'bold') ? 3.0 : 4.5;

        if (ratio < minRatio) {
          const isLighterBg = calculateLuminance(bg) > 0.5;
          const fixColor = isLighterBg ? '#0f172a' : '#ffffff';

          issues.push({
            id: `issue_contrast_${text.id}`,
            pageId: page.id,
            pageTitle: page.title || `Slide ${pageIndex + 1}`,
            pageIndex,
            nodeId: text.id,
            nodeType: 'text',
            severity: 'critical',
            title: 'Low Text Color Contrast',
            description: `Contrast ratio is ${ratio.toFixed(2)}:1, failing the WCAG ${minRatio}:1 minimum requirement.`,
            recommendation: `Increase contrast between text (${textCol}) and background (${bg}). Recommended: ${fixColor}`,
            wcagCriterion: '1.4.3 Contrast (Minimum) (Level AA)',
            autoFixType: 'fix_contrast',
            suggestedFix: fixColor,
          });
        }
      }

      // QUIZ CHECKS
      if (node.type === 'quiz') {
        const quiz = node as QuizNode;
        totalChecks++;
        if (!quiz.options || quiz.options.length < 2) {
          issues.push({
            id: `issue_quiz_options_${quiz.id}`,
            pageId: page.id,
            pageTitle: page.title || `Slide ${pageIndex + 1}`,
            pageIndex,
            nodeId: quiz.id,
            nodeType: 'quiz',
            severity: 'warning',
            title: 'Incomplete Quiz Options',
            description: 'Quiz question should offer at least two distinct answer choices for assessment.',
            recommendation: 'Add another option with clear answer feedback.',
            wcagCriterion: '3.3.2 Labels or Instructions (Level A)',
          });
        }
      }
    });
  });

  if (issues.length === 0) {
    passedChecks.push('All images include informative alternative text');
    passedChecks.push('All text elements pass WCAG 2.1 AA color contrast');
    passedChecks.push('All typography adheres to minimum readability thresholds (12px+)');
    passedChecks.push('All slides contain clear headings and titles');
  } else {
    if (!issues.some((i) => i.nodeType === 'image')) {
      passedChecks.push('All image assets have accessible alt text');
    }
    if (!issues.some((i) => i.title.includes('Contrast'))) {
      passedChecks.push('All text elements pass WCAG AA contrast');
    }
    if (!issues.some((i) => i.title.includes('Font Size'))) {
      passedChecks.push('All typography meets minimum legible sizing');
    }
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  // Compute 0-100 score
  const penalty = criticalCount * 18 + warningCount * 6 + infoCount * 2;
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  let wcagLevel: 'AAA' | 'AA' | 'A' | 'Fail' = 'AAA';
  if (criticalCount > 0) {
    wcagLevel = 'Fail';
  } else if (warningCount > 2) {
    wcagLevel = 'A';
  } else if (warningCount > 0) {
    wcagLevel = 'AA';
  }

  return {
    score,
    wcagLevel,
    totalChecks,
    criticalCount,
    warningCount,
    infoCount,
    issues,
    passedChecks,
  };
}
