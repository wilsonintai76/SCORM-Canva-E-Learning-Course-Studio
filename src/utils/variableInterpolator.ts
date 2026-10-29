import { CourseVariable } from '../types/schema';

export const DEFAULT_COURSE_VARIABLES: CourseVariable[] = [
  {
    id: 'var_userName',
    name: 'userName',
    type: 'string',
    defaultValue: 'Learner',
    currentValue: 'Alex Rivera',
    description: 'Name of the current student or participant',
  },
  {
    id: 'var_department',
    name: 'department',
    type: 'string',
    defaultValue: 'Information Security',
    currentValue: 'Information Security',
    description: 'Learner organizational unit or team',
  },
  {
    id: 'var_quizScore',
    name: 'quizScore',
    type: 'number',
    defaultValue: '0',
    currentValue: '85',
    description: 'Learner calculated quiz performance score (%)',
  },
  {
    id: 'var_passingScore',
    name: 'passingScore',
    type: 'number',
    defaultValue: '80',
    currentValue: '80',
    description: 'Minimum score percentage required to pass',
  },
  {
    id: 'var_completionDate',
    name: 'completionDate',
    type: 'string',
    defaultValue: 'Today',
    currentValue: new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    description: 'Date the module or slide was completed',
  },
];

/**
 * Replaces {{variableName}} tokens in text with their current or default values
 */
export function interpolateVariables(
  text: string,
  variables: CourseVariable[] = [],
  extraVars: Record<string, string> = {}
): string {
  if (!text || !text.includes('{{')) return text;

  // Build combined map of all known variables
  const varMap: Record<string, string> = {};

  // 1. Built-in defaults
  DEFAULT_COURSE_VARIABLES.forEach((v) => {
    varMap[v.name] = v.currentValue ?? v.defaultValue;
  });

  // 2. Course-level user variables
  variables.forEach((v) => {
    varMap[v.name] = v.currentValue ?? v.defaultValue;
  });

  // 3. Runtime dynamic extras
  Object.entries(extraVars).forEach(([k, val]) => {
    varMap[k] = val;
  });

  // Replace {{varName}}
  return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
    if (varMap[varName] !== undefined) {
      return varMap[varName];
    }
    return match; // Keep unresolved tokens intact
  });
}
