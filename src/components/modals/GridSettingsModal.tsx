import React from 'react';
import { useCourseStore } from '../../store/courseStore';
import { X, Grid, Check, Sparkles, Sliders } from 'lucide-react';

const COLOR_PRESETS = [
  { label: 'Slate Muted', val: '#334155' },
  { label: 'Sky Blue', val: '#0284c7' },
  { label: 'Indigo', val: '#4f46e5' },
  { label: 'Emerald', val: '#059669' },
  { label: 'Cyan Glow', val: '#06b6d4' },
  { label: 'Subtle Dark', val: '#1e293b' },
];

export const GridSettingsModal: React.FC = () => {
  const {
    isGridSettingsModalOpen,
    setIsGridSettingsModalOpen,
    isSnapToGridEnabled,
    setSnapToGrid,
    gridSize,
    setGridSize,
    gridColor,
    setGridColor,
  } = useCourseStore();

  if (!isGridSettingsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-16 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Canvas Grid &amp; Snapping Settings
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure grid spacing, visibility, and guide colors
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGridSettingsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Snap-to-Grid Main Toggle */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200 text-xs">Snap to Grid</div>
              <div className="text-[11px] text-slate-400">
                Snap element edges and drag steps to grid units
              </div>
            </div>
            <button
              onClick={() => setSnapToGrid(!isSnapToGridEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                isSnapToGridEnabled ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  isSnapToGridEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Grid Spacing Preset Buttons */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Grid Spacing Step ({gridSize}px)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 20, 25, 50].map((size) => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`py-2 rounded-xl border font-mono font-semibold text-center transition-all cursor-pointer ${
                    gridSize === size
                      ? 'border-blue-500 bg-blue-600/20 text-blue-300 shadow-sm'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Grid Color Picker & Presets */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Grid Dot / Line Color
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={gridColor.startsWith('#') ? gridColor : '#334155'}
                onChange={(e) => setGridColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={gridColor}
                onChange={(e) => setGridColor(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-mono text-[11px] outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.val}
                  onClick={() => setGridColor(p.val)}
                  title={p.label}
                  className="px-2 py-1 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300 flex items-center gap-1.5 text-[11px] transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full border border-slate-700"
                    style={{ background: p.val }}
                  />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid Preview Box */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Canvas Surface Preview</label>
            <div
              className="h-20 rounded-xl border border-slate-800 relative flex items-center justify-center text-slate-500 text-[10px]"
              style={{
                backgroundColor: '#0f172a',
                backgroundImage: `radial-gradient(${gridColor} 1.2px, transparent 1.2px)`,
                backgroundSize: `${gridSize * 2}px ${gridSize * 2}px`,
              }}
            >
              <span className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 font-mono text-slate-400">
                Grid: {gridSize}px &bull; Color: {gridColor}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 bg-slate-950 border-t border-slate-800 flex items-center justify-end px-6 shrink-0">
          <button
            onClick={() => setIsGridSettingsModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
