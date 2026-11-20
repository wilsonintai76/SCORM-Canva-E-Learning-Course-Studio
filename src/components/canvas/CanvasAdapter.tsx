import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCourseStore, globalCourseStore } from '../../store/courseStore';
import { CanvasNode, NodeType, TextNode, AssetItem, CanvasGuide } from '../../types/schema';
import { TypographyPreset } from '../../data/typographyData';
import { ComponentTemplateItem } from '../../data/componentTemplatesData';
import {
  calculateSnapping,
  snapValueToGrid,
  computeCompositeBounds,
  SnapGuide,
  NodeBounds,
} from '../../utils/snappingEngine';
import { validateQuizConfig } from '../../utils/quizValidator';
import { CanvasContextMenu } from './CanvasContextMenu';
import { TextNodeRenderer } from './renderers/TextNodeRenderer';
import { ImageNodeRenderer } from './renderers/ImageNodeRenderer';
import { QuizNodeRenderer } from './renderers/QuizNodeRenderer';
import { ShapeNodeRenderer } from './renderers/ShapeNodeRenderer';
import { CalloutNodeRenderer } from './renderers/CalloutNodeRenderer';
import { TimelineDrawer } from '../timeline/TimelineDrawer';
import { SpeakerNotesDrawer } from './SpeakerNotesDrawer';
import { SelectionManagerDrawer } from './SelectionManagerDrawer';
import { evaluateNodeAnimationAtTime } from '../../utils/animationTimeline';
import {
  clampHudPosition,
  loadSavedHudPositions,
  saveHudPositions,
  HudPositionsState,
} from '../../utils/hudPosition';
import {
  computeResizedBounds,
  computeMovedPositions,
  ResizeHandle,
} from '../../utils/canvasTransform';
import {
  Zap,
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
  FolderHeart,
  BookmarkPlus,
  X,
  Ruler,
  Eye,
  EyeOff,
  MessageSquare,
  Check,
  ChevronLeft,
  Magnet,
  CornerUpLeft,
  Focus,
} from 'lucide-react';

interface DragState {
  type: 'move' | 'resize' | 'pan' | 'group-resize';
  nodeId?: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth?: number;
  initialHeight?: number;
  resizeHandle?: ResizeHandle;
  initialPanX?: number;
  initialPanY?: number;
  initialNodesMap?: Record<string, { x: number; y: number; width: number; height: number }>;
  targetGroupNodeIds?: string[];
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
    deepSelectedNodeId,
    deepSelectedGroupId,
    isSnapToGridEnabled,
    isSmartGuidesEnabled,
    gridSize,
    gridColor,
    zoom,
    pan,
    showRulers,
    showGuides,
    setShowRulers,
    setShowGuides,
    setSnapToGrid,
    setSmartGuidesEnabled,
    setIsGridSettingsModalOpen,
    addGuide,
    updateGuide,
    deleteGuide,
    clearAllGuides,
    toggleLockGuide,
    addPresetGuides,
    setZoom,
    setPan,
    resetView,
    setSelectedNodeId,
    deepSelectNode,
    exitDeepSelect,
    setSelectedNodeIds,
    toggleNodeSelection,
    groupNodes,
    ungroupNodes,
    transformGroup,
    scaleGroup,
    saveSelectionToMyAssets,
    addMyAssetToCanvas,
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
    commitUndo,
    addComment,
    activeCommentMode,
    setActiveCommentMode,
    showVariablePreview,
  } = useCourseStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const didDragMoveRef = useRef(false);

  const [toolMode, setToolMode] = useState<'select' | 'pan'>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggingGuide, setDraggingGuide] = useState<{
    id?: string;
    orientation: 'horizontal' | 'vertical';
    position: number;
    isNew: boolean;
  } | null>(null);
  const [hoveredGuideId, setHoveredGuideId] = useState<string | null>(null);
  const [mousePosOnCanvas, setMousePosOnCanvas] = useState<{ x: number; y: number } | null>(null);
  const [isRulerMenuOpen, setIsRulerMenuOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isSelectionDrawerOpen, setIsSelectionDrawerOpen] = useState(false);
  const [isSaveResourcePopoverOpen, setIsSaveResourcePopoverOpen] = useState(false);
  const [saveResourceName, setSaveResourceName] = useState('');
  const [saveResourceCategory, setSaveResourceCategory] = useState<
    'patterns' | 'shapes' | 'icons' | 'cards' | 'groups'
  >('patterns');
  const [liveScrubTime, setLiveScrubTime] = useState<number | null>(null);
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

  const topHudRef = useRef<HTMLDivElement>(null);
  const zoomHudRef = useRef<HTMLDivElement>(null);
  const [hudPositions, setHudPositions] = useState<HudPositionsState>(() => loadSavedHudPositions());
  const [draggingHud, setDraggingHud] = useState<{
    target: 'topToolbar' | 'zoomHud';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hudWidth: number;
    hudHeight: number;
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
      } else if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsTimelineOpen((prev) => !prev);
      } else if (e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsSelectionDrawerOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(Math.min(2.0, globalCourseStore.getState().zoom + 0.1));
      } else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        setZoom(Math.max(0.4, globalCourseStore.getState().zoom - 0.1));
      } else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        resetView();
      } else if (e.key === 'Escape') {
        if (deepSelectedNodeId) {
          e.preventDefault();
          exitDeepSelect();
        }
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
    deepSelectedNodeId,
    currentPage,
    isSnapToGridEnabled,
    gridSize,
    deleteNode,
    duplicateNode,
    groupNodes,
    ungroupNodes,
    exitDeepSelect,
    undo,
    redo,
    updateNode,
  ]);

  // Window pointer listeners for magnetic guide creation and repositioning
  useEffect(() => {
    if (!draggingGuide) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      if (draggingGuide.orientation === 'horizontal') {
        let curY = Math.round((e.clientY - rect.top) / zoom);
        if (isSnapToGridEnabled) {
          curY = snapValueToGrid(curY, gridSize).val;
        }
        setDraggingGuide((prev) => (prev ? { ...prev, position: curY } : null));
      } else {
        let curX = Math.round((e.clientX - rect.left) / zoom);
        if (isSnapToGridEnabled) {
          curX = snapValueToGrid(curX, gridSize).val;
        }
        setDraggingGuide((prev) => (prev ? { ...prev, position: curX } : null));
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (!stageRef.current) {
        setDraggingGuide(null);
        return;
      }
      const rect = stageRef.current.getBoundingClientRect();
      const rawX = Math.round((e.clientX - rect.left) / zoom);
      const rawY = Math.round((e.clientY - rect.top) / zoom);

      if (draggingGuide.orientation === 'horizontal') {
        const finalY = isSnapToGridEnabled ? snapValueToGrid(rawY, gridSize).val : rawY;
        // If dropped off canvas (e.g. back into ruler or outside stage boundaries)
        if (finalY < 0 || finalY > canvasHeight) {
          if (!draggingGuide.isNew && draggingGuide.id) {
            deleteGuide(draggingGuide.id);
          }
        } else {
          if (draggingGuide.isNew) {
            addGuide('horizontal', finalY);
          } else if (draggingGuide.id) {
            updateGuide(draggingGuide.id, finalY);
          }
        }
      } else {
        const finalX = isSnapToGridEnabled ? snapValueToGrid(rawX, gridSize).val : rawX;
        if (finalX < 0 || finalX > canvasWidth) {
          if (!draggingGuide.isNew && draggingGuide.id) {
            deleteGuide(draggingGuide.id);
          }
        } else {
          if (draggingGuide.isNew) {
            addGuide('vertical', finalX);
          } else if (draggingGuide.id) {
            updateGuide(draggingGuide.id, finalX);
          }
        }
      }
      setDraggingGuide(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [
    draggingGuide,
    zoom,
    canvasWidth,
    canvasHeight,
    isSnapToGridEnabled,
    gridSize,
    addGuide,
    updateGuide,
    deleteGuide,
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
      if (activeCommentMode && stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const stageX = Math.round((e.clientX - rect.left) / zoom);
        const stageY = Math.round((e.clientY - rect.top) / zoom);
        addComment({
          pageId: currentPage.id,
          x: Math.max(10, Math.min(canvasWidth - 10, stageX)),
          y: Math.max(10, Math.min(canvasHeight - 10, stageY)),
          author: 'Instructional Reviewer',
          text: 'Feedback note on coordinate point',
          color: 'yellow',
        });
        setActiveCommentMode(false);
        return;
      }

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

  // Node Pointer Down (start moving single node, deep-selected child, or GroupedObject)
  const handleNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    if (contextMenu) {
      setContextMenu(null);
    }

    if (toolMode === 'pan' || isSpacePressed || e.button === 1 || e.button === 2) {
      return;
    }

    e.stopPropagation();
    didDragMoveRef.current = false;

    let activeSelectedIds = selectedNodeIds;
    if (e.altKey && node.groupId) {
      deepSelectNode(node.id);
      activeSelectedIds = [node.id];
    } else if (e.shiftKey) {
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
      if (activeSelectedIds.includes(n.id) && !n.isLocked) {
        initialNodesMap[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
      }
    });

    const composite = computeCompositeBounds(Object.values(initialNodesMap));

    setDragState({
      type: 'move',
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: composite ? composite.x : node.x,
      initialY: composite ? composite.y : node.y,
      initialWidth: composite ? composite.width : node.width,
      initialHeight: composite ? composite.height : node.height,
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

    const composite = computeCompositeBounds(Object.values(initialNodesMap));

    setDragState({
      type: 'move',
      nodeId: firstNode.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: composite ? composite.x : firstNode.x,
      initialY: composite ? composite.y : firstNode.y,
      initialWidth: composite ? composite.width : firstNode.width,
      initialHeight: composite ? composite.height : firstNode.height,
      initialNodesMap,
    });
  };

  // Top Ruler Pointer Down (Drag down to create horizontal magnetic guide)
  const handleTopRulerPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    let curY = Math.round((e.clientY - rect.top) / zoom);
    if (isSnapToGridEnabled) {
      curY = snapValueToGrid(curY, gridSize).val;
    }
    setDraggingGuide({
      orientation: 'horizontal',
      position: curY,
      isNew: true,
    });
  };

  // Left Ruler Pointer Down (Drag right to create vertical magnetic guide)
  const handleLeftRulerPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    let curX = Math.round((e.clientX - rect.left) / zoom);
    if (isSnapToGridEnabled) {
      curX = snapValueToGrid(curX, gridSize).val;
    }
    setDraggingGuide({
      orientation: 'vertical',
      position: curX,
      isNew: true,
    });
  };

  // Guide Pointer Down (Drag existing guide to reposition)
  const handleGuidePointerDown = (e: React.PointerEvent, guide: CanvasGuide) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (guide.isLocked) return;
    setDraggingGuide({
      id: guide.id,
      orientation: guide.orientation,
      position: guide.position,
      isNew: false,
    });
  };

  // Resize Handle Pointer Down
  const handleResizePointerDown = (
    e: React.PointerEvent,
    nodeId: string,
    handle: ResizeHandle
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (!currentPage) return;
    const node = currentPage.nodes.find((n) => n.id === nodeId);
    if (!node || node.isLocked) return;

    didDragMoveRef.current = false;
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

  // Pointer Down on Group / Parent Entity Resize Handle
  const handleGroupResizePointerDown = (
    e: React.PointerEvent,
    handle: ResizeHandle,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (!currentPage || selectedNodeIds.length === 0) return;
    if (toolMode === 'pan' || isSpacePressed) return;

    didDragMoveRef.current = false;
    const initialNodesMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    currentPage.nodes.forEach((n) => {
      if (selectedNodeIds.includes(n.id) && !n.isLocked) {
        initialNodesMap[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
      }
    });

    setDragState({
      type: 'group-resize',
      startX: e.clientX,
      startY: e.clientY,
      initialX: bounds.minX,
      initialY: bounds.minY,
      initialWidth: bounds.maxX - bounds.minX,
      initialHeight: bounds.maxY - bounds.minY,
      resizeHandle: handle,
      targetGroupNodeIds: [...selectedNodeIds],
      initialNodesMap,
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

  // Idle ruler cursor tracking inside canvas container
  const handleContainerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const curX = Math.round((e.clientX - rect.left) / zoom);
        const curY = Math.round((e.clientY - rect.top) / zoom);
        setMousePosOnCanvas({ x: curX, y: curY });
      }
    },
    [zoom]
  );

  // Active drag, resize, pan, and marquee tracking bound to window so fast drags outside bounds never stick
  const processPointerMove = useCallback(
    (e: { clientX: number; clientY: number; shiftKey: boolean }) => {
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const curX = Math.round((e.clientX - rect.left) / zoom);
        const curY = Math.round((e.clientY - rect.top) / zoom);
        setMousePosOnCanvas({ x: curX, y: curY });
      }

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

      if (!currentPage) return;
      if (dragState.type !== 'group-resize' && !dragState.nodeId) return;

      const deltaX = (e.clientX - dragState.startX) / zoom;
      const deltaY = (e.clientY - dragState.startY) / zoom;

      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        didDragMoveRef.current = true;
      }

      // On first significant pointer movement, push an undo state before moving or resizing
      if (
        !dragState.hasPushedUndo &&
        (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) &&
        (dragState.type === 'move' || dragState.type === 'resize' || dragState.type === 'group-resize')
      ) {
        dragState.hasPushedUndo = true;
        pushUndo(
          dragState.type === 'move'
            ? 'Move element'
            : dragState.type === 'group-resize'
            ? 'Transform group'
            : 'Resize element'
        );
      }

      if (dragState.type === 'move') {
        const curW = dragState.initialWidth || 40;
        const curH = dragState.initialHeight || 40;

        const movingIdSet = new Set(
          dragState.initialNodesMap
            ? Object.keys(dragState.initialNodesMap)
            : dragState.nodeId
            ? [dragState.nodeId]
            : selectedNodeIds
        );

        const otherNodes: NodeBounds[] = (currentPage.nodes || [])
          .filter((n) => !movingIdSet.has(n.id))
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
          isSnapToGridEnabled,
          8,
          showGuides ? currentPage.guides || [] : [],
          isSmartGuidesEnabled
        );

        const newX = Math.round(snapResult.x);
        const newY = Math.round(snapResult.y);

        setSmartGuidesX(snapResult.guidesX);
        setSmartGuidesY(snapResult.guidesY);

        const offsetX = newX - dragState.initialX;
        const offsetY = newY - dragState.initialY;

        if (dragState.initialNodesMap) {
          const movedPositions = computeMovedPositions(dragState.initialNodesMap, offsetX, offsetY);
          Object.entries(movedPositions).forEach(([id, pos]) => {
            updateNode(id, { x: pos.x, y: pos.y }, false);
          });
        } else if (dragState.nodeId) {
          updateNode(dragState.nodeId, { x: newX, y: newY }, false);
        }
      } else if (dragState.type === 'resize' && dragState.resizeHandle && dragState.nodeId) {
        const nextBounds = computeResizedBounds({
          initialBounds: {
            x: dragState.initialX,
            y: dragState.initialY,
            width: dragState.initialWidth || 40,
            height: dragState.initialHeight || 40,
          },
          handle: dragState.resizeHandle,
          deltaX,
          deltaY,
          minSize: 20,
          preserveAspectRatio: e.shiftKey,
          snapToGrid: isSnapToGridEnabled,
          gridSize,
        });

        // Show grid guides on resize when snap to grid is active
        if (isSnapToGridEnabled) {
          const rGuidesX: SnapGuide[] = [];
          const rGuidesY: SnapGuide[] = [];
          if (dragState.resizeHandle.includes('w')) {
            rGuidesX.push({ val: nextBounds.x, label: `Grid ${nextBounds.x}px`, type: 'grid' });
          } else if (dragState.resizeHandle.includes('e')) {
            rGuidesX.push({
              val: nextBounds.x + nextBounds.width,
              label: `Grid ${nextBounds.x + nextBounds.width}px`,
              type: 'grid',
            });
          }
          if (dragState.resizeHandle.includes('n')) {
            rGuidesY.push({ val: nextBounds.y, label: `Grid ${nextBounds.y}px`, type: 'grid' });
          } else if (dragState.resizeHandle.includes('s')) {
            rGuidesY.push({
              val: nextBounds.y + nextBounds.height,
              label: `Grid ${nextBounds.y + nextBounds.height}px`,
              type: 'grid',
            });
          }
          setSmartGuidesX(rGuidesX);
          setSmartGuidesY(rGuidesY);
        }

        updateNode(dragState.nodeId, nextBounds, false);
      } else if (dragState.type === 'group-resize' && dragState.resizeHandle && dragState.targetGroupNodeIds) {
        const nextBounds = computeResizedBounds({
          initialBounds: {
            x: dragState.initialX,
            y: dragState.initialY,
            width: dragState.initialWidth || 40,
            height: dragState.initialHeight || 40,
          },
          handle: dragState.resizeHandle,
          deltaX,
          deltaY,
          minSize: 30,
          preserveAspectRatio: e.shiftKey,
          snapToGrid: isSnapToGridEnabled,
          gridSize,
        });

        transformGroup(
          dragState.targetGroupNodeIds,
          nextBounds,
          {
            x: dragState.initialX,
            y: dragState.initialY,
            width: dragState.initialWidth || 40,
            height: dragState.initialHeight || 40,
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
      isSmartGuidesEnabled,
      showGuides,
      gridSize,
      setPan,
      updateNode,
      transformGroup,
      setSelectedNodeIds,
      pushUndo,
    ]
  );

  const finalizePointerInteraction = useCallback(() => {
    if (dragState) {
      if (dragState.hasPushedUndo) {
        commitUndo(
          dragState.type === 'move'
            ? 'Move element'
            : dragState.type === 'group-resize'
            ? 'Transform group'
            : 'Resize element'
        );
      }
      setDragState(null);
      setSnapLineX(null);
      setSnapLineY(null);
      setSmartGuidesX([]);
      setSmartGuidesY([]);
    }
    if (marqueeState) {
      setMarqueeState(null);
    }
  }, [dragState, marqueeState, commitUndo]);

  useEffect(() => {
    if (!dragState && !marqueeState) return;

    const handleWindowMove = (e: PointerEvent) => {
      processPointerMove(e);
    };
    const handleWindowUp = () => {
      finalizePointerInteraction();
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, [dragState, marqueeState, processPointerMove, finalizePointerInteraction]);

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
    const hasMyAsset = e.dataTransfer.types.includes('application/scorm-my-asset');
    const hasAsset = e.dataTransfer.types.includes('application/scorm-asset');
    const hasTypography = e.dataTransfer.types.includes('application/scorm-typography');
    const hasQuiz = e.dataTransfer.types.includes('application/scorm-quiz-template');
    const hasComponent = e.dataTransfer.types.includes('application/scorm-component-template');
    const hasFiles =
      e.dataTransfer.types.includes('Files') ||
      (e.dataTransfer.items && Array.from(e.dataTransfer.items).some((item) => item.kind === 'file'));

    if (hasLayout) setDragOverKind('layout');
    else if (hasMyAsset || hasComponent) setDragOverKind('component');
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

    // 0. Check for Resource Library / My Asset drop
    const myAssetJson = e.dataTransfer.getData('application/scorm-my-asset');
    if (myAssetJson) {
      try {
        const asset = JSON.parse(myAssetJson);
        addMyAssetToCanvas(
          asset.id,
          { x: dropX, y: dropY },
          { applyBrandTheme: asset.applyBrandTheme !== false }
        );
        setLayoutToast(`Inserted "${asset.name}" from Resource Library!`);
        setTimeout(() => setLayoutToast(null), 2500);
        return;
      } catch (err) {
        console.error('Failed to parse dropped custom asset:', err);
      }
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

  // Handle dragging for the two floating HUD toolbars
  useEffect(() => {
    if (!draggingHud) return;

    const handleHudMove = (e: PointerEvent) => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const next = clampHudPosition(
        draggingHud.initialX + (e.clientX - draggingHud.startX),
        draggingHud.initialY + (e.clientY - draggingHud.startY),
        draggingHud.hudWidth,
        draggingHud.hudHeight,
        containerRect.width,
        containerRect.height
      );
      setHudPositions((prev) => ({
        ...prev,
        [draggingHud.target]: next,
      }));
    };

    const handleHudUp = () => {
      setHudPositions((prev) => {
        saveHudPositions(prev);
        return prev;
      });
      setDraggingHud(null);
    };

    window.addEventListener('pointermove', handleHudMove);
    window.addEventListener('pointerup', handleHudUp);
    window.addEventListener('pointercancel', handleHudUp);
    return () => {
      window.removeEventListener('pointermove', handleHudMove);
      window.removeEventListener('pointerup', handleHudUp);
      window.removeEventListener('pointercancel', handleHudUp);
    };
  }, [draggingHud]);

  // Keep moved HUD bars inside viewport when container resizes
  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const clampBoth = () => {
      const rect = containerEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setHudPositions((prev) => {
        let changed = false;
        const next: HudPositionsState = { ...prev };
        if (prev.topToolbar && topHudRef.current) {
          const r = topHudRef.current.getBoundingClientRect();
          const clamped = clampHudPosition(
            prev.topToolbar.x,
            prev.topToolbar.y,
            r.width,
            r.height,
            rect.width,
            rect.height
          );
          if (clamped.x !== prev.topToolbar.x || clamped.y !== prev.topToolbar.y) {
            next.topToolbar = clamped;
            changed = true;
          }
        }
        if (prev.zoomHud && zoomHudRef.current) {
          const r = zoomHudRef.current.getBoundingClientRect();
          const clamped = clampHudPosition(
            prev.zoomHud.x,
            prev.zoomHud.y,
            r.width,
            r.height,
            rect.width,
            rect.height
          );
          if (clamped.x !== prev.zoomHud.x || clamped.y !== prev.zoomHud.y) {
            next.zoomHud = clamped;
            changed = true;
          }
        }
        if (changed) {
          saveHudPositions(next);
          return next;
        }
        return prev;
      });
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(clampBoth) : null;
    ro?.observe(containerEl);
    window.addEventListener('resize', clampBoth);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', clampBoth);
    };
  }, []);

  const startHudDrag = (
    target: 'topToolbar' | 'zoomHud',
    e: React.PointerEvent,
    requireHandle = false
  ) => {
    if (e.button !== 0) return;
    const el = e.target as HTMLElement;
    if (!requireHandle && el.closest('button, input, select, [data-hud-menu]')) {
      return;
    }

    const hudEl = target === 'topToolbar' ? topHudRef.current : zoomHudRef.current;
    const containerEl = containerRef.current;
    if (!hudEl || !containerEl) return;

    e.stopPropagation();
    e.preventDefault();

    const hudRect = hudEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    setDraggingHud({
      target,
      startX: e.clientX,
      startY: e.clientY,
      initialX: hudRect.left - containerRect.left,
      initialY: hudRect.top - containerRect.top,
      hudWidth: hudRect.width,
      hudHeight: hudRect.height,
    });
  };

  const resetHudPosition = (target: 'topToolbar' | 'zoomHud') => {
    setHudPositions((prev) => {
      const next = { ...prev, [target]: null };
      saveHudPositions(next);
      return next;
    });
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
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-950 select-none">
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
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
        onPointerMove={handleContainerPointerMove}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      {/* Movable Floating Canvas HUD Toolbar (Pan/Select, Zoom, Fit, Timeline, Selection) */}
      <div
        ref={topHudRef}
        style={
          hudPositions.topToolbar
            ? { left: `${hudPositions.topToolbar.x}px`, top: `${hudPositions.topToolbar.y}px` }
            : undefined
        }
        onPointerDown={(e) => startHudDrag('topToolbar', e)}
        className={`absolute z-40 bg-slate-900/95 backdrop-blur-md border rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs transition-shadow ${
          hudPositions.topToolbar ? '' : 'top-4 left-6'
        } ${
          draggingHud?.target === 'topToolbar'
            ? 'border-sky-500/80 ring-2 ring-sky-500/20 shadow-2xl cursor-grabbing'
            : 'border-slate-700/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          role="button"
          tabIndex={0}
          onPointerDown={(e) => startHudDrag('topToolbar', e, true)}
          onDoubleClick={() => resetHudPosition('topToolbar')}
          title="Drag to move toolbar (double-click to reset position)"
          className="px-0.5 py-1 text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing rounded flex items-center justify-center shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
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

        <button
          title="Pin Note / Add Annotation to Canvas (Click anywhere on stage)"
          onClick={() => setActiveCommentMode(!activeCommentMode)}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeCommentMode
              ? 'bg-amber-500 text-slate-950 font-bold animate-pulse'
              : 'text-amber-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-medium text-[11px]">Pin Note</span>
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

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        <button
          title={`Snap to Grid (${gridSize}px) — Double-click to open Grid Settings`}
          onClick={() => setSnapToGrid(!isSnapToGridEnabled)}
          onDoubleClick={() => setIsGridSettingsModalOpen(true)}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
            isSnapToGridEnabled
              ? 'bg-sky-600/90 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Grid</span>
          <span className="text-[9px] font-mono opacity-80 hidden xl:inline">{gridSize}px</span>
        </button>

        <button
          title="Toggle Smart Guides (Auto-align objects & spacing during drag)"
          onClick={() => setSmartGuidesEnabled(!isSmartGuidesEnabled)}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
            isSmartGuidesEnabled
              ? 'bg-fuchsia-600/85 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Smart</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        <button
          title="Toggle Timeline Animation Editor (Shift + A)"
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
            isTimelineOpen
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-amber-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Timeline</span>
        </button>

        <button
          title="Toggle Selection Manager Drawer (Shift + S)"
          onClick={() => setIsSelectionDrawerOpen(!isSelectionDrawerOpen)}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
            isSelectionDrawerOpen
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-sky-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Selection</span>
          {selectedNodeIds.length > 0 && (
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                isSelectionDrawerOpen
                  ? 'bg-sky-800 text-white'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}
            >
              {selectedNodeIds.length}
            </span>
          )}
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

          {/* Attach Annotation Note */}
          <button
            onClick={() => {
              if (selectedNodeId && currentPage) {
                const targetNode = currentPage.nodes.find((n) => n.id === selectedNodeId);
                if (targetNode) {
                  addComment({
                    pageId: currentPage.id,
                    nodeId: targetNode.id,
                    x: targetNode.x + targetNode.width,
                    y: targetNode.y,
                    author: 'Instructional Reviewer',
                    text: `Review note on ${targetNode.type} element`,
                    color: 'blue',
                  });
                }
              }
            }}
            title="Attach Annotation Note to Selected Element"
            className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/70 border border-amber-600/60 text-amber-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Note</span>
          </button>

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
        {/* Visual Snap-to-Grid Stage Overlay */}
        {isSnapToGridEnabled && gridSize > 0 && (
          <svg
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none z-10 rounded-lg overflow-hidden"
          >
            <defs>
              <pattern
                id="stage-snap-grid-minor"
                width={gridSize}
                height={gridSize}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke={gridColor || '#38bdf8'}
                  strokeOpacity={0.18}
                  strokeWidth={0.75}
                />
              </pattern>
              <pattern
                id="stage-snap-grid-major"
                width={gridSize * 5}
                height={gridSize * 5}
                patternUnits="userSpaceOnUse"
              >
                <rect width={gridSize * 5} height={gridSize * 5} fill="url(#stage-snap-grid-minor)" />
                <path
                  d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`}
                  fill="none"
                  stroke={gridColor || '#38bdf8'}
                  strokeOpacity={0.34}
                  strokeWidth={1}
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#stage-snap-grid-major)" />
          </svg>
        )}

        {/* Horizontal Canvas Ruler (Top Edge) */}
        {showRulers && (
          <>
            <div
              className="absolute -top-6 left-0 right-0 h-6 bg-slate-900 border-b border-slate-700/80 pointer-events-auto cursor-ns-resize select-none z-30 overflow-hidden hover:bg-slate-850 transition-colors group"
              onPointerDown={handleTopRulerPointerDown}
              title="Click and drag down to create a horizontal magnetic guide"
            >
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

                {/* Selected Elements Extent Highlight on Ruler */}
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

                {/* Markers for all vertical guides on Top Ruler */}
                {(currentPage.guides || [])
                  .filter((g) => g.orientation === 'vertical')
                  .map((g) => (
                    <g key={`top_ruler_guide_${g.id}`}>
                      <polygon
                        points={`${g.position - 3},24 ${g.position + 3},24 ${g.position},18`}
                        fill={g.isLocked ? '#fbbf24' : '#22d3ee'}
                      />
                      <line
                        x1={g.position}
                        y1={0}
                        x2={g.position}
                        y2={24}
                        stroke={g.isLocked ? '#fbbf24' : '#22d3ee'}
                        strokeWidth={1.5}
                      />
                    </g>
                  ))}

                {/* Live Mouse Pointer Reticle on Top Ruler */}
                {mousePosOnCanvas && mousePosOnCanvas.x >= 0 && mousePosOnCanvas.x <= canvasWidth && (
                  <line
                    x1={mousePosOnCanvas.x}
                    y1={0}
                    x2={mousePosOnCanvas.x}
                    y2={24}
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                )}
              </svg>
            </div>

            {/* Vertical Canvas Ruler (Left Edge) */}
            <div
              className="absolute -left-6 top-0 bottom-0 w-6 bg-slate-900 border-r border-slate-700/80 pointer-events-auto cursor-ew-resize select-none z-30 overflow-hidden hover:bg-slate-850 transition-colors group"
              onPointerDown={handleLeftRulerPointerDown}
              title="Click and drag right to create a vertical magnetic guide"
            >
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

                {/* Selected Elements Extent Highlight on Ruler */}
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

                {/* Markers for all horizontal guides on Left Ruler */}
                {(currentPage.guides || [])
                  .filter((g) => g.orientation === 'horizontal')
                  .map((g) => (
                    <g key={`left_ruler_guide_${g.id}`}>
                      <polygon
                        points={`24,${g.position - 3} 24,${g.position + 3} 18,${g.position}`}
                        fill={g.isLocked ? '#fbbf24' : '#22d3ee'}
                      />
                      <line
                        x1={0}
                        y1={g.position}
                        x2={24}
                        y2={g.position}
                        stroke={g.isLocked ? '#fbbf24' : '#22d3ee'}
                        strokeWidth={1.5}
                      />
                    </g>
                  ))}

                {/* Live Mouse Pointer Reticle on Left Ruler */}
                {mousePosOnCanvas && mousePosOnCanvas.y >= 0 && mousePosOnCanvas.y <= canvasHeight && (
                  <line
                    x1={0}
                    y1={mousePosOnCanvas.y}
                    x2={24}
                    y2={mousePosOnCanvas.y}
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                )}
              </svg>
            </div>

            {/* Ruler Corner Junction (0,0) with Guide Presets & Show/Hide Controls */}
            <div
              className="absolute -top-6 -left-6 w-6 h-6 bg-slate-950 hover:bg-slate-900 border-r border-b border-slate-700 flex items-center justify-center text-[9px] font-mono font-bold text-slate-300 hover:text-sky-300 z-40 select-none cursor-pointer transition-colors shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                setIsRulerMenuOpen(!isRulerMenuOpen);
              }}
              title="Ruler & Magnetic Guide Presets Menu"
            >
              <Ruler className="w-3.5 h-3.5 text-sky-400" />
            </div>

            {/* Ruler & Magnetic Guides Popover Menu */}
            {isRulerMenuOpen && (
              <div
                className="absolute -top-6 left-2 z-50 w-56 bg-slate-900/98 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-2 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/80 px-1">
                  <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                    <Ruler className="w-3.5 h-3.5 text-sky-400" />
                    <span>Rulers & Guides</span>
                  </div>
                  <button
                    onClick={() => setIsRulerMenuOpen(false)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Toggle Guides & Rulers */}
                <div className="space-y-1 mb-2 pb-2 border-b border-slate-700/80">
                  <button
                    onClick={() => setShowGuides(!showGuides)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {showGuides ? (
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>Magnetic Guides</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        showGuides ? 'bg-sky-950 text-sky-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {showGuides ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowRulers(!showRulers)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5 text-slate-400" />
                      <span>Canvas Rulers</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300">
                      ON
                    </span>
                  </button>
                </div>

                {/* Preset Guides */}
                <div className="mb-2">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Guide Presets
                  </div>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        addPresetGuides('safe-margins');
                        setIsRulerMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-slate-300 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>40px Safe Margins</span>
                      <span className="text-[10px] font-mono text-slate-500">4 guides</span>
                    </button>
                    <button
                      onClick={() => {
                        addPresetGuides('center');
                        setIsRulerMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-slate-300 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>Center Crosshair</span>
                      <span className="text-[10px] font-mono text-slate-500">50% H / V</span>
                    </button>
                    <button
                      onClick={() => {
                        addPresetGuides('rule-of-thirds');
                        setIsRulerMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-slate-300 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>Rule of Thirds</span>
                      <span className="text-[10px] font-mono text-slate-500">3x3 Grid</span>
                    </button>
                    <button
                      onClick={() => {
                        addPresetGuides('quads');
                        setIsRulerMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-slate-300 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>Quarter Grid</span>
                      <span className="text-[10px] font-mono text-slate-500">2x2 Quads</span>
                    </button>
                  </div>
                </div>

                {/* Clear All Guides */}
                <div className="pt-1 border-t border-slate-700/80">
                  <button
                    onClick={() => {
                      clearAllGuides();
                      setIsRulerMenuOpen(false);
                    }}
                    disabled={!currentPage.guides || currentPage.guides.length === 0}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-rose-950/70 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
                  >
                    <span>Clear All Guides</span>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Persistent User-Created Magnetic Guides */}
        {showGuides &&
          (currentPage.guides || []).map((guide) => {
            const isHoriz = guide.orientation === 'horizontal';
            const isHovered = hoveredGuideId === guide.id;

            if (isHoriz) {
              return (
                <div
                  key={`guide_h_${guide.id}`}
                  className={`absolute left-0 right-0 z-40 group select-none ${
                    guide.isLocked ? 'cursor-default' : 'cursor-ns-resize'
                  }`}
                  style={{ top: `${guide.position}px` }}
                  onPointerDown={(e) => handleGuidePointerDown(e, guide)}
                  onMouseEnter={() => setHoveredGuideId(guide.id)}
                  onMouseLeave={() => setHoveredGuideId(null)}
                >
                  {/* Hit Target */}
                  <div className="absolute -top-2 left-0 right-0 h-4" />

                  {/* Visual Guide Line */}
                  <div
                    className={`h-[1px] w-full transition-all ${
                      isHovered
                        ? 'h-[2px] bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.95)]'
                        : guide.isLocked
                        ? 'bg-amber-400/80 border-t border-dashed border-amber-400'
                        : 'bg-cyan-400/90 shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                    }`}
                  />

                  {/* Guide Info & Action Badge on Hover */}
                  {(isHovered || guide.isLocked) && (
                    <div
                      className="absolute top-1 left-4 z-50 bg-slate-900/95 border border-cyan-500/70 text-cyan-200 text-[10px] font-mono px-2 py-0.5 rounded shadow-xl flex items-center gap-1.5 backdrop-blur-xs select-none pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <span className="font-bold text-cyan-400">Y: {guide.position}px</span>
                      <button
                        title={guide.isLocked ? 'Unlock Guide' : 'Lock Guide'}
                        onClick={() => toggleLockGuide(guide.id)}
                        className={`p-0.5 rounded hover:bg-slate-800 transition-colors ${
                          guide.isLocked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {guide.isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                      </button>
                      {!guide.isLocked && (
                        <button
                          title="Delete Guide"
                          onClick={() => deleteGuide(guide.id)}
                          className="p-0.5 rounded hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`guide_v_${guide.id}`}
                className={`absolute top-0 bottom-0 z-40 group select-none ${
                  guide.isLocked ? 'cursor-default' : 'cursor-ew-resize'
                }`}
                style={{ left: `${guide.position}px` }}
                onPointerDown={(e) => handleGuidePointerDown(e, guide)}
                onMouseEnter={() => setHoveredGuideId(guide.id)}
                onMouseLeave={() => setHoveredGuideId(null)}
              >
                {/* Hit Target */}
                <div className="absolute -left-2 top-0 bottom-0 w-4" />

                {/* Visual Guide Line */}
                <div
                  className={`w-[1px] h-full transition-all ${
                    isHovered
                      ? 'w-[2px] bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.95)]'
                      : guide.isLocked
                      ? 'bg-amber-400/80 border-l border-dashed border-amber-400'
                      : 'bg-cyan-400/90 shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                  }`}
                />

                {/* Guide Info & Action Badge on Hover */}
                {(isHovered || guide.isLocked) && (
                  <div
                    className="absolute top-4 left-1 z-50 bg-slate-900/95 border border-cyan-500/70 text-cyan-200 text-[10px] font-mono px-2 py-0.5 rounded shadow-xl flex items-center gap-1.5 backdrop-blur-xs select-none pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="font-bold text-cyan-400">X: {guide.position}px</span>
                    <button
                      title={guide.isLocked ? 'Unlock Guide' : 'Lock Guide'}
                      onClick={() => toggleLockGuide(guide.id)}
                      className={`p-0.5 rounded hover:bg-slate-800 transition-colors ${
                        guide.isLocked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {guide.isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                    </button>
                    {!guide.isLocked && (
                      <button
                        title="Delete Guide"
                        onClick={() => deleteGuide(guide.id)}
                        className="p-0.5 rounded hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Live Dragging Guide Preview Overlay */}
        {draggingGuide && (
          <div
            className={`absolute pointer-events-none z-50 ${
              draggingGuide.orientation === 'horizontal'
                ? 'left-0 right-0 h-[2px] bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,1)]'
                : 'top-0 bottom-0 w-[2px] bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,1)]'
            }`}
            style={
              draggingGuide.orientation === 'horizontal'
                ? { top: `${draggingGuide.position}px` }
                : { left: `${draggingGuide.position}px` }
            }
          >
            <div
              className={`absolute font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-2xl backdrop-blur-xs flex items-center gap-1 whitespace-nowrap bg-cyan-950 text-cyan-200 border border-cyan-400 ${
                draggingGuide.orientation === 'horizontal' ? 'top-1.5 left-6' : 'top-6 left-1.5'
              }`}
            >
              <span>
                {draggingGuide.orientation === 'horizontal' ? 'Y:' : 'X:'} {draggingGuide.position}px
              </span>
              {(draggingGuide.position < 0 ||
                (draggingGuide.orientation === 'horizontal' && draggingGuide.position > canvasHeight) ||
                (draggingGuide.orientation === 'vertical' && draggingGuide.position > canvasWidth)) && (
                <span className="text-rose-400 text-[9px] font-normal ml-1">(Drop to delete)</span>
              )}
            </div>
          </div>
        )}

        {/* Smart Guide, Magnetic Guide & Grid Snap Alignment Lines Overlay */}
        {smartGuidesX
          .filter((guide) =>
            guide.type === 'grid'
              ? isSnapToGridEnabled
              : guide.type === 'guide'
              ? showGuides
              : isSmartGuidesEnabled
          )
          .map((guide, idx) => {
            const isPage = guide.type === 'page-edge' || guide.type === 'page-center';
            const isGrid = guide.type === 'grid';
            const isGuide = guide.type === 'guide';
            const isTideSnap = guide.type === 'tide-snap';
            const isSmartSpacing = guide.type === 'smart-spacing';
            return (
              <div
                key={`sg_x_${idx}_${guide.val}_${guide.type}`}
                className={`absolute top-0 bottom-0 pointer-events-none z-50 animate-in fade-in duration-75 ${
                  isTideSnap
                    ? 'w-[2px] bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.95)]'
                    : isSmartSpacing
                    ? 'w-[2px] bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.95)]'
                    : isGuide
                    ? 'w-[2px] bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,1)]'
                    : isGrid
                    ? 'w-[1.5px] border-l border-dashed border-sky-400 opacity-90'
                    : isPage
                    ? 'w-[1.5px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                    : 'w-[1.5px] bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]'
                }`}
                style={{ left: `${guide.val}px` }}
              >
                <div
                  className={`absolute top-1 left-1 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-lg backdrop-blur-xs flex items-center gap-1 whitespace-nowrap ${
                    isTideSnap
                      ? 'bg-emerald-950/98 text-emerald-200 border border-emerald-400 shadow-emerald-900/50 font-bold'
                      : isSmartSpacing
                      ? 'bg-purple-950/98 text-purple-200 border border-purple-400 shadow-purple-900/50 font-bold'
                      : isGuide
                      ? 'bg-cyan-950/98 text-cyan-200 border border-cyan-400 shadow-cyan-900/50'
                      : isGrid
                      ? 'bg-slate-900/95 text-sky-300 border border-sky-500/50'
                      : isPage
                      ? 'bg-cyan-950/95 text-cyan-200 border border-cyan-500/60'
                      : 'bg-fuchsia-950/95 text-fuchsia-200 border border-fuchsia-500/60'
                  }`}
                >
                  {isTideSnap && <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />}
                  <span>{guide.label}</span>
                  <span className={isTideSnap ? 'text-emerald-300' : isSmartSpacing ? 'text-purple-300' : isGuide || isPage ? 'text-cyan-400' : isGrid ? 'text-sky-400' : 'text-fuchsia-400'}>
                    ({guide.val}px)
                  </span>
                </div>
              </div>
            );
          })}
        {smartGuidesY
          .filter((guide) =>
            guide.type === 'grid'
              ? isSnapToGridEnabled
              : guide.type === 'guide'
              ? showGuides
              : isSmartGuidesEnabled
          )
          .map((guide, idx) => {
            const isPage = guide.type === 'page-edge' || guide.type === 'page-center';
            const isGrid = guide.type === 'grid';
            const isGuide = guide.type === 'guide';
            const isTideSnap = guide.type === 'tide-snap';
            const isSmartSpacing = guide.type === 'smart-spacing';
            return (
              <div
                key={`sg_y_${idx}_${guide.val}_${guide.type}`}
                className={`absolute left-0 right-0 pointer-events-none z-50 animate-in fade-in duration-75 ${
                  isTideSnap
                    ? 'h-[2px] bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.95)]'
                    : isSmartSpacing
                    ? 'h-[2px] bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.95)]'
                    : isGuide
                    ? 'h-[2px] bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,1)]'
                    : isGrid
                    ? 'h-[1.5px] border-t border-dashed border-sky-400 opacity-90'
                    : isPage
                    ? 'h-[1.5px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                    : 'h-[1.5px] bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]'
                }`}
                style={{ top: `${guide.val}px` }}
              >
                <div
                  className={`absolute top-1 left-1 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-lg backdrop-blur-xs flex items-center gap-1 whitespace-nowrap ${
                    isTideSnap
                      ? 'bg-emerald-950/98 text-emerald-200 border border-emerald-400 shadow-emerald-900/50 font-bold'
                      : isSmartSpacing
                      ? 'bg-purple-950/98 text-purple-200 border border-purple-400 shadow-purple-900/50 font-bold'
                      : isGuide
                      ? 'bg-cyan-950/98 text-cyan-200 border border-cyan-400 shadow-cyan-900/50'
                      : isGrid
                      ? 'bg-slate-900/95 text-sky-300 border border-sky-500/50'
                      : isPage
                      ? 'bg-cyan-950/95 text-cyan-200 border border-cyan-500/60'
                      : 'bg-fuchsia-950/95 text-fuchsia-200 border border-fuchsia-500/60'
                  }`}
                >
                  {isTideSnap && <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />}
                  <span>{guide.label}</span>
                  <span className={isTideSnap ? 'text-emerald-300' : isSmartSpacing ? 'text-purple-300' : isGuide || isPage ? 'text-cyan-400' : isGrid ? 'text-sky-400' : 'text-fuchsia-400'}>
                    ({guide.val}px)
                  </span>
                </div>
              </div>
            );
          })}

        {/* Deep-Selection Parent GroupedObject Ghost Outline */}
        {deepSelectedNodeId && deepSelectedGroupId && (() => {
          const parentMembers = currentPage.nodes.filter((n) => n.groupId === deepSelectedGroupId);
          const parentBounds = computeCompositeBounds(parentMembers);
          if (!parentBounds) return null;
          const groupMeta = (currentPage.groups || []).find((g) => g.id === deepSelectedGroupId);
          return (
            <div
              className="absolute border border-dashed border-amber-400/70 bg-amber-500/[0.03] pointer-events-none z-20 rounded"
              style={{
                left: `${parentBounds.x - 6}px`,
                top: `${parentBounds.y - 6}px`,
                width: `${parentBounds.width + 12}px`,
                height: `${parentBounds.height + 12}px`,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  exitDeepSelect();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto absolute -top-6 left-0 px-2 py-0.5 rounded bg-amber-950/95 hover:bg-amber-500 border border-amber-500/60 text-amber-300 hover:text-slate-950 text-[9px] font-bold flex items-center gap-1 shadow-lg cursor-pointer transition-colors"
                title="Exit deep-selection and select the full GroupedObject (Esc)"
              >
                <Focus className="w-2.5 h-2.5" />
                <span>{groupMeta?.name || 'GroupedObject'} • Click or Esc for Group</span>
              </button>
            </div>
          );
        })()}

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
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Multi-Selection Action HUD Toolbar */}
            <div
              className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/98 backdrop-blur-md text-white px-2.5 py-1 rounded-xl border border-slate-700/90 shadow-2xl flex items-center gap-1.5 pointer-events-auto text-xs select-none"
              onPointerDown={(e) => {
                const targetEl = e.target as HTMLElement;
                if (targetEl.closest('button')) {
                  e.stopPropagation();
                }
              }}
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

              {/* Save Group to Resource Library */}
              <button
                onClick={() => {
                  setSaveResourceName(
                    isSelectedGrouped ? 'Grouped Interaction Pattern' : 'Custom Pattern Group'
                  );
                  setSaveResourceCategory('patterns');
                  setIsSaveResourcePopoverOpen(true);
                }}
                title="Save Selection to Resource Library"
                className="px-2 py-1 bg-sky-600/90 hover:bg-sky-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FolderHeart className="w-3.5 h-3.5" />
                <span>Save Resource</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

              {/* Scale Quick Presets */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => scaleGroup(selectedNodeIds, 0.9)}
                  title="Scale Down Group (90%)"
                  className="px-1.5 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px] font-mono transition-colors cursor-pointer"
                >
                  -10%
                </button>
                <button
                  onClick={() => scaleGroup(selectedNodeIds, 1.1)}
                  title="Scale Up Group (110%)"
                  className="px-1.5 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px] font-mono transition-colors cursor-pointer"
                >
                  +10%
                </button>
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

            {/* 8 Interactive Parent Entity Resize Handles for Uniform & Directional Transformation */}
            {(
              [
                { handle: 'nw', size: 'w-3.5 h-3.5 -top-1.5 -left-1.5', cursor: 'nwse-resize', title: 'Resize Group NW (Hold Shift to keep ratio)' },
                { handle: 'n', size: 'w-6 h-2.5 -top-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize', title: 'Resize Group Top Edge (N)' },
                { handle: 'ne', size: 'w-3.5 h-3.5 -top-1.5 -right-1.5', cursor: 'nesw-resize', title: 'Resize Group NE (Hold Shift to keep ratio)' },
                { handle: 'e', size: 'w-2.5 h-6 top-1/2 -right-1.5 -translate-y-1/2', cursor: 'ew-resize', title: 'Resize Group Right Edge (E)' },
                { handle: 'se', size: 'w-3.5 h-3.5 -bottom-1.5 -right-1.5', cursor: 'nwse-resize', title: 'Resize Group SE (Hold Shift to keep ratio)' },
                { handle: 's', size: 'w-6 h-2.5 -bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize', title: 'Resize Group Bottom Edge (S)' },
                { handle: 'sw', size: 'w-3.5 h-3.5 -bottom-1.5 -left-1.5', cursor: 'nesw-resize', title: 'Resize Group SW (Hold Shift to keep ratio)' },
                { handle: 'w', size: 'w-2.5 h-6 top-1/2 -left-1.5 -translate-y-1/2', cursor: 'ew-resize', title: 'Resize Group Left Edge (W)' },
              ] as { handle: ResizeHandle; size: string; cursor: string; title: string }[]
            ).map(({ handle, size, cursor, title }) => (
              <div
                key={handle}
                data-resize-handle={handle}
                className={`absolute ${size} z-50 bg-sky-400 border-2 border-slate-900 rounded-xs shadow-md hover:scale-125 hover:bg-white hover:border-sky-500 transition-transform`}
                style={{ cursor }}
                onPointerDown={(e) => handleGroupResizePointerDown(e, handle, groupBounds)}
                onClick={(e) => e.stopPropagation()}
                title={title}
              />
            ))}

            {/* Parent Entity Live Coordinate & Dimension Badge */}
            <div className="absolute -bottom-6 right-0 z-50 bg-slate-900/95 text-sky-300 border border-slate-700/80 text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
              X:{Math.round(groupBounds.minX)} Y:{Math.round(groupBounds.minY)} •{' '}
              {Math.round(groupBounds.maxX - groupBounds.minX)} ×{' '}
              {Math.round(groupBounds.maxY - groupBounds.minY)}px
            </div>
          </div>
        )}

        {/* Render Canvas Nodes */}
        {currentPage.nodes.map((node) => {
          const isSelected = selectedNodeIds.includes(node.id);
          const isPrimarySelected = node.id === selectedNodeId;
          const isTransformingThisNode =
            dragState?.nodeId === node.id ||
            (dragState?.initialNodesMap && Boolean(dragState.initialNodesMap[node.id]));
          const animEval = evaluateNodeAnimationAtTime(node.animation, liveScrubTime);

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
                ...animEval.style,
              }}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                if (!didDragMoveRef.current && !e.shiftKey && !e.altKey && selectedNodeIds.length > 1 && !node.groupId) {
                  setSelectedNodeId(node.id);
                }
              }}
              onDoubleClick={(e) => {
                if (node.groupId && deepSelectedNodeId !== node.id) {
                  e.stopPropagation();
                  deepSelectNode(node.id);
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
                  canEditOnDoubleClick={!node.groupId || deepSelectedNodeId === node.id}
                  variables={course.variables}
                  showVariablePreview={showVariablePreview}
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

                  {/* Active Selection Coordinates & Dimensions Badge */}
                  <div
                    className={`absolute -bottom-6 left-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shadow-md pointer-events-none z-50 flex items-center gap-1.5 whitespace-nowrap ${
                      node.isLocked
                        ? 'bg-amber-950/95 text-amber-200 border border-amber-500/60'
                        : isTransformingThisNode
                        ? 'bg-blue-600 text-white border border-blue-400'
                        : 'bg-slate-900/95 text-sky-300 border border-slate-700/80'
                    }`}
                  >
                    <span className="uppercase text-[9px] font-bold opacity-75">{node.type}</span>
                    <span className="opacity-40">•</span>
                    <span>
                      X:{Math.round(node.x)} Y:{Math.round(node.y)}
                    </span>
                    <span className="opacity-40">•</span>
                    <span>
                      {Math.round(node.width)}×{Math.round(node.height)}px
                    </span>
                  </div>

                  {/* Floating Action Pill (When single node is primary selection) */}
                  {isPrimarySelected && !isMultiSelection && (
                    <div
                      className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-lg border border-slate-700/80 shadow-xl flex items-center gap-1 z-50"
                      onPointerDown={(e) => e.stopPropagation()}
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

                      {deepSelectedNodeId === node.id && deepSelectedGroupId && (
                        <button
                          title="Select Parent GroupedObject (Esc)"
                          onClick={() => exitDeepSelect()}
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <CornerUpLeft className="w-3 h-3" />
                          <span>Group</span>
                        </button>
                      )}

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

                  {/* 8 Corner & Edge Resize Handles */}
                  {!isMultiSelection &&
                    !node.isLocked &&
                    (
                      [
                        {
                          handle: 'nw',
                          cursor: 'nwse-resize',
                          pos: 'w-3 h-3 -top-1.5 -left-1.5',
                          title: 'Resize NW Corner (Hold Shift to keep ratio)',
                        },
                        {
                          handle: 'n',
                          cursor: 'ns-resize',
                          pos: 'w-5 h-2.5 -top-1.5 left-1/2 -translate-x-1/2',
                          title: 'Resize Top Edge',
                        },
                        {
                          handle: 'ne',
                          cursor: 'nesw-resize',
                          pos: 'w-3 h-3 -top-1.5 -right-1.5',
                          title: 'Resize NE Corner (Hold Shift to keep ratio)',
                        },
                        {
                          handle: 'e',
                          cursor: 'ew-resize',
                          pos: 'w-2.5 h-5 top-1/2 -right-1.5 -translate-y-1/2',
                          title: 'Resize Right Edge',
                        },
                        {
                          handle: 'se',
                          cursor: 'nwse-resize',
                          pos: 'w-3 h-3 -bottom-1.5 -right-1.5',
                          title: 'Resize SE Corner (Hold Shift to keep ratio)',
                        },
                        {
                          handle: 's',
                          cursor: 'ns-resize',
                          pos: 'w-5 h-2.5 -bottom-1.5 left-1/2 -translate-x-1/2',
                          title: 'Resize Bottom Edge',
                        },
                        {
                          handle: 'sw',
                          cursor: 'nesw-resize',
                          pos: 'w-3 h-3 -bottom-1.5 -left-1.5',
                          title: 'Resize SW Corner (Hold Shift to keep ratio)',
                        },
                        {
                          handle: 'w',
                          cursor: 'ew-resize',
                          pos: 'w-2.5 h-5 top-1/2 -left-1.5 -translate-y-1/2',
                          title: 'Resize Left Edge',
                        },
                      ] as { handle: ResizeHandle; cursor: string; pos: string; title: string }[]
                    ).map(({ handle, cursor, pos, title }) => (
                      <div
                        key={handle}
                        data-resize-handle={handle}
                        title={title}
                        className={`absolute z-50 bg-white border-2 border-blue-600 rounded-xs shadow-md hover:scale-125 hover:bg-blue-500 hover:border-white transition-transform ${pos}`}
                        style={{ cursor }}
                        onPointerDown={(e) => handleResizePointerDown(e, node.id, handle)}
                        onClick={(e) => e.stopPropagation()}
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

      {/* Movable Floating Zoom Level Controls HUD */}
      <div
        ref={zoomHudRef}
        style={
          hudPositions.zoomHud
            ? { left: `${hudPositions.zoomHud.x}px`, top: `${hudPositions.zoomHud.y}px` }
            : undefined
        }
        onPointerDown={(e) => startHudDrag('zoomHud', e)}
        className={`absolute z-40 bg-slate-900/95 backdrop-blur-md border rounded-xl p-1.5 shadow-2xl flex items-center gap-1.5 text-xs text-white select-none transition-shadow ${
          hudPositions.zoomHud ? '' : 'bottom-5 right-6'
        } ${
          draggingHud?.target === 'zoomHud'
            ? 'border-sky-500/80 ring-2 ring-sky-500/20 cursor-grabbing'
            : 'border-slate-700/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          role="button"
          tabIndex={0}
          onPointerDown={(e) => startHudDrag('zoomHud', e, true)}
          onDoubleClick={() => resetHudPosition('zoomHud')}
          title="Drag to move zoom controls (double-click to reset position)"
          className="px-0.5 py-1 text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing rounded flex items-center justify-center shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <button
          title="Zoom Out (Ctrl -)"
          onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Clickable Percentage Indicator with Quick Preset Dropdown */}
        <div className="relative" data-hud-menu="true">
          <button
            title="Select Zoom Preset Level"
            onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
            className="px-2 py-1 bg-slate-800/90 hover:bg-slate-700 rounded-lg text-xs font-mono font-bold text-sky-400 border border-slate-700 hover:border-sky-500/50 transition-colors flex items-center gap-1 cursor-pointer min-w-[56px] justify-center"
          >
            <span>{Math.round(zoom * 100)}%</span>
          </button>

          {/* Preset Zoom Dropdown Popover */}
          {isZoomMenuOpen && (
            <div
              className={`absolute right-0 z-50 w-36 bg-slate-900/98 border border-slate-700 shadow-2xl rounded-xl p-1 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 ${
                hudPositions.zoomHud && hudPositions.zoomHud.y < 240 ? 'top-9' : 'bottom-9'
              }`}
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 mb-1">
                Zoom Level
              </div>
              {[
                { label: '50%', value: 0.5 },
                { label: '75%', value: 0.75 },
                { label: '100% (Reset)', value: 1.0 },
                { label: '125%', value: 1.25 },
                { label: '150%', value: 1.5 },
                { label: '200%', value: 2.0 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setZoom(opt.value);
                    setIsZoomMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                    Math.abs(zoom - opt.value) < 0.02
                      ? 'bg-blue-600 text-white font-bold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
              <div className="pt-1 mt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleFitToScreen();
                    setIsZoomMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1 rounded-lg text-xs text-sky-300 hover:bg-slate-800 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Fit to Screen</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          title="Zoom In (Ctrl +)"
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
          onSaveToMyAssets={() => {
            const isGroup = selectedNodeIds.length > 1;
            setSaveResourceName(isGroup ? 'Custom Pattern Group' : 'Custom Resource');
            setSaveResourceCategory(isGroup ? 'patterns' : 'shapes');
            setIsSaveResourcePopoverOpen(true);
          }}
        />
      )}

      {/* Inline Save-to-Resource-Library Popover (no browser prompt) */}
      {isSaveResourcePopoverOpen && (
        <div
          className="absolute top-16 right-6 z-50 w-72 bg-slate-900/98 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 shadow-2xl text-xs text-slate-200 space-y-2.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <FolderHeart className="w-4 h-4 text-cyan-400" />
              <span>Save to Resource Library</span>
            </div>
            <button
              onClick={() => setIsSaveResourcePopoverOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!saveResourceName.trim()) return;
              const targetIds =
                selectedNodeIds.length > 0
                  ? selectedNodeIds
                  : selectedNodeId
                  ? [selectedNodeId]
                  : [];
              const saved = saveSelectionToMyAssets(
                saveResourceName.trim(),
                saveResourceCategory,
                targetIds
              );
              if (saved) {
                setIsSaveResourcePopoverOpen(false);
                setLayoutToast(`Saved "${saved.name}" to Resource Library!`);
                setTimeout(() => setLayoutToast(null), 2500);
              }
            }}
            className="space-y-2"
          >
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Resource Name</label>
              <input
                type="text"
                value={saveResourceName}
                onChange={(e) => setSaveResourceName(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Category</label>
              <select
                value={saveResourceCategory}
                onChange={(e) =>
                  setSaveResourceCategory(
                    e.target.value as 'patterns' | 'shapes' | 'icons' | 'cards' | 'groups'
                  )
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="patterns">Interaction Pattern</option>
                <option value="shapes">Custom Shape</option>
                <option value="icons">Branded Icon</option>
                <option value="cards">Callout / Card</option>
                <option value="groups">Reusable Group</option>
              </select>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsSaveResourcePopoverOpen(false)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!saveResourceName.trim()}
                className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Docked Right-Side Edge Handle for Selection Manager when closed */}
      {!isSelectionDrawerOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSelectionDrawerOpen(true);
          }}
          title="Open Selection Manager Drawer (Shift + S)"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-slate-900/95 hover:bg-slate-800 border border-r-0 border-slate-700/90 rounded-l-xl px-1.5 py-3 shadow-2xl flex flex-col items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <Boxes className="w-3.5 h-3.5" />
          {selectedNodeIds.length > 0 && (
            <span className="px-1 py-0.5 rounded bg-sky-600 text-white font-mono text-[9px] leading-none">
              {selectedNodeIds.length}
            </span>
          )}
        </button>
      )}
      </div>

      {/* Side-Docked Selection Manager Drawer */}
      <SelectionManagerDrawer
        isOpen={isSelectionDrawerOpen}
        onClose={() => setIsSelectionDrawerOpen(false)}
        onNotify={(msg) => {
          setLayoutToast(msg);
          setTimeout(() => setLayoutToast(null), 2500);
        }}
      />
      </div>

      {/* Bottom Docked Interactive Timeline Animation Editor */}
      <TimelineDrawer
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        onScrubTimeChange={(time) => setLiveScrubTime(time)}
      />

      {/* Bottom Docked Per-Slide Speaker Notes Editor */}
      <SpeakerNotesDrawer />
    </div>
  );
};
