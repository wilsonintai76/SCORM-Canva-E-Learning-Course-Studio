import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { TextInspector } from './TextInspector';
import { ImageInspector } from './ImageInspector';
import { QuizInspector } from './QuizInspector';
import { ShapeInspector } from './ShapeInspector';
import { CalloutInspector } from './CalloutInspector';
import { TextNode, ImageNode, QuizNode, ShapeNode, CalloutNode, CourseManifest } from '../../types/schema';
import { ColorPaletteGenerator } from './ColorPaletteGenerator';
import { VariableManager } from './VariableManager';
import { QuizLogicInspector } from './QuizLogicInspector';
import { SlideTransitionsInspector } from './SlideTransitionsInspector';
import { AudioNarrationInspector } from './AudioNarrationInspector';
import { LayersPanel } from './LayersPanel';
import { AnimationInspector } from './AnimationInspector';
import { DesignTokensPanel } from './DesignTokensPanel';
import {
  Layers,
  Sliders,
  FileText,
  Settings2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Sparkles,
  Boxes,
  Lock,
  Unlock,
  Code2,
  Palette,
  HelpCircle,
  Activity,
  Volume2,
  FolderHeart,
  BookmarkPlus,
  Zap,
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const {
    course,
    currentPage,
    selectedNodeId,
    selectedNodeIds,
    selectedNode,
    groupNodes,
    ungroupNodes,
    transformGroup,
    scaleGroup,
    saveSelectionToMyAssets,
    toggleLockNode,
    updateNode,
    deleteNode,
    duplicateNode,
    bringToFront,
    sendToBack,
    moveUp,
    moveDown,
    alignNode,
    distributeNodes,
    updateActivePage,
    updateManifest,
    setIsAiPaletteOpen,
    activeInspectorTab: activeTab,
    setActiveInspectorTab: setActiveTab,
  } = useCourseStore();

  const [isQuickSaveOpen, setIsQuickSaveOpen] = useState(false);
  const [quickSaveName, setQuickSaveName] = useState('');
  const [quickSaveSavedMsg, setQuickSaveSavedMsg] = useState<string | null>(null);

  // Auto-switch to element tab whenever a new node is selected
  React.useEffect(() => {
    if (selectedNodeId) {
      if (activeTab !== 'layers' && activeTab !== 'animations') {
        setActiveTab('element');
      }
    }
  }, [selectedNodeId]);

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Top Header / Mode Switcher */}
      <div className="flex flex-wrap border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
        <button
          onClick={() => setActiveTab('element')}
          title="Element properties and styling"
          className={`flex-1 min-w-[66px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'element' ||
            (selectedNode &&
              activeTab !== 'course' &&
              activeTab !== 'variables' &&
              activeTab !== 'tokens' &&
              activeTab !== 'quiz_logic' &&
              activeTab !== 'layers' &&
              activeTab !== 'slide' &&
              activeTab !== 'animations')
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>Element</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          title="Slide layer stack list view, reordering, grouping, locking, and hiding"
          className={`flex-1 min-w-[62px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3 h-3 text-blue-400" />
          <span>Layers</span>
        </button>

        {selectedNode && (
          <button
            onClick={() => setActiveTab('animations')}
            title="Timeline animation configuration for selected element"
            className={`flex-1 min-w-[58px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'animations'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-amber-400 hover:text-amber-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Anim</span>
          </button>
        )}

        {selectedNode?.type === 'quiz' && (
          <button
            onClick={() => setActiveTab('quiz_logic')}
            title="Quiz logic, answers, feedback messages and result screen routing"
            className={`flex-1 min-w-[68px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'quiz_logic'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-emerald-400 hover:text-emerald-200'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span>Logic</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('slide')}
          title="Slide background and settings"
          className={`flex-1 min-w-[56px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'slide' || (!selectedNode && activeTab === 'element')
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>Slide</span>
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          title="Dynamic course variables management"
          className={`flex-1 min-w-[56px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'variables'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3 h-3 text-blue-400" />
          <span>Vars</span>
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          title="Global Design Tokens (Colors, Typography & Spacing)"
          className={`flex-1 min-w-[64px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'tokens'
              ? 'bg-pink-600/90 text-white font-semibold'
              : 'text-pink-400 hover:text-pink-200'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span>Tokens</span>
        </button>
        <button
          onClick={() => setActiveTab('course')}
          title="SCORM 1.2 manifest and LMS configuration"
          className={`flex-1 min-w-[62px] py-1.5 px-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'course' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings2 className="w-3 h-3" />
          <span>SCORM</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ELEMENT TAB */}
        {selectedNode &&
          activeTab !== 'course' &&
          activeTab !== 'variables' &&
          activeTab !== 'tokens' &&
          activeTab !== 'quiz_logic' &&
          activeTab !== 'layers' &&
          activeTab !== 'animations' &&
          activeTab !== 'slide' && (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1.5">
                  <span>{selectedNode.type}</span>
                  {selectedNode.isLocked && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-semibold">
                      LOCKED
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  #{selectedNode.id.slice(-5)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleLockNode(selectedNode.id)}
                  title={selectedNode.isLocked ? 'Unlock Element' : 'Lock Element'}
                  className={`p-1 rounded transition-colors ${
                    selectedNode.isLocked
                      ? 'bg-amber-500 text-slate-950 font-bold border border-amber-300 shadow-sm shadow-amber-500/30'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {selectedNode.isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => duplicateNode(selectedNode.id)}
                  disabled={selectedNode.isLocked}
                  title={selectedNode.isLocked ? 'Element is locked' : 'Duplicate'}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => bringToFront(selectedNode.id)}
                  disabled={selectedNode.isLocked}
                  title={selectedNode.isLocked ? 'Element is locked' : 'Bring to Front'}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => sendToBack(selectedNode.id)}
                  disabled={selectedNode.isLocked}
                  title={selectedNode.isLocked ? 'Element is locked' : 'Send to Back'}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  disabled={selectedNode.isLocked}
                  title={selectedNode.isLocked ? 'Element is locked' : 'Delete'}
                  className="p-1 hover:bg-red-950 text-red-400 rounded disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lock/Unlock Quick Status Banner */}
            <div className={`mb-4 rounded-xl border p-3 transition-all ${
              selectedNode.isLocked
                ? 'bg-amber-950/70 border-amber-500/50 shadow-lg shadow-amber-950/40'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {selectedNode.isLocked ? (
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Unlock className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <div>
                    <div className={`text-xs font-bold ${selectedNode.isLocked ? 'text-amber-300' : 'text-slate-200'}`}>
                      {selectedNode.isLocked ? 'Element Locked' : 'Layer Unlocked'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleLockNode(selectedNode.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    selectedNode.isLocked
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {selectedNode.isLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lock</span>
                    </>
                  )}
                </button>
              </div>
              <p className={`text-[11px] leading-relaxed ${
                selectedNode.isLocked ? 'text-amber-200/80' : 'text-slate-500'
              }`}>
                {selectedNode.isLocked
                  ? 'Canvas dragging, resizing, baseline alignment and property editing are disabled until unlocked.'
                  : 'Free canvas movement, resizing and property modification enabled.'}
              </p>
            </div>

            {/* Fieldset disabling property editing when node is locked */}
            <fieldset
              disabled={selectedNode.isLocked}
              className={selectedNode.isLocked ? 'opacity-40 pointer-events-none select-none filter grayscale-[30%] space-y-4' : 'space-y-4'}
            >
              {/* Geometry Coordinates */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="flex items-center bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 font-mono w-6">X:</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.x)}
                    onChange={(e) => updateNode(selectedNode.id, { x: Number(e.target.value) || 0 })}
                    className="w-full bg-transparent text-slate-200 outline-none"
                  />
                </div>
                <div className="flex items-center bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 font-mono w-6">Y:</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.y)}
                    onChange={(e) => updateNode(selectedNode.id, { y: Number(e.target.value) || 0 })}
                    className="w-full bg-transparent text-slate-200 outline-none"
                  />
                </div>
                <div className="flex items-center bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 font-mono w-6">W:</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.width)}
                    onChange={(e) => updateNode(selectedNode.id, { width: Number(e.target.value) || 40 })}
                    className="w-full bg-transparent text-slate-200 outline-none"
                  />
                </div>
                <div className="flex items-center bg-slate-950 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 font-mono w-6">H:</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.height)}
                    onChange={(e) => updateNode(selectedNode.id, { height: Number(e.target.value) || 40 })}
                    className="w-full bg-transparent text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Layer Order Control */}
              {(() => {
                const pageNodes = currentPage?.nodes || [];
                const sortedByPaint = [...pageNodes].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
                const stackIndex = sortedByPaint.findIndex((n) => n.id === selectedNode.id);
                const totalLayers = sortedByPaint.length;
                const displayRank = stackIndex >= 0 ? stackIndex + 1 : 1;
                const currentZ = selectedNode.zIndex ?? 1;

                return (
                  <div className="mb-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Layer Order
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                          {displayRank}/{Math.max(1, totalLayers)} · z:{currentZ}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => bringToFront(selectedNode.id)}
                        title="Bring to Front (Topmost Layer)"
                        className="py-1.5 px-1 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronsUp className="w-4 h-4 text-blue-400" />
                        <span className="text-[9px] mt-0.5 font-medium whitespace-nowrap">To Front</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveUp(selectedNode.id)}
                        title="Bring Forward 1 Layer"
                        className="py-1.5 px-1 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5 font-medium whitespace-nowrap">Forward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(selectedNode.id)}
                        title="Send Backward 1 Layer"
                        className="py-1.5 px-1 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5 font-medium whitespace-nowrap">Backward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => sendToBack(selectedNode.id)}
                        title="Send to Back (Bottommost Layer)"
                        className="py-1.5 px-1 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronsDown className="w-4 h-4 text-blue-400" />
                        <span className="text-[9px] mt-0.5 font-medium whitespace-nowrap">To Back</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Object Grouping Button Group */}
              <div className="mb-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Object Grouping
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {selectedNode.groupId
                      ? 'Grouped'
                      : selectedNodeIds.length > 1
                      ? `${selectedNodeIds.length} Selected`
                      : 'Single'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => groupNodes()}
                    disabled={selectedNodeIds.length < 2}
                    title="Group selected objects into a composite group (Ctrl+G)"
                    className="py-1.5 px-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-200 hover:text-white hover:border-blue-500 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                  >
                    <Boxes className="w-3.5 h-3.5 text-blue-400" />
                    <span>Group</span>
                  </button>

                  <button
                    onClick={() => ungroupNodes(selectedNode.groupId)}
                    disabled={
                      !selectedNode.groupId &&
                      !selectedNodeIds.some((id) => currentPage?.nodes.find((n) => n.id === id)?.groupId)
                    }
                    title="Ungroup objects into standalone elements (Ctrl+Shift+G)"
                    className="py-1.5 px-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-200 hover:text-white hover:border-amber-500 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                  >
                    <Boxes className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ungroup</span>
                  </button>
                </div>

                {/* Parent Entity Scale Controls (When Grouped or Multi-Selected) */}
                {(Boolean(selectedNode.groupId) || selectedNodeIds.length > 1) && (
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Proportional Scale Unit</span>
                      <span className="font-mono text-sky-400">Transform All</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[10px] font-mono">
                      {[0.5, 0.75, 1.25, 1.5, 2.0].map((mult) => (
                        <button
                          key={mult}
                          onClick={() => {
                            const ids = selectedNode.groupId
                              ? currentPage?.nodes.filter((n) => n.groupId === selectedNode.groupId).map((n) => n.id) || selectedNodeIds
                              : selectedNodeIds;
                            scaleGroup(ids, mult);
                          }}
                          className="py-1 rounded bg-slate-900 hover:bg-sky-600/30 text-slate-300 hover:text-sky-300 border border-slate-800 hover:border-sky-500/50 transition-colors cursor-pointer"
                          title={`Scale entire group to ${Math.round(mult * 100)}%`}
                        >
                          {Math.round(mult * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Selection to Resource Library Button / Inline Form */}
                <div className="mt-2.5 space-y-1.5">
                  {quickSaveSavedMsg && (
                    <div className="p-1.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] text-center font-medium">
                      {quickSaveSavedMsg}
                    </div>
                  )}
                  {isQuickSaveOpen ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!quickSaveName.trim()) return;
                        const isGroup = Boolean(selectedNode.groupId) || selectedNodeIds.length > 1;
                        saveSelectionToMyAssets(
                          quickSaveName.trim(),
                          isGroup ? 'patterns' : undefined,
                          selectedNodeIds.length > 0 ? selectedNodeIds : [selectedNode.id]
                        );
                        setIsQuickSaveOpen(false);
                        setQuickSaveSavedMsg(`Saved "${quickSaveName.trim()}" to Resource Library`);
                        setTimeout(() => setQuickSaveSavedMsg(null), 2600);
                      }}
                      className="p-2 rounded-lg bg-slate-950 border border-sky-500/40 space-y-1.5"
                    >
                      <input
                        type="text"
                        value={quickSaveName}
                        onChange={(e) => setQuickSaveName(e.target.value)}
                        placeholder="Resource name..."
                        autoFocus
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-sky-500"
                      />
                      <div className="flex gap-1">
                        <button
                          type="submit"
                          disabled={!quickSaveName.trim()}
                          className="flex-1 py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsQuickSaveOpen(false)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        const isGroup = Boolean(selectedNode.groupId) || selectedNodeIds.length > 1;
                        const defaultName = isGroup
                          ? 'Custom Pattern Group'
                          : selectedNode.type === 'text'
                          ? (selectedNode as any).content?.slice(0, 24) || 'Custom Text Block'
                          : selectedNode.type === 'shape'
                          ? `Custom ${(selectedNode as any).shapeType || 'Shape'}`
                          : 'Custom Resource';
                        setQuickSaveName(defaultName);
                        setIsQuickSaveOpen(true);
                      }}
                      title="Save this element or group to Resource Library for drag-and-drop reuse across pages"
                      className="w-full py-1.5 px-2.5 rounded-lg bg-sky-950/60 border border-sky-500/40 text-[11px] font-semibold text-sky-300 hover:bg-sky-600 hover:text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <FolderHeart className="w-3.5 h-3.5" />
                      <span>Save to Resource Library</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Canvas Alignment Toolbar */}
              <div className="mb-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Canvas Alignment
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Align to Slide</span>
                </div>

                <div className="space-y-1.5">
                  {/* Horizontal & Vertical Alignment */}
                  <div className="grid grid-cols-6 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => alignNode(selectedNode.id, 'left')}
                      title="Align Left (X: 0)"
                      className="p-1.5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => alignNode(selectedNode.id, 'center-x')}
                      title="Align Center Horizontally"
                      className="p-1.5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => alignNode(selectedNode.id, 'right')}
                      title="Align Right"
                      className="p-1.5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => alignNode(selectedNode.id, 'top')}
                      title="Align Top (Y: 0)"
                      className="p-1.5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => alignNode(selectedNode.id, 'center-y')}
                      title="Align Center Vertically"
                      className="p-1.5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => alignNode(selectedNode.id, 'bottom')}
                      title="Align Bottom"
                      className="p-1.5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Auto-Distribute Feature (3+ elements) */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>Auto-Distribute</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          selectedNodeIds.length >= 3 || (currentPage?.nodes.length || 0) >= 3
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {selectedNodeIds.length >= 3
                          ? `${selectedNodeIds.length} Selected`
                          : `${currentPage?.nodes.length || 0} on Slide`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => distributeNodes('horizontal')}
                        title="Evenly space 3+ elements horizontally with 1 click"
                        className="py-1.5 px-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-cyan-500 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <AlignHorizontalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Distribute Horiz.</span>
                      </button>
                      <button
                        onClick={() => distributeNodes('vertical')}
                        title="Evenly space 3+ elements vertically with 1 click"
                        className="py-1.5 px-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-cyan-500 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <AlignVerticalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Distribute Vert.</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type Specific Inspectors */}
              {selectedNode.type === 'text' && (
                <TextInspector
                  node={selectedNode as TextNode}
                  onUpdate={(updates) => updateNode(selectedNode.id, updates)}
                />
              )}
              {selectedNode.type === 'image' && (
                <ImageInspector
                  node={selectedNode as ImageNode}
                  onUpdate={(updates) => updateNode(selectedNode.id, updates)}
                />
              )}
              {selectedNode.type === 'quiz' && (
                <QuizInspector
                  node={selectedNode as QuizNode}
                  onUpdate={(updates) => updateNode(selectedNode.id, updates)}
                />
              )}
              {selectedNode.type === 'shape' && (
                <ShapeInspector
                  node={selectedNode as ShapeNode}
                  onUpdate={(updates) => updateNode(selectedNode.id, updates)}
                />
              )}
              {selectedNode.type === 'callout' && (
                <CalloutInspector
                  node={selectedNode as CalloutNode}
                  onUpdate={(updates) => updateNode(selectedNode.id, updates)}
                />
              )}

              {/* Color Palette Generator for Selected Object */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <ColorPaletteGenerator
                  baseColor={
                    (selectedNode as any).fill ||
                    (selectedNode as any).color ||
                    (selectedNode as any).themeColor ||
                    '#3b82f6'
                  }
                  onApplyColor={(color) => {
                    if (selectedNode.type === 'shape') {
                      updateNode(selectedNode.id, { fill: color });
                    } else if (selectedNode.type === 'text') {
                      updateNode(selectedNode.id, { color });
                    } else if (selectedNode.type === 'quiz') {
                      updateNode(selectedNode.id, { themeColor: color });
                    } else {
                      updateNode(selectedNode.id, { color });
                    }
                  }}
                  label="Object Color Harmonies"
                />
              </div>

              {/* Component Entrance & Exit Animation (Slide Transitions) */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <SlideTransitionsInspector
                  node={selectedNode}
                  onUpdateNode={(updates) => updateNode(selectedNode.id, updates)}
                />
              </div>
            </fieldset>
          </div>
        )}

        {/* LAYERS TAB */}
        {activeTab === 'layers' && <LayersPanel />}

        {/* QUIZ LOGIC TAB */}
        {activeTab === 'quiz_logic' && selectedNode?.type === 'quiz' && (
          <QuizLogicInspector
            node={selectedNode as QuizNode}
            onUpdate={(updates) => updateNode(selectedNode.id, updates)}
          />
        )}

        {/* SLIDE TAB (When no node selected or slide tab clicked) */}
        {(!selectedNode || activeTab === 'slide') &&
          activeTab !== 'course' &&
          activeTab !== 'variables' &&
          activeTab !== 'tokens' &&
          activeTab !== 'layers' &&
          activeTab !== 'animations' &&
          activeTab !== 'quiz_logic' &&
          currentPage && (
          <div className="space-y-4 text-xs">
            <div className="pb-3 border-b border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Slide Settings
              </span>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Slide Title</label>
              <input
                type="text"
                value={currentPage.title}
                onChange={(e) => updateActivePage({ title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Slide Background</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { label: 'White', val: '#ffffff' },
                  { label: 'Off-White', val: '#f8fafc' },
                  { label: 'Dark Slate', val: '#0f172a' },
                  { label: 'Midnight', val: '#030712' },
                ].map((bg) => (
                  <button
                    key={bg.val}
                    onClick={() => updateActivePage({ background: { type: 'color', value: bg.val } })}
                    className="h-8 rounded border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 hover:border-blue-500"
                    style={{ background: bg.val }}
                    title={bg.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={
                    currentPage.background?.value.startsWith('#')
                      ? currentPage.background.value
                      : '#ffffff'
                  }
                  onChange={(e) =>
                    updateActivePage({ background: { type: 'color', value: e.target.value } })
                  }
                  className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={currentPage.background?.value || '#ffffff'}
                  onChange={(e) =>
                    updateActivePage({ background: { type: 'color', value: e.target.value } })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Slide Background Color Palette Generator */}
            <div className="pt-2">
              <ColorPaletteGenerator
                baseColor={
                  currentPage.background?.value.startsWith('#')
                    ? currentPage.background.value
                    : '#0f172a'
                }
                onApplyColor={(color) => {
                  updateActivePage({ background: { type: 'color', value: color } });
                }}
                label="Slide Background Harmonies"
              />
            </div>

            {/* Slide Transitions */}
            <div className="pt-2">
              <SlideTransitionsInspector
                page={currentPage}
                onUpdatePage={updateActivePage}
              />
            </div>

            {/* Audio Narration & Waveform */}
            <div className="pt-2">
              <AudioNarrationInspector
                page={currentPage}
                onUpdatePage={updateActivePage}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Presenter Notes / Transcript</label>
              <textarea
                rows={4}
                value={currentPage.notes || ''}
                placeholder="Notes for accessibility and instructor reference..."
                onChange={(e) => updateActivePage({ notes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsAiPaletteOpen(true)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Slide Assistant</span>
              </button>
            </div>
          </div>
        )}

        {/* ANIMATIONS TAB */}
        {activeTab === 'animations' && selectedNode && (
          <AnimationInspector
            node={selectedNode}
            onUpdate={(updates) => updateNode(selectedNode.id, updates)}
          />
        )}

        {/* VARIABLES TAB */}
        {activeTab === 'variables' && <VariableManager />}

        {/* DESIGN TOKENS TAB */}
        {activeTab === 'tokens' && <DesignTokensPanel />}

        {/* SCORM / COURSE TAB */}
        {activeTab === 'course' && (
          <div className="space-y-4 text-xs">
            <div className="pb-3 border-b border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                SCORM 1.2 Course Settings
              </span>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Course Title</label>
              <input
                type="text"
                value={course.title}
                onChange={(e) => updateManifest({ title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Description</label>
              <textarea
                rows={3}
                value={course.description}
                onChange={(e) => updateManifest({ description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Passing Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={course.passingScore}
                  onChange={(e) => updateManifest({ passingScore: Number(e.target.value) || 80 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Est. Duration (min)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={course.estimatedMinutes}
                  onChange={(e) => updateManifest({ estimatedMinutes: Number(e.target.value) || 10 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">LMS Completion Rule</label>
              <select
                value={course.completionCriteria}
                onChange={(e) =>
                  updateManifest({
                    completionCriteria: e.target.value as CourseManifest['completionCriteria'],
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="all_pages_and_quiz">View All Slides + Pass Quiz</option>
                <option value="all_pages">View All Slides</option>
                <option value="quiz_passed">Score Passing Threshold Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">SCORM Identifier</label>
              <input
                type="text"
                value={course.id}
                onChange={(e) => updateManifest({ id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
              />
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Standard:</span>
                <span className="font-semibold text-slate-300">SCORM 1.2 (CAM 1.2)</span>
              </div>
              <div className="flex justify-between">
                <span>Manifest:</span>
                <span className="font-mono text-slate-300">imsmanifest.xml</span>
              </div>
              <div className="flex justify-between">
                <span>Total Slides:</span>
                <span className="text-slate-300">{course.pages.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
