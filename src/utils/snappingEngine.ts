/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SnapGuide {
  val: number;
  label: string;
  type: 'page-edge' | 'page-center' | 'component' | 'grid';
}

export interface SnapCalculationResult {
  x: number;
  y: number;
  guidesX: SnapGuide[];
  guidesY: SnapGuide[];
}

export interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
}

/**
 * Snaps a single value to the nearest grid line if within threshold
 */
export function snapValueToGrid(
  val: number,
  gridSize: number,
  threshold = 8
): { val: number; didSnap: boolean } {
  if (gridSize <= 0) return { val, didSnap: false };
  const nearest = Math.round(val / gridSize) * gridSize;
  if (Math.abs(val - nearest) <= threshold) {
    return { val: nearest, didSnap: true };
  }
  return { val, didSnap: false };
}

/**
 * Calculates snapping coordinates for an element being dragged across the canvas:
 * 1. Page Edges (Left = 0, Center-X, Right = canvasWidth)
 * 2. Page Margins (Default 40px safe area)
 * 3. Page Verticals (Top = 0, Center-Y, Bottom = canvasHeight)
 * 4. Other Components (Left, Center, Right, Adjacent Edges)
 * 5. Grid Lines (Aligned to configured gridSize)
 */
export function calculateSnapping(
  rawX: number,
  rawY: number,
  width: number,
  height: number,
  otherNodes: NodeBounds[],
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number,
  isSnapToGridEnabled: boolean,
  threshold = 8
): SnapCalculationResult {
  const guidesX: SnapGuide[] = [];
  const guidesY: SnapGuide[] = [];

  // --- 1. Candidate Horizontal X Snap Points ---
  const candX: SnapGuide[] = [
    // Page boundaries
    { val: 0, label: 'Page Left', type: 'page-edge' },
    { val: Math.round(canvasWidth / 2), label: 'Center-X', type: 'page-center' },
    { val: canvasWidth, label: 'Page Right', type: 'page-edge' },
    // Page Safe Margins
    { val: 40, label: 'Margin Left (40px)', type: 'page-edge' },
    { val: canvasWidth - 40, label: 'Margin Right', type: 'page-edge' },
  ];

  // Other components' X points
  otherNodes.forEach((node) => {
    const nodeLabel = node.type ? `${node.type.toUpperCase()}` : 'Object';
    candX.push(
      { val: node.x, label: `${nodeLabel} Left`, type: 'component' },
      { val: Math.round(node.x + node.width / 2), label: `${nodeLabel} Center-X`, type: 'component' },
      { val: node.x + node.width, label: `${nodeLabel} Right`, type: 'component' }
    );
  });

  // --- 2. Candidate Vertical Y Snap Points ---
  const candY: SnapGuide[] = [
    // Page boundaries
    { val: 0, label: 'Page Top', type: 'page-edge' },
    { val: Math.round(canvasHeight / 2), label: 'Center-Y', type: 'page-center' },
    { val: canvasHeight, label: 'Page Bottom', type: 'page-edge' },
    // Page Safe Margins
    { val: 40, label: 'Margin Top (40px)', type: 'page-edge' },
    { val: canvasHeight - 40, label: 'Margin Bottom', type: 'page-edge' },
  ];

  // Other components' Y points
  otherNodes.forEach((node) => {
    const nodeLabel = node.type ? `${node.type.toUpperCase()}` : 'Object';
    candY.push(
      { val: node.y, label: `${nodeLabel} Top`, type: 'component' },
      { val: Math.round(node.y + node.height / 2), label: `${nodeLabel} Center-Y`, type: 'component' },
      { val: node.y + node.height, label: `${nodeLabel} Bottom`, type: 'component' }
    );
  });

  // Points of the moving element being evaluated
  const movingX = [
    { val: rawX, offset: 0, part: 'Left' },
    { val: rawX + width / 2, offset: width / 2, part: 'Center' },
    { val: rawX + width, offset: width, part: 'Right' },
  ];

  const movingY = [
    { val: rawY, offset: 0, part: 'Top' },
    { val: rawY + height / 2, offset: height / 2, part: 'Center' },
    { val: rawY + height, offset: height, part: 'Bottom' },
  ];

  let snappedX = rawX;
  let didSnapX = false;

  // Check component and page edge snapping for X
  for (const movePt of movingX) {
    for (const target of candX) {
      if (Math.abs(movePt.val - target.val) <= threshold) {
        snappedX = Math.round(target.val - movePt.offset);
        guidesX.push({
          val: target.val,
          label: `${target.label}`,
          type: target.type,
        });
        didSnapX = true;
        break;
      }
    }
    if (didSnapX) break;
  }

  // If not snapped to component or page edge, snap to grid if enabled
  if (!didSnapX && isSnapToGridEnabled && gridSize > 0) {
    const gridSnap = snapValueToGrid(rawX, gridSize, threshold);
    if (gridSnap.didSnap) {
      snappedX = gridSnap.val;
      guidesX.push({
        val: gridSnap.val,
        label: `Grid ${gridSnap.val}px`,
        type: 'grid',
      });
    } else {
      snappedX = Math.round(rawX);
    }
  } else if (!didSnapX) {
    snappedX = Math.round(rawX);
  }

  let snappedY = rawY;
  let didSnapY = false;

  // Check component and page edge snapping for Y
  for (const movePt of movingY) {
    for (const target of candY) {
      if (Math.abs(movePt.val - target.val) <= threshold) {
        snappedY = Math.round(target.val - movePt.offset);
        guidesY.push({
          val: target.val,
          label: `${target.label}`,
          type: target.type,
        });
        didSnapY = true;
        break;
      }
    }
    if (didSnapY) break;
  }

  // If not snapped to component or page edge, snap to grid if enabled
  if (!didSnapY && isSnapToGridEnabled && gridSize > 0) {
    const gridSnap = snapValueToGrid(rawY, gridSize, threshold);
    if (gridSnap.didSnap) {
      snappedY = gridSnap.val;
      guidesY.push({
        val: gridSnap.val,
        label: `Grid ${gridSnap.val}px`,
        type: 'grid',
      });
    } else {
      snappedY = Math.round(rawY);
    }
  } else if (!didSnapY) {
    snappedY = Math.round(rawY);
  }

  return {
    x: snappedX,
    y: snappedY,
    guidesX,
    guidesY,
  };
}
