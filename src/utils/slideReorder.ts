export type DropPosition = 'before' | 'after';

/**
 * Computes the destination array index for `reorderPages(fromIndex, toIndex)`
 * when dropping a slide onto the 'before' (left) or 'after' (right) side of `targetIndex`.
 */
export function computeReorderTargetIndex(
  fromIndex: number,
  targetIndex: number,
  position: DropPosition
): number {
  const rawSlot = position === 'before' ? targetIndex : targetIndex + 1;
  return fromIndex < rawSlot ? rawSlot - 1 : rawSlot;
}
