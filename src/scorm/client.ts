import { Scorm12Api, ScormLessonStatus } from './types';
import { findScorm12Api } from './discovery';
import { globalMockLms } from './mockLms';
import { formatCMITimespan } from './time';
import { encodeSuspendData, decodeSuspendData, DEFAULT_SUSPEND_PAYLOAD } from './suspend';
import { SuspendPayload } from '../types/schema';

export class ScormClient {
  private api: Scorm12Api;
  private isConnected = false;
  private startTime = 0;
  private isMock = false;

  constructor(preferredApi?: Scorm12Api) {
    if (preferredApi) {
      this.api = preferredApi;
      this.isMock = false;
    } else {
      const discovered = findScorm12Api();
      if (discovered) {
        this.api = discovered;
        this.isMock = false;
      } else {
        this.api = globalMockLms;
        this.isMock = true;
      }
    }
  }

  public getIsMock(): boolean {
    return this.isMock;
  }

  public initialize(): boolean {
    if (this.isConnected) return true;
    const res = this.api.LMSInitialize('');
    this.isConnected = res === 'true';
    if (this.isConnected) {
      this.startTime = Date.now();
      // Ensure initial status is at least incomplete if not attempted
      const currentStatus = this.api.LMSGetValue('cmi.core.lesson_status');
      if (!currentStatus || currentStatus === 'not attempted') {
        this.api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        this.api.LMSCommit('');
      }
    }
    return this.isConnected;
  }

  public terminate(): boolean {
    if (!this.isConnected) return true;
    this.saveSessionTime();
    const res = this.api.LMSFinish('');
    this.isConnected = false;
    return res === 'true';
  }

  public saveSessionTime(): void {
    if (!this.isConnected || this.startTime === 0) return;
    const elapsed = Date.now() - this.startTime;
    const timeSpan = formatCMITimespan(elapsed);
    this.api.LMSSetValue('cmi.core.session_time', timeSpan);
  }

  public getLessonLocation(): string {
    if (!this.isConnected) return '0';
    return this.api.LMSGetValue('cmi.core.lesson_location') || '0';
  }

  public setLessonLocation(pageIndex: number): boolean {
    if (!this.isConnected) return false;
    const res = this.api.LMSSetValue('cmi.core.lesson_location', String(pageIndex));
    this.api.LMSCommit('');
    return res === 'true';
  }

  public getLessonStatus(): ScormLessonStatus {
    if (!this.isConnected) return 'not attempted';
    return (this.api.LMSGetValue('cmi.core.lesson_status') as ScormLessonStatus) || 'incomplete';
  }

  public setLessonStatus(status: ScormLessonStatus): boolean {
    if (!this.isConnected) return false;
    const res = this.api.LMSSetValue('cmi.core.lesson_status', status);
    this.api.LMSCommit('');
    return res === 'true';
  }

  public setScore(rawScore: number, min = 0, max = 100): boolean {
    if (!this.isConnected) return false;
    this.api.LMSSetValue('cmi.core.score.min', String(min));
    this.api.LMSSetValue('cmi.core.score.max', String(max));
    const res = this.api.LMSSetValue('cmi.core.score.raw', String(Math.round(rawScore)));
    this.api.LMSCommit('');
    return res === 'true';
  }

  public getScore(): number {
    if (!this.isConnected) return 0;
    const val = this.api.LMSGetValue('cmi.core.score.raw');
    return parseFloat(val) || 0;
  }

  public getSuspendPayload(): SuspendPayload {
    if (!this.isConnected) return { ...DEFAULT_SUSPEND_PAYLOAD };
    const raw = this.api.LMSGetValue('cmi.suspend_data');
    return decodeSuspendData(raw);
  }

  public saveSuspendPayload(payload: Partial<SuspendPayload>): boolean {
    if (!this.isConnected) return false;
    const str = encodeSuspendData(payload);
    const res = this.api.LMSSetValue('cmi.suspend_data', str);
    this.api.LMSCommit('');
    return res === 'true';
  }

  public commit(): boolean {
    if (!this.isConnected) return false;
    return this.api.LMSCommit('') === 'true';
  }

  public getRawValue(element: string): string {
    if (!this.isConnected) return '';
    return this.api.LMSGetValue(element);
  }

  public setRawValue(element: string, value: string): string {
    if (!this.isConnected) return 'false';
    return this.api.LMSSetValue(element, value);
  }
}
