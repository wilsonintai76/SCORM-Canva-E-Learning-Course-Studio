import React from 'react';
import { QuizNode, QuizOption } from '../../types/schema';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  node: QuizNode;
  onUpdate: (updates: Partial<QuizNode>) => void;
}

export const QuizInspector: React.FC<Props> = ({ node, onUpdate }) => {
  const handleAddOption = () => {
    const newOpt: QuizOption = {
      id: 'opt_' + Math.random().toString(36).substring(2, 7),
      text: `New Answer Option ${node.options.length + 1}`,
      isCorrect: false,
      feedback: '',
    };
    onUpdate({ options: [...node.options, newOpt] });
  };

  const handleUpdateOption = (index: number, updates: Partial<QuizOption>) => {
    const nextOptions = [...node.options];
    nextOptions[index] = { ...nextOptions[index], ...updates };
    onUpdate({ options: nextOptions });
  };

  const handleSetCorrect = (index: number) => {
    // If single choice or true-false, only 1 option is correct
    const nextOptions = node.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    onUpdate({ options: nextOptions });
  };

  const handleDeleteOption = (index: number) => {
    if (node.options.length <= 2) return;
    const nextOptions = node.options.filter((_, i) => i !== index);
    onUpdate({ options: nextOptions });
  };

  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="block text-slate-400 font-medium mb-1.5">Question Prompt</label>
        <textarea
          rows={3}
          value={node.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 font-sans resize-y"
        />
      </div>

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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-400 font-medium">Answer Choices (click circle to set correct)</label>
          <button
            onClick={handleAddOption}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium"
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
                  title="Mark as correct answer"
                  onClick={() => handleSetCorrect(idx)}
                  className="shrink-0 text-slate-400 hover:text-emerald-400"
                >
                  {opt.isCorrect ? (
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
                    className="text-slate-500 hover:text-red-400 p-1"
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
                  placeholder="Feedback explanation shown to learner..."
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
