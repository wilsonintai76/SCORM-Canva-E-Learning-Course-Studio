/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CanvasGuide } from '../types/schema';

export interface SnapGuide {
  val: number;
  label: string;
  type: 'page-edge' | 'page-center' | 'component' | 'grid' | 'guide' | 'tide-snap' | 'smart-spacing';
  gap?: number;
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
 * Computes the combined bounding box for a set of nodes (e.g., a GroupedObject or multi-selection).
 */
export function computeCompositeBounds(
  nodes: Array<{ x: number; y: number; width: number; height: number }>
): { x: number; y: number; width: number; height: number } | null {
  if (!nodes || nodes.length === 0) return null;
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Calculates snapping coordinates for an element or GroupedObject being dragged across the canvas:
 * 1. User Magnetic Guides
 * 2. Page Boundaries, Safe Margins & Center Lines
 * 3. Other Component Edges & Centers (Smart Guides)
 * 4. Tide-Snapping Equal Spacing & Gaps
 * 5. Grid Lines (Snap to Grid)
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
  threshold = 8,
  userGuides: CanvasGuide[] = [],
  enableSmartGuides = true
): SnapCalculationResult {
  const guidesX: SnapGuide[] = [];
  const guidesY: SnapGuide[] = [];

  const candX: SnapGuide[] = [];
  const candY: SnapGuide[] = [];

  if (enableSmartGuides) {
    // Priority 1: User-created Magnetic Guides
    if (userGuides && userGuides.length > 0) {
      userGuides.forEach((g) => {
        if (g.orientation === 'vertical') {
          candX.push({
            val: g.position,
            label: `Guide ${g.position}px`,
            type: 'guide',
          });
        } else {
          candY.push({
            val: g.position,
            label: `Guide ${g.position}px`,
            type: 'guide',
          });
        }
      });
    }

    // Priority 2: Page boundaries, center lines & 40px safe margins
    candX.push(
      { val: Math.round(canvasWidth / 2), label: 'Center-X', type: 'page-center' },
      { val: 0, label: 'Page Left', type: 'page-edge' },
      { val: canvasWidth, label: 'Page Right', type: 'page-edge' },
      { val: 40, label: 'Margin Left', type: 'page-edge' },
      { val: canvasWidth - 40, label: 'Margin Right', type: 'page-edge' }
    );

    candY.push(
      { val: Math.round(canvasHeight / 2), label: 'Center-Y', type: 'page-center' },
      { val: 0, label: 'Page Top', type: 'page-edge' },
      { val: canvasHeight, label: 'Page Bottom', type: 'page-edge' },
      { val: 40, label: 'Margin Top', type: 'page-edge' },
      { val: canvasHeight - 40, label: 'Margin Bottom', type: 'page-edge' }
    );

    // Priority 3: Other components' edges & centers
    otherNodes.forEach((node) => {
      const nodeLabel = node.type ? `${node.type.toUpperCase()}` : 'Object';
      candX.push(
        { val: node.x, label: `${nodeLabel} Left`, type: 'component' },
        { val: Math.round(node.x + node.width / 2), label: `${nodeLabel} Center-X`, type: 'component' },
        { val: node.x + node.width, label: `${nodeLabel} Right`, type: 'component' }
      );
      candY.push(
        { val: node.y, label: `${nodeLabel} Top`, type: 'component' },
        { val: Math.round(node.y + node.height / 2), label: `${nodeLabel} Center-Y`, type: 'component' },
        { val: node.y + node.height, label: `${nodeLabel} Bottom`, type: 'component' }
      );
    });

    // Priority 4: Tide-Snapping & Equal Spacing
    if (otherNodes.length >= 2) {
      const sortedNodesX = [...otherNodes].sort((a, b) => a.x - b.x);
      for (let i = 0; i < sortedNodesX.length; i++) {
        for (let j = i + 1; j < sortedNodesX.length; j++) {
          const n1 = sortedNodesX[i];
          const n2 = sortedNodesX[j];
          const gap = n2.x - (n1.x + n1.width);
          if (gap >= 6) {
            const roundedGap = Math.round(gap);
            candX.push({
              val: n2.x + n2.width + gap,
              label: `Equal Gap (${roundedGap}px)`,
              type: 'tide-snap',
              gap: roundedGap,
            });
            candX.push({
              val: n1.x - gap,
              label: `Equal Gap (${roundedGap}px)`,
              type: 'tide-snap',
              gap: roundedGap,
            });
            if (gap > width + 6) {
              const centerGap = Math.round((gap - width) / 2);
              candX.push({
                val: n1.x + n1.width + centerGap,
                label: `Centered Gap (${centerGap}px)`,
                type: 'tide-snap',
                gap: centerGap,
              });
            }
          }
        }
      }

      const sortedNodesY = [...otherNodes].sort((a, b) => a.y - b.y);
      for (let i = 0; i < sortedNodesY.length; i++) {
        for (let j = i + 1; j < sortedNodesY.length; j++) {
          const n1 = sortedNodesY[i];
          const n2 = sortedNodesY[j];
          const gap = n2.y - (n1.y + n1.height);
          if (gap >= 6) {
            const roundedGap = Math.round(gap);
            candY.push({
              val: n2.y + n2.height + gap,
              label: `Equal Vertical Gap (${roundedGap}px)`,
              type: 'tide-snap',
              gap: roundedGap,
            });
            candY.push({
              val: n1.y - gap,
              label: `Equal Vertical Gap (${roundedGap}px)`,
              type: 'tide-snap',
              gap: roundedGap,
            });
            if (gap > height + 6) {
              const centerGap = Math.round((gap - height) / 2);
              candY.push({
                val: n1.y + n1.height + centerGap,
                label: `Centered Vertical Gap (${centerGap}px)`,
                type: 'tide-snap',
                gap: centerGap,
              });
            }
          }
        }
      }
    }
  }

  // Points of the moving element (or composite group) being evaluated
  const movingX = [
    { val: rawX, offset: 0, part: 'Left' },
    { val: rawX + width / 2, offset: width / 2, part: 'Center' },
    { val: rawX + width, offset: width, part: 'Right' },
  ];

  const movingY = [
    { val: rawY, offset: 0, part: 'Top' },
    { val: rawY + height / 2, offset: height / 2, part: 'Middle' },
    { val: rawY + height, offset: height, part: 'Bottom' },
  ];

  let snappedX = rawX;
  let didSnapX = false;

  // Find closest Smart Guide snap on X
  if (enableSmartGuides && candX.length > 0) {
    let bestDiff = threshold + 0.001;
    let bestTarget: SnapGuide | null = null;
    let bestOffset = 0;

    for (const movePt of movingX) {
      for (const target of candX) {
        const diff = Math.abs(movePt.val - target.val);
        if (diff <= threshold && diff < bestDiff) {
          bestDiff = diff;
          bestTarget = target;
          bestOffset = movePt.offset;
        }
      }
    }

    if (bestTarget) {
      snappedX = Math.round(bestTarget.val - bestOffset);
      didSnapX = true;
      guidesX.push({
        val: bestTarget.val,
        label: bestTarget.label,
        type: bestTarget.type,
        gap: bestTarget.gap,
      });
    }
  }

  // Snap to Grid X if enabled and no higher-priority Smart Guide snapped
  if (!didSnapX && isSnapToGridEnabled && gridSize > 0) {
    const effectiveThreshold = Math.max(threshold, Math.floor(gridSize / 2));
    const leftSnap = snapValueToGrid(rawX, gridSize, effectiveThreshold);
    const rightSnap = snapValueToGrid(rawX + width, gridSize, effectiveThreshold);

    const leftDist = Math.abs(rawX - leftSnap.val);
    const rightDist = Math.abs(rawX + width - rightSnap.val);

    if (leftSnap.didSnap && (!rightSnap.didSnap || leftDist <= rightDist)) {
      snappedX = leftSnap.val;
      guidesX.push({
        val: leftSnap.val,
        label: `Grid ${leftSnap.val}px`,
        type: 'grid',
      });
    } else if (rightSnap.didSnap) {
      snappedX = Math.round(rightSnap.val - width);
      guidesX.push({
        val: rightSnap.val,
        label: `Grid ${rightSnap.val}px`,
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

  // Find closest Smart Guide snap on Y
  if (enableSmartGuides && candY.length > 0) {
    let bestDiff = threshold + 0.001;
    let bestTarget: SnapGuide | null = null;
    let bestOffset = 0;

    for (const movePt of movingY) {
      for (const target of candY) {
        const diff = Math.abs(movePt.val - target.val);
        if (diff <= threshold && diff < bestDiff) {
          bestDiff = diff;
          bestTarget = target;
          bestOffset = movePt.offset;
        }
      }
    }

    if (bestTarget) {
      snappedY = Math.round(bestTarget.val - bestOffset);
      didSnapY = true;
      guidesY.push({
        val: bestTarget.val,
        label: bestTarget.label,
        type: bestTarget.type,
        gap: bestTarget.gap,
      });
    }
  }

  // Snap to Grid Y if enabled and no higher-priority Smart Guide snapped
  if (!didSnapY && isSnapToGridEnabled && gridSize > 0) {
    const effectiveThreshold = Math.max(threshold, Math.floor(gridSize / 2));
    const topSnap = snapValueToGrid(rawY, gridSize, effectiveThreshold);
    const bottomSnap = snapValueToGrid(rawY + height, gridSize, effectiveThreshold);

    const topDist = Math.abs(rawY - topSnap.val);
    const bottomDist = Math.abs(rawY + height - bottomSnap.val);

    if (topSnap.didSnap && (!bottomSnap.didSnap || topDist <= bottomDist)) {
      snappedY = topSnap.val;
      guidesY.push({
        val: topSnap.val,
        label: `Grid ${topSnap.val}px`,
        type: 'grid',
      });
    } else if (bottomSnap.didSnap) {
      snappedY = Math.round(bottomSnap.val - height);
      guidesY.push({
        val: bottomSnap.val,
        label: `Grid ${bottomSnap.val}px`,
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
