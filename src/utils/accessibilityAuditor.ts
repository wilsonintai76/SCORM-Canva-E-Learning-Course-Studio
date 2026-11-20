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
  category?: 'contrast' | 'readability' | 'alignment' | 'structure';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  wcagCriterion: string; // e.g. "1.4.3 Contrast (Minimum) (Level AA)"
  autoFixType?: 'add_alt' | 'fix_contrast' | 'increase_font_size' | 'fix_alignment' | 'standardize_font';
  suggestedFix?: string | number | { x?: number; y?: number };
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

// Run audit on full course or specific page
export function auditCourseAccessibility(
  course: CourseManifest,
  targetPageIndex?: number
): AccessibilityAuditResult {
  const issues: AccessibilityIssue[] = [];
  const passedChecks: string[] = [];
  let totalChecks = 0;

  const pagesToAudit =
    targetPageIndex !== undefined && targetPageIndex >= 0 && targetPageIndex < course.pages.length
      ? [course.pages[targetPageIndex]]
      : course.pages;

  pagesToAudit.forEach((page) => {
    const pageIndex = course.pages.indexOf(page);
    const pageBgColor = getSlideBackgroundColor(page.background);

    // 1. Check slide has title
    totalChecks++;
    if (!page.title || page.title.trim().length === 0) {
      issues.push({
        id: `issue_page_title_${page.id}`,
        pageId: page.id,
        pageTitle: `Slide ${pageIndex + 1}`,
        pageIndex,
        category: 'structure',
        severity: 'warning',
        title: 'Missing Slide Title',
        description: 'Each slide should have a descriptive title for screen reader navigation.',
        recommendation: 'Add a clear slide title in the Slide Inspector.',
        wcagCriterion: '2.4.2 Page Titled (Level A)',
      });
    }

    // Check font family consistency on slide
    const textNodes = page.nodes.filter((n) => n.type === 'text') as TextNode[];
    const fontFamilies = new Set(textNodes.map((t) => t.fontFamily || 'Inter, sans-serif'));
    if (fontFamilies.size > 2) {
      totalChecks++;
      issues.push({
        id: `issue_font_inconsistency_${page.id}`,
        pageId: page.id,
        pageTitle: page.title || `Slide ${pageIndex + 1}`,
        pageIndex,
        category: 'readability',
        severity: 'warning',
        title: 'Font Family Inconsistency',
        description: `This slide uses ${fontFamilies.size} different font families, which increases cognitive load.`,
        recommendation: 'Use a maximum of 2 complementary font families per slide (e.g., heading + body).',
        wcagCriterion: '1.4.8 Visual Presentation (Level AAA)',
      });
    }

    // Check alignment consistency across elements on the slide
    const canvasW = course.canvasWidth || 960;
    const canvasH = course.canvasHeight || 540;

    page.nodes.forEach((node) => {
      // Bounds Overflow check
      totalChecks++;
      if (node.x < 0 || node.y < 0 || node.x + node.width > canvasW + 10 || node.y + node.height > canvasH + 10) {
        issues.push({
          id: `issue_overflow_${node.id}`,
          pageId: page.id,
          pageTitle: page.title || `Slide ${pageIndex + 1}`,
          pageIndex,
          nodeId: node.id,
          nodeType: node.type,
          category: 'alignment',
          severity: 'warning',
          title: 'Canvas Bounds Overflow',
          description: `Element extends outside the visible slide stage bounds (${canvasW}x${canvasH}px).`,
          recommendation: 'Reposition element so it rests completely within page margins.',
          wcagCriterion: '1.4.10 Reflow (Level AA)',
          autoFixType: 'fix_alignment',
          suggestedFix: {
            x: Math.max(40, Math.min(canvasW - node.width - 40, node.x)),
            y: Math.max(40, Math.min(canvasH - node.height - 40, node.y)),
          },
        });
      }

      // Check near-misaligned X position to standard left margin (40px or 60px)
      totalChecks++;
      if (node.x > 30 && node.x < 40 && node.x !== 40) {
        issues.push({
          id: `issue_margin_align_${node.id}`,
          pageId: page.id,
          pageTitle: page.title || `Slide ${pageIndex + 1}`,
          pageIndex,
          nodeId: node.id,
          nodeType: node.type,
          category: 'alignment',
          severity: 'info',
          title: 'Slight Left Margin Misalignment',
          description: `Element X position is ${node.x}px (slightly off standard 40px left margin).`,
          recommendation: 'Snap element left edge to 40px margin for consistent visual alignment.',
          wcagCriterion: '1.4.10 Alignment Consistency (Level AA)',
          autoFixType: 'fix_alignment',
          suggestedFix: { x: 40, y: node.y },
        });
      }

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
            category: 'structure',
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
            category: 'structure',
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
            category: 'readability',
            severity: 'warning',
            title: 'Small Font Size (<12px)',
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
            category: 'contrast',
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
            category: 'structure',
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
    passedChecks.push('All slide elements are aligned within canvas margins');
  } else {
    if (!issues.some((i) => i.nodeType === 'image')) {
      passedChecks.push('All image assets have accessible alt text');
    }
    if (!issues.some((i) => i.category === 'contrast')) {
      passedChecks.push('All text elements pass WCAG AA contrast');
    }
    if (!issues.some((i) => i.category === 'readability')) {
      passedChecks.push('All typography meets minimum legible sizing');
    }
    if (!issues.some((i) => i.category === 'alignment')) {
      passedChecks.push('All canvas elements follow standard alignment rules');
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
