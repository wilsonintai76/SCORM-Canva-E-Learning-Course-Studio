import React from 'react';
import { CalloutNode } from '../../../types/schema';
import { AlertTriangle, Info, CheckCircle2, Lightbulb } from 'lucide-react';

interface Props {
  node: CalloutNode;
}

export const CalloutNodeRenderer: React.FC<Props> = ({ node }) => {
  const getStyle = () => {
    switch (node.variant) {
      case 'warning':
        return {
          bg: 'bg-amber-50/90 border-amber-300 text-amber-900',
          titleColor: 'text-amber-800',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
        };
      case 'success':
        return {
          bg: 'bg-emerald-50/90 border-emerald-300 text-emerald-900',
          titleColor: 'text-emerald-800',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
        };
      case 'tip':
        return {
          bg: 'bg-indigo-50/90 border-indigo-300 text-indigo-900',
          titleColor: 'text-indigo-800',
          icon: <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />,
        };
      default:
        return {
          bg: 'bg-sky-50/90 border-sky-300 text-sky-900',
          titleColor: 'text-sky-800',
          icon: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`w-full h-full p-4 rounded-xl border-l-4 border shadow-xs flex flex-col cursor-move overflow-hidden ${style.bg}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {style.icon}
        <h4 className={`text-sm font-bold tracking-tight ${style.titleColor}`}>
          {node.title || 'Note'}
        </h4>
      </div>
      <p className="text-xs leading-relaxed opacity-90 overflow-hidden line-clamp-6">
        {node.content}
      </p>
    </div>
  );
};
