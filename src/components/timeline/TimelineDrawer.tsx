import React, { useState, useEffect, useRef } from 'react';
import { useCourseStore } from '../../store/courseStore';
import {
  CanvasNode,
  ElementAnimationConfig,
  EntryAnimationType,
  EmphasisAnimationType,
  ExitAnimationType,
} from '../../types/schema';
import { computeAutoSequenceAnimations } from '../../utils/animationTimeline';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScrubTimeChange?: (time: number | null) => void;
}

type BarPhase = 'entry' | 'emphasis' | 'exitAnim';

interface DragBarState {
  nodeId: string;
  phase: BarPhase;
  mode: 'move' | 'resize';
  startClientX: number;
  initialDelay: number;
  initialDuration: number;
}

const ENTRY_TYPES: { value: EntryAnimationType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-in-left', label: 'Slide Left' },
  { value: 'slide-in-right', label: 'Slide Right' },
  { value: 'slide-in-top', label: 'Slide Top' },
  { value: 'slide-in-bottom', label: 'Slide Bottom' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'bounce-in', label: 'Bounce In' },
  { value: 'flip-in', label: '3D Flip' },
];

const EMPHASIS_TYPES: { value: EmphasisAnimationType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'spin', label: 'Spin' },
  { value: 'shake', label: 'Shake' },
  { value: 'flash', label: 'Flash' },
  { value: 'float', label: 'Float' },
];

const EXIT_TYPES: { value: ExitAnimationType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade-out', label: 'Fade Out' },
  { value: 'slide-out-left', label: 'Slide Left' },
  { value: 'slide-out-right', label: 'Slide Right' },
  { value: 'slide-out-bottom', label: 'Slide Bottom' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'bounce-out', label: 'Bounce Out' },
];

export const TimelineDrawer: React.FC<Props> = ({ isOpen, onClose, onScrubTimeChange }) => {
  const { currentPage, selectedNodeId, setSelectedNodeId, updateNode, pushUndo } = useCourseStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activePhaseEditor, setActivePhaseEditor] = useState<{
    nodeId: string;
    phase: BarPhase;
  } | null>(null);
  const [dragBar, setDragBar] = useState<DragBarState | null>(null);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);

  const totalDuration = 10; // 10 seconds timeline max
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const gridTrackRef = useRef<HTMLDivElement>(null);

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prevTime) => {
        const nextTime = prevTime + delta;
        if (nextTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return nextTime;
      });

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // Notify parent of live scrubber time
  useEffect(() => {
    if (onScrubTimeChange) {
      onScrubTimeChange(isPlaying || isScrubbingRuler || currentTime > 0 ? currentTime : null);
    }
  }, [currentTime, isPlaying, isScrubbingRuler, onScrubTimeChange]);

  // Clear live scrub on close
  useEffect(() => {
    if (!isOpen && onScrubTimeChange) {
      setIsPlaying(false);
      setCurrentTime(0);
      onScrubTimeChange(null);
    }
  }, [isOpen, onScrubTimeChange]);

  // Pointer drag handling for timeline bars & ruler scrubbing
  useEffect(() => {
    if (!dragBar && !isScrubbingRuler) return;

    const handlePointerMove = (e: PointerEvent) => {
      const trackEl = gridTrackRef.current;
      if (!trackEl) return;
      const rect = trackEl.getBoundingClientRect();
      const trackWidth = Math.max(100, rect.width);

      if (isScrubbingRuler) {
        const relX = Math.max(0, Math.min(trackWidth, e.clientX - rect.left));
        const t = Number(((relX / trackWidth) * totalDuration).toFixed(2));
        setCurrentTime(t);
        return;
      }

      if (dragBar && currentPage) {
        const targetNode = currentPage.nodes.find((n) => n.id === dragBar.nodeId);
        if (!targetNode) return;

        const deltaSeconds = ((e.clientX - dragBar.startClientX) / trackWidth) * totalDuration;
        const anim: ElementAnimationConfig = targetNode.animation || {};

        if (dragBar.mode === 'move') {
          const nextDelay = Math.max(
            0,
            Math.min(
              Number((totalDuration - dragBar.initialDuration).toFixed(1)),
              Math.round((dragBar.initialDelay + deltaSeconds) * 10) / 10
            )
          );
          const existingPhase = anim[dragBar.phase] || { type: 'fade-in', delay: 0, duration: 0.8 };
          updateNode(
            targetNode.id,
            {
              animation: {
                ...anim,
                [dragBar.phase]: {
                  ...existingPhase,
                  delay: nextDelay,
                },
              },
            },
            false
          );
        } else {
          const maxDur = Math.max(0.2, Number((totalDuration - dragBar.initialDelay).toFixed(1)));
          const nextDuration = Math.max(
            0.2,
            Math.min(maxDur, Math.round((dragBar.initialDuration + deltaSeconds) * 10) / 10)
          );
          const existingPhase = anim[dragBar.phase] || { type: 'fade-in', delay: 0, duration: 0.8 };
          updateNode(
            targetNode.id,
            {
              animation: {
                ...anim,
                [dragBar.phase]: {
                  ...existingPhase,
                  duration: nextDuration,
                },
              },
            },
            false
          );
        }
      }
    };

    const handlePointerUp = () => {
      setDragBar(null);
      setIsScrubbingRuler(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragBar, isScrubbingRuler, currentPage, totalDuration, updateNode]);

  if (!isOpen || !currentPage) return null;

  const nodes = currentPage.nodes || [];

  const handleRulerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const trackEl = gridTrackRef.current;
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const t = Number(((relX / Math.max(100, rect.width)) * totalDuration).toFixed(2));
    setIsPlaying(false);
    setCurrentTime(t);
    setIsScrubbingRuler(true);
  };

  const startBarDrag = (
    e: React.PointerEvent,
    node: CanvasNode,
    phase: BarPhase,
    mode: 'move' | 'resize',
    delay: number,
    duration: number
  ) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setActivePhaseEditor({ nodeId: node.id, phase });
    pushUndo(`Adjust ${phase} animation timing`);
    setDragBar({
      nodeId: node.id,
      phase,
      mode,
      startClientX: e.clientX,
      initialDelay: delay,
      initialDuration: duration,
    });
  };

  const handleQuickAddPhase = (node: CanvasNode, phase: BarPhase) => {
    setSelectedNodeId(node.id);
    const anim: ElementAnimationConfig = node.animation || {};
    if (phase === 'entry') {
      updateNode(node.id, {
        animation: {
          ...anim,
          entry: { type: 'fade-in', delay: 0, duration: 0.7, easing: 'ease-in-out' },
        },
      });
    } else if (phase === 'emphasis') {
      const suggestedDelay = Number(
        Math.min(8.5, (anim.entry?.delay ?? 0) + (anim.entry?.duration ?? 0.7) + 0.3).toFixed(1)
      );
      updateNode(node.id, {
        animation: {
          ...anim,
          emphasis: { type: 'pulse', delay: suggestedDelay, duration: 1.0, repeat: 1 },
        },
      });
    } else {
      updateNode(node.id, {
        animation: {
          ...anim,
          exitAnim: { type: 'fade-out', delay: 6.0, duration: 0.7, easing: 'ease-in-out' },
        },
      });
    }
    setActivePhaseEditor({ nodeId: node.id, phase });
  };

  const handleAutoSequence = () => {
    if (nodes.length === 0) return;
    pushUndo('Auto-sequence slide entrance animations');
    const sequenced = computeAutoSequenceAnimations(nodes, 0.4, 0.7);
    Object.entries(sequenced).forEach(([nodeId, animConfig]) => {
      updateNode(nodeId, { animation: animConfig }, false);
    });
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const activeEditorNode = activePhaseEditor
    ? nodes.find((n) => n.id === activePhaseEditor.nodeId)
    : nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      className={`w-full bg-slate-950/98 border-t border-slate-800 shadow-2xl text-white transition-all select-none shrink-0 z-30 flex flex-col ${
        isMinimized ? 'h-10' : 'h-64'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Timeline Header Toolbar */}
      <div className="h-10 px-3.5 bg-slate-900/95 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Animation Timeline</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          {/* Play / Pause / Reset Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (currentTime >= totalDuration) setCurrentTime(0);
                setIsPlaying(!isPlaying);
              }}
              title={isPlaying ? 'Pause Animation Preview' : 'Play Timeline Preview'}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Preview'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              title="Reset Timeline to 0.0s"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Scrubber readout */}
          <div className="flex items-center gap-1 font-mono text-xs text-sky-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="font-bold">{currentTime.toFixed(2)}s</span>
            <span className="text-slate-500">/ {totalDuration}s</span>
          </div>

          {/* Auto-Sequence Stagger Button */}
          <button
            onClick={handleAutoSequence}
            disabled={nodes.length === 0}
            title="Automatically stagger element entrance animations top-to-bottom"
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-amber-950/60 hover:bg-amber-900/70 border border-amber-600/50 text-amber-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Auto-Sequence</span>
          </button>
        </div>

        {/* Inline Active Phase Quick Controls + Legend & Minimize/Close */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {activePhaseEditor && activeEditorNode && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                {activePhaseEditor.phase === 'entry'
                  ? 'In:'
                  : activePhaseEditor.phase === 'emphasis'
                  ? 'Focus:'
                  : 'Out:'}
              </span>
              {activePhaseEditor.phase === 'entry' && (
                <select
                  value={activeEditorNode.animation?.entry?.type || 'none'}
                  onChange={(e) => {
                    const anim = activeEditorNode.animation || {};
                    const cur = anim.entry || { type: 'none', delay: 0, duration: 0.7 };
                    updateNode(activeEditorNode.id, {
                      animation: { ...anim, entry: { ...cur, type: e.target.value as EntryAnimationType } },
                    });
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-emerald-300 outline-none"
                >
                  {ENTRY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
              {activePhaseEditor.phase === 'emphasis' && (
                <select
                  value={activeEditorNode.animation?.emphasis?.type || 'none'}
                  onChange={(e) => {
                    const anim = activeEditorNode.animation || {};
                    const cur = anim.emphasis || { type: 'none', delay: 1.0, duration: 1.0 };
                    updateNode(activeEditorNode.id, {
                      animation: {
                        ...anim,
                        emphasis: { ...cur, type: e.target.value as EmphasisAnimationType },
                      },
                    });
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-amber-300 outline-none"
                >
                  {EMPHASIS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
              {activePhaseEditor.phase === 'exitAnim' && (
                <select
                  value={activeEditorNode.animation?.exitAnim?.type || 'none'}
                  onChange={(e) => {
                    const anim = activeEditorNode.animation || {};
                    const cur = anim.exitAnim || { type: 'none', delay: 5.0, duration: 0.7 };
                    updateNode(activeEditorNode.id, {
                      animation: {
                        ...anim,
                        exitAnim: { ...cur, type: e.target.value as ExitAnimationType },
                      },
                    });
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-rose-300 outline-none"
                >
                  {EXIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => {
                  const anim = activeEditorNode.animation || {};
                  const cur = anim[activePhaseEditor.phase];
                  if (cur) {
                    updateNode(activeEditorNode.id, {
                      animation: {
                        ...anim,
                        [activePhaseEditor.phase]: { ...cur, type: 'none' },
                      },
                    });
                  }
                  setActivePhaseEditor(null);
                }}
                title="Remove this animation phase"
                className="p-0.5 text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Entry
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Emphasis
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Exit
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand Timeline' : 'Minimize Timeline'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Timeline Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Tracks Body */}
      {!isMinimized && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Element Labels & Quick Add Controls */}
          <div className="w-56 bg-slate-900/70 border-r border-slate-800 overflow-y-auto shrink-0 divide-y divide-slate-800/60">
            <div className="h-6 px-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950/60">
              <span>Slide Layers ({nodes.length})</span>
              <span>Sequence</span>
            </div>
            {nodes.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center italic">No elements on slide</div>
            ) : (
              nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const anim: ElementAnimationConfig = node.animation || {};
                const hasEntry = anim.entry && anim.entry.type !== 'none';
                const hasEmphasis = anim.emphasis && anim.emphasis.type !== 'none';
                const hasExit = anim.exitAnim && anim.exitAnim.type !== 'none';

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`h-11 px-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-white font-semibold border-l-2 border-blue-500'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="truncate min-w-0 pr-1.5 flex-1">
                      <div className="truncate text-[11px] font-medium">
                        {node.name ||
                          (node.type === 'text'
                            ? (node as any).content?.slice(0, 18) || 'Text'
                            : node.type.toUpperCase())}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 uppercase">{node.type}</div>
                    </div>

                    {/* Quick Add Phase Buttons */}
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPhase(node, 'entry')}
                        title={hasEntry ? 'Edit Entry Animation' : 'Add Entry Animation'}
                        className={`px-1 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                          hasEntry
                            ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-emerald-300'
                        }`}
                      >
                        In
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPhase(node, 'emphasis')}
                        title={hasEmphasis ? 'Edit Emphasis Animation' : 'Add Emphasis Animation'}
                        className={`px-1 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                          hasEmphasis
                            ? 'bg-amber-500/25 border-amber-500/60 text-amber-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-amber-300'
                        }`}
                      >
                        Fx
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPhase(node, 'exitAnim')}
                        title={hasExit ? 'Edit Exit Animation' : 'Add Exit Animation'}
                        className={`px-1 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                          hasExit
                            ? 'bg-rose-500/25 border-rose-500/60 text-rose-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-rose-300'
                        }`}
                      >
                        Out
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Interactive Visual Timeline Grid */}
          <div ref={gridTrackRef} className="flex-1 relative overflow-y-auto overflow-x-hidden bg-slate-950">
            {/* Interactive Timeline Ruler Header (0s to 10s) */}
            <div
              onPointerDown={handleRulerPointerDown}
              title="Click or drag anywhere on ruler to scrub timeline"
              className="h-6 border-b border-slate-800 bg-slate-900/60 relative font-mono text-[10px] text-slate-400 flex items-center select-none cursor-ew-resize sticky top-0 z-20"
            >
              {Array.from({ length: totalDuration + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute border-l border-slate-800 h-full flex items-center pl-1 pointer-events-none"
                  style={{ left: `${(i / totalDuration) * 100}%` }}
                >
                  <span>{i}s</span>
                </div>
              ))}
            </div>

            {/* Current Scrubber Needle Line */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none"
              style={{ left: `${(currentTime / totalDuration) * 100}%` }}
            >
              <div className="w-3 h-3 bg-red-500 rotate-45 -translate-x-[5px] -mt-1 shadow-md" />
            </div>

            {/* Element Tracks */}
            <div className="divide-y divide-slate-800/60">
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const anim: ElementAnimationConfig = node.animation || {};
                const entry = anim.entry || { type: 'none', delay: 0, duration: 0.7 };
                const emphasis = anim.emphasis || { type: 'none', delay: 1, duration: 1 };
                const exitAnim = anim.exitAnim || { type: 'none', delay: 5, duration: 0.7 };

                const entryLeft = (entry.delay / totalDuration) * 100;
                const entryWidth = (entry.duration / totalDuration) * 100;

                const emphasisLeft = (emphasis.delay / totalDuration) * 100;
                const emphasisWidth = (emphasis.duration / totalDuration) * 100;

                const exitLeft = (exitAnim.delay / totalDuration) * 100;
                const exitWidth = (exitAnim.duration / totalDuration) * 100;

                const hasAnyBar =
                  entry.type !== 'none' || emphasis.type !== 'none' || exitAnim.type !== 'none';

                return (
                  <div
                    key={`track_${node.id}`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`h-11 relative flex items-center px-2 transition-colors ${
                      isSelected ? 'bg-blue-950/25' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {/* Background Seconds Grid Lines */}
                    {Array.from({ length: totalDuration + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-slate-800/40 pointer-events-none"
                        style={{ left: `${(i / totalDuration) * 100}%` }}
                      />
                    ))}

                    {!hasAnyBar && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAddPhase(node, 'entry');
                        }}
                        className="z-10 mx-auto px-2 py-0.5 rounded border border-dashed border-slate-700 hover:border-emerald-500/70 text-[10px] text-slate-500 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Entrance</span>
                      </button>
                    )}

                    {/* Entry Bar (Draggable + Right-edge Resizable) */}
                    {entry.type !== 'none' && (
                      <div
                        onPointerDown={(e) =>
                          startBarDrag(e, node, 'entry', 'move', entry.delay, entry.duration)
                        }
                        className={`absolute h-6 rounded-md bg-emerald-500/85 border text-emerald-950 text-[10px] font-bold flex items-center justify-between pl-2 pr-1 shadow-md z-10 cursor-grab active:cursor-grabbing ${
                          activePhaseEditor?.nodeId === node.id && activePhaseEditor.phase === 'entry'
                            ? 'border-white ring-1 ring-emerald-300'
                            : 'border-emerald-300'
                        }`}
                        style={{ left: `${entryLeft}%`, width: `${Math.max(4, entryWidth)}%` }}
                        title={`Entry: ${entry.type} (${entry.delay}s → ${(entry.delay + entry.duration).toFixed(1)}s). Drag bar to shift delay, drag right edge to resize duration.`}
                      >
                        <span className="truncate">
                          In: {entry.type} ({entry.delay}s)
                        </span>
                        <div
                          onPointerDown={(e) =>
                            startBarDrag(e, node, 'entry', 'resize', entry.delay, entry.duration)
                          }
                          className="w-1.5 h-4 rounded-xs bg-emerald-950/40 hover:bg-white cursor-ew-resize shrink-0 ml-1"
                          title="Drag to resize duration"
                        />
                      </div>
                    )}

                    {/* Emphasis Bar (Draggable + Right-edge Resizable) */}
                    {emphasis.type !== 'none' && (
                      <div
                        onPointerDown={(e) =>
                          startBarDrag(e, node, 'emphasis', 'move', emphasis.delay, emphasis.duration)
                        }
                        className={`absolute h-6 rounded-md bg-amber-500/85 border text-amber-950 text-[10px] font-bold flex items-center justify-between pl-2 pr-1 shadow-md z-10 cursor-grab active:cursor-grabbing ${
                          activePhaseEditor?.nodeId === node.id && activePhaseEditor.phase === 'emphasis'
                            ? 'border-white ring-1 ring-amber-300'
                            : 'border-amber-300'
                        }`}
                        style={{ left: `${emphasisLeft}%`, width: `${Math.max(4, emphasisWidth)}%` }}
                        title={`Emphasis: ${emphasis.type} (${emphasis.delay}s → ${(emphasis.delay + emphasis.duration).toFixed(1)}s)`}
                      >
                        <span className="truncate">
                          Fx: {emphasis.type} ({emphasis.delay}s)
                        </span>
                        <div
                          onPointerDown={(e) =>
                            startBarDrag(e, node, 'emphasis', 'resize', emphasis.delay, emphasis.duration)
                          }
                          className="w-1.5 h-4 rounded-xs bg-amber-950/40 hover:bg-white cursor-ew-resize shrink-0 ml-1"
                          title="Drag to resize duration"
                        />
                      </div>
                    )}

                    {/* Exit Bar (Draggable + Right-edge Resizable) */}
                    {exitAnim.type !== 'none' && (
                      <div
                        onPointerDown={(e) =>
                          startBarDrag(e, node, 'exitAnim', 'move', exitAnim.delay, exitAnim.duration)
                        }
                        className={`absolute h-6 rounded-md bg-rose-500/85 border text-rose-950 text-[10px] font-bold flex items-center justify-between pl-2 pr-1 shadow-md z-10 cursor-grab active:cursor-grabbing ${
                          activePhaseEditor?.nodeId === node.id && activePhaseEditor.phase === 'exitAnim'
                            ? 'border-white ring-1 ring-rose-300'
                            : 'border-rose-300'
                        }`}
                        style={{ left: `${exitLeft}%`, width: `${Math.max(4, exitWidth)}%` }}
                        title={`Exit: ${exitAnim.type} (${exitAnim.delay}s → ${(exitAnim.delay + exitAnim.duration).toFixed(1)}s)`}
                      >
                        <span className="truncate">
                          Out: {exitAnim.type} ({exitAnim.delay}s)
                        </span>
                        <div
                          onPointerDown={(e) =>
                            startBarDrag(e, node, 'exitAnim', 'resize', exitAnim.delay, exitAnim.duration)
                          }
                          className="w-1.5 h-4 rounded-xs bg-rose-950/40 hover:bg-white cursor-ew-resize shrink-0 ml-1"
                          title="Drag to resize duration"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
