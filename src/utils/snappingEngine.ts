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
 * Calculates snapping coordinates for an element being dragged across the canvas:
 * 1. User Magnetic Guides
 * 2. Tide-Snapping Equal Spacing & Gaps (Smart Layout Suggestions)
 * 3. Adjacent Component Edge Docking
 * 4. Page Edges & Center Lines
 * 5. Other Component Edges (Left, Center, Right, Top, Middle, Bottom)
 * 6. Grid Lines
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
  userGuides: CanvasGuide[] = []
): SnapCalculationResult {
  const guidesX: SnapGuide[] = [];
  const guidesY: SnapGuide[] = [];

  // --- 1. Candidate Horizontal X Snap Points ---
  const candX: SnapGuide[] = [];

  // Priority 1: User-created Magnetic Guides (Vertical lines snap X coordinates)
  if (userGuides && userGuides.length > 0) {
    userGuides
      .filter((g) => g.orientation === 'vertical')
      .forEach((g) => {
        candX.push({
          val: g.position,
          label: `Guide ${g.position}px`,
          type: 'guide',
        });
      });
  }

  // Priority 2: Tide-Snapping & Equal Spacing (Horizontal Gaps between pairs)
  if (otherNodes.length >= 2) {
    const sortedNodesX = [...otherNodes].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sortedNodesX.length; i++) {
      for (let j = i + 1; j < sortedNodesX.length; j++) {
        const n1 = sortedNodesX[i];
        const n2 = sortedNodesX[j];
        const gap = n2.x - (n1.x + n1.width);
        if (gap >= 6) {
          const roundedGap = Math.round(gap);
          // Placement to the right of n2
          candX.push({
            val: n2.x + n2.width + gap,
            label: `Tide-Snap: Equal Gap (${roundedGap}px)`,
            type: 'tide-snap',
            gap: roundedGap,
          });
          // Placement to the left of n1
          candX.push({
            val: n1.x - gap,
            label: `Tide-Snap: Equal Gap (${roundedGap}px)`,
            type: 'tide-snap',
            gap: roundedGap,
          });
          // Placement centered between n1 and n2
          if (gap > width + 6) {
            const centerGap = Math.round((gap - width) / 2);
            candX.push({
              val: n1.x + n1.width + centerGap,
              label: `Tide-Snap: Centered Gap (${centerGap}px)`,
              type: 'tide-snap',
              gap: centerGap,
            });
          }
        }
      }
    }
  }

  // Priority 3: Page boundaries & margins
  candX.push(
    { val: 0, label: 'Page Left', type: 'page-edge' },
    { val: Math.round(canvasWidth / 2), label: 'Center-X', type: 'page-center' },
    { val: canvasWidth, label: 'Page Right', type: 'page-edge' },
    { val: 40, label: 'Margin Left (40px)', type: 'page-edge' },
    { val: canvasWidth - 40, label: 'Margin Right', type: 'page-edge' }
  );

  // Priority 4: Other components' X points (Left, Center, Right)
  otherNodes.forEach((node) => {
    const nodeLabel = node.type ? `${node.type.toUpperCase()}` : 'Object';
    candX.push(
      { val: node.x, label: `${nodeLabel} Left`, type: 'component' },
      { val: Math.round(node.x + node.width / 2), label: `${nodeLabel} Center-X`, type: 'component' },
      { val: node.x + node.width, label: `${nodeLabel} Right`, type: 'component' }
    );
  });

  // Priority 5: Adjacent Edge Docking (Smart Layout Spacing)
  otherNodes.forEach((node) => {
    const nodeLabel = node.type ? `${node.type.toUpperCase()}` : 'Object';
    candX.push({
      val: node.x + node.width,
      label: `Dock Right of ${nodeLabel}`,
      type: 'smart-spacing',
    });
    candX.push({
      val: node.x,
      label: `Dock Left of ${nodeLabel}`,
      type: 'smart-spacing',
    });
  });

  // --- 2. Candidate Vertical Y Snap Points ---
  const candY: SnapGuide[] = [];

  // Priority 1: User-created Magnetic Guides (Horizontal lines snap Y coordinates)
  if (userGuides && userGuides.length > 0) {
    userGuides
      .filter((g) => g.orientation === 'horizontal')
      .forEach((g) => {
        candY.push({
          val: g.position,
          label: `Guide ${g.position}px`,
          type: 'guide',
        });
      });
  }

  // Priority 2: Tide-Snapping & Equal Spacing (Vertical Gaps between pairs)
  if (otherNodes.length >= 2) {
    const sortedNodesY = [...otherNodes].sort((a, b) => a.y - b.y);
    for (let i = 0; i < sortedNodesY.length; i++) {
      for (let j = i + 1; j < sortedNodesY.length; j++) {
        const n1 = sortedNodesY[i];
        const n2 = sortedNodesY[j];
        const gap = n2.y - (n1.y + n1.height);
        if (gap >= 6) {
          const roundedGap = Math.round(gap);
          // Placement below n2
          candY.push({
            val: n2.y + n2.height + gap,
            label: `Tide-Snap: Equal Vertical Gap (${roundedGap}px)`,
            type: 'tide-snap',
            gap: roundedGap,
          });
          // Placement above n1
          candY.push({
            val: n1.y - gap,
            label: `Tide-Snap: Equal Vertical Gap (${roundedGap}px)`,
            type: 'tide-snap',
            gap: roundedGap,
          });
          // Placement centered between n1 and n2
          if (gap > height + 6) {
            const centerGap = Math.round((gap - height) / 2);
            candY.push({
              val: n1.y + n1.height + centerGap,
              label: `Tide-Snap: Centered Vertical Gap (${centerGap}px)`,
              type: 'tide-snap',
              gap: centerGap,
            });
          }
        }
      }
    }
  }

  // Priority 3: Page boundaries & margins
  candY.push(
    { val: 0, label: 'Page Top', type: 'page-edge' },
    { val: Math.round(canvasHeight / 2), label: 'Center-Y', type: 'page-center' },
    { val: canvasHeight, label: 'Page Bottom', type: 'page-edge' },
    { val: 40, label: 'Margin Top (40px)', type: 'page-edge' },
    { val: canvasHeight - 40, label: 'Margin Bottom', type: 'page-edge' }
  );

  // Priority 4: Other components' Y points (Top, Center, Bottom)
  otherNodes.forEach((node) => {
    const nodeLabel = node.type ? `${node.type.toUpperCase()}` : 'Object';
    candY.push(
      { val: node.y, label: `${nodeLabel} Top`, type: 'component' },
      { val: Math.round(node.y + node.height / 2), label: `${nodeLabel} Center-Y`, type: 'component' },
      { val: node.y + node.height, label: `${nodeLabel} Bottom`, type: 'component' }
    );
  });

  // Priority 5: Adjacent Edge Docking (Smart Layout Spacing)
  otherNodes.forEach((node) => {
    const nodeLabel = node.type ? `${node.type.toUpperCase()}` : 'Object';
    candY.push({
      val: node.y + node.height,
      label: `Dock Bottom of ${nodeLabel}`,
      type: 'smart-spacing',
    });
    candY.push({
      val: node.y,
      label: `Dock Top of ${nodeLabel}`,
      type: 'smart-spacing',
    });
  });

  // Priority 3: Page boundaries & margins
  candY.push(
    { val: 0, label: 'Page Top', type: 'page-edge' },
    { val: Math.round(canvasHeight / 2), label: 'Center-Y', type: 'page-center' },
    { val: canvasHeight, label: 'Page Bottom', type: 'page-edge' },
    { val: 40, label: 'Margin Top (40px)', type: 'page-edge' },
    { val: canvasHeight - 40, label: 'Margin Bottom', type: 'page-edge' }
  );

  // Priority 4: Other components' Y points
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
