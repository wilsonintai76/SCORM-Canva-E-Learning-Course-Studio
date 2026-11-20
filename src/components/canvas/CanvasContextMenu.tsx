import React, { useEffect, useRef } from 'react';
import {
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Boxes,
  Layers,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  FolderHeart,
} from 'lucide-react';
import { CanvasNode } from '../../types/schema';

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  targetNode?: CanvasNode | null;
  selectedNodes: CanvasNode[];
  onClose: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onSaveToMyAssets?: () => void;
  onAlign: (
    type:
      | 'left'
      | 'center-h'
      | 'right'
      | 'top'
      | 'center-v'
      | 'bottom'
      | 'baseline'
      | 'distribute-h'
      | 'distribute-v'
  ) => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  targetNode,
  selectedNodes,
  onClose,
  onBringToFront,
  onSendToBack,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onGroup,
  onUngroup,
  onToggleLock,
  onDelete,
  onAlign,
  onSaveToMyAssets,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const count = selectedNodes.length;
  const isMultiple = count > 1;
  const canGroup = count >= 2;
  const hasGroupedNode = selectedNodes.some((n) => Boolean(n.groupId));
  const isLocked = selectedNodes.every((n) => n.isLocked);

  // Viewport clamping
  const menuWidth = 240;
  const menuHeight = 440;
  const clampedX = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));
  const clampedY = Math.max(12, Math.min(y, window.innerHeight - menuHeight - 12));

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Canvas element context menu"
      className="fixed z-[100] w-[230px] bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header Info */}
      <div className="px-3 py-1.5 border-b border-slate-800/80 mb-1 flex items-center justify-between">
        <span className="font-semibold text-sky-400 text-[11px] uppercase tracking-wider">
          {isMultiple ? `${count} Elements` : targetNode?.type || 'Canvas Element'}
        </span>
        {targetNode && (
          <span className="text-[10px] font-mono text-slate-400">
            {Math.round(targetNode.width)}×{Math.round(targetNode.height)}
          </span>
        )}
      </div>

      {/* Layer Ordering Actions */}
      <button
        onClick={() => {
          onBringToFront();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          <BringToFront className="w-3.5 h-3.5 text-sky-400" />
          <span>Bring to Front</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Shift+Top</span>
      </button>

      <button
        onClick={() => {
          onSendToBack();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          <SendToBack className="w-3.5 h-3.5 text-indigo-400" />
          <span>Send to Back</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Shift+Btm</span>
      </button>

      <button
        onClick={() => {
          onMoveUp();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          <ArrowUp className="w-3.5 h-3.5 text-slate-400" />
          <span>Forward 1 Layer</span>
        </span>
      </button>

      <button
        onClick={() => {
          onMoveDown();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
          <span>Backward 1 Layer</span>
        </span>
      </button>

      <div className="h-[1px] bg-slate-800/80 my-1 mx-2" />

      {/* Grouping Actions */}
      <button
        onClick={() => {
          onGroup();
          onClose();
        }}
        disabled={!canGroup}
        className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors text-left ${
          canGroup
            ? 'hover:bg-slate-800/90 hover:text-white cursor-pointer'
            : 'text-slate-500 opacity-40 pointer-events-none'
        }`}
      >
        <span className="flex items-center gap-2">
          <Boxes className="w-3.5 h-3.5 text-blue-400" />
          <span>Group</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+G</span>
      </button>

      <button
        onClick={() => {
          onUngroup();
          onClose();
        }}
        disabled={!hasGroupedNode}
        className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors text-left ${
          hasGroupedNode
            ? 'hover:bg-slate-800/90 hover:text-white cursor-pointer'
            : 'text-slate-500 opacity-40 pointer-events-none'
        }`}
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ungroup</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+Shift+G</span>
      </button>

      <div className="h-[1px] bg-slate-800/80 my-1 mx-2" />

      {/* Duplicate & Lock */}
      <button
        onClick={() => {
          onDuplicate();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-emerald-400" />
          <span>Duplicate</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+D</span>
      </button>

      <button
        onClick={() => {
          onToggleLock();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          {isLocked ? (
            <Unlock className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{isLocked ? 'Unlock Element' : 'Lock Element'}</span>
        </span>
      </button>

      {onSaveToMyAssets && (
        <button
          onClick={() => {
            onSaveToMyAssets();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer text-left"
        >
          <span className="flex items-center gap-2">
            <FolderHeart className="w-3.5 h-3.5 text-sky-400" />
            <span>Save to My Assets</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Reusable</span>
        </button>
      )}

      <div className="h-[1px] bg-slate-800/80 my-1 mx-2" />

      {/* Quick Align Toolbar Row within Menu */}
      <div className="px-3 py-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
          <span>Align</span>
          <span className="text-[9px] text-sky-400 lowercase">{count > 1 ? 'relative' : 'to slide'}</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => {
              onAlign('left');
              onClose();
            }}
            title="Align Left"
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              onAlign('center-h');
              onClose();
            }}
            title="Center Horizontally"
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <AlignCenterHorizontal className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              onAlign('right');
              onClose();
            }}
            title="Align Right"
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <AlignRight className="w-3 h-3" />
          </button>
          <div className="w-[1px] h-3 bg-slate-800" />
          <button
            onClick={() => {
              onAlign('top');
              onClose();
            }}
            title="Align Top"
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <AlignStartVertical className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              onAlign('center-v');
              onClose();
            }}
            title="Center Vertically"
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <AlignCenterVertical className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              onAlign('bottom');
              onClose();
            }}
            title="Align Bottom"
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <AlignEndVertical className="w-3 h-3" />
          </button>
          <div className="w-[1px] h-3 bg-slate-800" />
          <button
            onClick={() => {
              onAlign('baseline');
              onClose();
            }}
            title="Snap to Baseline"
            className="p-1 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded transition-colors"
          >
            <AlignEndHorizontal className="w-3 h-3" />
          </button>
          {count >= 3 && (
            <button
              onClick={() => {
                onAlign('distribute-h');
                onClose();
              }}
              title="Distribute Horizontally"
              className="p-1 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded transition-colors"
            >
              <AlignHorizontalDistributeCenter className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="h-[1px] bg-slate-800/80 my-1 mx-2" />

      {/* Delete Action */}
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between text-rose-400 hover:bg-rose-950/60 hover:text-rose-200 transition-colors cursor-pointer text-left rounded-b-lg"
      >
        <span className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </span>
        <span className="text-[10px] text-rose-500/80 font-mono">Del</span>
      </button>
    </div>
  );
};
