import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { BranchingConnection } from '../../types/schema';
import {
  X,
  GitBranch,
  Plus,
  Trash2,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Compass,
  Shuffle,
  Sparkles,
  Info,
} from 'lucide-react';

export const BranchingFlowModal: React.FC = () => {
  const {
    isBranchingFlowOpen,
    setIsBranchingFlowOpen,
    course,
    addBranchingConnection,
    deleteBranchingConnection,
    setActivePage,
  } = useCourseStore();

  const [fromPageId, setFromPageId] = useState<string>(course.pages[0]?.id || '');
  const [toPageId, setToPageId] = useState<string>(course.pages[1]?.id || course.pages[0]?.id || '');
  const [condition, setCondition] = useState<'default' | 'passed' | 'failed' | 'choice'>('default');
  const [label, setLabel] = useState<string>('');
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  if (!isBranchingFlowOpen) return null;

  const branching = course.branching || [];

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromPageId || !toPageId || fromPageId === toPageId) return;

    const fromPage = course.pages.find((p) => p.id === fromPageId);
    const toPage = course.pages.find((p) => p.id === toPageId);

    const defaultLabel =
      condition === 'passed'
        ? 'Quiz Pass Route'
        : condition === 'failed'
        ? 'Quiz Fail Route'
        : condition === 'choice'
        ? 'Branch Option'
        : 'Next Slide';

    const newConn: BranchingConnection = {
      id: 'branch_' + Math.random().toString(36).substring(2, 9),
      fromPageId,
      toPageId,
      condition,
      label: label.trim() || defaultLabel,
    };

    addBranchingConnection(newConn);
    setLabel('');
  };

  const getConditionColor = (cond?: string) => {
    switch (cond) {
      case 'passed':
        return {
          stroke: '#10b981',
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-800',
          text: 'text-emerald-400',
        };
      case 'failed':
        return {
          stroke: '#f43f5e',
          bg: 'bg-rose-950/80',
          border: 'border-rose-800',
          text: 'text-rose-400',
        };
      case 'choice':
        return {
          stroke: '#f59e0b',
          bg: 'bg-amber-950/80',
          border: 'border-amber-800',
          text: 'text-amber-400',
        };
      default:
        return {
          stroke: '#3b82f6',
          bg: 'bg-blue-950/80',
          border: 'border-blue-800',
          text: 'text-blue-400',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-16 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Branching Flow Visual Editor
                <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-full">
                  {branching.length} Custom Branch Paths
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Design non-linear learning paths, quiz adaptive routing, and decision branches
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBranchingFlowOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace: Flow Canvas + Controls Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Visual Node Diagram (Left) */}
          <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col justify-between relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Course Slide Flowchart ({course.pages.length} Slides)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  Default
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Pass
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  Fail
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Choice
                </span>
              </div>
            </div>

            {/* Slide Node Cards with Inter-Node Connector Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              {course.pages.map((page, idx) => {
                const isSelected = selectedSlideId === page.id;
                const hasQuiz = page.nodes.some((n) => n.type === 'quiz');
                const outRoutes = branching.filter((b) => b.fromPageId === page.id);
                const inRoutes = branching.filter((b) => b.toPageId === page.id);

                return (
                  <div
                    key={page.id}
                    onClick={() => setSelectedSlideId(isSelected ? null : page.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Slide {idx + 1}
                      </span>
                      {hasQuiz && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                          Quiz Element
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-xs text-slate-100 mb-1 truncate">
                      {page.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">
                      {page.nodes.length} components · {page.background.value}
                    </p>

                    {/* Routing Badges */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                      {outRoutes.length > 0 ? (
                        outRoutes.map((route) => {
                          const targetIdx = course.pages.findIndex((p) => p.id === route.toPageId);
                          const style = getConditionColor(route.condition);
                          return (
                            <div
                              key={route.id}
                              className={`flex items-center justify-between px-2 py-1 rounded ${style.bg} ${style.border} border ${style.text}`}
                            >
                              <span className="flex items-center gap-1 truncate font-medium">
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                {route.label || 'Route'} &rarr; Slide {targetIdx + 1}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBranchingConnection(route.id);
                                }}
                                className="text-slate-400 hover:text-red-400 ml-1"
                                title="Remove connection"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-slate-500 italic text-[10px] flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 opacity-50" />
                          <span>Sequential (Next Slide)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick jump note */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-[11px] flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                SCORM Player dynamically executes these non-linear routing rules when learners answer quizzes or advance slides.
              </span>
            </div>
          </div>

          {/* Connect & Add Branch Form (Right Panel) */}
          <div className="w-80 bg-slate-950/80 border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto shrink-0 text-xs">
            <form onSubmit={handleAddBranch} className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                  <Plus className="w-4 h-4 text-sky-400" />
                  Add Custom Branch Route
                </h4>
                <p className="text-[11px] text-slate-400">
                  Connect any origin slide to a destination slide
                </p>
              </div>

              {/* Origin Slide */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Origin Slide (From)</label>
                <select
                  value={fromPageId}
                  onChange={(e) => setFromPageId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
                >
                  {course.pages.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      Slide {idx + 1}: {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Slide */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Destination Slide (To)</label>
                <select
                  value={toPageId}
                  onChange={(e) => setToPageId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
                >
                  {course.pages.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      Slide {idx + 1}: {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Branch Condition</label>
                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as 'default' | 'passed' | 'failed' | 'choice')
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="default">Default / Next Click</option>
                  <option value="passed">On Quiz Passed (&ge; Passing Score)</option>
                  <option value="failed">On Quiz Failed (&lt; Passing Score)</option>
                  <option value="choice">Learner Scenario Decision</option>
                </select>
              </div>

              {/* Custom Label */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Route Label</label>
                <input
                  type="text"
                  placeholder="e.g. Remediation Path, Fast Track"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={fromPageId === toPageId}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Connection</span>
              </button>
            </form>

            {/* Branch Summary & Reset */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>Active Connections</span>
                <span className="font-mono text-slate-300">{branching.length}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Non-linear paths are compiled into the SCORM manifest and interactive HTML5 player engine automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
