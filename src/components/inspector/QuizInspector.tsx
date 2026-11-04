import React from 'react';
import { QuizNode, QuizOption } from '../../types/schema';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { validateQuizConfig } from '../../utils/quizValidator';

interface Props {
  node: QuizNode;
  onUpdate: (updates: Partial<QuizNode>) => void;
}

export const QuizInspector: React.FC<Props> = ({ node, onUpdate }) => {
  const validation = validateQuizConfig(node);

  const handleAddOption = () => {
    const newOpt: QuizOption = {
      id: 'opt_' + Math.random().toString(36).substring(2, 7),
      text: `New Answer Option ${node.options.length + 1}`,
      isCorrect: false,
      feedback: 'Explanation for learner...',
    };
    onUpdate({ options: [...node.options, newOpt] });
  };

  const handleUpdateOption = (index: number, updates: Partial<QuizOption>) => {
    const nextOptions = [...node.options];
    nextOptions[index] = { ...nextOptions[index], ...updates };
    onUpdate({ options: nextOptions });
  };

  const handleSetCorrect = (index: number) => {
    if (node.quizType === 'multiple') {
      // Toggle for multi-select
      const nextOptions = node.options.map((opt, i) =>
        i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt
      );
      onUpdate({ options: nextOptions });
    } else {
      // Single choice or true-false: exactly 1 choice is correct
      const nextOptions = node.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      onUpdate({ options: nextOptions });
    }
  };

  const handleSetTrueFalsePreset = () => {
    onUpdate({
      quizType: 'true-false',
      options: [
        {
          id: 'opt_tf_1',
          text: 'True',
          isCorrect: true,
          feedback: 'Correct! This statement is accurate.',
        },
        {
          id: 'opt_tf_2',
          text: 'False',
          isCorrect: false,
          feedback: 'Incorrect! This statement is actually true.',
        },
      ],
    });
  };

  const handleDeleteOption = (index: number) => {
    if (node.options.length <= 2) return;
    const nextOptions = node.options.filter((_, i) => i !== index);
    onUpdate({ options: nextOptions });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Live SCORM Validation Status Panel */}
      <div
        className={`p-3 rounded-xl border transition-all ${
          validation.isValid
            ? validation.warnings.length > 0
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-red-950/40 border-red-500/50 text-red-200'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            {validation.isValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{validation.isValid ? 'Quiz SCORM Valid' : 'Missing Required Fields'}</span>
          </div>
          <span
            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-semibold ${
              validation.isValid ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'
            }`}
          >
            {validation.isValid ? 'Ready to grade' : 'Action required'}
          </span>
        </div>

        {!validation.isValid && (
          <ul className="mt-1.5 space-y-1 text-[11px] list-disc list-inside text-red-300/90 leading-tight">
            {validation.errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        )}

        {validation.isValid && validation.warnings.length > 0 && (
          <ul className="mt-1.5 space-y-1 text-[10px] text-amber-300/80 leading-tight">
            {validation.warnings.map((warn, i) => (
              <li key={i}>• {warn.message}</li>
            ))}
          </ul>
        )}

        {validation.isValid && validation.warnings.length === 0 && (
          <p className="text-[10px] text-emerald-300/80 mt-0.5">
            Prompt, choices, correct answers, and feedback messages are properly configured.
          </p>
        )}
      </div>

      {/* Quiz Interaction Type */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-slate-400 font-medium">Quiz Interaction Type</label>
          {node.quizType === 'true-false' && (
            <button
              type="button"
              onClick={handleSetTrueFalsePreset}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Format True/False</span>
            </button>
          )}
        </div>
        <select
          value={node.quizType || 'single'}
          onChange={(e) => onUpdate({ quizType: e.target.value as any })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500 font-medium"
        >
          <option value="single">Multiple Choice (Single Answer)</option>
          <option value="multiple">Multiple Select (Check All That Apply)</option>
          <option value="true-false">True / False Fast Check</option>
          <option value="matching">Scenario &amp; Diagnostic Matching</option>
        </select>
      </div>

      {/* Question Prompt */}
      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Question Prompt</label>
        <textarea
          rows={3}
          value={node.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          placeholder="e.g. Which defensive control best mitigates phishing..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 font-sans resize-y"
        />
      </div>

      {/* Points & Feedback Mode */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Score Points</label>
          <input
            type="number"
            min={1}
            max={500}
            value={node.points || 10}
            onChange={(e) => onUpdate({ points: Number(e.target.value) || 10 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Feedback Mode</label>
          <select
            value={node.showFeedbackImmediately ? 'true' : 'false'}
            onChange={(e) => onUpdate({ showFeedbackImmediately: e.target.value === 'true' })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="true">Instant Feedback</option>
            <option value="false">On Course Finish</option>
          </select>
        </div>
      </div>

      {/* Answer Choices */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-400 font-medium">
            {node.quizType === 'multiple'
              ? 'Answer Choices (check all correct options)'
              : 'Answer Choices (click to select correct option)'}
          </label>
          <button
            onClick={handleAddOption}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Option</span>
          </button>
        </div>

        <div className="space-y-3">
          {node.options.map((opt, idx) => (
            <div
              key={opt.id}
              className={`p-2.5 rounded-lg border transition-colors ${
                opt.isCorrect
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-slate-800 bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  title={
                    node.quizType === 'multiple'
                      ? 'Toggle correct answer'
                      : 'Mark as single correct answer'
                  }
                  onClick={() => handleSetCorrect(idx)}
                  className="shrink-0 text-slate-400 hover:text-emerald-400 cursor-pointer"
                >
                  {node.quizType === 'multiple' ? (
                    opt.isCorrect ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )
                  ) : opt.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600" />
                  )}
                </button>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleUpdateOption(idx, { text: e.target.value })}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 text-xs outline-none focus:border-blue-500"
                />
                {node.options.length > 2 && (
                  <button
                    onClick={() => handleDeleteOption(idx)}
                    className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                    title="Remove Option"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <input
                  type="text"
                  value={opt.feedback || ''}
                  onChange={(e) => handleUpdateOption(idx, { feedback: e.target.value })}
                  placeholder="Feedback explanation shown to learner when selected..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-slate-400 text-[11px] outline-none focus:border-slate-600"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
