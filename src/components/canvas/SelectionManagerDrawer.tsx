import React, { useState, useMemo, useEffect } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { CanvasNode, SavedCustomAsset } from '../../types/schema';
import {
  Boxes,
  X,
  Check,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  ArrowUpToLine,
  ArrowDownToLine,
  Type,
  Image as ImageIcon,
  Square,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FolderHeart,
  Layers,
  MinusCircle,
  Plus,
  Crosshair,
  Ungroup,
  Sparkles,
} from 'lucide-react';

interface SelectionManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (message: string) => void;
}

function getNodeLabel(node: CanvasNode): string {
  if (node.name && node.name.trim()) return node.name.trim();
  if (node.type === 'text') {
    const txt = (node as any).content?.trim();
    return txt ? txt.slice(0, 28) + (txt.length > 28 ? '…' : '') : 'Text Block';
  }
  if (node.type === 'callout') {
    return (node as any).title?.trim() || 'Callout Card';
  }
  if (node.type === 'quiz') {
    const q = (node as any).question?.trim();
    return q ? q.slice(0, 26) + (q.length > 26 ? '…' : '') : 'Quiz Interaction';
  }
  if (node.type === 'image') {
    return (node as any).alt?.trim() || 'Image / Icon';
  }
  if (node.type === 'shape') {
    return `Shape (${(node as any).shapeType || 'rect'})`;
  }
  return 'Element';
}

function getNodeTypeIcon(node: CanvasNode) {
  switch (node.type) {
    case 'text':
      return <Type className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    case 'image':
      return <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    case 'quiz':
      return <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'callout':
      return <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    case 'shape':
    default:
      return <Square className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  }
}

export const SelectionManagerDrawer: React.FC<SelectionManagerDrawerProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const {
    course,
    currentPage,
    selectedNodeId,
    selectedNodeIds,
    setSelectedNodeId,
    setSelectedNodeIds,
    toggleNodeSelection,
    selectAllNodesOnSlide,
    invertSelectionOnSlide,
    selectGroupMembers,
    setPrimarySelectedNode,
    deleteSelectedNodes,
    groupNodes,
    ungroupNodes,
    scaleGroup,
    alignSelected,
    alignSelectedToMargins,
    spaceNodesEvenly,
    toggleLockNode,
    toggleHideNode,
    duplicateNode,
    bringToFront,
    sendToBack,
    saveSelectionToMyAssets,
  } = useCourseStore();

  const defaultGap = course.theme?.spacing?.elementGap ?? 16;
  const [gapPx, setGapPx] = useState<number>(defaultGap);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [isSavingOpen, setIsSavingOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<SavedCustomAsset['category']>('patterns');
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    setGapPx(course.theme?.spacing?.elementGap ?? 16);
  }, [course.theme?.spacing?.elementGap]);

  const allNodes = currentPage?.nodes || [];

  const selectedNodes = useMemo(() => {
    const idSet = new Set(selectedNodeIds);
    return allNodes.filter((n) => idSet.has(n.id));
  }, [allNodes, selectedNodeIds]);

  const unselectedNodes = useMemo(() => {
    const idSet = new Set(selectedNodeIds);
    return allNodes.filter((n) => !idSet.has(n.id));
  }, [allNodes, selectedNodeIds]);

  const selectionBounds = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    const minX = Math.min(...selectedNodes.map((n) => n.x));
    const minY = Math.min(...selectedNodes.map((n) => n.y));
    const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width));
    const maxY = Math.max(...selectedNodes.map((n) => n.y + n.height));
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.round(maxX - minX),
      height: Math.round(maxY - minY),
    };
  }, [selectedNodes]);

  const activeGroups = useMemo(() => {
    const map = new Map<string, CanvasNode[]>();
    selectedNodes.forEach((n) => {
      if (n.groupId) {
        const list = map.get(n.groupId) || [];
        list.push(n);
        map.set(n.groupId, list);
      }
    });
    return Array.from(map.entries());
  }, [selectedNodes]);

  if (!isOpen || !currentPage) return null;

  const canAlignMultiple = selectedNodes.length >= 2;
  const canDistribute = selectedNodes.length >= 3;
  const slideMargin = course.theme?.spacing?.slideMargin ?? 40;

  const handleOpenSaveForm = () => {
    if (selectedNodes.length === 0) return;
    if (selectedNodes.length === 1) {
      const single = selectedNodes[0];
      setSaveName(getNodeLabel(single));
      setSaveCategory(
        single.type === 'shape'
          ? 'shapes'
          : single.type === 'image'
          ? 'icons'
          : single.type === 'quiz'
          ? 'patterns'
          : single.type === 'callout'
          ? 'cards'
          : 'text'
      );
    } else {
      setSaveName(`Custom Pattern (${selectedNodes.length})`);
      setSaveCategory('patterns');
    }
    setIsSavingOpen(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim() || selectedNodes.length === 0) return;
    const created = saveSelectionToMyAssets(saveName.trim(), saveCategory, selectedNodeIds);
    if (created) {
      setIsSavingOpen(false);
      setSavedSuccess(`Saved "${created.name}"`);
      onNotify?.(`Saved "${created.name}" to Resource Library`);
      setTimeout(() => setSavedSuccess(null), 2600);
    }
  };

  return (
    <aside
      className="w-72 bg-slate-900/98 backdrop-blur-md border-l border-slate-800 h-full shrink-0 flex flex-col select-none text-xs shadow-2xl z-30"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white leading-tight truncate">
              Selection Manager
            </h3>
            <p className="text-[10px] text-slate-400 leading-tight">
              {selectedNodes.length} of {allNodes.length} element{allNodes.length === 1 ? '' : 's'} active
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close Selection Manager"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Selection Controls */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={selectAllNodesOnSlide}
            disabled={allNodes.length === 0}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[10px] font-semibold transition-colors cursor-pointer"
            title="Select all visible elements on current slide"
          >
            Select All
          </button>
          <button
            onClick={invertSelectionOnSlide}
            disabled={allNodes.length === 0}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10px] font-medium transition-colors cursor-pointer"
            title="Invert current slide selection"
          >
            Invert
          </button>
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          disabled={selectedNodes.length === 0}
          className="px-2 py-1 rounded bg-slate-800/80 hover:bg-rose-950/70 disabled:opacity-40 text-slate-300 hover:text-rose-300 text-[10px] font-medium transition-colors cursor-pointer"
          title="Clear current selection"
        >
          Clear
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Bounding Box Summary */}
        {selectionBounds && (
          <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Selection Bounds
              </span>
              <span className="text-[10px] font-mono text-sky-400">
                {selectedNodes.length} item{selectedNodes.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
              <div className="bg-slate-900 rounded py-1 border border-slate-800/80">
                <div className="text-[9px] text-slate-500">X</div>
                <div className="text-slate-200 font-semibold">{selectionBounds.x}</div>
              </div>
              <div className="bg-slate-900 rounded py-1 border border-slate-800/80">
                <div className="text-[9px] text-slate-500">Y</div>
                <div className="text-slate-200 font-semibold">{selectionBounds.y}</div>
              </div>
              <div className="bg-slate-900 rounded py-1 border border-slate-800/80">
                <div className="text-[9px] text-slate-500">W</div>
                <div className="text-slate-200 font-semibold">{selectionBounds.width}</div>
              </div>
              <div className="bg-slate-900 rounded py-1 border border-slate-800/80">
                <div className="text-[9px] text-slate-500">H</div>
                <div className="text-slate-200 font-semibold">{selectionBounds.height}</div>
              </div>
            </div>
          </div>
        )}

        {/* Active Selected Elements List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Selected Elements ({selectedNodes.length})
            </span>
            {unselectedNodes.length > 0 && (
              <button
                onClick={() => setShowAddPicker(!showAddPicker)}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                {showAddPicker ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Add ({unselectedNodes.length})</span>
              </button>
            )}
          </div>

          {selectedNodes.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/50 text-center space-y-2">
              <Layers className="w-6 h-6 mx-auto text-slate-600" />
              <p className="text-[11px] text-slate-400 leading-snug">
                Click elements on the canvas (Hold <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[9px] text-slate-300">Shift</kbd> for multi-select) or pick from this slide below.
              </p>
              {allNodes.length > 0 && (
                <button
                  onClick={selectAllNodesOnSlide}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Select All {allNodes.length} Slide Elements
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              {selectedNodes.map((node) => {
                const isPrimary = node.id === selectedNodeId;
                return (
                  <div
                    key={node.id}
                    className={`p-2 rounded-lg border transition-colors flex items-center justify-between gap-1.5 ${
                      isPrimary
                        ? 'bg-sky-950/40 border-sky-500/60'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <button
                      onClick={() => setPrimarySelectedNode(node.id)}
                      title="Set as Primary Selection"
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      {getNodeTypeIcon(node)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-slate-200 truncate">
                            {getNodeLabel(node)}
                          </span>
                          {isPrimary && (
                            <span className="text-[8px] uppercase font-bold px-1 py-0.2 rounded bg-sky-600 text-white shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1.5">
                          <span>
                            {Math.round(node.x)},{Math.round(node.y)} • {Math.round(node.width)}×
                            {Math.round(node.height)}
                          </span>
                          {node.groupId && (
                            <span className="text-amber-400/90 font-semibold">• Grouped</span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => toggleLockNode(node.id)}
                        title={node.isLocked ? 'Unlock' : 'Lock'}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer ${
                          node.isLocked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {node.isLocked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleHideNode(node.id)}
                        title={node.isHidden ? 'Show' : 'Hide'}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer ${
                          node.isHidden ? 'text-rose-400' : 'text-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {node.isHidden ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setSelectedNodeIds(selectedNodeIds.filter((id) => id !== node.id))
                        }
                        title="Remove from Selection"
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <MinusCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unselected Slide Elements Quick-Add List */}
          {(showAddPicker || selectedNodes.length === 0) && unselectedNodes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                <span>Available on Slide</span>
                <span className="text-[9px] text-slate-500">Click + to add</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                {unselectedNodes.map((node) => (
                  <div
                    key={node.id}
                    className="px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-sky-500/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {getNodeTypeIcon(node)}
                      <span className="text-[10px] text-slate-300 truncate">
                        {getNodeLabel(node)}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleNodeSelection(node.id)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bulk Alignment Tools */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bulk Alignment
            </span>
            <span className="text-[9px] text-slate-500">
              {canAlignMultiple ? 'Relative to Selection' : 'Relative to Slide'}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => alignSelected('left')}
              disabled={selectedNodes.length === 0}
              title="Align Left"
              className="p-1.5 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer"
            >
              <AlignLeft className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              onClick={() => alignSelected('center-h')}
              disabled={selectedNodes.length === 0}
              title="Align Center Horizontal"
              className="p-1.5 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              onClick={() => alignSelected('right')}
              disabled={selectedNodes.length === 0}
              title="Align Right"
              className="p-1.5 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer"
            >
              <AlignRight className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              onClick={() => alignSelected('top')}
              disabled={selectedNodes.length === 0}
              title="Align Top"
              className="p-1.5 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer"
            >
              <AlignStartVertical className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              onClick={() => alignSelected('center-v')}
              disabled={selectedNodes.length === 0}
              title="Align Middle Vertical"
              className="p-1.5 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer"
            >
              <AlignCenterVertical className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              onClick={() => alignSelected('bottom')}
              disabled={selectedNodes.length === 0}
              title="Align Bottom"
              className="p-1.5 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer"
            >
              <AlignEndVertical className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </div>

          {/* Safe Margin Alignment & Baseline */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => alignSelectedToMargins('left')}
              disabled={selectedNodes.length === 0}
              title={`Snap Left Edge to ${slideMargin}px Safe Margin`}
              className="py-1 px-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-[10px] text-slate-300 hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              M-Left
            </button>
            <button
              onClick={() => alignSelectedToMargins('right')}
              disabled={selectedNodes.length === 0}
              title={`Snap Right Edge to ${slideMargin}px Safe Margin`}
              className="py-1 px-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-[10px] text-slate-300 hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              M-Right
            </button>
            <button
              onClick={() => alignSelectedToMargins('top')}
              disabled={selectedNodes.length === 0}
              title={`Snap Top Edge to ${slideMargin}px Safe Margin`}
              className="py-1 px-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-[10px] text-slate-300 hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              M-Top
            </button>
            <button
              onClick={() => alignSelectedToMargins('bottom')}
              disabled={selectedNodes.length === 0}
              title={`Snap Bottom Edge to ${slideMargin}px Safe Margin`}
              className="py-1 px-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-[10px] text-slate-300 hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              M-Btm
            </button>
            <button
              onClick={() => alignSelected('baseline')}
              disabled={!canAlignMultiple}
              title="Align Bottom Baselines"
              className="py-1 px-1 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-[10px] text-sky-300 hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              Base
            </button>
          </div>
        </div>

        {/* Distribution & Uniform Spacing Tools */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Distribution &amp; Spacing
            </span>
            <span className="text-[9px] text-slate-500">
              {canDistribute ? 'Ready' : 'Distribute needs 3+'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => alignSelected('distribute-h')}
              disabled={!canDistribute}
              className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 hover:text-white disabled:opacity-35 flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
              title="Distribute centers/edges evenly horizontally"
            >
              <AlignHorizontalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Distribute H</span>
            </button>
            <button
              onClick={() => alignSelected('distribute-v')}
              disabled={!canDistribute}
              className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 hover:text-white disabled:opacity-35 flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
              title="Distribute centers/edges evenly vertically"
            >
              <AlignVerticalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Distribute V</span>
            </button>
          </div>

          {/* Exact Uniform Gap Stepper */}
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-medium text-slate-400">Uniform Gap (px)</label>
              <input
                type="number"
                min={0}
                max={200}
                value={gapPx}
                onChange={(e) => setGapPx(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-[11px] text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => spaceNodesEvenly('horizontal', gapPx)}
                disabled={!canAlignMultiple}
                className="py-1 px-2 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white disabled:opacity-35 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Apply {gapPx}px Row Gap
              </button>
              <button
                onClick={() => spaceNodesEvenly('vertical', gapPx)}
                disabled={!canAlignMultiple}
                className="py-1 px-2 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white disabled:opacity-35 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Apply {gapPx}px Col Gap
              </button>
            </div>
          </div>
        </div>

        {/* Group & Bulk Layer Management */}
        <div className="pt-3 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Group &amp; Layer Actions
            </span>
            {activeGroups.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                {activeGroups.length} Group{activeGroups.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => groupNodes()}
              disabled={!canAlignMultiple}
              className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-35 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Group selected elements (Ctrl+G)"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Group ({selectedNodes.length})</span>
            </button>
            <button
              onClick={() => ungroupNodes()}
              disabled={activeGroups.length === 0}
              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Ungroup selected elements (Ctrl+Shift+G)"
            >
              <Ungroup className="w-3.5 h-3.5 text-amber-400" />
              <span>Ungroup</span>
            </button>
          </div>

          {/* Active Group Pills */}
          {activeGroups.length > 0 && (
            <div className="space-y-1">
              {activeGroups.map(([gid, members], idx) => (
                <div
                  key={gid}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-1"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-amber-300 truncate">
                      Group #{idx + 1} ({members.length} items)
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => selectGroupMembers(gid)}
                      title="Select all members of this group"
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-600 text-[9px] text-slate-200 hover:text-white flex items-center gap-0.5 cursor-pointer"
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                      <span>Select All</span>
                    </button>
                    <button
                      onClick={() => ungroupNodes(gid)}
                      title="Dissolve this group"
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-rose-700 text-[9px] text-slate-300 hover:text-white cursor-pointer"
                    >
                      Break
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Proportional Scale Presets */}
          {canAlignMultiple && (
            <div className="flex items-center justify-between gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 pl-1">Scale:</span>
              <div className="flex items-center gap-1">
                {[0.75, 0.9, 1.1, 1.25].map((mult) => (
                  <button
                    key={mult}
                    onClick={() => scaleGroup(selectedNodeIds, mult)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-600 text-[10px] font-mono text-slate-200 hover:text-white transition-colors cursor-pointer"
                  >
                    {Math.round(mult * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Z-Order & Bulk Actions */}
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => selectedNodes.forEach((n) => bringToFront(n.id))}
              disabled={selectedNodes.length === 0}
              title="Bring Selected to Front"
              className="py-1.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white disabled:opacity-35 flex flex-col items-center gap-0.5 text-[9px] cursor-pointer"
            >
              <ArrowUpToLine className="w-3 h-3 text-sky-400" />
              <span>Front</span>
            </button>
            <button
              onClick={() => selectedNodes.forEach((n) => sendToBack(n.id))}
              disabled={selectedNodes.length === 0}
              title="Send Selected to Back"
              className="py-1.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white disabled:opacity-35 flex flex-col items-center gap-0.5 text-[9px] cursor-pointer"
            >
              <ArrowDownToLine className="w-3 h-3 text-sky-400" />
              <span>Back</span>
            </button>
            <button
              onClick={() => selectedNodes.forEach((n) => duplicateNode(n.id))}
              disabled={selectedNodes.length === 0}
              title="Duplicate Selected Elements"
              className="py-1.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white disabled:opacity-35 flex flex-col items-center gap-0.5 text-[9px] cursor-pointer"
            >
              <Copy className="w-3 h-3 text-emerald-400" />
              <span>Clone</span>
            </button>
            <button
              onClick={deleteSelectedNodes}
              disabled={selectedNodes.length === 0}
              title="Delete Selected Elements"
              className="py-1.5 rounded bg-slate-950 border border-slate-800 hover:border-rose-600/60 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 disabled:opacity-35 flex flex-col items-center gap-0.5 text-[9px] cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Save Selection to Resource Library */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          {savedSuccess && (
            <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{savedSuccess}</span>
            </div>
          )}

          {isSavingOpen ? (
            <form
              onSubmit={handleConfirmSave}
              className="p-2.5 rounded-xl bg-slate-950 border border-sky-500/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Save to Resource Library
                </span>
                <button
                  type="button"
                  onClick={() => setIsSavingOpen(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Resource name..."
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
              />
              <select
                value={saveCategory}
                onChange={(e) => setSaveCategory(e.target.value as SavedCustomAsset['category'])}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-500"
              >
                <option value="patterns">Interaction Pattern</option>
                <option value="shapes">Custom Shape</option>
                <option value="icons">Branded Icon</option>
                <option value="cards">Callout / Card</option>
                <option value="groups">Reusable Group</option>
              </select>
              <button
                type="submit"
                disabled={!saveName.trim()}
                className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Resource</span>
              </button>
            </form>
          ) : (
            <button
              onClick={handleOpenSaveForm}
              disabled={selectedNodes.length === 0}
              className="w-full py-2 px-3 rounded-xl bg-sky-950/60 hover:bg-sky-600 border border-sky-500/40 text-sky-300 hover:text-white disabled:opacity-35 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderHeart className="w-3.5 h-3.5" />
              <span>Save Selection to Resource Library</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
