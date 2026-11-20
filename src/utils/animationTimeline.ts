import React from 'react';
import { CanvasNode, ElementAnimationConfig } from '../types/schema';

export type TimelinePhase = 'waiting' | 'entering' | 'visible' | 'emphasizing' | 'exiting' | 'exited';

export interface NodeAnimationEvalResult {
  style: React.CSSProperties;
  phase: TimelinePhase;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);

const easeOutBounce = (x: number): number => {
  const t = clamp01(x);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const t2 = t - 1.5 / d1;
    return n1 * t2 * t2 + 0.75;
  }
  if (t < 2.5 / d1) {
    const t2 = t - 2.25 / d1;
    return n1 * t2 * t2 + 0.9375;
  }
  const t2 = t - 2.625 / d1;
  return n1 * t2 * t2 + 0.984375;
};

/**
 * Evaluates live CSS opacity/transform/filter for a node at a given timeline scrub time (in seconds).
 */
export function evaluateNodeAnimationAtTime(
  anim: ElementAnimationConfig | undefined,
  scrubTime: number | null
): NodeAnimationEvalResult {
  if (scrubTime === null || scrubTime === undefined || !anim) {
    return { style: {}, phase: 'visible' };
  }

  let opacity = 1;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let rotateDeg = 0;
  let rotateYDeg = 0;
  let filter = '';
  let phase: TimelinePhase = 'visible';

  const entry = anim.entry;
  const emphasis = anim.emphasis;
  const exitAnim = anim.exitAnim;

  // 1. Entry Animation phase
  if (entry && entry.type !== 'none') {
    const delay = Math.max(0, entry.delay || 0);
    const dur = Math.max(0.1, entry.duration || 0.8);

    if (scrubTime < delay) {
      return {
        style: {
          opacity: 0.12,
          filter: 'grayscale(80%)',
          transition: 'none',
        },
        phase: 'waiting',
      };
    }

    if (scrubTime < delay + dur) {
      phase = 'entering';
      const rawP = clamp01((scrubTime - delay) / dur);
      const p = entry.type === 'bounce-in' ? easeOutBounce(rawP) : easeOutCubic(rawP);

      switch (entry.type) {
        case 'fade-in':
          opacity = p;
          break;
        case 'slide-in-left':
          opacity = clamp01(rawP * 1.4);
          translateX = (1 - p) * -70;
          break;
        case 'slide-in-right':
          opacity = clamp01(rawP * 1.4);
          translateX = (1 - p) * 70;
          break;
        case 'slide-in-top':
          opacity = clamp01(rawP * 1.4);
          translateY = (1 - p) * -55;
          break;
        case 'slide-in-bottom':
          opacity = clamp01(rawP * 1.4);
          translateY = (1 - p) * 55;
          break;
        case 'zoom-in':
          opacity = clamp01(rawP * 1.3);
          scale = 0.55 + p * 0.45;
          break;
        case 'bounce-in':
          opacity = clamp01(rawP * 2);
          scale = 0.45 + p * 0.55;
          break;
        case 'flip-in':
          opacity = clamp01(rawP * 1.5);
          rotateYDeg = (1 - p) * 90;
          break;
      }
    }
  }

  // 2. Emphasis Animation phase
  if (emphasis && emphasis.type !== 'none') {
    const delay = Math.max(0, emphasis.delay || 0);
    const dur = Math.max(0.1, emphasis.duration || 1.0);
    if (scrubTime >= delay && scrubTime <= delay + dur) {
      phase = 'emphasizing';
      const p = clamp01((scrubTime - delay) / dur);
      const wave = Math.sin(p * Math.PI * 2);

      switch (emphasis.type) {
        case 'pulse':
          scale *= 1 + Math.sin(p * Math.PI) * 0.1;
          break;
        case 'bounce':
          translateY += -Math.abs(Math.sin(p * Math.PI * 2)) * 16;
          break;
        case 'spin':
          rotateDeg += p * 360;
          break;
        case 'shake':
          translateX += Math.sin(p * Math.PI * 6) * 10 * (1 - p * 0.4);
          break;
        case 'flash':
          opacity *= 0.45 + Math.abs(wave) * 0.55;
          filter = `brightness(${1 + Math.abs(wave) * 0.35})`;
          break;
        case 'float':
          translateY += Math.sin(p * Math.PI * 2) * 10;
          break;
      }
    }
  }

  // 3. Exit Animation phase
  if (exitAnim && exitAnim.type !== 'none') {
    const delay = Math.max(0, exitAnim.delay || 0);
    const dur = Math.max(0.1, exitAnim.duration || 0.8);

    if (scrubTime >= delay + dur) {
      return {
        style: {
          opacity: 0.08,
          filter: 'grayscale(90%)',
          transition: 'none',
        },
        phase: 'exited',
      };
    }

    if (scrubTime >= delay) {
      phase = 'exiting';
      const p = easeOutCubic((scrubTime - delay) / dur);
      switch (exitAnim.type) {
        case 'fade-out':
          opacity *= 1 - p;
          break;
        case 'slide-out-left':
          opacity *= 1 - p;
          translateX += -70 * p;
          break;
        case 'slide-out-right':
          opacity *= 1 - p;
          translateX += 70 * p;
          break;
        case 'slide-out-bottom':
          opacity *= 1 - p;
          translateY += 60 * p;
          break;
        case 'zoom-out':
          opacity *= 1 - p;
          scale *= 1 - p * 0.45;
          break;
        case 'bounce-out':
          opacity *= 1 - p * 0.9;
          scale *= 1 + Math.sin(p * Math.PI) * 0.12 - p * 0.45;
          break;
      }
    }
  }

  const transforms: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    transforms.push(`translate(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px)`);
  }
  if (scale !== 1) {
    transforms.push(`scale(${scale.toFixed(3)})`);
  }
  if (rotateDeg !== 0) {
    transforms.push(`rotate(${rotateDeg.toFixed(1)}deg)`);
  }
  if (rotateYDeg !== 0) {
    transforms.push(`perspective(600px) rotateY(${rotateYDeg.toFixed(1)}deg)`);
  }

  return {
    style: {
      opacity: clamp01(opacity),
      transform: transforms.length > 0 ? transforms.join(' ') : undefined,
      filter: filter || undefined,
      transition: 'none',
    },
    phase,
  };
}

/**
 * Generates sequential staggered entry delays across nodes on a slide (top-to-bottom, left-to-right).
 */
export function computeAutoSequenceAnimations(
  nodes: CanvasNode[],
  staggerDelay = 0.4,
  defaultDuration = 0.7
): Record<string, ElementAnimationConfig> {
  const ordered = [...nodes].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 28) return a.y - b.y;
    return a.x - b.x;
  });

  const result: Record<string, ElementAnimationConfig> = {};
  ordered.forEach((node, idx) => {
    const existing = node.animation || {};
    const entryType =
      existing.entry?.type && existing.entry.type !== 'none'
        ? existing.entry.type
        : node.type === 'text'
        ? 'fade-in'
        : node.type === 'image'
        ? 'zoom-in'
        : 'slide-in-bottom';

    const delay = Number((idx * staggerDelay).toFixed(1));
    const duration = existing.entry?.duration || defaultDuration;

    result[node.id] = {
      ...existing,
      entry: {
        type: entryType,
        delay: Math.min(8.5, delay),
        duration,
        easing: existing.entry?.easing || 'ease-in-out',
      },
    };
  });

  return result;
}
