export interface HudCoordinates {
  x: number;
  y: number;
}

export interface HudPositionsState {
  topToolbar: HudCoordinates | null;
  zoomHud: HudCoordinates | null;
}

const HUD_STORAGE_KEY = 'scorm_canva_hud_positions_v1';

/**
 * Clamps a floating HUD bar's (x, y) top-left offset within its parent container.
 */
export function clampHudPosition(
  x: number,
  y: number,
  hudWidth: number,
  hudHeight: number,
  containerWidth: number,
  containerHeight: number,
  margin = 8
): HudCoordinates {
  const maxX = Math.max(margin, containerWidth - hudWidth - margin);
  const maxY = Math.max(margin, containerHeight - hudHeight - margin);
  return {
    x: Math.round(Math.min(Math.max(margin, x), maxX)),
    y: Math.round(Math.min(Math.max(margin, y), maxY)),
  };
}

export function loadSavedHudPositions(): HudPositionsState {
  try {
    if (typeof localStorage === 'undefined') {
      return { topToolbar: null, zoomHud: null };
    }
    const raw = localStorage.getItem(HUD_STORAGE_KEY);
    if (!raw) return { topToolbar: null, zoomHud: null };
    const parsed = JSON.parse(raw);
    return {
      topToolbar:
        parsed?.topToolbar &&
        typeof parsed.topToolbar.x === 'number' &&
        typeof parsed.topToolbar.y === 'number'
          ? { x: parsed.topToolbar.x, y: parsed.topToolbar.y }
          : null,
      zoomHud:
        parsed?.zoomHud &&
        typeof parsed.zoomHud.x === 'number' &&
        typeof parsed.zoomHud.y === 'number'
          ? { x: parsed.zoomHud.x, y: parsed.zoomHud.y }
          : null,
    };
  } catch {
    return { topToolbar: null, zoomHud: null };
  }
}

export function saveHudPositions(state: HudPositionsState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HUD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}
