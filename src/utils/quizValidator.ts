/**
 * Validation helper for Quiz template configurations.
 * Validates required fields (question text, options, correct answers, feedback messages, points)
 * before applying quiz templates or nodes to the canvas.
 */

import { QuizNode, QuizOption } from '../types/schema';

export interface QuizValidationError {
  field: string;
  message: string;
}

export interface QuizValidationResult {
  isValid: boolean;
  errors: QuizValidationError[];
  warnings: QuizValidationError[];
  summary: string;
}

export interface QuizInputOption {
  id?: string;
  text?: string;
  isCorrect?: boolean;
  feedback?: string;
}

export interface QuizInputConfig {
  id?: string;
  type?: string;
  quizType?: 'single' | 'multiple' | 'true-false' | 'matching';
  question?: string;
  points?: number;
  options?: QuizInputOption[];
  quizLogic?: {
    onPass?: string;
    onFail?: string;
    correctFeedback?: string;
    incorrectFeedback?: string;
  };
  themeColor?: string;
  accentColor?: string;
  name?: string;
  [key: string]: any;
}

/**
 * Validates a quiz template or node configuration against SCORM 1.2 and pedagogical requirements.
 */
export function validateQuizConfig(quiz: QuizInputConfig | null | undefined): QuizValidationResult {
  const errors: QuizValidationError[] = [];
  const warnings: QuizValidationError[] = [];

  if (!quiz) {
    return {
      isValid: false,
      errors: [{ field: 'quiz', message: 'Quiz configuration object is missing or null.' }],
      warnings: [],
      summary: 'Quiz configuration object is missing.',
    };
  }

  // 1. Question Prompt Validation
  if (!quiz.question || typeof quiz.question !== 'string' || !quiz.question.trim()) {
    errors.push({
      field: 'question',
      message: 'Question prompt is required and cannot be blank.',
    });
  } else if (quiz.question.trim().length < 5) {
    warnings.push({
      field: 'question',
      message: 'Question prompt is unusually short (less than 5 characters).',
    });
  }

  // 2. Options Array Existence & Minimum Count
  const options = quiz.options;
  if (!options || !Array.isArray(options) || options.length < 2) {
    errors.push({
      field: 'options',
      message: 'A quiz must contain at least 2 answer choices.',
    });
  } else {
    // 3. Inspect Individual Answer Choices
    let correctCount = 0;
    let missingTextCount = 0;
    let missingFeedbackCount = 0;

    options.forEach((opt, idx) => {
      const optionNum = idx + 1;
      const text = opt.text ? String(opt.text).trim() : '';

      if (!text) {
        missingTextCount++;
        errors.push({
          field: `options[${idx}].text`,
          message: `Answer choice #${optionNum} has empty or blank text.`,
        });
      }

      if (opt.isCorrect === true) {
        correctCount++;
      }

      const feedback = opt.feedback ? String(opt.feedback).trim() : '';
      if (!feedback) {
        missingFeedbackCount++;
      }
    });

    // 4. Correct Answer Presence Validation
    const quizType =
      quiz.quizType ||
      (['single', 'multiple', 'true-false', 'matching'].includes(quiz.type as any)
        ? (quiz.type as any)
        : 'single');

    if (correctCount === 0) {
      errors.push({
        field: 'correctAnswers',
        message: 'No correct answer is selected. At least one option must be marked as correct.',
      });
    } else if (quizType === 'single' && correctCount > 1) {
      warnings.push({
        field: 'correctAnswers',
        message: `Multiple choices (${correctCount}) are marked correct for a single-select quiz. Only the first will be evaluated.`,
      });
    } else if (quizType === 'true-false' && correctCount !== 1) {
      errors.push({
        field: 'correctAnswers',
        message: 'True/False questions must have exactly 1 correct answer (True or False).',
      });
    }

    // 5. Feedback Messages Validation
    const hasGlobalFeedback =
      (quiz.quizLogic?.correctFeedback && String(quiz.quizLogic.correctFeedback).trim().length > 0) ||
      (quiz.quizLogic?.incorrectFeedback && String(quiz.quizLogic.incorrectFeedback).trim().length > 0);

    if (missingFeedbackCount === options.length && !hasGlobalFeedback) {
      // If neither option feedback nor global feedback exists, it's an error
      errors.push({
        field: 'feedback',
        message: 'Feedback messages are missing. Provide rationale in options or general feedback rules.',
      });
    } else if (missingFeedbackCount > 0 && !hasGlobalFeedback) {
      warnings.push({
        field: 'feedback',
        message: `${missingFeedbackCount} option(s) are missing explanation feedback for learners.`,
      });
    }
  }

  // 6. Points Scoring Validation
  if (quiz.points !== undefined) {
    const pointsNum = Number(quiz.points);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      errors.push({
        field: 'points',
        message: 'Points must be a positive number greater than 0.',
      });
    }
  }

  const isValid = errors.length === 0;
  const summary = isValid
    ? warnings.length > 0
      ? `Valid with ${warnings.length} warning(s)`
      : 'Quiz configuration is valid'
    : `Validation failed: ${errors.map((e) => e.message).join('; ')}`;

  return {
    isValid,
    errors,
    warnings,
    summary,
  };
}

/**
 * Fast boolean check if quiz configuration is valid.
 */
export function isQuizConfigValid(quiz: QuizInputConfig | null | undefined): boolean {
  return validateQuizConfig(quiz).isValid;
}
