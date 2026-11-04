import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useCourseStore } from '../../store/courseStore';
import { triggerDownloadBlob } from '../../packager/zipPackager';
import {
  Undo,
  Redo,
  Play,
  Download,
  Terminal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  Layers,
  Grid,
  Keyboard,
  FileImage,
  Users,
  FileText,
  FileDown,
  Ruler,
  Sliders,
  History,
  ShieldCheck,
  GitBranch,
  FolderDown,
  Crosshair,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  ChevronDown,
  Eye,
  Wrench,
  RotateCcw,
  Moon,
  Sun,
  Palette,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const TopNavBar: React.FC = () => {
  const {
    course,
    currentPage,
    selectedNodeIds,
    alignSelected,
    zoom,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    lastUndoDescription,
    lastRedoDescription,
    undo,
    redo,
    isSnapToGridEnabled,
    gridSize,
    showRulers,
    showGuides,
    setSnapToGrid,
    setShowRulers,
    setShowGuides,
    setZoom,
    resetView,
    updateManifest,
    setIsPreviewOpen,
    setIsDebuggerOpen,
    setIsExportModalOpen,
    setIsShortcutsModalOpen,
    setIsCollaborateModalOpen,
    setIsGridSettingsModalOpen,
    setIsMediaManagerOpen,
    setIsBranchingFlowOpen,
    setIsAccessibilityModalOpen,
    setIsVersionHistoryOpen,
    setIsPdfModalOpen,
    exportProjectJson,
  } = useCourseStore();

  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);

  // Close open dropdown menus on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsViewMenuOpen(false);
        setIsToolsMenuOpen(false);
        setIsExportMenuOpen(false);
        setIsAlignMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsViewMenuOpen(false);
        setIsToolsMenuOpen(false);
        setIsExportMenuOpen(false);
        setIsAlignMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDownloadProject = () => {
    try {
      const jsonStr = exportProjectJson();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const safeTitle = (course.title || 'course')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      triggerDownloadBlob(blob, `${safeTitle || 'project'}_backup.json`);
    } catch (err) {
      console.error('Failed to export project JSON:', err);
    }
  };

  const handleDownloadImage = async () => {
    try {
      setIsExportingImage(true);
      const stageEl =
        (document.querySelector('.aistudio-slide-stage') as HTMLElement) ||
        (document.querySelector('div[style*="transform-origin"]') as HTMLElement);

      if (!stageEl) {
        console.error('Canvas stage element not found');
        return;
      }

      const canvas = await html2canvas(stageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeTitle = (currentPage?.title || course.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      link.download = `${safeTitle || 'slide'}_design.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export slide as PNG image:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const closeAllMenus = () => {
    setIsViewMenuOpen(false);
    setIsToolsMenuOpen(false);
    setIsExportMenuOpen(false);
    setIsAlignMenuOpen(false);
  };

  return (
    <header
      ref={navRef}
      className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 md:px-4 z-20 shrink-0 select-none gap-2"
    >
      {/* 1. LEFT: Brand & Course Title */}
      <div className="flex items-center gap-2 md:gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-sm text-slate-100 tracking-tight flex items-center gap-1.5">
              SCORM Canva
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.2 rounded">
                1.2
              </span>
            </span>
          </div>
        </div>

        <div className="hidden sm:block h-4 w-[1px] bg-slate-800 mx-0.5" />

        {/* Course Title editable input */}
        <input
          type="text"
          value={course.title}
          onChange={(e) => updateManifest({ title: e.target.value })}
          className="text-xs font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/80 px-2 py-1 rounded transition-colors border border-transparent focus:border-blue-500 focus:bg-slate-950 outline-none max-w-[130px] md:max-w-[200px] lg:max-w-[240px] truncate"
          title="Click to rename course"
        />

        <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 pl-1">
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px]">Saved</span>
        </div>
      </div>

      {/* 2. CENTER: Canvas Navigation & Editing Toolbar */}
      <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-1 text-xs shrink-0">
        {/* Undo Button */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title={
            canUndo
              ? `Undo: ${lastUndoDescription || 'last change'} (Ctrl+Z) • ${undoCount} action${undoCount > 1 ? 's' : ''}`
              : 'Undo (Ctrl+Z)'
          }
          className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors text-xs ${
            canUndo
              ? 'text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 shadow-xs cursor-pointer'
              : 'text-slate-500 opacity-40 pointer-events-none'
          }`}
        >
          <Undo className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium hidden sm:inline">Undo</span>
          {canUndo && undoCount > 0 && (
            <span className="text-[10px] font-mono text-blue-300 bg-blue-950 px-1 rounded border border-blue-800/80">
              {undoCount}
            </span>
          )}
        </button>

        {/* Redo Button */}
        <button
          onClick={redo}
          disabled={!canRedo}
          title={
            canRedo
              ? `Redo: ${lastRedoDescription || 'action'} (Ctrl+Y) • ${redoCount} action${redoCount > 1 ? 's' : ''}`
              : 'Redo (Ctrl+Y)'
          }
          className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors text-xs ${
            canRedo
              ? 'text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 shadow-xs cursor-pointer'
              : 'text-slate-500 opacity-40 pointer-events-none'
          }`}
        >
          <Redo className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium hidden sm:inline">Redo</span>
          {canRedo && redoCount > 0 && (
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-1 rounded border border-indigo-800/80">
              {redoCount}
            </span>
          )}
        </button>

        <div className="h-3.5 w-[1px] bg-slate-800 mx-0.5" />

        {/* Zoom Controls */}
        <button
          onClick={() => setZoom(zoom - 0.1)}
          title="Zoom Out"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[36px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          title="Zoom In"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-[1px] bg-slate-800 mx-0.5" />

        {/* Quick Snap Toggle */}
        <button
          onClick={() => setSnapToGrid(!isSnapToGridEnabled)}
          title={
            isSnapToGridEnabled
              ? `Snap to Grid Enabled (${gridSize}px) - Click to toggle`
              : 'Snap to Grid Disabled - Click to toggle'
          }
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
            isSnapToGridEnabled
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold hidden md:inline">Snap</span>
        </button>

        {/* View Options Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsViewMenuOpen(!isViewMenuOpen);
              setIsToolsMenuOpen(false);
              setIsExportMenuOpen(false);
              setIsAlignMenuOpen(false);
            }}
            title="Canvas View & Rulers Options"
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              isViewMenuOpen
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] hidden sm:inline">View</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isViewMenuOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-52 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                View & Canvas Options
              </div>

              <button
                onClick={() => {
                  setShowRulers(!showRulers);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-sky-400" />
                  <span>Show Rulers</span>
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    showRulers
                      ? 'bg-sky-500 border-sky-400 text-slate-950 font-bold'
                      : 'border-slate-600'
                  }`}
                >
                  {showRulers && '✓'}
                </span>
              </button>

              <button
                onClick={() => {
                  setShowGuides(!showGuides);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Smart Guides</span>
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    showGuides
                      ? 'bg-indigo-500 border-indigo-400 text-slate-950 font-bold'
                      : 'border-slate-600'
                  }`}
                >
                  {showGuides && '✓'}
                </span>
              </button>

              <button
                onClick={() => {
                  setSnapToGrid(!isSnapToGridEnabled);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-blue-400" />
                  <span>Snap to Grid</span>
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    isSnapToGridEnabled
                      ? 'bg-blue-500 border-blue-400 text-slate-950 font-bold'
                      : 'border-slate-600'
                  }`}
                >
                  {isSnapToGridEnabled && '✓'}
                </span>
              </button>

              <div className="h-[1px] bg-slate-800/80 my-1 mx-2" />

              <button
                onClick={() => {
                  setIsGridSettingsModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Grid Spacing & Color...</span>
              </button>

              <button
                onClick={() => {
                  resetView();
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset View (100%)</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Align Popover or Inline Buttons when elements selected */}
        <div className="h-3.5 w-[1px] bg-slate-800 mx-0.5" />

        {selectedNodeIds.length > 0 ? (
          <div className="flex items-center gap-0.5 bg-sky-950/40 border border-sky-500/30 rounded-md px-1 py-0.5">
            <span className="text-[10px] font-bold text-sky-400 px-1 border-r border-sky-800/80 mr-0.5">
              {selectedNodeIds.length}
            </span>
            <button
              onClick={() => alignSelected('left')}
              title="Align Left"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('center-h')}
              title="Center Horizontally"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('right')}
              title="Align Right"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />
            <button
              onClick={() => alignSelected('top')}
              title="Align Top"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignStartVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('center-v')}
              title="Center Vertically"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('bottom')}
              title="Align Bottom"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignEndVertical className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />
            <button
              onClick={() => alignSelected('baseline')}
              title="Snap to Baseline"
              className="p-1 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded cursor-pointer"
            >
              <AlignEndHorizontal className="w-3.5 h-3.5" />
            </button>
            {selectedNodeIds.length >= 3 && (
              <button
                onClick={() => alignSelected('distribute-h')}
                title="Distribute Horizontally"
                className="p-1 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
              >
                <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => {
                setIsAlignMenuOpen(!isAlignMenuOpen);
                setIsViewMenuOpen(false);
                setIsToolsMenuOpen(false);
                setIsExportMenuOpen(false);
              }}
              title="Quick Align Elements (Select elements on canvas first)"
              className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] hidden sm:inline">Align</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {isAlignMenuOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-52 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[11px] font-semibold text-slate-300 mb-1">Align Elements</div>
                <p className="text-[10px] text-slate-400 mb-2">
                  Select one or more elements on the canvas to activate alignment tools.
                </p>
                <div className="flex items-center justify-center gap-1 opacity-40 pointer-events-none">
                  <AlignLeft className="w-4 h-4 text-slate-400" />
                  <AlignCenterHorizontal className="w-4 h-4 text-slate-400" />
                  <AlignRight className="w-4 h-4 text-slate-400" />
                  <AlignStartVertical className="w-4 h-4 text-slate-400" />
                  <AlignCenterVertical className="w-4 h-4 text-slate-400" />
                  <AlignEndVertical className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. RIGHT: Clean Structured Tools & Export Actions */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Tools Menu Dropdown (Replaces Branching, Media, Audit, Versions, LMS, Shortcuts) */}
        <div className="relative">
          <button
            onClick={() => {
              setIsToolsMenuOpen(!isToolsMenuOpen);
              setIsViewMenuOpen(false);
              setIsExportMenuOpen(false);
              setIsAlignMenuOpen(false);
            }}
            title="Course Authoring Tools & Audits"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isToolsMenuOpen
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Tools</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isToolsMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-56 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                Studio Tools & Audits
              </div>

              <button
                onClick={() => {
                  setIsBranchingFlowOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <GitBranch className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">Branching Flow</div>
                  <div className="text-[10px] text-slate-400">Non-linear navigation map</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMediaManagerOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">Media Manager</div>
                  <div className="text-[10px] text-slate-400">Audit & replace assets</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsAccessibilityModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">WCAG 2.1 Audit</div>
                  <div className="text-[10px] text-slate-400">Contrast & alt text checker</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsVersionHistoryOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">Version History</div>
                  <div className="text-[10px] text-slate-400">Snapshots & restore points</div>
                </div>
              </button>

              <div className="h-[1px] bg-slate-800/80 my-1 mx-2" />

              <button
                onClick={() => {
                  setIsDebuggerOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">LMS Debugger</div>
                  <div className="text-[10px] text-slate-400">SCORM CMI tracking log</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsShortcutsModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <Keyboard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">Shortcuts Guide</div>
                  <div className="text-[10px] text-slate-400">Keyboard hotkeys (?)</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Export & Download Menu Dropdown (Replaces Download Project, Download PDF, PNG) */}
        <div className="relative">
          <button
            onClick={() => {
              setIsExportMenuOpen(!isExportMenuOpen);
              setIsViewMenuOpen(false);
              setIsToolsMenuOpen(false);
              setIsAlignMenuOpen(false);
            }}
            title="Download & Export Options"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isExportMenuOpen
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isExportMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-60 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                Export & Download
              </div>

              <button
                onClick={() => {
                  setIsExportModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-blue-950/60 hover:text-blue-200 text-left transition-colors cursor-pointer text-slate-200 border-b border-slate-800/60"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="font-semibold text-blue-300">SCORM Package (.zip)</div>
                  <div className="text-[10px] text-slate-400">Ready for Moodle, Canvas, Blackboard</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsPdfModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">PDF Handout</div>
                  <div className="text-[10px] text-slate-400">Formatted printable lesson handout</div>
                </div>
              </button>

              <button
                onClick={() => {
                  handleDownloadImage();
                  closeAllMenus();
                }}
                disabled={isExportingImage}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <FileImage className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">Slide PNG Image</div>
                  <div className="text-[10px] text-slate-400">
                    {isExportingImage ? 'Rendering image...' : 'High-resolution image snapshot'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  handleDownloadProject();
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <FolderDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="font-medium leading-snug">Project JSON Backup</div>
                  <div className="text-[10px] text-slate-400">Full course manifest & state</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Global Theme Mode Toggle Button (Dark / Light / Custom) */}
        {(() => {
          const { themeMode, setThemeMode } = useTheme();
          const handleCycleTheme = () => {
            if (themeMode === 'dark') setThemeMode('light');
            else if (themeMode === 'light') setThemeMode('custom');
            else setThemeMode('dark');
          };
          return (
            <button
              onClick={handleCycleTheme}
              title={`Active Theme: ${themeMode.toUpperCase()} (Click to cycle)`}
              className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  : themeMode === 'light'
                  ? 'bg-sky-500/20 border-sky-400/40 text-sky-300 hover:bg-sky-500/30'
                  : 'bg-pink-950/60 border-pink-700/60 text-pink-300 hover:bg-pink-900/60'
              }`}
            >
              {themeMode === 'dark' && <Moon className="w-3.5 h-3.5 text-blue-400" />}
              {themeMode === 'light' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
              {themeMode === 'custom' && <Palette className="w-3.5 h-3.5 text-pink-400" />}
              <span className="hidden lg:inline capitalize">{themeMode}</span>
            </button>
          );
        })()}

        {/* Collaborate Button */}
        <button
          onClick={() => setIsCollaborateModalOpen(true)}
          title="Share read-only review link or collaborate"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Collaborate</span>
        </button>

        {/* Live Interactive SCORM Preview */}
        <button
          onClick={() => setIsPreviewOpen(true)}
          title="Launch Live SCORM Simulator Preview"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Primary Export SCORM (.zip) CTA Button */}
        <button
          onClick={() => setIsExportModalOpen(true)}
          title="Export course into SCORM package (.zip)"
          className="px-3 md:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-600/30 transition-all cursor-pointer hover:shadow-blue-600/50"
        >
          <Download className="w-3.5 h-3.5 text-white" />
          <span>Export (.zip)</span>
        </button>
      </div>
    </header>
  );
};
