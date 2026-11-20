import React, { useState, useEffect, useRef } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { computeReorderTargetIndex, DropPosition } from '../../utils/slideReorder';
import {
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Palette,
  GripVertical,
} from 'lucide-react';

interface ContextMenuState {
  x: number;
  y: number;
  targetIndex: number;
  selectedIndices: number[];
}

interface DropTargetState {
  index: number;
  position: DropPosition;
}

const BG_PRESETS = [
  { label: 'White', color: '#ffffff' },
  { label: 'Off-White', color: '#f8fafc' },
  { label: 'Slate Dark', color: '#0f172a' },
  { label: 'Navy Deep', color: '#172554' },
  { label: 'Emerald Deep', color: '#064e3b' },
  { label: 'Charcoal', color: '#18181b' },
];

export const PageTabs: React.FC = () => {
  const {
    course,
    activePageIndex,
    setActivePage,
    addPage,
    duplicatePage,
    deletePage,
    reorderPages,
    changeSlideBackground,
    duplicateMultiplePages,
    deleteMultiplePages,
  } = useCourseStore();

  const [selectedIndices, setSelectedIndices] = useState<number[]>([activePageIndex]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isChangingBg, setIsChangingBg] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Sync selectedIndices with activePageIndex if single-select
  useEffect(() => {
    if (!selectedIndices.includes(activePageIndex)) {
      setSelectedIndices([activePageIndex]);
    }
  }, [activePageIndex]);

  // Click outside to dismiss context menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setIsChangingBg(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setIsChangingBg(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSlideClick = (index: number, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setSelectedIndices((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelectedIndices([index]);
      setActivePage(index);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    setDropTarget(null);
    setContextMenu(null);
    setIsChangingBg(false);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/scorm-slide-index', String(index));
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    const hasSlidePayload =
      draggedIndex !== null || e.dataTransfer.types.includes('application/scorm-slide-index');
    if (!hasSlidePayload) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const position: DropPosition = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';

    setDropTarget((prev) =>
      prev && prev.index === index && prev.position === position ? prev : { index, position }
    );
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget((prev) => (prev && prev.index === index ? null : prev));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const rawFrom =
      e.dataTransfer.getData('application/scorm-slide-index') ||
      (draggedIndex !== null ? String(draggedIndex) : '');
    const fromIndex = parseInt(rawFrom, 10);

    const rect = e.currentTarget.getBoundingClientRect();
    const position: DropPosition = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';

    if (!Number.isNaN(fromIndex) && fromIndex >= 0 && fromIndex < course.pages.length) {
      const toIndex = computeReorderTargetIndex(fromIndex, targetIndex, position);
      if (toIndex !== fromIndex && toIndex >= 0 && toIndex < course.pages.length) {
        reorderPages(fromIndex, toIndex);
        setSelectedIndices([toIndex]);
      }
    }

    setDraggedIndex(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTarget(null);
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const targetIndices = selectedIndices.includes(index) ? selectedIndices : [index];
    if (!selectedIndices.includes(index)) {
      setSelectedIndices([index]);
    }

    // Keep context menu on screen
    const menuWidth = 200;
    const menuHeight = 260;
    const clickX = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const clickY = Math.min(e.clientY - menuHeight + 40, window.innerHeight - menuHeight - 10);

    setContextMenu({
      x: clickX,
      y: Math.max(10, clickY),
      targetIndex: index,
      selectedIndices: targetIndices,
    });
    setIsChangingBg(false);
  };

  const handleDuplicateAction = () => {
    if (!contextMenu) return;
    if (contextMenu.selectedIndices.length === 1) {
      duplicatePage(contextMenu.selectedIndices[0]);
    } else {
      duplicateMultiplePages(contextMenu.selectedIndices);
    }
    setContextMenu(null);
  };

  const handleDeleteAction = () => {
    if (!contextMenu) return;
    if (contextMenu.selectedIndices.length === 1) {
      deletePage(contextMenu.selectedIndices[0]);
    } else {
      deleteMultiplePages(contextMenu.selectedIndices);
    }
    setContextMenu(null);
  };

  const handleApplyBackground = (color: string) => {
    if (!contextMenu) return;
    changeSlideBackground(contextMenu.selectedIndices, color);
    setContextMenu(null);
    setIsChangingBg(false);
  };

  return (
    <footer className="h-24 bg-slate-900 border-t border-slate-800 flex items-center px-4 gap-3 shrink-0 select-none overflow-x-auto relative">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0">
        <span>Slides ({course.pages.length}):</span>
        {selectedIndices.length > 1 && (
          <span className="text-[10px] text-blue-400 font-mono bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800">
            {selectedIndices.length} selected
          </span>
        )}
      </div>

      {/* Slide Thumbnails Filmstrip */}
      <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 flex-1">
        {course.pages.map((page, index) => {
          const isActive = index === activePageIndex;
          const isSelected = selectedIndices.includes(index);
          const isDragging = draggedIndex === index;

          const showDropIndicator =
            dropTarget !== null &&
            dropTarget.index === index &&
            draggedIndex !== null &&
            computeReorderTargetIndex(draggedIndex, index, dropTarget.position) !== draggedIndex;

          return (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={(e) => handleDragLeave(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              title="Click to select, or drag to reorder slide"
              className={`group relative flex flex-col items-center shrink-0 cursor-grab active:cursor-grabbing transition-all ${
                isDragging
                  ? 'opacity-40 scale-95'
                  : isActive
                  ? 'scale-105'
                  : 'opacity-75 hover:opacity-100'
              }`}
              onClick={(e) => handleSlideClick(index, e)}
              onContextMenu={(e) => handleContextMenu(e, index)}
            >
              {/* Drag-and-Drop Insertion Indicator */}
              {showDropIndicator && dropTarget.position === 'before' && (
                <div
                  aria-hidden="true"
                  className="absolute -left-2 top-0 bottom-0 w-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.95)] z-50 pointer-events-none"
                />
              )}
              {showDropIndicator && dropTarget.position === 'after' && (
                <div
                  aria-hidden="true"
                  className="absolute -right-2 top-0 bottom-0 w-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.95)] z-50 pointer-events-none"
                />
              )}

              {/* Thumbnail Frame */}
              <div
                className={`w-28 h-16 rounded border transition-all overflow-hidden relative shadow-sm flex flex-col justify-between p-1.5 ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-blue-500/20'
                    : isSelected
                    ? 'border-sky-400 ring-1 ring-sky-400/50'
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

                <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600 bg-white/70 px-1 py-0.5 rounded-xs backdrop-blur-xs pointer-events-none">
                  <span className="flex items-center gap-0.5">
                    <GripVertical className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    #{index + 1}
                  </span>
                  <span className="truncate max-w-13.5">{page.nodes.length} nodes</span>
                </div>
              </div>

              {/* Hover Actions Bar */}
              <div
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
                className="absolute -top-3.5 right-0 hidden group-hover:flex items-center gap-0.5 bg-slate-950/90 border border-slate-700 rounded px-1 py-0.5 shadow-lg z-50"
              >
                {index > 0 && (
                  <button
                    title="Move Left"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderPages(index, index - 1);
                      setSelectedIndices([index - 1]);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
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
                      setSelectedIndices([index + 1]);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
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
                  className="p-0.5 text-slate-400 hover:text-blue-400 cursor-pointer"
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
                    className="p-0.5 text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Single Add Slide Button */}
        <button
          onClick={addPage}
          title="Add New Slide"
          className="w-28 h-16 shrink-0 rounded border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/40 hover:bg-slate-800 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-400 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[11px] font-medium">Add Slide</span>
        </button>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-[100] w-56 text-xs text-slate-200 select-none animate-in fade-in duration-100"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-800 text-[11px] text-slate-400 font-semibold flex items-center justify-between">
            <span>
              {contextMenu.selectedIndices.length > 1
                ? `${contextMenu.selectedIndices.length} Slides Selected`
                : `Slide #${contextMenu.targetIndex + 1}`}
            </span>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              onClick={handleDuplicateAction}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {contextMenu.selectedIndices.length > 1
                  ? `Duplicate ${contextMenu.selectedIndices.length} Slides`
                  : 'Duplicate Slide'}
              </span>
            </button>

            <button
              onClick={() => setIsChangingBg(!isChangingBg)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                <span>Change Background</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>

            {/* Background color options expansion */}
            {isChangingBg && (
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 my-1 space-y-2">
                <span className="text-[10px] text-slate-400 font-medium block">Select Color:</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {BG_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      onClick={() => handleApplyBackground(p.color)}
                      title={p.label}
                      className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                      style={{ background: p.color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="color"
                    onChange={(e) => handleApplyBackground(e.target.value)}
                    className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                    title="Custom color picker"
                  />
                  <span className="text-[10px] text-slate-400">Custom hex color</span>
                </div>
              </div>
            )}

            {course.pages.length > contextMenu.selectedIndices.length && (
              <button
                onClick={handleDeleteAction}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-950/80 text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {contextMenu.selectedIndices.length > 1
                    ? `Delete ${contextMenu.selectedIndices.length} Slides`
                    : 'Delete Slide'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </footer>
  );
};
