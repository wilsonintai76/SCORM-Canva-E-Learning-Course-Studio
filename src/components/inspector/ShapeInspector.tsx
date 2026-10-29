import React from 'react';
import { ShapeNode } from '../../types/schema';

interface Props {
  node: ShapeNode;
  onUpdate: (updates: Partial<ShapeNode>) => void;
}

export const ShapeInspector: React.FC<Props> = ({ node, onUpdate }) => {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="block text-slate-400 font-medium mb-1">Shape Type</label>
        <select
          value={node.shapeType}
          onChange={(e) => onUpdate({ shapeType: e.target.value as ShapeNode['shapeType'] })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
        >
          <option value="rect">Rectangle</option>
          <option value="rounded-rect">Rounded Rectangle</option>
          <option value="circle">Circle</option>
          <option value="badge">Badge Pill</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Fill Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={node.fill.startsWith('#') ? node.fill : '#3b82f6'}
              onChange={(e) => onUpdate({ fill: e.target.value })}
              className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={node.fill}
              onChange={(e) => onUpdate({ fill: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 font-mono text-[11px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 font-medium mb-1">Opacity</label>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={node.opacity ?? 1}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            className="w-full mt-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Corner Radius (px)</label>
          <input
            type="number"
            min={0}
            max={80}
            value={node.borderRadius || 0}
            onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Border Width</label>
          <input
            type="number"
            min={0}
            max={20}
            value={node.strokeWidth || 0}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
