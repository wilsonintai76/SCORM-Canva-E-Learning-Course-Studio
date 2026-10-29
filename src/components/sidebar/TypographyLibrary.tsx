import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { TYPOGRAPHY_PRESETS, TypographyPreset } from '../../data/typographyData';
import { Type, Sparkles, Plus, Quote, Hash, Layers } from 'lucide-react';

export const TypographyLibrary: React.FC = () => {
  const { currentPage, updateActivePage } = useCourseStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPresets = TYPOGRAPHY_PRESETS.filter((preset) => {
    if (selectedCategory === 'all') return true;
    return preset.category === selectedCategory;
  });

  const handleDragStart = (e: React.DragEvent, preset: TypographyPreset) => {
    e.dataTransfer.setData('application/scorm-typography', JSON.stringify(preset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleApplyPreset = (preset: TypographyPreset) => {
    if (!currentPage) return;
    const maxZ = currentPage.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0);

    const newNodes = preset.nodes.map((node, i) => ({
      ...node,
      id: `${node.type}_typo_${Math.random().toString(36).substring(2, 9)}`,
      zIndex: maxZ + i + 1,
    }));

    updateActivePage({
      nodes: [...currentPage.nodes, ...(newNodes as any)],
    });
  };

  return (
    <div className="space-y-3.5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-xs font-bold text-slate-200">Typography & Text Styles</h4>
          <span className="text-[10px] text-blue-400 font-medium">Drag to Canvas</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
          Curated font pairings, statistic callouts, editorial headlines, and styled pull quotes.
        </p>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'pairing', label: 'Pairings' },
            { id: 'stat', label: 'Stats & Metrics' },
            { id: 'quote', label: 'Quotes' },
            { id: 'card', label: 'Step Cards' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset List */}
      <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-0.5">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            draggable
            onDragStart={(e) => handleDragStart(e, preset)}
            onClick={() => handleApplyPreset(preset)}
            className="group p-3 rounded-lg border border-slate-800 hover:border-blue-500/60 bg-slate-950/70 hover:bg-slate-850 cursor-grab active:cursor-grabbing transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-300">
                {preset.name}
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {preset.category}
              </span>
            </div>

            {/* Typography Visual Preview Box */}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
              <div
                className="text-sm font-bold text-slate-100 truncate"
                style={{ fontFamily: preset.fontFamily }}
              >
                {preset.previewHeader}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {preset.previewSubtext}
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-500">
              <span>{preset.description}</span>
              <span className="text-blue-400 opacity-0 group-hover:opacity-100 font-medium flex items-center gap-0.5 transition-opacity">
                <Plus className="w-3 h-3" /> Add
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
