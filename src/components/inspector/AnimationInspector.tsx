import React from 'react';
import {
  CanvasNode,
  EntryAnimationType,
  EmphasisAnimationType,
  ExitAnimationType,
  ElementAnimationConfig,
} from '../../types/schema';
import {
  Zap,
  Play,
  ArrowRight,
  Clock,
  SlidersHorizontal,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCw,
} from 'lucide-react';

interface Props {
  node: CanvasNode;
  onUpdate: (updates: Partial<CanvasNode>) => void;
}

export const AnimationInspector: React.FC<Props> = ({ node, onUpdate }) => {
  const anim: ElementAnimationConfig = node.animation || {};

  const entry = anim.entry || { type: 'fade-in', delay: 0, duration: 0.8, easing: 'ease-in-out' };
  const emphasis = anim.emphasis || { type: 'none', delay: 1.0, duration: 1.0, repeat: 1 };
  const exitAnim = anim.exitAnim || { type: 'none', delay: 5.0, duration: 0.8, easing: 'ease-in-out' };

  const updateEntry = (updates: Partial<NonNullable<ElementAnimationConfig['entry']>>) => {
    onUpdate({
      animation: {
        ...anim,
        entry: {
          ...entry,
          ...updates,
        },
      },
    });
  };

  const updateEmphasis = (updates: Partial<NonNullable<ElementAnimationConfig['emphasis']>>) => {
    onUpdate({
      animation: {
        ...anim,
        emphasis: {
          ...emphasis,
          ...updates,
        },
      },
    });
  };

  const updateExit = (updates: Partial<NonNullable<ElementAnimationConfig['exitAnim']>>) => {
    onUpdate({
      animation: {
        ...anim,
        exitAnim: {
          ...exitAnim,
          ...updates,
        },
      },
    });
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Timeline Animation Editor
          </span>
        </div>
        <span className="text-[10px] text-amber-400 font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80 font-bold">
          {node.type.toUpperCase()}
        </span>
      </div>

      {/* 1. ENTRY ANIMATION CARD */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
            <ArrowUpRight className="w-4 h-4" />
            <span>1. Entry Animation</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-mono font-bold">
            {entry.delay}s start • {entry.duration}s dur
          </span>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Entry Effect:</label>
          <select
            value={entry.type}
            onChange={(e) => updateEntry({ type: e.target.value as EntryAnimationType })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-emerald-500 font-medium"
          >
            <option value="none">None (Static Display)</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-in-left">Slide In Left</option>
            <option value="slide-in-right">Slide In Right</option>
            <option value="slide-in-top">Slide In Top</option>
            <option value="slide-in-bottom">Slide In Bottom</option>
            <option value="zoom-in">Zoom In &amp; Scale</option>
            <option value="bounce-in">Bounce In</option>
            <option value="flip-in">3D Flip In</option>
          </select>
        </div>

        {entry.type !== 'none' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Start Delay:</span>
                <span className="font-mono text-emerald-400 font-bold">{entry.delay}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={0.1}
                value={entry.delay}
                onChange={(e) => updateEntry({ delay: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Duration:</span>
                <span className="font-mono text-emerald-400 font-bold">{entry.duration}s</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={4}
                step={0.1}
                value={entry.duration}
                onChange={(e) => updateEntry({ duration: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. EMPHASIS ANIMATION CARD */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
            <Sparkles className="w-4 h-4" />
            <span>2. Emphasis Animation</span>
          </div>
          <span className="text-[10px] text-amber-300 font-mono font-bold">
            {emphasis.delay}s start • {emphasis.duration}s dur
          </span>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Emphasis Effect:</label>
          <select
            value={emphasis.type}
            onChange={(e) => updateEmphasis({ type: e.target.value as EmphasisAnimationType })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-amber-500 font-medium"
          >
            <option value="none">None</option>
            <option value="pulse">Pulse Heartbeat</option>
            <option value="bounce">Vertical Bounce</option>
            <option value="spin">360° Spin</option>
            <option value="shake">Shake Attention</option>
            <option value="flash">Flash Glow</option>
            <option value="float">Hover Float</option>
          </select>
        </div>

        {emphasis.type !== 'none' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Start Delay:</span>
                <span className="font-mono text-amber-400 font-bold">{emphasis.delay}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={0.1}
                value={emphasis.delay}
                onChange={(e) => updateEmphasis({ delay: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Duration:</span>
                <span className="font-mono text-amber-400 font-bold">{emphasis.duration}s</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={4}
                step={0.1}
                value={emphasis.duration}
                onChange={(e) => updateEmphasis({ duration: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. EXIT ANIMATION CARD */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-rose-400 text-xs">
            <ArrowDownLeft className="w-4 h-4" />
            <span>3. Exit Animation</span>
          </div>
          <span className="text-[10px] text-rose-300 font-mono font-bold">
            {exitAnim.delay}s start • {exitAnim.duration}s dur
          </span>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Exit Effect:</label>
          <select
            value={exitAnim.type}
            onChange={(e) => updateExit({ type: e.target.value as ExitAnimationType })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-rose-500 font-medium"
          >
            <option value="none">None (Stays on Canvas)</option>
            <option value="fade-out">Fade Out</option>
            <option value="slide-out-left">Slide Out Left</option>
            <option value="slide-out-right">Slide Out Right</option>
            <option value="slide-out-bottom">Slide Out Bottom</option>
            <option value="zoom-out">Zoom Out &amp; Shrink</option>
            <option value="bounce-out">Bounce Out</option>
          </select>
        </div>

        {exitAnim.type !== 'none' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Start Delay:</span>
                <span className="font-mono text-rose-400 font-bold">{exitAnim.delay}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={exitAnim.delay}
                onChange={(e) => updateExit({ delay: parseFloat(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Duration:</span>
                <span className="font-mono text-rose-400 font-bold">{exitAnim.duration}s</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={4}
                step={0.1}
                value={exitAnim.duration}
                onChange={(e) => updateExit({ duration: parseFloat(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
