import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { NodeType } from '../../types/schema';
import { COURSE_TEMPLATES } from '../../data/templates';
import { SLIDE_LAYOUTS, SlideLayout } from '../../data/slideLayouts';
import { AssetsLibrary } from './AssetsLibrary';
import { TypographyLibrary } from './TypographyLibrary';
import { TemplatePreviewThumbnail } from './TemplatePreviewThumbnail';
import {
  Type,
  HelpCircle,
  Image as ImageIcon,
  Square,
  MessageSquare,
  BookOpen,
  Sparkles,
  Palette,
  CheckCircle2,
  LayoutGrid,
  Plus,
  ArrowRight,
  GripVertical,
  Layers,
  FolderArchive,
} from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const {
    addNode,
    loadCourse,
    applySlideLayout,
    addSlideWithLayout,
    setIsAiPaletteOpen,
    course,
  } = useCourseStore();

  const [activePanel, setActivePanel] = useState<
    'layouts' | 'assets' | 'typography' | 'elements' | 'courses'
  >('layouts');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredLayoutId, setHoveredLayoutId] = useState<string | null>(null);

  const filteredLayouts = SLIDE_LAYOUTS.filter((layout) => {
    if (selectedCategory === 'all') return true;
    return layout.category === selectedCategory;
  });

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Top 5 Section Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-0.5">
        <button
          onClick={() => setActivePanel('layouts')}
          title="Slide Layouts Library"
          className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activePanel === 'layouts'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Layouts</span>
        </button>
        <button
          onClick={() => setActivePanel('assets')}
          title="Assets & Shared Graphics Library"
          className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activePanel === 'assets'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Assets</span>
        </button>
        <button
          onClick={() => setActivePanel('typography')}
          title="Typography & Text Box Styles"
          className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activePanel === 'typography'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-sky-400" />
          <span>Text</span>
        </button>
        <button
          onClick={() => setActivePanel('elements')}
          title="Individual Elements"
          className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activePanel === 'elements'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span>Shapes</span>
        </button>
        <button
          onClick={() => setActivePanel('courses')}
          title="Full Sample Courses"
          className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activePanel === 'courses'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Courses</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ================= ASSETS LIBRARY ================= */}
        {activePanel === 'assets' && <AssetsLibrary />}

        {/* ================= TYPOGRAPHY LIBRARY ================= */}
        {activePanel === 'typography' && <TypographyLibrary />}
        {/* ================= LAYOUTS LIBRARY ================= */}
        {activePanel === 'layouts' && (
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-slate-200">Slide Layouts Library</h4>
                <span className="text-[10px] text-blue-400 font-medium">Drag to Canvas</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
                Drag any pre-designed slide layout directly onto the active canvas or click to apply.
              </p>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'intro', label: 'Intro' },
                  { id: 'content', label: 'Content' },
                  { id: 'quiz', label: 'Quiz' },
                  { id: 'conclusion', label: 'Summary' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Cards */}
            <div className="space-y-3">
              {filteredLayouts.map((layout) => (
                <div
                  key={layout.id}
                  draggable
                  onMouseEnter={() => setHoveredLayoutId(layout.id)}
                  onMouseLeave={() => setHoveredLayoutId(null)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/scorm-slide-layout', JSON.stringify(layout));
                    e.dataTransfer.setData('text/plain', layout.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-2.5 rounded-xl border border-slate-700/80 bg-slate-950/80 hover:border-blue-500 transition-all group shadow-sm cursor-grab active:cursor-grabbing relative"
                >
                  {/* Floating Hover Preview Thumbnail Generator */}
                  {hoveredLayoutId === layout.id && (
                    <div className="absolute left-[calc(100%+12px)] top-0 z-50 pointer-events-none drop-shadow-2xl hidden lg:block">
                      <div className="bg-slate-900 p-1.5 rounded-xl border border-blue-500/60 shadow-2xl space-y-1">
                        <TemplatePreviewThumbnail layout={layout} />
                        <div className="text-[10px] text-slate-300 font-medium px-1 flex items-center justify-between">
                          <span>{layout.title}</span>
                          <span className="text-blue-400 font-mono text-[9px] uppercase">
                            {layout.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Miniature Visual Wireframe */}
                  <div
                    className="w-full h-24 rounded-lg border border-slate-700/60 overflow-hidden relative mb-2 p-2 flex flex-col justify-between shadow-inner"
                    style={{ background: layout.background.value }}
                  >
                    {/* Simulated visual layout wireframe elements */}
                    <div className="space-y-1 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-2 rounded-xs bg-blue-500/80" />
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-black/40 text-slate-200 uppercase">
                          {layout.category}
                        </span>
                      </div>
                      <div className="w-3/4 h-3 rounded-xs bg-slate-200/90 font-bold" />
                      <div className="w-1/2 h-2 rounded-xs bg-slate-400/60" />
                    </div>

                    <div className="flex items-end justify-between pointer-events-none">
                      <div className="w-20 h-5 rounded-xs bg-blue-500/30 border border-blue-400/40" />
                      <div className="w-14 h-8 rounded-xs bg-slate-500/40" />
                    </div>

                    {/* Drag Hint Overlay on hover */}
                    <div className="absolute inset-0 bg-blue-950/70 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 px-2.5 py-1 rounded-md shadow-lg">
                        <GripVertical className="w-3.5 h-3.5" />
                        <span>Drag onto Slide</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Title & Meta */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">{layout.title}</span>
                    {layout.badge && (
                      <span className="text-[9px] font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.2 rounded">
                        {layout.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-2 line-clamp-2">
                    {layout.description}
                  </p>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60 text-[11px]">
                    <button
                      onClick={() => applySlideLayout(layout)}
                      title="Replace current slide with this layout"
                      className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3 text-blue-400" />
                      <span>Apply to Slide</span>
                    </button>
                    <button
                      onClick={() => addSlideWithLayout(layout)}
                      title="Add as a new slide to course"
                      className="py-1 px-2 rounded bg-blue-600/80 hover:bg-blue-600 text-white font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ New Slide</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= INDIVIDUAL ELEMENTS ================= */}
        {activePanel === 'elements' && (
          <>
            {/* AI Generator CTA Banner */}
            <div
              onClick={() => setIsAiPaletteOpen(true)}
              className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/90 via-blue-950/70 to-slate-900 border border-blue-500/30 hover:border-blue-400 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1">
                <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>AI Course Generator</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Generate complete multi-slide courses or instant quiz questions with Gemini.
              </p>
            </div>

            {/* Interactive Components */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  SCORM E-Learning Elements
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">Drag or Click</span>
              </div>
              <div className="space-y-2">
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/scorm-node-type', 'quiz');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addNode('quiz')}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:border-blue-500 text-left flex items-start gap-3 transition-colors group cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="p-2 rounded bg-blue-500/10 text-blue-400 group-hover:text-blue-300 group-hover:bg-blue-500/20 shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white flex items-center justify-between">
                      <span>Interactive Quiz</span>
                      <span className="text-[9px] text-blue-400 font-mono">DRAG</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Graded knowledge check with SCORM score tracking
                    </div>
                  </div>
                </div>

                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/scorm-node-type', 'callout');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addNode('callout')}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:border-blue-500 text-left flex items-start gap-3 transition-colors group cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="p-2 rounded bg-sky-500/10 text-sky-400 group-hover:text-sky-300 group-hover:bg-sky-500/20 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white flex items-center justify-between">
                      <span>Info / Warning Callout</span>
                      <span className="text-[9px] text-sky-400 font-mono">DRAG</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Highlighted card for rules, objectives &amp; tips
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Standard Design Elements */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  Typography &amp; Media
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">Drag to Canvas</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/scorm-node-type', 'text');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addNode('text')}
                  className="p-3 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 hover:border-blue-500 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing select-none"
                >
                  <Type className="w-4 h-4 text-slate-300" />
                  <span className="text-xs text-slate-200 font-medium">Text Box</span>
                </div>

                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/scorm-node-type', 'image');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addNode('image')}
                  className="p-3 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 hover:border-blue-500 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing select-none"
                >
                  <ImageIcon className="w-4 h-4 text-slate-300" />
                  <span className="text-xs text-slate-200 font-medium">Image Asset</span>
                </div>

                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/scorm-node-type', 'shape');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addNode('shape')}
                  className="p-3 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 hover:border-blue-500 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing select-none col-span-2"
                >
                  <Square className="w-4 h-4 text-slate-300" />
                  <span className="text-xs text-slate-200 font-medium">Card Shape / Badge</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================= COURSES TAB ================= */}
        {activePanel === 'courses' && (
          <div className="space-y-4">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Starter E-Learning Courses
            </h4>
            <div className="space-y-3">
              <div
                onClick={() => loadCourse(COURSE_TEMPLATES.cybersecurity)}
                className="p-3 rounded-lg border border-slate-700 bg-slate-800 hover:border-blue-500 cursor-pointer transition-colors"
              >
                <div className="text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>Cybersecurity Awareness</span>
                  {course.id === 'COURSE_CYBER_2026' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  4-slide interactive course covering phishing email detection, rules, and scored quiz.
                </p>
              </div>

              <div
                onClick={() => loadCourse(COURSE_TEMPLATES.workplace_safety)}
                className="p-3 rounded-lg border border-slate-700 bg-slate-800 hover:border-blue-500 cursor-pointer transition-colors"
              >
                <div className="text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>Workplace Safety &amp; Ergonomics</span>
                  {course.id === 'COURSE_SAFETY_101' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Postural ergonomics essentials with interactive monitor height quiz.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
