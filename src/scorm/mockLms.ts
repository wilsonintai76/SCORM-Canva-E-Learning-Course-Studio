import { Scorm12Api, ScormLogEntry, ScormLessonStatus } from './types';

export class MockScorm12Engine implements Scorm12Api {
  private initialized = false;
  private finished = false;
  private lastErrorCode = '0';
  private logs: ScormLogEntry[] = [];
  private listeners: Set<(logs: ScormLogEntry[], data: Record<string, string>) => void> = new Set();

  private cmi: Record<string, string> = {
    'cmi.core._children': 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time',
    'cmi.core.student_id': 'STUDENT_001',
    'cmi.core.student_name': 'Taylor, Alex',
    'cmi.core.lesson_location': '0',
    'cmi.core.credit': 'credit',
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.entry': 'ab-initio',
    'cmi.core.score._children': 'raw,min,max',
    'cmi.core.score.raw': '0',
    'cmi.core.score.min': '0',
    'cmi.core.score.max': '100',
    'cmi.core.total_time': '0000:00:00.00',
    'cmi.core.lesson_mode': 'normal',
    'cmi.core.exit': '',
    'cmi.core.session_time': '0000:00:00.00',
    'cmi.suspend_data': '',
    'cmi.launch_data': '',
    'cmi.student_data.mastery_score': '80',
  };

  private errorStrings: Record<string, string> = {
    '0': 'No error',
    '101': 'General exception',
    '201': 'Invalid argument error',
    '202': 'Element cannot have children',
    '203': 'Element not an array - cannot have count',
    '301': 'Not initialized',
    '401': 'Not implemented error',
    '402': 'Invalid set value, element is a keyword',
    '403': 'Element is read only',
    '404': 'Element is write only',
    '405': 'Incorrect Data Type',
  };

  public subscribe(fn: (logs: ScormLogEntry[], data: Record<string, string>) => void): () => void {
    this.listeners.add(fn);
    fn(this.getLogs(), this.getData());
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    const logs = this.getLogs();
    const data = this.getData();
    this.listeners.forEach((fn) => fn(logs, data));
  }

  public getLogs(): ScormLogEntry[] {
    return [...this.logs];
  }

  public getData(): Record<string, string> {
    return { ...this.cmi };
  }

  public clearLogs(): void {
    this.logs = [];
    this.notify();
  }

  public reset(): void {
    this.initialized = false;
    this.finished = false;
    this.lastErrorCode = '0';
    this.cmi['cmi.core.lesson_location'] = '0';
    this.cmi['cmi.core.lesson_status'] = 'not attempted';
    this.cmi['cmi.core.score.raw'] = '0';
    this.cmi['cmi.core.session_time'] = '0000:00:00.00';
    this.cmi['cmi.suspend_data'] = '';
    this.logs = [];
    this.notify();
  }

  private addLog(method: ScormLogEntry['method'], param?: string, value?: string, result = 'true'): void {
    const entry: ScormLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method,
      param,
      value,
      result,
      errorCode: this.lastErrorCode,
      errorString: this.errorStrings[this.lastErrorCode],
    };
    this.logs.unshift(entry);
    if (this.logs.length > 200) {
      this.logs.pop();
    }
    this.notify();
  }

  LMSInitialize(param: string): string {
    if (param !== '') {
      this.lastErrorCode = '201';
      this.addLog('LMSInitialize', param, undefined, 'false');
      return 'false';
    }
    if (this.initialized) {
      this.lastErrorCode = '101';
      this.addLog('LMSInitialize', param, undefined, 'false');
      return 'false';
    }

    this.initialized = true;
    this.finished = false;
    this.lastErrorCode = '0';
    if (this.cmi['cmi.core.lesson_status'] === 'not attempted') {
      this.cmi['cmi.core.lesson_status'] = 'incomplete';
    }
    this.addLog('LMSInitialize', param, undefined, 'true');
    return 'true';
  }

  LMSFinish(param: string): string {
    if (param !== '') {
      this.lastErrorCode = '201';
      this.addLog('LMSFinish', param, undefined, 'false');
      return 'false';
    }
    if (!this.initialized || this.finished) {
      this.lastErrorCode = '301';
      this.addLog('LMSFinish', param, undefined, 'false');
      return 'false';
    }

    this.finished = true;
    this.initialized = false;
    this.lastErrorCode = '0';
    this.addLog('LMSFinish', param, undefined, 'true');
    return 'true';
  }

  LMSGetValue(element: string): string {
    if (!this.initialized) {
      this.lastErrorCode = '301';
      this.addLog('LMSGetValue', element, undefined, '');
      return '';
    }

    if (element in this.cmi) {
      const val = this.cmi[element];
      this.lastErrorCode = '0';
      this.addLog('LMSGetValue', element, val, val);
      return val;
    }

    this.lastErrorCode = '401';
    this.addLog('LMSGetValue', element, undefined, '');
    return '';
  }

  LMSSetValue(element: string, value: string): string {
    if (!this.initialized) {
      this.lastErrorCode = '301';
      this.addLog('LMSSetValue', element, value, 'false');
      return 'false';
    }

    // Read only elements
    const readOnly = [
      'cmi.core._children',
      'cmi.core.student_id',
      'cmi.core.student_name',
      'cmi.core.credit',
      'cmi.core.entry',
      'cmi.core.total_time',
      'cmi.core.lesson_mode',
      'cmi.student_data.mastery_score',
    ];

    if (readOnly.includes(element)) {
      this.lastErrorCode = '403';
      this.addLog('LMSSetValue', element, value, 'false');
      return 'false';
    }

    this.cmi[element] = String(value);
    this.lastErrorCode = '0';
    this.addLog('LMSSetValue', element, value, 'true');
    return 'true';
  }

  LMSCommit(param: string): string {
    if (param !== '') {
      this.lastErrorCode = '201';
      this.addLog('LMSCommit', param, undefined, 'false');
      return 'false';
    }
    if (!this.initialized) {
      this.lastErrorCode = '301';
      this.addLog('LMSCommit', param, undefined, 'false');
      return 'false';
    }

    this.lastErrorCode = '0';
    this.addLog('LMSCommit', param, undefined, 'true');
    return 'true';
  }

  LMSGetLastError(): string {
    return this.lastErrorCode;
  }

  LMSGetErrorString(errorCode: string): string {
    return this.errorStrings[errorCode] || 'Unknown error';
  }

  LMSGetDiagnostic(errorCode: string): string {
    return `Diagnostic for code ${errorCode}: ${this.errorStrings[errorCode] || 'None'}`;
  }
}

// Global singleton instance for simulation and debugger
export const globalMockLms = new MockScorm12Engine();
