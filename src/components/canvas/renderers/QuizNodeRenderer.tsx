import React from 'react';
import { QuizNode } from '../../../types/schema';
import { CheckCircle2, CircleDot, HelpCircle, CheckSquare, Square, SplitSquareVertical } from 'lucide-react';

interface Props {
  node: QuizNode;
  isSelected: boolean;
}

export const QuizNodeRenderer: React.FC<Props> = ({ node }) => {
  const accent = node.themeColor || '#2563eb';
  const isMulti = node.quizType === 'multiple';
  const isTF = node.quizType === 'true-false';
  const isMatching = node.quizType === 'matching';

  const typeLabel = isMulti
    ? 'Multiple Select (Check All)'
    : isTF
    ? 'True / False Check'
    : isMatching
    ? 'Diagnostic Matching'
    : 'Multiple Choice';

  return (
    <div className="w-full h-full bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between overflow-hidden cursor-move">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md"
            style={{
              color: accent,
              backgroundColor: `${accent}15`,
            }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Interactive Knowledge Check</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase font-mono"
              style={{
                color: accent,
                backgroundColor: `${accent}10`,
                border: `1px solid ${accent}30`,
              }}
            >
              {typeLabel}
            </span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {node.points || 10} pts
            </span>
          </div>
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
              {isMulti ? (
                opt.isCorrect ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )
              ) : opt.isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <CircleDot className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-relaxed">{opt.text}</span>
              {opt.isCorrect && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded shrink-0">
                  Correct Choice
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>SCORM 1.2 Graded Assessment</span>
        <span className="font-mono text-[10px]">
          {node.options?.filter((o) => o.isCorrect).length || 0} Correct / {node.options?.length || 0} Total
        </span>
      </div>
    </div>
  );
};
