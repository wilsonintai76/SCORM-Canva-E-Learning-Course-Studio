/**
 * SCORM 1.2 CMITimespan Formatter and Parser
 * Format: HHHH:MM:SS.SS (e.g. 0000:05:32.40 or 00:05:32)
 */

export function formatCMITimespan(ms: number): string {
  if (isNaN(ms) || ms < 0) {
    ms = 0;
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hundredths = Math.floor((ms % 1000) / 10);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number, width = 2) => String(n).padStart(width, '0');

  // SCORM 1.2 specification: HHHH:MM:SS.SS (with 2-4 digits for hours)
  return `${pad(hours, 4)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(hundredths, 2)}`;
}

export function parseCMITimespan(cmiTime: string): number {
  if (!cmiTime || typeof cmiTime !== 'string') return 0;
  const parts = cmiTime.trim().split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  
  const secParts = parts[2].split('.');
  const seconds = parseInt(secParts[0], 10) || 0;
  let hundredths = 0;
  if (secParts[1]) {
    const rawH = secParts[1].slice(0, 2).padEnd(2, '0');
    hundredths = parseInt(rawH, 10) || 0;
  }

  return (hours * 3600 + minutes * 60 + seconds) * 1000 + hundredths * 10;
}
