import React from 'react';
import { ImageNode } from '../../types/schema';

interface Props {
  node: ImageNode;
  onUpdate: (updates: Partial<ImageNode>) => void;
}

const PRESET_IMAGES = [
  { label: 'Cybersecurity Data', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=700&q=80' },
  { label: 'Ergonomic Desk', url: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=700&q=80' },
  { label: 'Customer Support', url: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=700&q=80' },
  { label: 'Modern Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80' },
];

export const ImageInspector: React.FC<Props> = ({ node, onUpdate }) => {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Image URL</label>
        <input
          type="text"
          value={node.url}
          placeholder="https://..."
          onChange={(e) => onUpdate({ url: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 font-mono text-[11px]"
        />
      </div>

      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Quick Stock Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_IMAGES.map((img) => (
            <button
              key={img.label}
              onClick={() => onUpdate({ url: img.url, alt: img.label })}
              className="text-left p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-blue-500 text-slate-300 hover:text-white transition-colors flex items-center gap-2 truncate"
            >
              <img src={img.url} alt={img.label} className="w-6 h-6 rounded object-cover shrink-0" />
              <span className="truncate">{img.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Object Fit</label>
          <select
            value={node.objectFit || 'cover'}
            onChange={(e) => onUpdate({ objectFit: e.target.value as ImageNode['objectFit'] })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="cover">Cover (Fill & Crop)</option>
            <option value="contain">Contain (Fit Whole)</option>
            <option value="fill">Stretch</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Corner Radius (px)</label>
          <input
            type="number"
            min={0}
            max={60}
            value={node.borderRadius || 0}
            onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="text-slate-400 font-medium cursor-pointer" htmlFor="shadow-toggle">
          Drop Shadow Effect
        </label>
        <input
          id="shadow-toggle"
          type="checkbox"
          checked={Boolean(node.shadow)}
          onChange={(e) => onUpdate({ shadow: e.target.checked })}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
        />
      </div>
    </div>
  );
};
