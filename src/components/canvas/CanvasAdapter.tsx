import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCourseStore, globalCourseStore } from '../../store/courseStore';
import { CanvasNode, NodeType, TextNode } from '../../types/schema';
import { TextNodeRenderer } from './renderers/TextNodeRenderer';
import { ImageNodeRenderer } from './renderers/ImageNodeRenderer';
import { QuizNodeRenderer } from './renderers/QuizNodeRenderer';
import { ShapeNodeRenderer } from './renderers/ShapeNodeRenderer';
import { CalloutNodeRenderer } from './renderers/CalloutNodeRenderer';
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Hand,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Boxes,
  Layers,
  Grid,
  Lock,
  Unlock,
} from 'lucide-react';

interface DragState {
  type: 'move' | 'resize' | 'pan';
  nodeId?: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth?: number;
  initialHeight?: number;
  resizeHandle?: string;
  initialPanX?: number;
  initialPanY?: number;
  initialNodesMap?: Record<string, { x: number; y: number; width: number; height: number }>;
}

export interface ActiveGuide {
  val: number;
  label?: string;
}

export const CanvasAdapter: React.FC = () => {
  const {
    course,
    currentPage,
    selectedNodeId,
    selectedNodeIds,
    isSnapToGridEnabled,
    gridSize,
    zoom,
    pan,
    setZoom,
    setPan,
    resetView,
    setSelectedNodeId,
    setSelectedNodeIds,
    toggleNodeSelection,
    groupNodes,
    ungroupNodes,
    toggleLockNode,
    updateNode,
    deleteNode,
    duplicateNode,
    bringToFront,
    sendToBack,
    addNode,
    applySlideLayout,
    undo,
    redo,
  } = useCourseStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [toolMode, setToolMode] = useState<'select' | 'pan'>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [snapLineX, setSnapLineX] = useState<number | null>(null);
  const [snapLineY, setSnapLineY] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverKind, setDragOverKind] = useState<'node' | 'layout'>('node');
  const [layoutToast, setLayoutToast] = useState<string | null>(null);
  const [smartGuidesX, setSmartGuidesX] = useState<ActiveGuide[]>([]);
  const [smartGuidesY, setSmartGuidesY] = useState<ActiveGuide[]>([]);
  const [marqueeState, setMarqueeState] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const canvasWidth = course.canvasWidth || 960;
  const canvasHeight = course.canvasHeight || 540;

  // Dynamic Ruler Steps depending on current Zoom level
  const rulerSteps =
    zoom >= 1.4
      ? { minor: 5, medium: 25, major: 50 }
      : zoom >= 0.8
      ? { minor: 10, medium: 50, major: 100 }
      : { minor: 20, medium: 100, major: 200 };

  // Spacebar pan and key listeners (Ctrl+G group, Ctrl+Shift+G ungroup, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key.toLowerCase() === 'h') {
        setToolMode('pan');
      } else if (e.key.toLowerCase() === 'v') {
        setToolMode('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          selectedNodeIds.forEach((id) => deleteNode(id));
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupNodes();
        } else {
          groupNodes();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        if (selectedNodeId) {
          e.preventDefault();
          duplicateNode(selectedNodeId);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedNodeIds.length > 0 && currentPage) {
          e.preventDefault();
          const step = e.shiftKey ? (isSnapToGridEnabled ? gridSize : 10) : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;

          selectedNodeIds.forEach((id) => {
            const node = currentPage.nodes.find((n) => n.id === id);
            if (node) {
              updateNode(id, { x: node.x + dx, y: node.y + dy }, false);
            }
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedNodeId,
    selectedNodeIds,
    currentPage,
    isSnapToGridEnabled,
    gridSize,
    deleteNode,
    duplicateNode,
    groupNodes,
    ungroupNodes,
    undo,
    redo,
    updateNode,
  ]);

  // Fit to screen helper
  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const padding = 80;
    const availW = containerRef.current.clientWidth - padding;
    const availH = containerRef.current.clientHeight - padding;
    const scaleX = availW / canvasWidth;
    const scaleY = availH / canvasHeight;
    const fitScale = Math.max(0.4, Math.min(1.4, Math.min(scaleX, scaleY)));
    setZoom(fitScale);
    setPan({ x: 0, y: 0 });
  };

  // Wheel to Zoom / Pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      const nextZoom = Math.max(0.4, Math.min(2.0, zoom * zoomFactor));
      setZoom(nextZoom);
    } else {
      setPan({
        x: pan.x - e.deltaX * 0.8,
        y: pan.y - e.deltaY * 0.8,
      });
    }
  };

  // Pointer Down on Canvas Container (start panning or clear selection & start marquee lasso)
  const handleContainerPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || toolMode === 'pan' || isSpacePressed) {
      e.preventDefault();
      setDragState({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialX: 0,
        initialY: 0,
        initialPanX: pan.x,
        initialPanY: pan.y,
      });
      return;
    }

    if (e.target === containerRef.current || e.target === stageRef.current) {
      if (!e.shiftKey) {
        setSelectedNodeId(null);
      }
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const stageX = (e.clientX - rect.left) / zoom;
        const stageY = (e.clientY - rect.top) / zoom;

        setMarqueeState({
          startX: stageX,
          startY: stageY,
          currentX: stageX,
          currentY: stageY,
        });
      }
    }
  };

  // Node Pointer Down (start moving single node or multi-selection group)
  const handleNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    if (toolMode === 'pan' || isSpacePressed || e.button === 1) {
      return;
    }

    e.stopPropagation();

    let activeSelectedIds = selectedNodeIds;
    if (e.shiftKey) {
      toggleNodeSelection(node.id);
      activeSelectedIds = globalCourseStore.getState().selectedNodeIds;
    } else {
      if (!selectedNodeIds.includes(node.id)) {
        setSelectedNodeId(node.id);
        activeSelectedIds = globalCourseStore.getState().selectedNodeIds;
      }
    }

    if (!currentPage) return;

    if (node.isLocked) {
      // Locked nodes can be selected but cannot be dragged on canvas
      return;
    }

    const initialNodesMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    currentPage.nodes.forEach((n) => {
      if (activeSelectedIds.includes(n.id)) {
        initialNodesMap[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
      }
    });

    setDragState({
      type: 'move',
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: node.x,
      initialY: node.y,
      initialWidth: node.width,
      initialHeight: node.height,
      initialNodesMap,
    });
  };

  // Resize Handle Pointer Down
  const handleResizePointerDown = (e: React.PointerEvent, nodeId: string, handle: string) => {
    e.stopPropagation();
    if (!currentPage) return;
    const node = currentPage.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDragState({
      type: 'resize',
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: node.x,
      initialY: node.y,
      initialWidth: node.width,
      initialHeight: node.height,
      resizeHandle: handle,
    });
  };

  // Drag Pointer Move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // 1. Marquee Selection Drag
      if (marqueeState && stageRef.current && currentPage) {
        const rect = stageRef.current.getBoundingClientRect();
        const curX = Math.round((e.clientX - rect.left) / zoom);
        const curY = Math.round((e.clientY - rect.top) / zoom);

        setMarqueeState((prev) => (prev ? { ...prev, currentX: curX, currentY: curY } : null));

        const left = Math.min(marqueeState.startX, curX);
        const top = Math.min(marqueeState.startY, curY);
        const right = Math.max(marqueeState.startX, curX);
        const bottom = Math.max(marqueeState.startY, curY);

        const intersectedIds = currentPage.nodes
          .filter((n) => {
            const overlap = !(n.x + n.width < left || n.x > right || n.y + n.height < top || n.y > bottom);
            return overlap;
          })
          .flatMap((n) => {
            if (n.groupId) {
              return currentPage.nodes.filter((g) => g.groupId === n.groupId).map((g) => g.id);
            }
            return [n.id];
          });

        const uniqueIds = Array.from(new Set(intersectedIds));
        setSelectedNodeIds(uniqueIds);
        return;
      }

      if (!dragState) return;

      if (dragState.type === 'pan') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setPan({
          x: (dragState.initialPanX || 0) + dx,
          y: (dragState.initialPanY || 0) + dy,
        });
        return;
      }

      if (!currentPage || !dragState.nodeId) return;

      const deltaX = (e.clientX - dragState.startX) / zoom;
      const deltaY = (e.clientY - dragState.startY) / zoom;

      if (dragState.type === 'move') {
        let newX = dragState.initialX + deltaX;
        let newY = dragState.initialY + deltaY;

        if (isSnapToGridEnabled) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        } else {
          newX = Math.round(newX);
          newY = Math.round(newY);
        }

        // --- Smart Guides Calculation across Canvas Elements & Page Bounds ---
        const SNAP_THRESHOLD = 5;
        const activeGuidesX: ActiveGuide[] = [];
        const activeGuidesY: ActiveGuide[] = [];

        // Candidate X points with alignment descriptions
        const candXPoints: { val: number; label: string }[] = [
          { val: 0, label: 'Page Left' },
          { val: Math.round(canvasWidth / 2), label: 'Center-X' },
          { val: canvasWidth, label: 'Page Right' },
        ];
        // Candidate Y points with alignment descriptions
        const candYPoints: { val: number; label: string }[] = [
          { val: 0, label: 'Page Top' },
          { val: Math.round(canvasHeight / 2), label: 'Center-Y' },
          { val: canvasHeight, label: 'Page Bottom' },
        ];

        currentPage.nodes.forEach((n) => {
          if (!selectedNodeIds.includes(n.id)) {
            candXPoints.push(
              { val: n.x, label: 'Align Left' },
              { val: Math.round(n.x + n.width / 2), label: 'Align Center-X' },
              { val: n.x + n.width, label: 'Align Right' }
            );
            candYPoints.push(
              { val: n.y, label: 'Align Top' },
              { val: Math.round(n.y + n.height / 2), label: 'Align Center-Y' },
              { val: n.y + n.height, label: 'Align Bottom' }
            );
          }
        });

        const curW = dragState.initialWidth || 40;
        const curH = dragState.initialHeight || 40;

        // Check horizontal alignment (X points)
        const movedXPoints = [
          { val: newX, offset: 0 },
          { val: newX + curW / 2, offset: curW / 2 },
          { val: newX + curW, offset: curW },
        ];

        let snappedX = newX;
        let xSnapped = false;
        for (const movedPt of movedXPoints) {
          for (const candX of candXPoints) {
            if (Math.abs(movedPt.val - candX.val) <= SNAP_THRESHOLD) {
              snappedX = Math.round(candX.val - movedPt.offset);
              activeGuidesX.push({ val: candX.val, label: candX.label });
              xSnapped = true;
              break;
            }
          }
          if (xSnapped) break;
        }
        newX = snappedX;

        // Check vertical alignment (Y points)
        const movedYPoints = [
          { val: newY, offset: 0 },
          { val: newY + curH / 2, offset: curH / 2 },
          { val: newY + curH, offset: curH },
        ];

        let snappedY = newY;
        let ySnapped = false;
        for (const movedPt of movedYPoints) {
          for (const candY of candYPoints) {
            if (Math.abs(movedPt.val - candY.val) <= SNAP_THRESHOLD) {
              snappedY = Math.round(candY.val - movedPt.offset);
              activeGuidesY.push({ val: candY.val, label: candY.label });
              ySnapped = true;
              break;
            }
          }
          if (ySnapped) break;
        }
        newY = snappedY;

        setSmartGuidesX(activeGuidesX);
        setSmartGuidesY(activeGuidesY);

        const offsetX = newX - dragState.initialX;
        const offsetY = newY - dragState.initialY;

        if (dragState.initialNodesMap) {
          Object.entries(dragState.initialNodesMap).forEach(([id, initPos]) => {
            updateNode(id, { x: initPos.x + offsetX, y: initPos.y + offsetY }, false);
          });
        } else if (dragState.nodeId) {
          updateNode(dragState.nodeId, { x: newX, y: newY }, false);
        }
      } else if (dragState.type === 'resize' && dragState.resizeHandle) {
        let newX = dragState.initialX;
        let newY = dragState.initialY;
        let newW = dragState.initialWidth || 40;
        let newH = dragState.initialHeight || 40;

        const MIN_SIZE = 20;

        if (dragState.resizeHandle.includes('e')) {
          newW = Math.max(MIN_SIZE, (dragState.initialWidth || 40) + deltaX);
        }
        if (dragState.resizeHandle.includes('s')) {
          newH = Math.max(MIN_SIZE, (dragState.initialHeight || 40) + deltaY);
        }
        if (dragState.resizeHandle.includes('w')) {
          const maxDeltaW = (dragState.initialWidth || 40) - MIN_SIZE;
          const appliedDelta = Math.min(deltaX, maxDeltaW);
          newW = (dragState.initialWidth || 40) - appliedDelta;
          newX = dragState.initialX + appliedDelta;
        }
        if (dragState.resizeHandle.includes('n')) {
          const maxDeltaH = (dragState.initialHeight || 40) - MIN_SIZE;
          const appliedDelta = Math.min(deltaY, maxDeltaH);
          newH = (dragState.initialHeight || 40) - appliedDelta;
          newY = dragState.initialY + appliedDelta;
        }

        if (isSnapToGridEnabled) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
          newW = Math.round(newW / gridSize) * gridSize;
          newH = Math.round(newH / gridSize) * gridSize;
        } else {
          newX = Math.round(newX);
          newY = Math.round(newY);
          newW = Math.round(newW);
          newH = Math.round(newH);
        }

        updateNode(dragState.nodeId, { x: newX, y: newY, width: newW, height: newH }, false);
      }
    },
    [
      dragState,
      marqueeState,
      currentPage,
      selectedNodeIds,
      zoom,
      canvasWidth,
      canvasHeight,
      isSnapToGridEnabled,
      gridSize,
      setPan,
      updateNode,
      setSelectedNodeIds,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (dragState) {
      setDragState(null);
      setSnapLineX(null);
      setSnapLineY(null);
      setSmartGuidesX([]);
      setSmartGuidesY([]);
    }
    if (marqueeState) {
      setMarqueeState(null);
    }
  }, [dragState, marqueeState]);

  // Drag and Drop from Sidebar into Canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);

    const hasLayout = e.dataTransfer.types.includes('application/scorm-slide-layout');
    setDragOverKind(hasLayout ? 'layout' : 'node');
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // 1. Check for Slide Layout drop
    const layoutJson = e.dataTransfer.getData('application/scorm-slide-layout');
    if (layoutJson) {
      try {
        const layout = JSON.parse(layoutJson);
        applySlideLayout(layout);
        setLayoutToast(`Applied "${layout.title}" layout to slide!`);
        setTimeout(() => setLayoutToast(null), 2500);
        return;
      } catch (err) {
        console.error('Failed to parse dropped layout:', err);
      }
    }

    // 2. Check for Single Node drop
    const nodeType = (e.dataTransfer.getData('application/scorm-node-type') ||
      e.dataTransfer.getData('text/plain')) as NodeType;

    if (!nodeType || !stageRef.current) return;

    // Calculate drop coordinates relative to slide canvas
    const rect = stageRef.current.getBoundingClientRect();
    const dropX = (e.clientX - rect.left) / zoom;
    const dropY = (e.clientY - rect.top) / zoom;

    addNode(nodeType, { x: dropX, y: dropY });
  };

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        No active slide selected
      </div>
    );
  }

  const isPanningActive = toolMode === 'pan' || isSpacePressed;

  const selectedNodes = currentPage.nodes.filter((n) => selectedNodeIds.includes(n.id));
  const isMultiSelection = selectedNodes.length > 1;
  const isSelectedGrouped = selectedNodes.some((n) => Boolean(n.groupId));

  const groupBounds = isMultiSelection
    ? {
        minX: Math.min(...selectedNodes.map((n) => n.x)),
        minY: Math.min(...selectedNodes.map((n) => n.y)),
        maxX: Math.max(...selectedNodes.map((n) => n.x + n.width)),
        maxY: Math.max(...selectedNodes.map((n) => n.y + n.height)),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className={`flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center select-none ${
        isPanningActive
          ? dragState?.type === 'pan'
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : 'cursor-default'
      }`}
      style={{
        backgroundImage: isSnapToGridEnabled
          ? `radial-gradient(#0284c7 1.2px, transparent 1.2px)`
          : 'radial-gradient(#334155 0.75px, transparent 0.75px)',
        backgroundSize: isSnapToGridEnabled ? `${gridSize * 2}px ${gridSize * 2}px` : '24px 24px',
        backgroundPosition: `${pan.x % (isSnapToGridEnabled ? gridSize * 2 : 24)}px ${
          pan.y % (isSnapToGridEnabled ? gridSize * 2 : 24)
        }px`,
      }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Floating Canvas HUD Toolbar (Pan/Select, Zoom, Fit) */}
      <div
        className="absolute top-4 left-6 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Select Tool (V)"
          onClick={() => setToolMode('select')}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
            toolMode === 'select' && !isSpacePressed
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>
        <button
          title="Hand / Pan Tool (H or Hold Spacebar)"
          onClick={() => setToolMode('pan')}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
            toolMode === 'pan' || isSpacePressed
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        <button
          title="Zoom Out"
          onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-slate-300 min-w-[40px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          title="Zoom In"
          onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        <button
          title="Fit Slide to Screen"
          onClick={handleFitToScreen}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden sm:inline">Fit</span>
        </button>

        <button
          title="Reset View (100% Zoom &amp; Center)"
          onClick={resetView}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide Canvas Stage with Pan & Zoom Transform */}
      <div
        ref={stageRef}
        className={`relative transition-shadow shadow-2xl rounded-lg ${
          isDragOver ? 'ring-4 ring-blue-500/80' : ''
        }`}
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          background: currentPage.background?.value || '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedNodeId(null);
          }
        }}
      >
        {/* Horizontal Canvas Ruler (Top Edge) */}
        <div className="absolute -top-6 left-0 right-0 h-6 bg-slate-900 border-b border-slate-700/80 pointer-events-none select-none z-30 overflow-hidden">
          <svg className="w-full h-full">
            {Array.from({ length: Math.floor(canvasWidth / rulerSteps.minor) + 1 }).map((_, i) => {
              const x = i * rulerSteps.minor;
              const isMajor = x % rulerSteps.major === 0;
              const isMedium = x % rulerSteps.medium === 0;
              const tickH = isMajor ? 12 : isMedium ? 8 : 4;
              return (
                <g key={x}>
                  <line
                    x1={x}
                    y1={24}
                    x2={x}
                    y2={24 - tickH}
                    stroke={isMajor ? '#cbd5e1' : isMedium ? '#64748b' : '#334155'}
                    strokeWidth={isMajor ? 1.2 : 0.8}
                  />
                  {isMajor && (
                    <text
                      x={x + 2}
                      y={10}
                      fill="#e2e8f0"
                      fontSize={8}
                      fontFamily="monospace"
                    >
                      {x}
                    </text>
                  )}
                </g>
              );
            })}
            {selectedNodes.map((n) => (
              <rect
                key={`h_mark_${n.id}`}
                x={n.x}
                y={18}
                width={Math.max(2, n.width)}
                height={6}
                fill="#38bdf8"
                opacity={0.85}
              />
            ))}
          </svg>
        </div>

        {/* Vertical Canvas Ruler (Left Edge) */}
        <div className="absolute -left-6 top-0 bottom-0 w-6 bg-slate-900 border-r border-slate-700/80 pointer-events-none select-none z-30 overflow-hidden">
          <svg className="w-full h-full">
            {Array.from({ length: Math.floor(canvasHeight / rulerSteps.minor) + 1 }).map((_, i) => {
              const y = i * rulerSteps.minor;
              const isMajor = y % rulerSteps.major === 0;
              const isMedium = y % rulerSteps.medium === 0;
              const tickW = isMajor ? 12 : isMedium ? 8 : 4;
              return (
                <g key={y}>
                  <line
                    x1={24}
                    y1={y}
                    x2={24 - tickW}
                    y2={y}
                    stroke={isMajor ? '#cbd5e1' : isMedium ? '#64748b' : '#334155'}
                    strokeWidth={isMajor ? 1.2 : 0.8}
                  />
                  {isMajor && (
                    <text
                      x={10}
                      y={y + 3}
                      fill="#e2e8f0"
                      fontSize={8}
                      fontFamily="monospace"
                      textAnchor="middle"
                      transform={`rotate(-90 10 ${y + 3})`}
                    >
                      {y}
                    </text>
                  )}
                </g>
              );
            })}
            {selectedNodes.map((n) => (
              <rect
                key={`v_mark_${n.id}`}
                x={18}
                y={n.y}
                width={6}
                height={Math.max(2, n.height)}
                fill="#38bdf8"
                opacity={0.85}
              />
            ))}
          </svg>
        </div>

        {/* Ruler Corner Junction (0,0) */}
        <div className="absolute -top-6 -left-6 w-6 h-6 bg-slate-950 border-r border-b border-slate-700 flex items-center justify-center text-[8px] font-mono font-bold text-slate-400 z-30 select-none">
          px
        </div>

        {/* Smart Guide Alignment Lines Overlay */}
        {smartGuidesX.map((guide, idx) => (
          <div
            key={`sg_x_${idx}_${guide.val}`}
            className="absolute top-0 bottom-0 w-[1.5px] bg-fuchsia-500 z-50 pointer-events-none shadow-sm shadow-fuchsia-500/80 animate-in fade-in duration-75"
            style={{ left: `${guide.val}px` }}
          >
            <div className="absolute top-1 left-1 bg-fuchsia-950/95 text-fuchsia-200 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded border border-fuchsia-500/60 shadow-md backdrop-blur-xs flex items-center gap-1">
              <span>{guide.label || 'Aligned'}</span>
              <span className="text-fuchsia-400">({guide.val}px)</span>
            </div>
          </div>
        ))}
        {smartGuidesY.map((guide, idx) => (
          <div
            key={`sg_y_${idx}_${guide.val}`}
            className="absolute left-0 right-0 h-[1.5px] bg-fuchsia-500 z-50 pointer-events-none shadow-sm shadow-fuchsia-500/80 animate-in fade-in duration-75"
            style={{ top: `${guide.val}px` }}
          >
            <div className="absolute top-1 left-1 bg-fuchsia-950/95 text-fuchsia-200 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded border border-fuchsia-500/60 shadow-md backdrop-blur-xs flex items-center gap-1">
              <span>{guide.label || 'Aligned'}</span>
              <span className="text-fuchsia-400">({guide.val}px)</span>
            </div>
          </div>
        ))}

        {/* Marquee Lasso Selection Overlay */}
        {marqueeState && (
          <div
            className="absolute border-2 border-dashed border-sky-400 bg-sky-500/20 z-50 pointer-events-none rounded-[2px]"
            style={{
              left: `${Math.min(marqueeState.startX, marqueeState.currentX)}px`,
              top: `${Math.min(marqueeState.startY, marqueeState.currentY)}px`,
              width: `${Math.abs(marqueeState.currentX - marqueeState.startX)}px`,
              height: `${Math.abs(marqueeState.currentY - marqueeState.startY)}px`,
            }}
          />
        )}

        {/* Drag Over Hint Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/15 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-50 pointer-events-none backdrop-blur-[1px]">
            <div className="bg-slate-900/95 text-blue-300 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border border-blue-500/30">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>
                {dragOverKind === 'layout'
                  ? 'Drop to apply pre-designed slide layout'
                  : 'Drop element anywhere on slide'}
              </span>
            </div>
          </div>
        )}

        {/* Layout Applied Toast Notification */}
        {layoutToast && (
          <div className="absolute top-4 right-4 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xl z-50 animate-in fade-in flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{layoutToast}</span>
          </div>
        )}

        {/* Multi-Selection Group Bounding Box Overlay */}
        {groupBounds && (
          <div
            className="absolute border-2 border-dashed border-sky-400 bg-sky-500/10 pointer-events-none z-40 rounded"
            style={{
              left: `${groupBounds.minX - 6}px`,
              top: `${groupBounds.minY - 6}px`,
              width: `${groupBounds.maxX - groupBounds.minX + 12}px`,
              height: `${groupBounds.maxY - groupBounds.minY + 12}px`,
            }}
          >
            {/* Floating Multi-Selection Actions */}
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-3 py-1 rounded-lg border border-slate-700 shadow-xl flex items-center gap-2 pointer-events-auto text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] font-semibold text-sky-300 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5" />
                {selectedNodes.length} Elements Selected
              </span>

              <div className="w-[1px] h-3.5 bg-slate-700" />

              {!isSelectedGrouped ? (
                <button
                  onClick={() => groupNodes()}
                  title="Group selected elements (Ctrl+G)"
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Boxes className="w-3 h-3" />
                  <span>Group</span>
                </button>
              ) : (
                <button
                  onClick={() => ungroupNodes()}
                  title="Ungroup elements (Ctrl+Shift+G)"
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Boxes className="w-3 h-3 text-amber-400" />
                  <span>Ungroup</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Render Canvas Nodes */}
        {currentPage.nodes.map((node) => {
          const isSelected = selectedNodeIds.includes(node.id);
          const isPrimarySelected = node.id === selectedNodeId;

          return (
            <div
              key={node.id}
              className="absolute"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                zIndex: node.zIndex || 1,
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  toggleNodeSelection(node.id);
                } else {
                  setSelectedNodeId(node.id);
                }
              }}
            >
              {/* Lock Badge Overlay */}
              {node.isLocked && (
                <div
                  className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 p-1 rounded-full shadow-lg z-50 border border-amber-300"
                  title="Locked Element"
                >
                  <Lock className="w-3 h-3" />
                </div>
              )}

              {node.type === 'text' && (
                <TextNodeRenderer
                  node={node as TextNode}
                  isSelected={isSelected}
                  onUpdateContent={(content) => updateNode(node.id, { content })}
                />
              )}
              {node.type === 'image' && <ImageNodeRenderer node={node} isSelected={isSelected} />}
              {node.type === 'quiz' && <QuizNodeRenderer node={node} isSelected={isSelected} />}
              {node.type === 'shape' && <ShapeNodeRenderer node={node} />}
              {node.type === 'callout' && <CalloutNodeRenderer node={node} />}

              {/* Selection Border & Floating Actions */}
              {isSelected && (
                <>
                  <div
                    className={`absolute inset-0 border-2 ${
                      node.isLocked
                        ? 'border-amber-400 border-dashed'
                        : isPrimarySelected
                        ? 'border-blue-500'
                        : 'border-sky-400 border-dashed'
                    } pointer-events-none rounded-[2px]`}
                  />

                  {/* Floating Action Pill (When single node is primary selection) */}
                  {isPrimarySelected && !isMultiSelection && (
                    <div
                      className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-lg border border-slate-700/80 shadow-xl flex items-center gap-1 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        title={node.isLocked ? 'Unlock Layer' : 'Lock Layer'}
                        onClick={() => toggleLockNode(node.id)}
                        className={`p-1 rounded transition-colors ${
                          node.isLocked
                            ? 'bg-amber-500/30 text-amber-300 hover:bg-amber-500/50'
                            : 'hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {node.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {!node.isLocked && (
                        <>
                          <button
                            title="Duplicate (Ctrl+D)"
                            onClick={() => duplicateNode(node.id)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Bring to Front"
                            onClick={() => bringToFront(node.id)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Send to Back"
                            onClick={() => sendToBack(node.id)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
                      <button
                        title="Delete (Del)"
                        onClick={() => deleteNode(node.id)}
                        className="p-1 hover:bg-red-950/80 rounded text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* 8 Resize Handles */}
                  {!isMultiSelection &&
                    !node.isLocked &&
                    [
                      { handle: 'nw', cursor: 'nwse-resize', pos: '-top-1.5 -left-1.5' },
                      { handle: 'n', cursor: 'ns-resize', pos: '-top-1.5 left-1/2 -translate-x-1/2' },
                      { handle: 'ne', cursor: 'nesw-resize', pos: '-top-1.5 -right-1.5' },
                      { handle: 'e', cursor: 'ew-resize', pos: 'top-1/2 -right-1.5 -translate-y-1/2' },
                      { handle: 'se', cursor: 'nwse-resize', pos: '-bottom-1.5 -right-1.5' },
                      { handle: 's', cursor: 'ns-resize', pos: '-bottom-1.5 left-1/2 -translate-x-1/2' },
                      { handle: 'sw', cursor: 'nesw-resize', pos: '-bottom-1.5 -left-1.5' },
                      { handle: 'w', cursor: 'ew-resize', pos: 'top-1/2 -left-1.5 -translate-y-1/2' },
                    ].map(({ handle, cursor, pos }) => (
                      <div
                        key={handle}
                        className={`absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow-xs ${pos}`}
                        style={{ cursor }}
                        onPointerDown={(e) => handleResizePointerDown(e, node.id, handle)}
                      />
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom-Right Floating Zoom Level Controls HUD */}
      <div
        className="absolute bottom-5 right-6 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-2xl flex items-center gap-1.5 text-xs text-white select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Zoom Out"
          onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span
          title="Current Zoom Level"
          className="text-xs font-mono font-bold text-sky-400 min-w-[46px] text-center"
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          title="Zoom In"
          onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

        <button
          title="Fit Slide to Viewport"
          onClick={handleFitToScreen}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-slate-700/80"
        >
          <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Fit</span>
        </button>

        <button
          title="Reset Zoom to 100%"
          onClick={resetView}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
