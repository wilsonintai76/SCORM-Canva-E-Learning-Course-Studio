import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { useCourseStore } from '../../store/courseStore';
import { bundleCourseToScormZip } from '../../services/scormBundleService';
import { triggerDownloadBlob } from '../../packager/zipPackager';
import {
  Undo,
  Redo,
  Play,
  Download,
  Terminal,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  Layers,
  Grid,
  Keyboard,
  FileImage,
} from 'lucide-react';

export const TopNavBar: React.FC = () => {
  const {
    course,
    currentPage,
    zoom,
    canUndo,
    canRedo,
    undo,
    redo,
    isSnapToGridEnabled,
    gridSize,
    setSnapToGrid,
    setGridSize,
    setZoom,
    updateManifest,
    setIsPreviewOpen,
    setIsDebuggerOpen,
    setIsAiPaletteOpen,
    setIsExportModalOpen,
    setIsShortcutsModalOpen,
  } = useCourseStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportScorm = async () => {
    try {
      setIsExporting(true);
      const bundleRes = await bundleCourseToScormZip(course);
      triggerDownloadBlob(bundleRes.blob, bundleRes.filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export SCORM package:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    try {
      setIsExportingImage(true);
      const stageEl = (document.querySelector('.aistudio-slide-stage') as HTMLElement) ||
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

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-20 shrink-0 select-none">
      {/* Brand & Course Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-100 tracking-tight flex items-center gap-1.5">
              SCORM Canva
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.2 rounded">
                1.2
              </span>
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        {/* Course Title editable input */}
        <input
          type="text"
          value={course.title}
          onChange={(e) => updateManifest({ title: e.target.value })}
          className="text-xs font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/80 px-2 py-1 rounded transition-colors border border-transparent focus:border-blue-500 focus:bg-slate-950 outline-none max-w-[260px] truncate"
          title="Click to rename course"
        />
      </div>

      {/* Center Tool Actions (Undo, Redo, Zoom, Snap-to-Grid) */}
      <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-1 text-xs">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-800 transition-colors"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-800 transition-colors"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-[1px] bg-slate-800 mx-1" />

        <button
          onClick={() => setZoom(zoom - 0.1)}
          title="Zoom Out"
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          title="Zoom In"
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(1.0)}
          title="Reset Zoom to 100%"
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
        >
          <Maximize2 className="w-3 h-3" />
        </button>

        <div className="h-3 w-[1px] bg-slate-800 mx-1" />

        {/* Snap-to-Grid Toggle & Grid Size Options */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSnapToGrid(!isSnapToGridEnabled)}
            title={
              isSnapToGridEnabled
                ? `Snap-to-Grid Enabled (${gridSize}px) - Click to Disable`
                : 'Snap-to-Grid Disabled - Click to Enable'
            }
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              isSnapToGridEnabled
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">Snap</span>
          </button>
          {isSnapToGridEnabled && (
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              title="Configurable Grid Size"
              className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono rounded px-1 py-0.5 outline-none hover:border-slate-500 cursor-pointer"
            >
              <option value={5}>5px</option>
              <option value={10}>10px</option>
              <option value={20}>20px</option>
              <option value={25}>25px</option>
              <option value={50}>50px</option>
            </select>
          )}
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Keyboard Shortcuts Guide */}
        <button
          onClick={() => setIsShortcutsModalOpen(true)}
          title="Keyboard Shortcuts Guide (?)"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Keyboard className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        {/* Download High-Res PNG Image */}
        <button
          onClick={handleDownloadImage}
          disabled={isExportingImage}
          title="Export active slide design as high-resolution PNG image"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <FileImage className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isExportingImage ? 'Exporting...' : 'Download Image'}</span>
        </button>

        {/* AI Generator Palette */}
        <button
          onClick={() => setIsAiPaletteOpen(true)}
          className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 hover:from-indigo-600/30 hover:to-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">AI Palette</span>
        </button>

        {/* LMS Debugger Console Drawer */}
        <button
          onClick={() => setIsDebuggerOpen(true)}
          title="Inspect SCORM CMI Model & Live LMS Calls"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">LMS Debugger</span>
        </button>

        {/* Live Interactive SCORM Preview */}
        <button
          onClick={() => setIsPreviewOpen(true)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
          <span>Preview</span>
        </button>

        {/* Export SCORM Package (.zip) */}
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-white" />
          <span>Export (.zip)</span>
        </button>
      </div>
    </header>
  );
};
