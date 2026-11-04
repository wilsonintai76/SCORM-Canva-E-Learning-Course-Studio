import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCourseStore, globalCourseStore } from '../../store/courseStore';
import { CanvasNode, NodeType, TextNode, AssetItem } from '../../types/schema';
import { TypographyPreset } from '../../data/typographyData';
import { ComponentTemplateItem } from '../../data/componentTemplatesData';
import { calculateSnapping, snapValueToGrid, SnapGuide, NodeBounds } from '../../utils/snappingEngine';
import { validateQuizConfig } from '../../utils/quizValidator';
import { CanvasContextMenu } from './CanvasContextMenu';
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
  Volume2,
  Sparkles,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  GripVertical,
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
  hasPushedUndo?: boolean;
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
    gridColor,
    zoom,
    pan,
    showRulers,
    showGuides,
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
    moveUp,
    moveDown,
    alignSelected,
    addNode,
    applySlideLayout,
    updateActivePage,
    addCustomAsset,
    undo,
    redo,
    pushUndo,
  } = useCourseStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [toolMode, setToolMode] = useState<'select' | 'pan'>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [snapLineX, setSnapLineX] = useState<number | null>(null);
  const [snapLineY, setSnapLineY] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverKind, setDragOverKind] = useState<
    'node' | 'layout' | 'asset' | 'typography' | 'quiz' | 'component' | 'file'
  >('node');
  const [dragCoord, setDragCoord] = useState<{ x: number; y: number } | null>(null);
  const [layoutToast, setLayoutToast] = useState<string | null>(null);
  const [smartGuidesX, setSmartGuidesX] = useState<SnapGuide[]>([]);
  const [smartGuidesY, setSmartGuidesY] = useState<SnapGuide[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetNodeId?: string;
  } | null>(null);
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
        if (selectedNodeIds.length > 0 && currentPage) {
          e.preventDefault();
          selectedNodeIds.forEach((id) => {
            const node = currentPage.nodes.find((n) => n.id === id);
            if (node && !node.isLocked) {
              deleteNode(id);
            }
          });
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupNodes();
        } else {
          groupNodes();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        if (selectedNodeId && currentPage) {
          const node = currentPage.nodes.find((n) => n.id === selectedNodeId);
          if (node && !node.isLocked) {
            e.preventDefault();
            duplicateNode(selectedNodeId);
          }
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
            if (node && !node.isLocked) {
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
    if (contextMenu) {
      setContextMenu(null);
    }
    if (e.button === 2) {
      return;
    }

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
    if (contextMenu) {
      setContextMenu(null);
    }

    if (toolMode === 'pan' || isSpacePressed || e.button === 1 || e.button === 2) {
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

  // Pointer Down on Multi-Selection Frame (bulk move all selected elements)
  const handleMultiSelectionPointerDown = (e: React.PointerEvent) => {
    if (contextMenu) {
      setContextMenu(null);
    }
    if (toolMode === 'pan' || isSpacePressed || e.button === 1 || e.button === 2) {
      return;
    }
    e.stopPropagation();

    if (!currentPage || selectedNodeIds.length === 0) return;

    const initialNodesMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    currentPage.nodes.forEach((n) => {
      if (selectedNodeIds.includes(n.id) && !n.isLocked) {
        initialNodesMap[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
      }
    });

    const firstNode = currentPage.nodes.find((n) => selectedNodeIds.includes(n.id));
    if (!firstNode) return;

    setDragState({
      type: 'move',
      nodeId: firstNode.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: firstNode.x,
      initialY: firstNode.y,
      initialWidth: firstNode.width,
      initialHeight: firstNode.height,
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

  // Node Right-Click Context Menu
  const handleNodeContextMenu = (e: React.MouseEvent, node: CanvasNode) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the node if it wasn't already in selectedNodeIds
    if (!selectedNodeIds.includes(node.id)) {
      setSelectedNodeId(node.id);
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetNodeId: node.id,
    });
  };

  // Canvas Stage Right-Click Context Menu
  const handleStageContextMenu = (e: React.MouseEvent) => {
    if (selectedNodeIds.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        targetNodeId: selectedNodeId || selectedNodeIds[0],
      });
    } else {
      setContextMenu(null);
    }
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

      // On first significant pointer movement, push an undo state before moving or resizing
      if (
        !dragState.hasPushedUndo &&
        (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) &&
        (dragState.type === 'move' || dragState.type === 'resize')
      ) {
        dragState.hasPushedUndo = true;
        pushUndo();
      }

      if (dragState.type === 'move') {
        const curW = dragState.initialWidth || 40;
        const curH = dragState.initialHeight || 40;

        const otherNodes: NodeBounds[] = (currentPage.nodes || [])
          .filter((n) => !selectedNodeIds.includes(n.id))
          .map((n) => ({
            id: n.id,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            type: n.type,
          }));

        const snapResult = calculateSnapping(
          dragState.initialX + deltaX,
          dragState.initialY + deltaY,
          curW,
          curH,
          otherNodes,
          canvasWidth,
          canvasHeight,
          gridSize,
          isSnapToGridEnabled
        );

        const newX = snapResult.x;
        const newY = snapResult.y;

        setSmartGuidesX(snapResult.guidesX);
        setSmartGuidesY(snapResult.guidesY);

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
          if (isSnapToGridEnabled) {
            const snappedRight = snapValueToGrid(dragState.initialX + newW, gridSize).val;
            newW = Math.max(MIN_SIZE, snappedRight - dragState.initialX);
          }
        }
        if (dragState.resizeHandle.includes('s')) {
          newH = Math.max(MIN_SIZE, (dragState.initialHeight || 40) + deltaY);
          if (isSnapToGridEnabled) {
            const snappedBottom = snapValueToGrid(dragState.initialY + newH, gridSize).val;
            newH = Math.max(MIN_SIZE, snappedBottom - dragState.initialY);
          }
        }
        if (dragState.resizeHandle.includes('w')) {
          const maxDeltaW = (dragState.initialWidth || 40) - MIN_SIZE;
          const appliedDelta = Math.min(deltaX, maxDeltaW);
          let targetX = dragState.initialX + appliedDelta;
          if (isSnapToGridEnabled) {
            targetX = snapValueToGrid(targetX, gridSize).val;
          }
          newW = (dragState.initialX + (dragState.initialWidth || 40)) - targetX;
          newX = targetX;
        }
        if (dragState.resizeHandle.includes('n')) {
          const maxDeltaH = (dragState.initialHeight || 40) - MIN_SIZE;
          const appliedDelta = Math.min(deltaY, maxDeltaH);
          let targetY = dragState.initialY + appliedDelta;
          if (isSnapToGridEnabled) {
            targetY = snapValueToGrid(targetY, gridSize).val;
          }
          newH = (dragState.initialY + (dragState.initialHeight || 40)) - targetY;
          newY = targetY;
        }

        updateNode(
          dragState.nodeId,
          {
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          },
          false
        );
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
      pushUndo,
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

    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const currentX = Math.round((e.clientX - rect.left) / zoom);
      const currentY = Math.round((e.clientY - rect.top) / zoom);
      setDragCoord({
        x: Math.max(0, Math.min(canvasWidth, currentX)),
        y: Math.max(0, Math.min(canvasHeight, currentY)),
      });
    }

    const hasLayout = e.dataTransfer.types.includes('application/scorm-slide-layout');
    const hasAsset = e.dataTransfer.types.includes('application/scorm-asset');
    const hasTypography = e.dataTransfer.types.includes('application/scorm-typography');
    const hasQuiz = e.dataTransfer.types.includes('application/scorm-quiz-template');
    const hasComponent = e.dataTransfer.types.includes('application/scorm-component-template');
    const hasFiles =
      e.dataTransfer.types.includes('Files') ||
      (e.dataTransfer.items && Array.from(e.dataTransfer.items).some((item) => item.kind === 'file'));

    if (hasLayout) setDragOverKind('layout');
    else if (hasComponent) setDragOverKind('component');
    else if (hasAsset) setDragOverKind('asset');
    else if (hasTypography) setDragOverKind('typography');
    else if (hasQuiz) setDragOverKind('quiz');
    else if (hasFiles) setDragOverKind('file');
    else setDragOverKind('node');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target || !containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDragCoord(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragCoord(null);

    if (!stageRef.current || !currentPage) return;

    // Calculate drop coordinates relative to slide canvas accounting for zoom & offset
    const rect = stageRef.current.getBoundingClientRect();
    const rawX = Math.round((e.clientX - rect.left) / zoom);
    const rawY = Math.round((e.clientY - rect.top) / zoom);
    let dropX = Math.max(0, Math.min(canvasWidth, rawX));
    let dropY = Math.max(0, Math.min(canvasHeight, rawY));

    if (isSnapToGridEnabled) {
      dropX = snapValueToGrid(dropX, gridSize).val;
      dropY = snapValueToGrid(dropY, gridSize).val;
    }

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

    // 2. Check for E-Learning Component Template drop
    const compJson = e.dataTransfer.getData('application/scorm-component-template');
    if (compJson) {
      try {
        const template: ComponentTemplateItem = JSON.parse(compJson);
        const minPresetX = Math.min(...template.nodes.map((n) => n.x ?? 0));
        const minPresetY = Math.min(...template.nodes.map((n) => n.y ?? 0));

        const maxZ = currentPage.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0);

        // Center template around drop position
        const targetX = Math.max(10, Math.min(canvasWidth - 50, Math.round(dropX - template.width / 2)));
        const targetY = Math.max(10, Math.min(canvasHeight - 30, Math.round(dropY - template.height / 2)));

        const offsetNodes = template.nodes.map((node, i) => {
          const relativeX = (node.x ?? 0) - minPresetX;
          const relativeY = (node.y ?? 0) - minPresetY;
          let finalX = Math.max(10, Math.min(canvasWidth - 20, targetX + relativeX));
          let finalY = Math.max(10, Math.min(canvasHeight - 20, targetY + relativeY));

          if (isSnapToGridEnabled) {
            finalX = snapValueToGrid(finalX, gridSize).val;
            finalY = snapValueToGrid(finalY, gridSize).val;
          }

          return {
            ...node,
            id: `${node.type}_comp_${Math.random().toString(36).substring(2, 9)}`,
            x: Math.round(finalX),
            y: Math.round(finalY),
            zIndex: maxZ + i + 1,
          } as CanvasNode;
        });

        pushUndo(`Applied "${template.name}" component`);
        updateActivePage({
          nodes: [...currentPage.nodes, ...offsetNodes],
        });

        setLayoutToast(`Added "${template.name}" component to slide!`);
        setTimeout(() => setLayoutToast(null), 2500);
        return;
      } catch (err) {
        console.error('Failed to parse dropped component template:', err);
      }
    }

    // 2. Check for Asset Library drop (Image / Shape / Icon)
    const assetJson = e.dataTransfer.getData('application/scorm-asset');
    if (assetJson) {
      try {
        const asset: AssetItem = JSON.parse(assetJson);
        const targetW =
          asset.width || (asset.type === 'image' ? 320 : asset.type === 'shape' ? 240 : 120);
        const targetH =
          asset.height || (asset.type === 'image' ? 220 : asset.type === 'shape' ? 140 : 120);

        let posX = Math.max(10, Math.min(canvasWidth - targetW - 10, Math.round(dropX - targetW / 2)));
        let posY = Math.max(10, Math.min(canvasHeight - targetH - 10, Math.round(dropY - targetH / 2)));

        if (isSnapToGridEnabled) {
          posX = snapValueToGrid(posX, gridSize).val;
          posY = snapValueToGrid(posY, gridSize).val;
        }

        if (asset.type === 'image') {
          addNode(
            'image',
            { x: posX, y: posY },
            {
              alt: asset.name,
              url:
                asset.url ||
                'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
              width: targetW,
              height: targetH,
            }
          );
        } else if (asset.type === 'shape') {
          const mappedShapeType: 'circle' | 'badge' | 'rect' =
            asset.shapeType === 'circle'
              ? 'circle'
              : asset.shapeType === 'badge'
              ? 'badge'
              : 'rect';
          addNode(
            'shape',
            { x: posX, y: posY },
            {
              shapeType: mappedShapeType,
              fill: asset.color || '#3b82f6',
              borderRadius:
                asset.shapeType === 'circle' ? 9999 : asset.shapeType === 'badge' ? 12 : 8,
              width: targetW,
              height: targetH,
            }
          );
        } else {
          // Icon or badge
          addNode(
            'shape',
            { x: posX, y: posY },
            {
              shapeType: 'rounded-rect',
              fill: `${asset.color || '#38bdf8'}20`,
              stroke: asset.color || '#38bdf8',
              strokeWidth: 2,
              borderRadius: 12,
              width: targetW,
              height: targetH,
            }
          );
        }

        setLayoutToast(`Added "${asset.name}" asset to slide!`);
        setTimeout(() => setLayoutToast(null), 2500);
        return;
      } catch (err) {
        console.error('Failed to parse dropped asset:', err);
      }
    }

    // 3. Check for Typography Preset drop
    const typoJson = e.dataTransfer.getData('application/scorm-typography');
    if (typoJson) {
      try {
        const preset: TypographyPreset = JSON.parse(typoJson);
        const minPresetX = Math.min(...preset.nodes.map((n) => n.x ?? 0));
        const minPresetY = Math.min(...preset.nodes.map((n) => n.y ?? 0));

        const maxZ = currentPage.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0);
        const offsetNodes = preset.nodes.map((node, i) => {
          const relativeX = (node.x ?? 0) - minPresetX;
          const relativeY = (node.y ?? 0) - minPresetY;
          let finalX = Math.max(10, Math.min(canvasWidth - (node.width || 200) - 10, dropX + relativeX));
          let finalY = Math.max(10, Math.min(canvasHeight - (node.height || 60) - 10, dropY + relativeY));

          if (isSnapToGridEnabled) {
            finalX = snapValueToGrid(finalX, gridSize).val;
            finalY = snapValueToGrid(finalY, gridSize).val;
          }

          return {
            ...node,
            id: `${node.type}_typo_${Math.random().toString(36).substring(2, 9)}`,
            x: Math.round(finalX),
            y: Math.round(finalY),
            zIndex: maxZ + i + 1,
          } as CanvasNode;
        });

        pushUndo(`Applied "${preset.name}" typography`);
        updateActivePage({
          nodes: [...currentPage.nodes, ...offsetNodes],
        });

        setLayoutToast(`Applied "${preset.name}" typography preset!`);
        setTimeout(() => setLayoutToast(null), 2500);
        return;
      } catch (err) {
        console.error('Failed to parse dropped typography preset:', err);
      }
    }

    // 4. Check for Quiz Template drop with validation
    const quizTemplateJson = e.dataTransfer.getData('application/scorm-quiz-template');
    if (quizTemplateJson) {
      try {
        const tmpl = JSON.parse(quizTemplateJson);
        const validation = validateQuizConfig(tmpl);
        if (!validation.isValid) {
          setLayoutToast(
            `Quiz validation error: ${validation.errors[0]?.message || 'Invalid configuration'}`
          );
          setTimeout(() => setLayoutToast(null), 3500);
          return;
        }

        const targetW = 680;
        const targetH = 340;
        let posX = Math.max(20, Math.min(canvasWidth - targetW - 20, Math.round(dropX - targetW / 2)));
        let posY = Math.max(20, Math.min(canvasHeight - targetH - 20, Math.round(dropY - targetH / 2)));

        if (isSnapToGridEnabled) {
          posX = snapValueToGrid(posX, gridSize).val;
          posY = snapValueToGrid(posY, gridSize).val;
        }

        addNode(
          'quiz',
          { x: posX, y: posY },
          {
            quizType: tmpl.type,
            question: tmpl.question,
            options: (tmpl.options || []).map((opt: any) => ({
              ...opt,
              id: 'opt_' + Math.random().toString(36).substring(2, 7),
            })),
            points: tmpl.points || 20,
            showFeedbackImmediately: true,
            themeColor: tmpl.accentColor || '#2563eb',
            width: targetW,
            height: targetH,
            quizLogic: {
              onPass: 'next_slide',
              onFail: 'retry',
              correctFeedback: 'Excellent work! You answered correctly.',
              incorrectFeedback: 'Review the guidance and try again.',
            },
          } as CanvasNode
        );

        setLayoutToast(`Added verified "${tmpl.name}" quiz!`);
        setTimeout(() => setLayoutToast(null), 2500);
        return;
      } catch (err) {
        console.error('Failed to parse dropped quiz template:', err);
      }
    }

    // 5. Check for Native Desktop Image File drops
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const imgWidth = 360;
          const imgHeight = 240;
          let posX = Math.max(20, Math.min(canvasWidth - imgWidth - 20, Math.round(dropX - imgWidth / 2)));
          let posY = Math.max(20, Math.min(canvasHeight - imgHeight - 20, Math.round(dropY - imgHeight / 2)));

          if (isSnapToGridEnabled) {
            posX = snapValueToGrid(posX, gridSize).val;
            posY = snapValueToGrid(posY, gridSize).val;
          }

          const assetName = file.name.replace(/\.[^/.]+$/, '');
          addNode(
            'image',
            { x: posX, y: posY },
            {
              alt: assetName,
              url: dataUrl,
              width: imgWidth,
              height: imgHeight,
            }
          );

          addCustomAsset({
            id: 'custom_asset_' + Date.now(),
            name: assetName,
            category: 'images',
            type: 'image',
            url: dataUrl,
            width: imgWidth,
            height: imgHeight,
            tags: ['desktop-upload', 'dropped'],
            isCustom: true,
          });

          setLayoutToast(`Uploaded & added "${file.name}" to canvas!`);
          setTimeout(() => setLayoutToast(null), 2500);
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // 6. Check for Single Node drop (standard Elements)
    const nodeType = (e.dataTransfer.getData('application/scorm-node-type') ||
      e.dataTransfer.getData('text/plain')) as NodeType;

    if (nodeType) {
      const defaultW =
        nodeType === 'quiz'
          ? 640
          : nodeType === 'callout'
          ? 380
          : nodeType === 'image'
          ? 320
          : nodeType === 'shape'
          ? 240
          : 280;
      const defaultH =
        nodeType === 'quiz'
          ? 320
          : nodeType === 'callout'
          ? 120
          : nodeType === 'image'
          ? 200
          : nodeType === 'shape'
          ? 160
          : 70;

      let posX = Math.max(10, Math.min(canvasWidth - defaultW - 10, Math.round(dropX - defaultW / 2)));
      let posY = Math.max(10, Math.min(canvasHeight - defaultH - 10, Math.round(dropY - defaultH / 2)));

      if (isSnapToGridEnabled) {
        posX = snapValueToGrid(posX, gridSize).val;
        posY = snapValueToGrid(posY, gridSize).val;
      }

      addNode(nodeType, { x: posX, y: posY });
      setLayoutToast(`Added ${nodeType.toUpperCase()} element to slide!`);
      setTimeout(() => setLayoutToast(null), 2000);
      return;
    }
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

      {/* Multi-Selection Surface Toolbar (Appears when 2+ elements are selected) */}
      {isMultiSelection && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/98 backdrop-blur-md border border-slate-700/90 rounded-xl px-3 py-1.5 shadow-2xl flex items-center gap-2 text-xs text-white animate-in fade-in slide-in-from-top-2 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 border-r border-slate-700/80 pr-2.5">
            <Boxes className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{selectedNodes.length} Selected</span>
          </div>

          <div className="flex items-center gap-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden sm:inline">Align:</span>
            <button
              onClick={() => alignSelected('left')}
              title="Align Left Edges"
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <AlignLeft className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline font-medium">Left</span>
            </button>
            <button
              onClick={() => alignSelected('center-h')}
              title="Align Center Horizontally"
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline font-medium">Center</span>
            </button>
            <button
              onClick={() => alignSelected('right')}
              title="Align Right Edges"
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <AlignRight className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline font-medium">Right</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-1" />

            <button
              onClick={() => alignSelected('top')}
              title="Align Top Edges"
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <AlignStartVertical className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline font-medium">Top</span>
            </button>
            <button
              onClick={() => alignSelected('center-v')}
              title="Align Middle (Vertical Center)"
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <AlignCenterVertical className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline font-medium">Middle</span>
            </button>
            <button
              onClick={() => alignSelected('bottom')}
              title="Align Bottom Edges"
              className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <AlignEndVertical className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline font-medium">Bottom</span>
            </button>
          </div>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          <div className="flex items-center gap-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden sm:inline">Space:</span>
            <button
              onClick={() => alignSelected('distribute-h')}
              disabled={selectedNodes.length < 3}
              title={selectedNodes.length >= 3 ? 'Distribute Horizontally (Even Spacing)' : 'Requires 3+ elements to distribute'}
              className="p-1.5 hover:bg-slate-800 text-cyan-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] disabled:opacity-35 disabled:pointer-events-none"
            >
              <AlignHorizontalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline font-medium">Distribute H</span>
            </button>
            <button
              onClick={() => alignSelected('distribute-v')}
              disabled={selectedNodes.length < 3}
              title={selectedNodes.length >= 3 ? 'Distribute Vertically (Even Spacing)' : 'Requires 3+ elements to distribute'}
              className="p-1.5 hover:bg-slate-800 text-cyan-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] disabled:opacity-35 disabled:pointer-events-none"
            >
              <AlignVerticalDistributeCenter className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline font-medium">Distribute V</span>
            </button>
          </div>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          {/* Group / Ungroup Toggle */}
          {!isSelectedGrouped ? (
            <button
              onClick={() => groupNodes()}
              title="Group selected elements (Ctrl+G)"
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Group</span>
            </button>
          ) : (
            <button
              onClick={() => ungroupNodes()}
              title="Ungroup elements (Ctrl+Shift+G)"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5 text-amber-400" />
              <span>Ungroup</span>
            </button>
          )}

          {/* Bulk Delete */}
          <button
            onClick={() => {
              selectedNodeIds.forEach((id) => deleteNode(id));
            }}
            title="Delete Selected Elements (Del)"
            className="p-1.5 hover:bg-rose-950/80 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
        onContextMenu={handleStageContextMenu}
      >
        {/* Horizontal Canvas Ruler (Top Edge) */}
        {showRulers && (
          <>
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
          </>
        )}

        {/* Smart Guide Alignment Lines Overlay */}
        {showGuides &&
          smartGuidesX.map((guide, idx) => {
            const isPage = guide.type === 'page-edge' || guide.type === 'page-center';
            const isGrid = guide.type === 'grid';
            return (
              <div
                key={`sg_x_${idx}_${guide.val}_${guide.type}`}
                className={`absolute top-0 bottom-0 pointer-events-none z-50 animate-in fade-in duration-75 ${
                  isGrid
                    ? 'w-[1.5px] border-l border-dashed border-sky-400 opacity-90'
                    : isPage
                    ? 'w-[1.5px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                    : 'w-[1.5px] bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]'
                }`}
                style={{ left: `${guide.val}px` }}
              >
                <div
                  className={`absolute top-1 left-1 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-lg backdrop-blur-xs flex items-center gap-1 whitespace-nowrap ${
                    isGrid
                      ? 'bg-slate-900/95 text-sky-300 border border-sky-500/50'
                      : isPage
                      ? 'bg-cyan-950/95 text-cyan-200 border border-cyan-500/60'
                      : 'bg-fuchsia-950/95 text-fuchsia-200 border border-fuchsia-500/60'
                  }`}
                >
                  <span>{guide.label}</span>
                  <span className={isGrid ? 'text-sky-400' : isPage ? 'text-cyan-400' : 'text-fuchsia-400'}>
                    ({guide.val}px)
                  </span>
                </div>
              </div>
            );
          })}
        {showGuides &&
          smartGuidesY.map((guide, idx) => {
            const isPage = guide.type === 'page-edge' || guide.type === 'page-center';
            const isGrid = guide.type === 'grid';
            return (
              <div
                key={`sg_y_${idx}_${guide.val}_${guide.type}`}
                className={`absolute left-0 right-0 pointer-events-none z-50 animate-in fade-in duration-75 ${
                  isGrid
                    ? 'h-[1.5px] border-t border-dashed border-sky-400 opacity-90'
                    : isPage
                    ? 'h-[1.5px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                    : 'h-[1.5px] bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]'
                }`}
                style={{ top: `${guide.val}px` }}
              >
                <div
                  className={`absolute top-1 left-1 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-lg backdrop-blur-xs flex items-center gap-1 whitespace-nowrap ${
                    isGrid
                      ? 'bg-slate-900/95 text-sky-300 border border-sky-500/50'
                      : isPage
                      ? 'bg-cyan-950/95 text-cyan-200 border border-cyan-500/60'
                      : 'bg-fuchsia-950/95 text-fuchsia-200 border border-fuchsia-500/60'
                  }`}
                >
                  <span>{guide.label}</span>
                  <span className={isGrid ? 'text-sky-400' : isPage ? 'text-cyan-400' : 'text-fuchsia-400'}>
                    ({guide.val}px)
                  </span>
                </div>
              </div>
            );
          })}

        {/* Visual Audio Waveform on Canvas */}
        {currentPage.audioNarration && (
          <div className="absolute bottom-3 right-3 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2.5 z-30 pointer-events-auto">
            <div className="w-7 h-7 rounded-lg bg-cyan-600/25 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-200 flex items-center gap-1.5">
                <span className="truncate max-w-[110px]">{currentPage.audioNarration.name || 'Slide Audio'}</span>
                <span className="text-cyan-400 font-mono">~{currentPage.audioNarration.duration || 5}s</span>
              </div>
              <div className="flex items-end gap-[2px] h-3 mt-1">
                {(currentPage.audioNarration.waveform || [40, 70, 50, 90, 60, 80, 100, 45, 75, 95, 35, 65, 85, 55, 70, 90, 40, 60]).slice(0, 18).map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-cyan-400 rounded-t-[1px] animate-pulse"
                    style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Marquee Lasso Selection Overlay */}
        {marqueeState && (
          <div
            className="absolute border-2 border-dashed border-sky-400 bg-sky-500/15 ring-2 ring-sky-400/20 shadow-[0_0_15px_rgba(56,189,248,0.3)] z-50 pointer-events-none rounded-[2px]"
            style={{
              left: `${Math.min(marqueeState.startX, marqueeState.currentX)}px`,
              top: `${Math.min(marqueeState.startY, marqueeState.currentY)}px`,
              width: `${Math.abs(marqueeState.currentX - marqueeState.startX)}px`,
              height: `${Math.abs(marqueeState.currentY - marqueeState.startY)}px`,
            }}
          >
            {/* Live Marquee Dimensions & Element Count Badge */}
            <div className="absolute -top-7 left-0 bg-slate-900/95 border border-sky-500/70 text-sky-200 text-[10px] font-mono px-2 py-0.5 rounded shadow-xl flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
              <span className="font-bold text-white">
                {Math.round(Math.abs(marqueeState.currentX - marqueeState.startX))} ×{' '}
                {Math.round(Math.abs(marqueeState.currentY - marqueeState.startY))}px
              </span>
              <span className="text-sky-400 font-bold">•</span>
              <span className="text-sky-300">
                {selectedNodeIds.length} Element{selectedNodeIds.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
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

        {/* Multi-Selection Group Bounding Box Overlay & Bulk Toolbar */}
        {groupBounds && (
          <div
            className="absolute border-2 border-dashed border-sky-400 ring-2 ring-sky-400/25 shadow-[0_0_16px_rgba(56,189,248,0.4)] bg-sky-500/10 pointer-events-auto z-40 rounded cursor-move group"
            style={{
              left: `${groupBounds.minX - 6}px`,
              top: `${groupBounds.minY - 6}px`,
              width: `${groupBounds.maxX - groupBounds.minX + 12}px`,
              height: `${groupBounds.maxY - groupBounds.minY + 12}px`,
            }}
            onPointerDown={handleMultiSelectionPointerDown}
          >
            {/* Floating Multi-Selection Action HUD Toolbar */}
            <div
              className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/98 backdrop-blur-md text-white px-2.5 py-1 rounded-xl border border-slate-700/90 shadow-2xl flex items-center gap-1.5 pointer-events-auto text-xs select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-sky-300 px-1 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5 text-slate-500" />
                <span>{selectedNodes.length} Selected</span>
              </div>

              <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

              {/* Group / Ungroup Button */}
              {!isSelectedGrouped ? (
                <button
                  onClick={() => groupNodes()}
                  title="Group selected elements (Ctrl+G)"
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Group</span>
                </button>
              ) : (
                <button
                  onClick={() => ungroupNodes()}
                  title="Ungroup elements (Ctrl+Shift+G)"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ungroup</span>
                </button>
              )}

              <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

              {/* Quick Alignment Controls */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => alignSelected('left')}
                  title="Align Left Edges"
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignSelected('center-h')}
                  title="Align Horizontal Center"
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <AlignCenterHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignSelected('right')}
                  title="Align Right Edges"
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignSelected('top')}
                  title="Align Top Edges"
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <AlignStartVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignSelected('center-v')}
                  title="Align Vertical Center"
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <AlignCenterVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alignSelected('bottom')}
                  title="Align Bottom Edges"
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <AlignEndVertical className="w-3.5 h-3.5" />
                </button>

                {selectedNodes.length >= 3 && (
                  <>
                    <button
                      onClick={() => alignSelected('distribute-h')}
                      title="Distribute Horizontally"
                      className="p-1 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded transition-colors cursor-pointer"
                    >
                      <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => alignSelected('distribute-v')}
                      title="Distribute Vertically"
                      className="p-1 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded transition-colors cursor-pointer"
                    >
                      <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

              {/* Bulk Delete Button */}
              <button
                onClick={() => {
                  selectedNodeIds.forEach((id) => deleteNode(id));
                }}
                title="Delete Selected Elements (Del)"
                className="p-1 hover:bg-rose-950/80 rounded text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
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
                display: node.isHidden ? 'none' : 'block',
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
              onContextMenu={(e) => handleNodeContextMenu(e, node)}
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

              {/* Active Selection Dashed Border Highlight Effect */}
              {isSelected && (
                <>
                  <div
                    className={`absolute -inset-[2px] border-2 border-dashed ${
                      node.isLocked
                        ? 'border-amber-400 ring-2 ring-amber-400/25 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                        : isPrimarySelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                        : 'border-sky-400 ring-2 ring-sky-400/25 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                    } pointer-events-none rounded-[3px] transition-all`}
                  />

                  {/* Active Selection Dimensions & Type Badge */}
                  <div
                    className={`absolute -bottom-6 left-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shadow-md pointer-events-none z-50 flex items-center gap-1.5 ${
                      node.isLocked
                        ? 'bg-amber-950/95 text-amber-200 border border-amber-500/60'
                        : 'bg-slate-900/95 text-sky-300 border border-slate-700/80'
                    }`}
                  >
                    <span className="uppercase text-[9px] font-bold text-slate-400">{node.type}</span>
                    <span className="text-slate-600">•</span>
                    <span>{Math.round(node.width)}×{Math.round(node.height)}px</span>
                  </div>

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

        {/* High-Fidelity Drag-and-Drop Drop Zone Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 pointer-events-none rounded-lg border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center transition-all animate-in fade-in duration-150">
            <div className="bg-slate-900/95 border border-blue-500/80 shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-3 text-white">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Drop to Insert {dragOverKind.toUpperCase()}</span>
                  {dragCoord && (
                    <span className="font-mono text-[10px] text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                      X: {dragCoord.x}px • Y: {dragCoord.y}px
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  Places element directly at cursor drop location on canvas
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Layout & Asset Action Toast */}
      {layoutToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-blue-500/80 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-medium">{layoutToast}</span>
        </div>
      )}

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

      {/* Right-Click Canvas Context Menu */}
      {contextMenu?.visible && currentPage && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetNode={
            currentPage.nodes.find((n) => n.id === contextMenu.targetNodeId) ||
            currentPage.nodes.find((n) => n.id === selectedNodeId) ||
            null
          }
          selectedNodes={
            selectedNodeIds.length > 0
              ? currentPage.nodes.filter((n) => selectedNodeIds.includes(n.id))
              : contextMenu.targetNodeId
              ? currentPage.nodes.filter((n) => n.id === contextMenu.targetNodeId)
              : []
          }
          onClose={() => setContextMenu(null)}
          onBringToFront={() => {
            const id = contextMenu.targetNodeId || selectedNodeId;
            if (id) bringToFront(id);
          }}
          onSendToBack={() => {
            const id = contextMenu.targetNodeId || selectedNodeId;
            if (id) sendToBack(id);
          }}
          onMoveUp={() => {
            const id = contextMenu.targetNodeId || selectedNodeId;
            if (id) moveUp(id);
          }}
          onMoveDown={() => {
            const id = contextMenu.targetNodeId || selectedNodeId;
            if (id) moveDown(id);
          }}
          onDuplicate={() => {
            if (selectedNodeIds.length > 1) {
              selectedNodeIds.forEach((id) => duplicateNode(id));
            } else {
              const id = contextMenu.targetNodeId || selectedNodeId;
              if (id) duplicateNode(id);
            }
          }}
          onGroup={() => groupNodes()}
          onUngroup={() => ungroupNodes()}
          onToggleLock={() => {
            const id = contextMenu.targetNodeId || selectedNodeId;
            if (id) toggleLockNode(id);
          }}
          onDelete={() => {
            if (selectedNodeIds.length > 0) {
              selectedNodeIds.forEach((id) => deleteNode(id));
            } else if (contextMenu.targetNodeId) {
              deleteNode(contextMenu.targetNodeId);
            }
          }}
          onAlign={(type) => alignSelected(type)}
        />
      )}
    </div>
  );
};
