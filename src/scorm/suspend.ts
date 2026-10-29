import { SuspendPayload } from '../types/schema';

export const SUSPEND_PAYLOAD_VERSION = 1;

export const DEFAULT_SUSPEND_PAYLOAD: SuspendPayload = {
  v: SUSPEND_PAYLOAD_VERSION,
  currentPageIndex: 0,
  visitedPages: [],
  quizAnswers: {},
  quizScores: {},
  totalScore: 0,
  maxScore: 100,
  percentageScore: 0,
  isCompleted: false,
  isPassed: false,
  timestamp: Date.now(),
};

/**
 * Encodes state to SCORM suspend_data string
 */
export function encodeSuspendData(payload: Partial<SuspendPayload>): string {
  const merged: SuspendPayload = {
    ...DEFAULT_SUSPEND_PAYLOAD,
    ...payload,
    v: SUSPEND_PAYLOAD_VERSION,
    timestamp: Date.now(),
  };

  const json = JSON.stringify(merged);
  // SCORM 1.2 character limit check (4096 chars)
  if (json.length > 4096) {
    console.warn(`[SCORM] Suspend data length (${json.length}) exceeds SCORM 1.2 standard 4096 character limit!`);
  }
  return json;
}

/**
 * Safely decodes SCORM suspend_data string with fallback
 */
export function decodeSuspendData(raw: string | null | undefined): SuspendPayload {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { ...DEFAULT_SUSPEND_PAYLOAD };
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        v: parsed.v || SUSPEND_PAYLOAD_VERSION,
        currentPageIndex: typeof parsed.currentPageIndex === 'number' ? parsed.currentPageIndex : 0,
        visitedPages: Array.isArray(parsed.visitedPages) ? parsed.visitedPages : [],
        quizAnswers: typeof parsed.quizAnswers === 'object' && parsed.quizAnswers !== null ? parsed.quizAnswers : {},
        quizScores: typeof parsed.quizScores === 'object' && parsed.quizScores !== null ? parsed.quizScores : {},
        totalScore: typeof parsed.totalScore === 'number' ? parsed.totalScore : 0,
        maxScore: typeof parsed.maxScore === 'number' ? parsed.maxScore : 100,
        percentageScore: typeof parsed.percentageScore === 'number' ? parsed.percentageScore : 0,
        isCompleted: Boolean(parsed.isCompleted),
        isPassed: Boolean(parsed.isPassed),
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
      };
    }
  } catch (err) {
    console.error('[SCORM] Failed to parse suspend_data JSON:', err);
  }

  return { ...DEFAULT_SUSPEND_PAYLOAD };
}
