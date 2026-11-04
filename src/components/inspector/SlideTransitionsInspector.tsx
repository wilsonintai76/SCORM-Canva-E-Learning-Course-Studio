import React from 'react';
import { CanvasNode, Page, PageTransition } from '../../types/schema';
import { Play, Sparkles, MoveRight, ZoomIn, Eye, Activity } from 'lucide-react';

interface Props {
  node?: CanvasNode;
  page?: Page;
  onUpdateNode?: (updates: Partial<CanvasNode>) => void;
  onUpdatePage?: (updates: Partial<Page>) => void;
}

export const SlideTransitionsInspector: React.FC<Props> = ({
  node,
  page,
  onUpdateNode,
  onUpdatePage,
}) => {
  const isNodeMode = Boolean(node && onUpdateNode);

  const nodeAnimation = node?.animation || {
    enter: 'none',
    exit: 'none',
    duration: 0.5,
  };

  const pageTransition: PageTransition = page?.transition || {
    type: 'fade',
    duration: 0.5,
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            {isNodeMode ? 'Component Animation' : 'Slide Transition'}
          </span>
        </div>
        <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/80">
          {isNodeMode ? nodeAnimation.enter : pageTransition.type}
        </span>
      </div>

      {isNodeMode && onUpdateNode && (
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Entrance Effect</label>
            <select
              value={nodeAnimation.enter}
              onChange={(e) =>
                onUpdateNode({
                  animation: {
                    ...nodeAnimation,
                    enter: e.target.value as any,
                  },
                })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="none">None (Instant Display)</option>
              <option value="fade">Fade In</option>
              <option value="slide-up">Slide In (Up)</option>
              <option value="slide-left">Slide In (Left)</option>
              <option value="zoom">Zoom In Scale</option>
              <option value="bounce">Subtle Bounce</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Exit Effect</label>
            <select
              value={nodeAnimation.exit || 'none'}
              onChange={(e) =>
                onUpdateNode({
                  animation: {
                    ...nodeAnimation,
                    exit: e.target.value as any,
                  },
                })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="none">None</option>
              <option value="fade">Fade Out</option>
              <option value="slide-down">Slide Out (Down)</option>
              <option value="zoom">Zoom Out</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-medium">
              <span>Effect Duration</span>
              <span className="font-mono text-slate-300">
                {(nodeAnimation.duration || 0.5).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.1}
              value={nodeAnimation.duration || 0.5}
              onChange={(e) =>
                onUpdateNode({
                  animation: {
                    ...nodeAnimation,
                    duration: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Slide-Level Transition Settings */}
      {page && onUpdatePage && (
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Slide Navigation Transition</label>
            <select
              value={pageTransition.type}
              onChange={(e) =>
                onUpdatePage({
                  transition: {
                    ...pageTransition,
                    type: e.target.value as any,
                  },
                })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="none">None (Cut)</option>
              <option value="fade">Smooth Fade Cross dissolve</option>
              <option value="slide">Horizontal Slide Pan</option>
              <option value="zoom">Scale Zoom Punch</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-medium">
              <span>Transition Speed</span>
              <span className="font-mono text-slate-300">
                {(pageTransition.duration || 0.5).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1.5}
              step={0.1}
              value={pageTransition.duration || 0.5}
              onChange={(e) =>
                onUpdatePage({
                  transition: {
                    ...pageTransition,
                    duration: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
