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
  } = useCourseStore();

  const [activeTab, setActiveTab] = useState<'element' | 'slide' | 'variables' | 'course'>('element');

  // Auto-switch to element tab whenever a new node is selected
  React.useEffect(() => {
    if (selectedNodeId) {
      setActiveTab('element');
    }
  }, [selectedNodeId]);

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Top Header / Mode Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-0.5">
        <button
          onClick={() => setActiveTab('element')}
          title="Element properties and styling"
          className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'element' || (selectedNode && activeTab !== 'course' && activeTab !== 'variables')
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Element</span>
        </button>
        <button
          onClick={() => setActiveTab('slide')}
          title="Slide background and settings"
          className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'slide' && !selectedNode
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Slide</span>
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          title="Dynamic course variables management"
          className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'variables'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Vars</span>
        </button>
        <button
          onClick={() => setActiveTab('course')}
          title="SCORM 1.2 manifest and LMS configuration"
          className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'course' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>SCORM</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ELEMENT TAB */}
        {selectedNode && activeTab !== 'course' && (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">
                  {selectedNode.type}
                </span>
                <span className="text-[11px] text-slate-500 font-mono ml-2">
                  #{selectedNode.id.slice(-5)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleLockNode(selectedNode.id)}
                  title={selectedNode.isLocked ? 'Unlock Element' : 'Lock Element'}
                  className={`p-1 rounded transition-colors ${
                    selectedNode.isLocked
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
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
                  title="Duplicate"
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => bringToFront(selectedNode.id)}
                  title="Bring to Front"
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => sendToBack(selectedNode.id)}
                  title="Send to Back"
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  title="Delete"
                  className="p-1 hover:bg-red-950 text-red-400 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lock/Unlock Quick Status Banner */}
            <div className="mb-4 flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                {selectedNode.isLocked ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-slate-500" />
                )}
                <div>
                  <div className="text-[11px] font-semibold text-slate-200">
                    {selectedNode.isLocked ? 'Layer Locked' : 'Layer Unlocked'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {selectedNode.isLocked
                      ? 'Canvas dragging & editing locked'
                      : 'Free moving & editing enabled'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleLockNode(selectedNode.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  selectedNode.isLocked
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {selectedNode.isLocked ? 'Unlock' : 'Lock'}
              </button>
            </div>

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

                {/* Distribute Space */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => distributeNodes('horizontal')}
                    title="Distribute all slide elements horizontally"
                    className="py-1.5 px-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <AlignHorizontalDistributeCenter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Distribute Horiz.</span>
                  </button>
                  <button
                    onClick={() => distributeNodes('vertical')}
                    title="Distribute all slide elements vertically"
                    className="py-1.5 px-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <AlignVerticalDistributeCenter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Distribute Vert.</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Layer Control Toolbar */}
            <div className="mb-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Layer Order
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  z-index: {selectedNode.zIndex || 1}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => bringToFront(selectedNode.id)}
                  title="Bring to Front (Highest Z-Index)"
                  className="py-1.5 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ChevronsUp className="w-4 h-4 text-blue-400" />
                  <span className="text-[9px] mt-0.5 font-medium">Front</span>
                </button>
                <button
                  onClick={() => moveUp(selectedNode.id)}
                  title="Move Up 1 Layer"
                  className="py-1.5 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span className="text-[9px] mt-0.5 font-medium">Up</span>
                </button>
                <button
                  onClick={() => moveDown(selectedNode.id)}
                  title="Move Down 1 Layer"
                  className="py-1.5 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span className="text-[9px] mt-0.5 font-medium">Down</span>
                </button>
                <button
                  onClick={() => sendToBack(selectedNode.id)}
                  title="Send to Back (Lowest Z-Index)"
                  className="py-1.5 flex flex-col items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ChevronsDown className="w-4 h-4 text-blue-400" />
                  <span className="text-[9px] mt-0.5 font-medium">Back</span>
                </button>
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
          </div>
        )}

        {/* SLIDE TAB (When no node selected or slide tab clicked) */}
        {(!selectedNode || activeTab === 'slide') &&
          activeTab !== 'course' &&
          activeTab !== 'variables' &&
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

        {/* VARIABLES TAB */}
        {activeTab === 'variables' && <VariableManager />}

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
