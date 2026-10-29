import React, { useMemo } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { auditCourseAccessibility, AccessibilityIssue } from '../../utils/accessibilityAuditor';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Wand2,
  Eye,
  Info,
} from 'lucide-react';

export const AccessibilityModal: React.FC = () => {
  const {
    course,
    isAccessibilityModalOpen,
    setIsAccessibilityModalOpen,
    setActivePage,
    setSelectedNodeId,
    updateNode,
  } = useCourseStore();

  const audit = useMemo(() => auditCourseAccessibility(course), [course]);

  if (!isAccessibilityModalOpen) return null;

  // Jump to element on slide
  const handleJumpToIssue = (issue: AccessibilityIssue) => {
    setActivePage(issue.pageIndex);
    if (issue.nodeId) {
      setSelectedNodeId(issue.nodeId);
    }
    setIsAccessibilityModalOpen(false);
  };

  // Auto-fix issue
  const handleAutoFix = (issue: AccessibilityIssue) => {
    if (!issue.nodeId || !issue.autoFixType || !issue.suggestedFix) return;

    if (issue.autoFixType === 'add_alt') {
      updateNode(issue.nodeId, { alt: issue.suggestedFix as string });
    } else if (issue.autoFixType === 'fix_contrast') {
      updateNode(issue.nodeId, { color: issue.suggestedFix as string });
    } else if (issue.autoFixType === 'increase_font_size') {
      updateNode(issue.nodeId, { fontSize: issue.suggestedFix as number });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
    if (score >= 70) return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/30';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                WCAG 2.1 Accessibility Auditor
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400">
                  Level {audit.wcagLevel}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Automated accessibility compliance scan for images, contrast ratios, and text sizing
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAccessibilityModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Score Banner */}
          <div className="grid grid-cols-4 gap-3">
            <div
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(
                audit.score
              )}`}
            >
              <span className="text-2xl font-black">{audit.score}%</span>
              <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5">
                Accessibility Score
              </span>
            </div>

            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 flex flex-col items-center justify-center text-center text-rose-300">
              <span className="text-xl font-bold">{audit.criticalCount}</span>
              <span className="text-[10px] font-medium text-slate-400">Critical Issues</span>
            </div>

            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col items-center justify-center text-center text-amber-300">
              <span className="text-xl font-bold">{audit.warningCount}</span>
              <span className="text-[10px] font-medium text-slate-400">Warnings</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col items-center justify-center text-center text-emerald-300">
              <span className="text-xl font-bold">{audit.passedChecks.length}</span>
              <span className="text-[10px] font-medium text-slate-400">Passed Standards</span>
            </div>
          </div>

          {/* Issues List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Detected Compliance Findings ({audit.issues.length})
              </h4>
            </div>

            {audit.issues.length === 0 ? (
              <div className="p-6 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                <h5 className="text-sm font-bold text-white">Outstanding Accessibility!</h5>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  All images have descriptive alt text, all typography adheres to WCAG 2.1 AA color
                  contrast requirements, and text sizing is legible.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {audit.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {issue.severity === 'critical' ? (
                          <div className="p-1 rounded bg-rose-500/20 text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded bg-amber-500/20 text-amber-400">
                            <Info className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{issue.title}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                              {issue.pageTitle}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-blue-400 block mt-0.5">
                            {issue.wcagCriterion}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {issue.autoFixType && (
                          <button
                            onClick={() => handleAutoFix(issue)}
                            title="Apply recommended automated fix"
                            className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 hover:text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Auto Fix</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleJumpToIssue(issue)}
                          title="Navigate to element on slide"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-sky-400" />
                          <span>Locate</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Recommendation:</span>{' '}
                      {issue.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Passed Checks Section */}
          {audit.passedChecks.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Passed Compliance Rules
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {audit.passedChecks.map((check, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center gap-2 text-xs text-slate-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Standards Grounding: WCAG 2.1 Level AA Guidelines</span>
          <button
            onClick={() => setIsAccessibilityModalOpen(false)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
