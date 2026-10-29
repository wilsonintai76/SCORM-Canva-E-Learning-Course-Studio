import React from 'react';
import { useCourseStore } from '../../store/courseStore';
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export const PageTabs: React.FC = () => {
  const {
    course,
    activePageIndex,
    setActivePage,
    addPage,
    duplicatePage,
    deletePage,
    reorderPages,
  } = useCourseStore();

  return (
    <footer className="h-24 bg-slate-900 border-t border-slate-800 flex items-center px-4 gap-3 shrink-0 select-none overflow-x-auto">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0">
        <span>Slides ({course.pages.length}):</span>
      </div>

      {/* Slide Thumbnails Filmstrip */}
      <div className="flex items-center gap-3 overflow-x-auto py-2 flex-1">
        {course.pages.map((page, index) => {
          const isActive = index === activePageIndex;

          return (
            <div
              key={page.id}
              className={`group relative flex flex-col items-center shrink-0 cursor-pointer transition-all ${
                isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'
              }`}
              onClick={() => setActivePage(index)}
            >
              {/* Thumbnail Frame */}
              <div
                className={`w-28 h-16 rounded border transition-all overflow-hidden relative shadow-sm flex flex-col justify-between p-1.5 ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-blue-500/20'
                    : 'border-slate-700 bg-slate-800'
                }`}
                style={{
                  background: page.background?.value || '#ffffff',
                }}
              >
                {/* Micro preview nodes representation */}
                <div className="w-full flex-1 relative overflow-hidden pointer-events-none">
                  <div className="text-[7px] font-bold text-slate-800 truncate leading-none">
                    {page.title}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {page.nodes.slice(0, 4).map((n) => (
                      <div
                        key={n.id}
                        className="w-3 h-1.5 rounded-[1px] bg-slate-400/40"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600 bg-white/70 px-1 py-0.5 rounded-[2px] backdrop-blur-xs">
                  <span>#{index + 1}</span>
                  <span className="truncate max-w-[60px]">{page.nodes.length} nodes</span>
                </div>
              </div>

              {/* Hover Actions Bar */}
              <div className="absolute -top-3.5 right-0 hidden group-hover:flex items-center gap-0.5 bg-slate-950/90 border border-slate-700 rounded px-1 py-0.5 shadow-lg z-50">
                {index > 0 && (
                  <button
                    title="Move Left"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderPages(index, index - 1);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}
                {index < course.pages.length - 1 && (
                  <button
                    title="Move Right"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderPages(index, index + 1);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  title="Duplicate Slide"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicatePage(index);
                  }}
                  className="p-0.5 text-slate-400 hover:text-blue-400"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {course.pages.length > 1 && (
                  <button
                    title="Delete Slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(index);
                    }}
                    className="p-0.5 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Slide Button */}
        <button
          onClick={addPage}
          className="w-28 h-16 shrink-0 rounded border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/40 hover:bg-slate-800 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-400 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[11px] font-medium">Add Slide</span>
        </button>
      </div>
    </footer>
  );
};
