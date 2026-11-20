import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { CanvasNode, TextNode, ImageNode, QuizNode, ShapeNode, CalloutNode } from '../../types/schema';
import {
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Boxes,
  Trash2,
  Copy,
  Type,
  Image as ImageIcon,
  HelpCircle,
  Square,
  MessageSquare,
  GripVertical,
  Search,
  Edit2,
  Check,
} from 'lucide-react';

export const LayersPanel: React.FC = () => {
  const {
    currentPage,
    selectedNodeId,
    selectedNodeIds,
    setSelectedNodeId,
    setSelectedNodeIds,
    toggleNodeSelection,
    toggleLockNode,
    toggleHideNode,
    reorderLayerNodes,
    moveUp,
    moveDown,
    bringToFront,
    sendToBack,
    deleteNode,
    duplicateNode,
    groupNodes,
    ungroupNodes,
    updateNode,
  } = useCourseStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!currentPage) {
    return (
      <div className="p-4 text-xs text-slate-500 text-center">
        No active slide selected
      </div>
    );
  }

  // Sort nodes by zIndex descending (top layer first)
  const sortedNodes = [...currentPage.nodes].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1));

  // Filter by search term if typed
  const filteredNodes = sortedNodes.filter((node) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (node.name || '').toLowerCase();
    const type = node.type.toLowerCase();
    let contentStr = '';
    if (node.type === 'text') contentStr = (node as TextNode).content || '';
    if (node.type === 'quiz') contentStr = (node as QuizNode).question || '';
    if (node.type === 'callout') contentStr = `${(node as CalloutNode).title} ${(node as CalloutNode).content}`;
    if (node.type === 'image') contentStr = (node as ImageNode).alt || '';
    if (node.type === 'shape') contentStr = (node as ShapeNode).shapeType || '';

    return name.includes(term) || type.includes(term) || contentStr.toLowerCase().includes(term);
  });

  const getNodeLabel = (node: CanvasNode): string => {
    if (node.name) return node.name;
    switch (node.type) {
      case 'text': {
        const text = (node as TextNode).content || 'Text Element';
        return text.length > 28 ? `${text.slice(0, 25)}...` : text;
      }
      case 'image': {
        const alt = (node as ImageNode).alt || 'Image';
        return alt.length > 28 ? `${alt.slice(0, 25)}...` : alt;
      }
      case 'quiz': {
        const q = (node as QuizNode).question || 'Quiz Question';
        return q.length > 28 ? `${q.slice(0, 25)}...` : q;
      }
      case 'callout': {
        const title = (node as CalloutNode).title || 'Callout Box';
        return title.length > 28 ? `${title.slice(0, 25)}...` : title;
      }
      case 'shape': {
        const shape = (node as ShapeNode).shapeType || 'Shape';
        return `${shape.charAt(0).toUpperCase()}${shape.slice(1)} Shape`;
      }
      default:
        return 'Canvas Node';
    }
  };

  const getNodeIcon = (node: CanvasNode) => {
    switch (node.type) {
      case 'text':
        return <Type className="w-3.5 h-3.5 text-blue-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'shape':
        return <Square className="w-3.5 h-3.5 text-purple-400" />;
      case 'callout':
        return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...sortedNodes];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, moved);

    const reorderedIds = reordered.map((n) => n.id);
    reorderLayerNodes(reorderedIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Inline rename submit
  const handleSaveRename = (nodeId: string) => {
    updateNode(nodeId, { name: editingName.trim() || undefined });
    setEditingNodeId(null);
    setEditingName('');
  };

  // Bulk Layer Actions
  const handleLockAll = () => {
    const isAnyUnlocked = sortedNodes.some((n) => !n.isLocked);
    sortedNodes.forEach((n) => {
      if (isAnyUnlocked && !n.isLocked) toggleLockNode(n.id);
      if (!isAnyUnlocked && n.isLocked) toggleLockNode(n.id);
    });
  };

  const handleHideAll = () => {
    const isAnyVisible = sortedNodes.some((n) => !n.isHidden);
    sortedNodes.forEach((n) => {
      if (isAnyVisible && !n.isHidden) toggleHideNode(n.id);
      if (!isAnyVisible && n.isHidden) toggleHideNode(n.id);
    });
  };

  return (
    <div className="space-y-3 text-xs select-none">
      {/* Top Header & Search Filter */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="uppercase text-[11px] tracking-wider">Slide Layers</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          {currentPage.nodes.length} Elements
        </span>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter layers by name or text..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 text-[11px] placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Bulk Toolbar Controls */}
      <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-[11px]">
        <div className="flex items-center gap-1">
          <button
            onClick={handleLockAll}
            title="Toggle Lock for all elements on slide"
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Toggle Lock</span>
          </button>
          <button
            onClick={handleHideAll}
            title="Toggle Visibility for all elements"
            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Eye className="w-3 h-3 text-sky-400" />
            <span>Toggle Hide</span>
          </button>
        </div>

        {selectedNodeIds.length > 1 && (
          <button
            onClick={() => groupNodes()}
            title="Group selected layers (Ctrl+G)"
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Boxes className="w-3 h-3" />
            <span>Group ({selectedNodeIds.length})</span>
          </button>
        )}
      </div>

      {/* Layer List Items Container */}
      <div className="space-y-1 max-h-120 overflow-y-auto pr-1">
        {filteredNodes.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-[11px]">
            {searchTerm ? 'No layers match search' : 'No elements on slide'}
          </div>
        ) : (
          filteredNodes.map((node, index) => {
            const isSelected = selectedNodeIds.includes(node.id);
            const isEditing = editingNodeId === node.id;
            const isDragging = draggedIndex === index;
            const isTarget = dragOverIndex === index;

            return (
              <div
                key={node.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onClick={(e) => {
                  if (e.shiftKey) {
                    toggleNodeSelection(node.id);
                  } else {
                    setSelectedNodeId(node.id);
                  }
                }}
                className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all ${
                  isDragging
                    ? 'opacity-30 border-dashed border-blue-500'
                    : isTarget
                    ? 'border-2 border-sky-400 bg-sky-500/10'
                    : isSelected
                    ? node.isLocked
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                      : 'bg-slate-800/90 border-blue-500/80 text-white shadow-sm shadow-blue-500/20'
                    : node.isHidden
                    ? 'bg-slate-950/60 border-slate-900 text-slate-500 opacity-60'
                    : 'bg-slate-950 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                }`}
              >
                {/* Drag Handle & Icon */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="cursor-grab active:cursor-grabbing text-slate-600 group-hover:text-slate-400 transition-colors shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  <div className="shrink-0">{getNodeIcon(node)}</div>

                  {/* Layer Label or Inline Rename Input */}
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(node.id);
                          if (e.key === 'Escape') setEditingNodeId(null);
                        }}
                        className="w-full bg-slate-900 border border-blue-500 text-white rounded px-1.5 py-0.5 text-xs outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(node.id)}
                        className="p-1 bg-blue-600 hover:bg-blue-500 text-white rounded shrink-0"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingNodeId(node.id);
                          setEditingName(node.name || getNodeLabel(node));
                        }}
                        className="truncate font-medium text-xs cursor-pointer hover:text-white"
                        title={getNodeLabel(node)}
                      >
                        {getNodeLabel(node)}
                      </span>

                      {/* Group Badge */}
                      {node.groupId && (
                        <span className="text-[9px] bg-slate-900 border border-slate-700/80 text-blue-400 font-mono px-1 py-0.2 rounded shrink-0">
                          GRP
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Layer Quick Action Toggle Icons */}
                <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                  {/* Hide / Show Toggle */}
                  <button
                    onClick={() => toggleHideNode(node.id)}
                    title={node.isHidden ? 'Show Layer on Canvas' : 'Hide Layer on Canvas'}
                    className={`p-1 rounded transition-colors ${
                      node.isHidden
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {node.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {/* Lock / Unlock Toggle */}
                  <button
                    onClick={() => toggleLockNode(node.id)}
                    title={node.isLocked ? 'Unlock Layer' : 'Lock Layer'}
                    className={`p-1 rounded transition-colors ${
                      node.isLocked
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {node.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Quick Order Up/Down Buttons */}
                  <button
                    onClick={() => moveUp(node.id)}
                    title="Bring Forward 1 Layer"
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveDown(node.id)}
                    title="Send Backward 1 Layer"
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteNode(node.id)}
                    disabled={node.isLocked}
                    title={node.isLocked ? 'Cannot delete locked layer' : 'Delete Layer'}
                    className="p-1 hover:bg-rose-950 text-rose-400 rounded disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
