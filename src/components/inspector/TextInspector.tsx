import React from 'react';
import { TextNode } from '../../types/schema';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';

interface Props {
  node: TextNode;
  onUpdate: (updates: Partial<TextNode>) => void;
}

export const TextInspector: React.FC<Props> = ({ node, onUpdate }) => {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Text Content</label>
        <textarea
          rows={3}
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 font-sans resize-y"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Font Size (px)</label>
          <input
            type="number"
            min={10}
            max={96}
            value={node.fontSize || 16}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) || 16 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Font Weight</label>
          <select
            value={node.fontWeight || 'normal'}
            onChange={(e) => onUpdate({ fontWeight: e.target.value as TextNode['fontWeight'] })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="normal">Regular</option>
            <option value="semibold">SemiBold</option>
            <option value="bold">Bold</option>
            <option value="black">Black</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-slate-400 font-medium mb-1">Alignment</label>
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onUpdate({ textAlign: align })}
              className={`py-1.5 flex items-center justify-center rounded transition-colors ${
                node.textAlign === align ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
              {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
              {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={node.color.startsWith('#') ? node.color : '#0f172a'}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={node.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 font-mono text-[11px]"
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={node.backgroundColor?.startsWith('#') ? node.backgroundColor : '#ffffff'}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={node.backgroundColor || ''}
              placeholder="transparent"
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 font-mono text-[11px]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Padding (px)</label>
          <input
            type="number"
            min={0}
            max={60}
            value={node.padding || 0}
            onChange={(e) => onUpdate({ padding: Number(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Border Radius</label>
          <input
            type="number"
            min={0}
            max={40}
            value={node.borderRadius || 0}
            onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
