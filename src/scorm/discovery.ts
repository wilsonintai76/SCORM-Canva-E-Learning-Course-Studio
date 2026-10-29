import { Scorm12Api } from './types';

/**
 * Searches the DOM window hierarchy for the SCORM 1.2 API object.
 * Standard SCORM 1.2 searches window, window.parent, window.top, and window.opener.
 */
export function findScorm12Api(win: Window = window): Scorm12Api | null {
  let attempts = 0;
  const MAX_ATTEMPTS = 50;

  let currentWin: Window | null = win;

  while (currentWin && attempts < MAX_ATTEMPTS) {
    try {
      // Check for SCORM 1.2 API
      if ((currentWin as unknown as { API?: Scorm12Api }).API) {
        return (currentWin as unknown as { API: Scorm12Api }).API;
      }
    } catch {
      // Cross-origin iframe security restriction
      break;
    }

    // Try opener if parent is top
    if (currentWin.parent && currentWin.parent !== currentWin) {
      currentWin = currentWin.parent;
    } else if (currentWin.opener) {
      try {
        if ((currentWin.opener as unknown as { API?: Scorm12Api }).API) {
          return (currentWin.opener as unknown as { API: Scorm12Api }).API;
        }
      } catch {
        // Cross-origin opener
      }
      break;
    } else {
      break;
    }
    attempts++;
  }

  return null;
}
