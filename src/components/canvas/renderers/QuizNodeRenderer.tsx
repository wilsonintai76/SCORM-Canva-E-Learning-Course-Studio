import React from 'react';
import { QuizNode } from '../../../types/schema';
import { CheckCircle2, CircleDot, HelpCircle } from 'lucide-react';

interface Props {
  node: QuizNode;
  isSelected: boolean;
}

export const QuizNodeRenderer: React.FC<Props> = ({ node }) => {
  return (
    <div className="w-full h-full bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between overflow-hidden cursor-move">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Interactive Knowledge Check</span>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {node.points || 10} pts
          </span>
        </div>

        <h3 className="text-sm font-semibold text-slate-800 leading-snug mb-3 line-clamp-3">
          {node.question || 'Enter your question prompt in the inspector...'}
        </h3>

        <div className="space-y-2">
          {(node.options || []).map((opt, idx) => (
            <div
              key={opt.id || idx}
              className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs transition-colors ${
                opt.isCorrect
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 font-medium'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700'
              }`}
            >
              {opt.isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <CircleDot className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-relaxed">{opt.text}</span>
              {opt.isCorrect && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded shrink-0">
                  Correct Answer
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Type: {node.quizType === 'multiple' ? 'Multiple Choice' : 'Single Select'}</span>
        <span>SCORM Graded</span>
      </div>
    </div>
  );
};
