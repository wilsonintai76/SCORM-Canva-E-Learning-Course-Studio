/**
 * SCORM 1.2 API Interface and Logger Types
 */

export interface Scorm12Api {
  LMSInitialize(param: string): string; // "true" or "false"
  LMSFinish(param: string): string;
  LMSGetValue(element: string): string;
  LMSSetValue(element: string, value: string): string;
  LMSCommit(param: string): string;
  LMSGetLastError(): string;
  LMSGetErrorString(errorCode: string): string;
  LMSGetDiagnostic(errorCode: string): string;
}

export type ScormLessonStatus = 'passed' | 'completed' | 'failed' | 'incomplete' | 'browsed' | 'not attempted';

export interface ScormLogEntry {
  id: string;
  timestamp: string;
  method: 'LMSInitialize' | 'LMSFinish' | 'LMSGetValue' | 'LMSSetValue' | 'LMSCommit' | 'LMSGetLastError';
  param?: string;
  value?: string;
  result: string;
  errorCode?: string;
  errorString?: string;
}

export interface ScormState {
  isInitialized: boolean;
  isFinished: boolean;
  lessonLocation: string;
  lessonStatus: ScormLessonStatus;
  scoreRaw: number;
  scoreMin: number;
  scoreMax: number;
  suspendData: string;
  studentName: string;
  studentId: string;
  sessionTime: string;
  totalTime: string;
}
