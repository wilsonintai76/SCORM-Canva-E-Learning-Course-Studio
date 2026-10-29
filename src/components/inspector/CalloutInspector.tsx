import React from 'react';
import { CalloutNode } from '../../types/schema';

interface Props {
  node: CalloutNode;
  onUpdate: (updates: Partial<CalloutNode>) => void;
}

export const CalloutInspector: React.FC<Props> = ({ node, onUpdate }) => {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="block text-slate-400 font-medium mb-1">Callout Style</label>
        <select
          value={node.variant}
          onChange={(e) => onUpdate({ variant: e.target.value as CalloutNode['variant'] })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
        >
          <option value="info">Info (Sky Blue)</option>
          <option value="warning">Warning / Alert (Amber)</option>
          <option value="success">Success / Verified (Emerald)</option>
          <option value="tip">Pro-Tip / Objective (Indigo)</option>
        </select>
      </div>

      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Card Heading</label>
        <input
          type="text"
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Content Body</label>
        <textarea
          rows={4}
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 font-sans resize-y"
        />
      </div>
    </div>
  );
};
