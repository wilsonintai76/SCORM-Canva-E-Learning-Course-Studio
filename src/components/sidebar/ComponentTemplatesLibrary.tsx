import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { COMPONENT_TEMPLATES, ComponentTemplateItem } from '../../data/componentTemplatesData';
import { CanvasNode } from '../../types/schema';
import {
  Boxes,
  HelpCircle,
  Sparkles,
  ListOrdered,
  Columns,
  UserCheck,
  Award,
  BookOpen,
  FileText,
  Search,
  X,
  Layers,
  ArrowRight,
  GripVertical,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  HelpCircle,
  Sparkles,
  ListOrdered,
  Columns,
  UserCheck,
  Award,
  BookOpen,
  FileText,
  Boxes,
};

export const ComponentTemplatesLibrary: React.FC = () => {
  const { currentPage, updateActivePage, pushUndo } = useCourseStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComponents = COMPONENT_TEMPLATES.filter((tmpl) => {
    if (selectedCategory !== 'all' && tmpl.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tmpl.name.toLowerCase().includes(q);
      const matchDesc = tmpl.description.toLowerCase().includes(q);
      const matchBadge = tmpl.badge.toLowerCase().includes(q);
      const matchTags = tmpl.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchBadge || matchTags;
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent, template: ComponentTemplateItem) => {
    e.dataTransfer.setData('application/scorm-component-template', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleApplyComponent = (template: ComponentTemplateItem) => {
    if (!currentPage) return;

    const canvasWidth = 960;
    const canvasHeight = 540;

    // Calculate center placement
    const targetX = Math.max(10, Math.round((canvasWidth - template.width) / 2));
    const targetY = Math.max(10, Math.round((canvasHeight - template.height) / 2));

    const minPresetX = Math.min(...template.nodes.map((n) => n.x ?? 0));
    const minPresetY = Math.min(...template.nodes.map((n) => n.y ?? 0));

    const maxZ = currentPage.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0);

    const offsetNodes = template.nodes.map((node, i) => {
      const relativeX = (node.x ?? 0) - minPresetX;
      const relativeY = (node.y ?? 0) - minPresetY;
      const finalX = Math.max(10, Math.min(canvasWidth - 50, targetX + relativeX));
      const finalY = Math.max(10, Math.min(canvasHeight - 30, targetY + relativeY));

      return {
        ...node,
        id: `${node.type}_comp_${Math.random().toString(36).substring(2, 9)}`,
        x: Math.round(finalX),
        y: Math.round(finalY),
        zIndex: maxZ + i + 1,
      } as CanvasNode;
    });

    pushUndo(`Insert ${template.name}`);
    updateActivePage({
      nodes: [...currentPage.nodes, ...offsetNodes],
    });
  };

  return (
    <div className="space-y-3.5 select-none text-xs">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-sky-400" />
            <span>E-Learning Components</span>
          </h4>
          <span className="text-[10px] text-sky-400 font-medium">Drag to Canvas</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
          Ready-to-use e-learning patterns: Knowledge Checks, Click-to-Reveals, Process Steppers, and Scenario Cards.
        </p>

        {/* Search Bar */}
        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search e-learning components..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-slate-200 text-xs placeholder:text-slate-500 outline-none focus:border-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'interactive', label: 'Interactive' },
            { id: 'process', label: 'Process' },
            { id: 'comparison', label: 'Do\'s & Don\'ts' },
            { id: 'scenario', label: 'Scenarios' },
            { id: 'summary', label: 'Summaries' },
            { id: 'reference', label: 'Reference' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Components List */}
      <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-0.5">
        {filteredComponents.map((tmpl) => {
          const IconComp = ICON_MAP[tmpl.iconName] || Boxes;
          return (
            <div
              key={tmpl.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tmpl)}
              onClick={() => handleApplyComponent(tmpl)}
              className="group p-3 rounded-xl border border-slate-800 hover:border-sky-500/70 bg-slate-950/80 hover:bg-slate-900 cursor-grab active:cursor-grabbing transition-all space-y-2 shadow-md relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="p-1.5 rounded-lg border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${tmpl.accentColor}15`,
                      borderColor: `${tmpl.accentColor}40`,
                      color: tmpl.accentColor,
                    }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                      {tmpl.name}
                    </h5>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                      {tmpl.badge}
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-bold font-mono text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/60 opacity-80 group-hover:opacity-100 transition-opacity">
                  DRAG
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                {tmpl.description}
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                <span>{tmpl.nodes.length} element block{tmpl.nodes.length > 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1 text-sky-400 group-hover:translate-x-0.5 transition-transform font-medium">
                  <span>Add to Slide</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}

        {filteredComponents.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            No e-learning components found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
