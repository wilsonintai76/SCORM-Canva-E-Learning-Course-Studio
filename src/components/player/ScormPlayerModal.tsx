import React, { useState, useEffect, useRef } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { ScormClient } from '../../scorm/client';
import { CanvasNode, QuizNode } from '../../types/schema';
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  CircleDot,
  Terminal,
  Trophy,
} from 'lucide-react';

export const ScormPlayerModal: React.FC = () => {
  const { isPreviewOpen, setIsPreviewOpen, course } = useCourseStore();

  const [client, setClient] = useState<ScormClient | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
  const [quizScores, setQuizScores] = useState<Record<string, number>>({});
  const [sessionScore, setSessionScore] = useState(0);
  const [lessonStatus, setLessonStatus] = useState<'incomplete' | 'passed' | 'completed'>('incomplete');
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const canvasWidth = course.canvasWidth || 960;
  const canvasHeight = course.canvasHeight || 540;
  const pages = course.pages || [];
  const passingScore = course.passingScore || 80;

  // Initialize SCORM session when modal opens
  useEffect(() => {
    if (!isPreviewOpen) return;

    const scorm = new ScormClient();
    scorm.initialize();
    setClient(scorm);

    const initialLogs: string[] = ['[LMS] LMSInitialize("") -> true'];

    // Check suspend data
    const suspend = scorm.getSuspendPayload();
    if (suspend && suspend.quizAnswers) {
      setQuizAnswers(suspend.quizAnswers);
      setQuizScores(suspend.quizScores || {});
    }

    const loc = parseInt(scorm.getLessonLocation(), 10);
    if (!isNaN(loc) && loc >= 0 && loc < pages.length) {
      setCurrentPageIndex(loc);
      initialLogs.push(`[LMS] Resumed at slide ${loc + 1} from cmi.core.lesson_location`);
    }

    setConsoleLogs(initialLogs);

    return () => {
      scorm.terminate();
    };
  }, [isPreviewOpen, pages.length]);

  // Recalculate scale on resize
  useEffect(() => {
    if (!isPreviewOpen) return;
    const updateScale = () => {
      const availW = window.innerWidth - 64;
      const availH = window.innerHeight - 180;
      const s = Math.min(availW / canvasWidth, availH / canvasHeight, 1.1);
      setScale(Math.max(s, 0.3));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isPreviewOpen, canvasWidth, canvasHeight]);

  // Score Calculation
  const calculateTotalScore = (updatedScores: Record<string, number>) => {
    let totalPossible = 0;
    let earned = 0;
    pages.forEach((p) => {
      p.nodes.forEach((n) => {
        if (n.type === 'quiz') {
          const q = n as QuizNode;
          const pts = q.points || 10;
          totalPossible += pts;
          if (updatedScores[q.id]) {
            earned += updatedScores[q.id];
          }
        }
      });
    });

    const pct = totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 100;
    return { earned, totalPossible, pct };
  };

  const handleSelectQuizOption = (nodeId: string, optionId: string, isCorrect: boolean, points: number) => {
    const nextAnswers = { ...quizAnswers, [nodeId]: [optionId] };
    const nextScores = { ...quizScores, [nodeId]: isCorrect ? points : 0 };
    setQuizAnswers(nextAnswers);
    setQuizScores(nextScores);

    const { pct } = calculateTotalScore(nextScores);
    setSessionScore(pct);

    if (client) {
      client.setScore(pct, 0, 100);
      client.saveSuspendPayload({
        currentPageIndex,
        quizAnswers: nextAnswers,
        quizScores: nextScores,
        percentageScore: pct,
      });

      const isPassed = pct >= passingScore;
      const isLastSlide = currentPageIndex === pages.length - 1;

      if (isPassed && isLastSlide) {
        client.setLessonStatus('passed');
        setLessonStatus('passed');
      } else if (isLastSlide) {
        client.setLessonStatus(isPassed ? 'passed' : 'completed');
        setLessonStatus(isPassed ? 'passed' : 'completed');
      }

      setConsoleLogs((prev) => [
        `[LMS] LMSSetValue('cmi.core.score.raw', '${pct}') -> true`,
        `[LMS] Quiz answered for #${nodeId.slice(-5)} (Score: ${pct}%)`,
        ...prev.slice(0, 30),
      ]);
    }
  };

  const goToPage = (idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPageIndex(idx);

    if (client) {
      client.setLessonLocation(idx);
      const isPassed = sessionScore >= passingScore;
      const isLastSlide = idx === pages.length - 1;

      if (isLastSlide) {
        const nextStatus = isPassed ? 'passed' : 'completed';
        client.setLessonStatus(nextStatus);
        setLessonStatus(nextStatus);
      }

      client.saveSuspendPayload({
        currentPageIndex: idx,
        quizAnswers,
        quizScores,
        percentageScore: sessionScore,
      });

      setConsoleLogs((prev) => [
        `[LMS] LMSSetValue('cmi.core.lesson_location', '${idx}') -> true`,
        ...prev.slice(0, 30),
      ]);
    }
  };

  const handleResetSession = () => {
    setCurrentPageIndex(0);
    setQuizAnswers({});
    setQuizScores({});
    setSessionScore(0);
    setLessonStatus('incomplete');
    if (client) {
      client.setLessonLocation(0);
      client.setScore(0, 0, 100);
      client.setLessonStatus('incomplete');
      client.saveSuspendPayload({});
      setConsoleLogs((prev) => ['[LMS] Reset session to initial state', ...prev.slice(0, 30)]);
    }
  };

  if (!isPreviewOpen) return null;

  const currentPage = pages[currentPageIndex];
  const progressPercent = pages.length > 0 ? ((currentPageIndex + 1) / pages.length) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between overflow-hidden select-none animate-in fade-in duration-150">
      {/* Player Header */}
      <header className="w-full h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white">
            SCORM 1.2 RUNTIME
          </span>
          <h2 className="text-sm font-semibold text-slate-100 truncate max-w-sm">
            {course.title}
          </h2>
        </div>

        {/* Progress Bar & Telemetry Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Progress:</span>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300 min-w-[32px]">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                lessonStatus === 'passed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : lessonStatus === 'completed'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {lessonStatus.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Score: {sessionScore}% (Req: {passingScore}%)
            </span>
          </div>

          <button
            onClick={() => setShowConsole(!showConsole)}
            title="Toggle Live SCORM Console Log"
            className={`p-1.5 rounded border transition-colors ${
              showConsole
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetSession}
            title="Restart Course / Reset Telemetry"
            className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPreviewOpen(false)}
            title="Close Preview"
            className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-red-950 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Slide Presentation Viewport */}
      <main className="flex-1 w-full flex items-center justify-center relative overflow-hidden p-4">
        {currentPage && (
          <div
            ref={stageRef}
            className="relative shadow-2xl rounded-xl overflow-hidden transition-transform duration-100 ease-out"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              background: currentPage.background?.value || '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Render Nodes */}
            {currentPage.nodes.map((node) => {
              if (node.type === 'text') {
                return (
                  <div
                    key={node.id}
                    className="absolute select-text"
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                      zIndex: node.zIndex || 1,
                      color: node.color || '#0f172a',
                      fontSize: `${node.fontSize || 16}px`,
                      fontWeight:
                        node.fontWeight === 'bold'
                          ? 700
                          : node.fontWeight === 'semibold'
                          ? 600
                          : 400,
                      textAlign: node.textAlign || 'left',
                      backgroundColor: node.backgroundColor,
                      borderRadius: node.borderRadius ? `${node.borderRadius}px` : undefined,
                      padding: node.padding ? `${node.padding}px` : undefined,
                      lineHeight: 1.35,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {node.content}
                  </div>
                );
              }

              if (node.type === 'image') {
                return (
                  <div
                    key={node.id}
                    className="absolute overflow-hidden"
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                      zIndex: node.zIndex || 1,
                      borderRadius: `${node.borderRadius || 0}px`,
                      opacity: node.opacity ?? 1,
                      boxShadow: node.shadow ? '0 10px 15px -3px rgba(0,0,0,0.2)' : undefined,
                    }}
                  >
                    <img
                      src={node.url}
                      alt={node.alt || 'Slide Asset'}
                      className="w-full h-full"
                      style={{ objectFit: node.objectFit || 'cover' }}
                    />
                  </div>
                );
              }

              if (node.type === 'shape') {
                return (
                  <div
                    key={node.id}
                    className="absolute"
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                      zIndex: node.zIndex || 1,
                      backgroundColor: node.fill || '#3b82f6',
                      borderRadius:
                        node.shapeType === 'circle'
                          ? '50%'
                          : node.borderRadius
                          ? `${node.borderRadius}px`
                          : '8px',
                      opacity: node.opacity ?? 1,
                    }}
                  />
                );
              }

              if (node.type === 'callout') {
                const isWarn = node.variant === 'warning';
                const isSuccess = node.variant === 'success';
                const isTip = node.variant === 'tip';

                return (
                  <div
                    key={node.id}
                    className={`absolute p-4 rounded-xl border-l-4 shadow-sm flex flex-col overflow-hidden ${
                      isWarn
                        ? 'bg-amber-50/95 border-amber-500 text-amber-950'
                        : isSuccess
                        ? 'bg-emerald-50/95 border-emerald-500 text-emerald-950'
                        : isTip
                        ? 'bg-indigo-50/95 border-indigo-500 text-indigo-950'
                        : 'bg-sky-50/95 border-sky-500 text-sky-950'
                    }`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                      zIndex: node.zIndex || 1,
                    }}
                  >
                    <h4 className="text-sm font-bold mb-1">{node.title || 'Note'}</h4>
                    <p className="text-xs leading-relaxed opacity-90">{node.content}</p>
                  </div>
                );
              }

              if (node.type === 'quiz') {
                const quiz = node as QuizNode;
                const selectedOpts = quizAnswers[quiz.id] || [];
                const answered = selectedOpts.length > 0;
                const currentOpt = quiz.options.find((o) => selectedOpts.includes(o.id));

                return (
                  <div
                    key={node.id}
                    className="absolute bg-white rounded-xl border border-slate-200/90 shadow-md p-6 flex flex-col justify-between"
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                      zIndex: node.zIndex || 1,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                          <HelpCircle className="w-4 h-4" />
                          <span>Knowledge Check</span>
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                          {quiz.points || 10} points
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 leading-snug mb-4">
                        {quiz.question}
                      </h3>

                      <div className="space-y-2.5">
                        {quiz.options.map((opt) => {
                          const isSelected = selectedOpts.includes(opt.id);

                          let buttonStyle = 'border-slate-200 bg-slate-50/80 hover:bg-blue-50/50 hover:border-blue-400 text-slate-800';
                          if (isSelected) {
                            if (opt.isCorrect) {
                              buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                            } else {
                              buttonStyle = 'border-red-500 bg-red-50 text-red-950 font-semibold ring-1 ring-red-500';
                            }
                          }

                          return (
                            <button
                              key={opt.id}
                              onClick={() =>
                                handleSelectQuizOption(
                                  quiz.id,
                                  opt.id,
                                  Boolean(opt.isCorrect),
                                  quiz.points || 10
                                )
                              }
                              className={`w-full text-left p-3 rounded-lg border text-xs flex items-center gap-3 transition-all cursor-pointer ${buttonStyle}`}
                            >
                              <CircleDot
                                className={`w-4 h-4 shrink-0 ${
                                  isSelected
                                    ? opt.isCorrect
                                      ? 'text-emerald-600'
                                      : 'text-red-600'
                                    : 'text-slate-400'
                                }`}
                              />
                              <span className="flex-1 leading-normal">{opt.text}</span>
                              {isSelected && opt.isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                  Correct
                                </span>
                              )}
                              {isSelected && !opt.isCorrect && (
                                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                  Incorrect
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Instant Feedback Explanation */}
                    {answered && currentOpt && (
                      <div
                        className={`mt-4 p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                          currentOpt.isCorrect
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                            : 'bg-red-50 text-red-900 border border-red-200'
                        }`}
                      >
                        {currentOpt.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold mb-0.5">
                            {currentOpt.isCorrect ? 'Correct!' : 'Incorrect'}
                          </div>
                          <p className="opacity-90 leading-relaxed">
                            {currentOpt.feedback ||
                              (currentOpt.isCorrect
                                ? 'Good job, your answer is verified.'
                                : 'Please review the slide material before proceeding.')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* Live Mini-Debugger Console Overlay */}
        {showConsole && (
          <div className="absolute bottom-6 right-6 w-96 max-h-64 bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl flex flex-col text-xs font-mono z-30">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Terminal className="w-3.5 h-3.5" />
                Live SCORM Call Stream
              </span>
              <button
                onClick={() => setConsoleLogs([])}
                className="text-[10px] hover:text-white text-slate-500"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-2 space-y-1 text-[11px] text-slate-300">
              {consoleLogs.map((log, i) => (
                <div key={i} className="truncate">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Player Navigation Footer */}
      <footer className="w-full h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8 shrink-0 z-20">
        <button
          onClick={() => goToPage(currentPageIndex - 1)}
          disabled={currentPageIndex === 0}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Slide</span>
        </button>

        <div className="flex items-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                i === currentPageIndex
                  ? 'bg-blue-500 scale-125'
                  : 'bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Jump to slide ${i + 1}`}
            />
          ))}
          <span className="text-xs text-slate-400 ml-2 font-mono">
            Slide {currentPageIndex + 1} of {pages.length}
          </span>
        </div>

        <button
          onClick={() => {
            if (currentPageIndex < pages.length - 1) {
              goToPage(currentPageIndex + 1);
            } else {
              // Final finish
              if (client) {
                const isPassed = sessionScore >= passingScore;
                client.setLessonStatus(isPassed ? 'passed' : 'completed');
                client.commit();
              }
              alert(`Course completed! Final Score: ${sessionScore}%`);
            }
          }}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <span>{currentPageIndex === pages.length - 1 ? 'Finish Course' : 'Next Slide'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
};
