import { snapValueToGrid } from './snappingEngine';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputeResizedBoundsParams {
  initialBounds: ElementBounds;
  handle: ResizeHandle;
  deltaX: number;
  deltaY: number;
  minSize?: number;
  preserveAspectRatio?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
}

const isCornerHandle = (handle: ResizeHandle): boolean =>
  handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw';

/**
 * Computes new element bounds (x, y, width, height) for any of the 8 corner or edge resize handles.
 * Supports grid snapping, minimum size clamping without edge flipping, and Shift aspect-ratio lock.
 */
export function computeResizedBounds({
  initialBounds,
  handle,
  deltaX,
  deltaY,
  minSize = 20,
  preserveAspectRatio = false,
  snapToGrid = false,
  gridSize = 10,
}: ComputeResizedBoundsParams): ElementBounds {
  const initX = initialBounds.x;
  const initY = initialBounds.y;
  const initW = Math.max(minSize, initialBounds.width);
  const initH = Math.max(minSize, initialBounds.height);
  const rightEdge = initX + initW;
  const bottomEdge = initY + initH;

  let newX = initX;
  let newY = initY;
  let newW = initW;
  let newH = initH;

  if (handle.includes('e')) {
    let targetRight = rightEdge + deltaX;
    if (snapToGrid) {
      targetRight = snapValueToGrid(targetRight, gridSize).val;
    }
    targetRight = Math.max(initX + minSize, targetRight);
    newW = targetRight - initX;
  }

  if (handle.includes('s')) {
    let targetBottom = bottomEdge + deltaY;
    if (snapToGrid) {
      targetBottom = snapValueToGrid(targetBottom, gridSize).val;
    }
    targetBottom = Math.max(initY + minSize, targetBottom);
    newH = targetBottom - initY;
  }

  if (handle.includes('w')) {
    let targetX = initX + deltaX;
    if (snapToGrid) {
      targetX = snapValueToGrid(targetX, gridSize).val;
    }
    targetX = Math.min(rightEdge - minSize, targetX);
    newX = targetX;
    newW = rightEdge - targetX;
  }

  if (handle.includes('n')) {
    let targetY = initY + deltaY;
    if (snapToGrid) {
      targetY = snapValueToGrid(targetY, gridSize).val;
    }
    targetY = Math.min(bottomEdge - minSize, targetY);
    newY = targetY;
    newH = bottomEdge - targetY;
  }

  if (preserveAspectRatio && isCornerHandle(handle) && initH > 0 && initW > 0) {
    const aspect = initW / initH;
    const scaleX = newW / initW;
    const scaleY = newH / initH;

    if (Math.abs(scaleX - 1) >= Math.abs(scaleY - 1)) {
      newH = Math.max(minSize, newW / aspect);
      if (newH === minSize) {
        newW = Math.max(minSize, newH * aspect);
      }
    } else {
      newW = Math.max(minSize, newH * aspect);
      if (newW === minSize) {
        newH = Math.max(minSize, newW / aspect);
      }
    }

    if (handle.includes('w')) {
      newX = rightEdge - newW;
    }
    if (handle.includes('n')) {
      newY = bottomEdge - newH;
    }
  }

  return {
    x: Math.round(newX),
    y: Math.round(newY),
    width: Math.max(minSize, Math.round(newW)),
    height: Math.max(minSize, Math.round(newH)),
  };
}

export function computeMovedPositions(
  initialNodesMap: Record<string, { x: number; y: number }>,
  offsetX: number,
  offsetY: number
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {};
  Object.entries(initialNodesMap).forEach(([id, pos]) => {
    result[id] = {
      x: Math.round(pos.x + offsetX),
      y: Math.round(pos.y + offsetY),
    };
  });
  return result;
}
