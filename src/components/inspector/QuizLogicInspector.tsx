import React from 'react';
import { QuizNode, QuizLogicConfig, Page } from '../../types/schema';
import { useCourseStore } from '../../store/courseStore';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  GitBranch,
  ArrowRight,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface Props {
  node: QuizNode;
  onUpdate: (updates: Partial<QuizNode>) => void;
}

export const QuizLogicInspector: React.FC<Props> = ({ node, onUpdate }) => {
  const { course } = useCourseStore();

  const quizLogic: QuizLogicConfig = node.quizLogic || {
    onPass: 'next_slide',
    onFail: 'retry',
    correctFeedback: 'Great job! You answered correctly.',
    incorrectFeedback: 'Not quite. Please review the material and try again.',
  };

  const handleUpdateLogic = (updates: Partial<QuizLogicConfig>) => {
    onUpdate({
      quizLogic: {
        ...quizLogic,
        ...updates,
      },
    });
  };

  const handleToggleCorrect = (idx: number) => {
    if (node.quizType === 'single' || node.quizType === 'true-false') {
      const nextOptions = node.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === idx,
      }));
      onUpdate({ options: nextOptions });
    } else {
      const nextOptions = [...node.options];
      nextOptions[idx] = {
        ...nextOptions[idx],
        isCorrect: !nextOptions[idx].isCorrect,
      };
      onUpdate({ options: nextOptions });
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Quiz Logic &amp; Routing
          </span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/80">
          {node.options.filter((o) => o.isCorrect).length} Correct
        </span>
      </div>

      {/* Answer Choice Validation Rules */}
      <div className="space-y-2">
        <label className="block text-slate-400 font-medium">
          Define Correct Answers ({node.quizType === 'single' ? 'Single Choice' : node.quizType === 'true-false' ? 'True/False' : 'Multiple Choices'})
        </label>
        <div className="space-y-2">
          {node.options.map((opt, idx) => (
            <div
              key={opt.id}
              onClick={() => handleToggleCorrect(idx)}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                opt.isCorrect
                  ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200'
                  : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {opt.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-200 truncate">{opt.text}</div>
                {opt.feedback && (
                  <div className="text-[10px] text-slate-400 mt-0.5 italic">
                    Feedback: &ldquo;{opt.feedback}&rdquo;
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Feedback Messages */}
      <div className="space-y-3 pt-3 border-t border-slate-800/80">
        <div>
          <label className="block text-emerald-400 font-medium mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Success Feedback Message</span>
          </label>
          <textarea
            rows={2}
            value={quizLogic.correctFeedback || ''}
            onChange={(e) => handleUpdateLogic({ correctFeedback: e.target.value })}
            placeholder="Feedback displayed when learner answers correctly..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-emerald-500 font-sans"
          />
        </div>

        <div>
          <label className="block text-amber-400 font-medium mb-1 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Incorrect Feedback Message</span>
          </label>
          <textarea
            rows={2}
            value={quizLogic.incorrectFeedback || ''}
            onChange={(e) => handleUpdateLogic({ incorrectFeedback: e.target.value })}
            placeholder="Feedback displayed when learner answers incorrectly..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>

      {/* Result Screen Routing */}
      <div className="space-y-3 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 mb-1">
          <GitBranch className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
            Result Screen Routing
          </span>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">On Correct / Passing Score:</label>
          <select
            value={quizLogic.onPass || 'next_slide'}
            onChange={(e) =>
              handleUpdateLogic({
                onPass: e.target.value as QuizLogicConfig['onPass'],
              })
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="next_slide">Advance to Next Slide</option>
            <option value="result_screen">Route to Final SCORM Result Screen</option>
            <option value="specific_slide">Jump to Specific Custom Slide...</option>
          </select>
        </div>

        {quizLogic.onPass === 'specific_slide' && (
          <div>
            <label className="block text-slate-400 mb-1">Target Slide on Pass:</label>
            <select
              value={quizLogic.targetSlideId || course.pages[0]?.id || ''}
              onChange={(e) => handleUpdateLogic({ targetSlideId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
            >
              {course.pages.map((p, i) => (
                <option key={p.id} value={p.id}>
                  Slide #{i + 1}: {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-slate-400 mb-1">On Incorrect / Failing Score:</label>
          <select
            value={quizLogic.onFail || 'retry'}
            onChange={(e) =>
              handleUpdateLogic({
                onFail: e.target.value as QuizLogicConfig['onFail'],
              })
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="retry">Allow Learner to Retry</option>
            <option value="review">Route to Topic Review Slide</option>
            <option value="next_slide">Continue to Next Slide Anyway</option>
          </select>
        </div>
      </div>
    </div>
  );
};
