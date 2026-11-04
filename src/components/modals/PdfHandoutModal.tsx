import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import {
  X,
  FileText,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Clock,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';

export const PdfHandoutModal: React.FC = () => {
  const { isPdfModalOpen, setIsPdfModalOpen, course } = useCourseStore();
  const [includeAnswerKeys, setIncludeAnswerKeys] = useState(true);
  const [includeSlideNotes, setIncludeSlideNotes] = useState(true);

  if (!isPdfModalOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const printArea = document.getElementById('printable-course-handout');
    if (!printArea) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${course.title} - Offline Course Handout</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; max-width: 860px; margin: 0 auto; background: #fff; }
    h1 { font-size: 26px; color: #0f172a; margin-bottom: 8px; }
    h2 { font-size: 20px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 32px; }
    h3 { font-size: 16px; color: #334155; margin-top: 16px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #e0f2fe; color: #0369a1; margin-right: 8px; }
    .slide-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; margin-bottom: 28px; page-break-after: always; background: #f8fafc; }
    .notes-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 16px; font-size: 13px; color: #92400e; border-radius: 0 4px 4px 0; }
    .quiz-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin-top: 16px; }
    .quiz-option { padding: 6px 10px; margin: 4px 0; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 13px; background: #fff; }
    .quiz-option.correct { background: #dcfce7; border-color: #86efac; font-weight: 600; color: #166534; }
    @media print {
      body { padding: 0; }
      .slide-card { page-break-after: always; box-shadow: none; border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>
  ${printArea.innerHTML}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = course.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    a.href = url;
    a.download = `${safeTitle}_handout.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-4xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-16 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Formatted Course Handout &amp; PDF Export
              </h3>
              <p className="text-[11px] text-slate-400">
                Print-ready study guide, instructor review booklet, and offline transcript
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              title="Download standalone HTML document"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Download HTML</span>
            </button>
            <button
              onClick={handlePrint}
              title="Open browser print dialog to Save as PDF"
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={() => setIsPdfModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Options Bar */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={includeAnswerKeys}
                onChange={(e) => setIncludeAnswerKeys(e.target.checked)}
                className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-900"
              />
              <span className="text-[11px]">Reveal Answer Keys &amp; Feedback</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={includeSlideNotes}
                onChange={(e) => setIncludeSlideNotes(e.target.checked)}
                className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-900"
              />
              <span className="text-[11px]">Include Slide Notes &amp; Scripts</span>
            </label>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {course.pages.length} Slides · Passing Score: {course.passingScore}%
          </span>
        </div>

        {/* Document Preview Pane (Styled for White Paper Print Simulation) */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 flex justify-center">
          <div
            id="printable-course-handout"
            className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-xl p-8 space-y-8 select-text"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-200 pb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4" />
                <span>Course Reference &amp; Study Guide</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h1>
              <p className="text-sm text-slate-600 mb-4">{course.description}</p>

              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="px-2.5 py-1 bg-slate-100 rounded-md font-medium">
                  Author: {course.author || 'Instructional Designer'}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md font-medium">
                  Version: {course.version}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md font-medium">
                  Estimated Duration: {course.estimatedMinutes} mins
                </span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md font-medium border border-emerald-200">
                  Passing Score: {course.passingScore}%
                </span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md font-medium">
                  Date: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Slide Outline */}
            <div className="space-y-6">
              {course.pages.map((page, idx) => {
                const textNodes = page.nodes.filter((n) => n.type === 'text');
                const quizNodes = page.nodes.filter((n) => n.type === 'quiz');
                const calloutNodes = page.nodes.filter((n) => n.type === 'callout');
                const imageNodes = page.nodes.filter((n) => n.type === 'image');

                return (
                  <div
                    key={page.id}
                    className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 shadow-sm break-inside-avoid"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-mono text-xs font-bold">
                          Slide {idx + 1}
                        </span>
                        <h2 className="text-base font-bold text-slate-900">{page.title}</h2>
                      </div>
                      <span className="text-xs text-slate-400">
                        {page.nodes.length} components
                      </span>
                    </div>

                    {/* Text nodes content */}
                    {textNodes.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {textNodes.map((n) => {
                          const t = n as any;
                          return (
                            <p
                              key={n.id}
                              className="text-sm text-slate-700 leading-relaxed font-normal"
                            >
                              {t.content}
                            </p>
                          );
                        })}
                      </div>
                    )}

                    {/* Images summary */}
                    {imageNodes.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {imageNodes.map((n) => {
                          const img = n as any;
                          return (
                            <div
                              key={n.id}
                              className="border border-slate-200 rounded-lg overflow-hidden bg-white p-2"
                            >
                              <img
                                src={img.url}
                                alt={img.alt || 'Slide graphic'}
                                className="w-full h-32 object-cover rounded"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                              <p className="text-[11px] text-slate-500 mt-1 italic">
                                Figure: {img.alt || 'Course Illustration'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Callouts */}
                    {calloutNodes.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {calloutNodes.map((n) => {
                          const callout = n as any;
                          return (
                            <div
                              key={n.id}
                              className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg text-xs text-blue-900"
                            >
                              <div className="font-bold mb-0.5">{callout.title}</div>
                              <div>{callout.content}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quizzes & Assessments */}
                    {quizNodes.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {quizNodes.map((n) => {
                          const q = n as any;
                          return (
                            <div
                              key={n.id}
                              className="border border-emerald-300 bg-emerald-50/60 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                                  Knowledge Check ({q.points || 10} Points)
                                </span>
                                <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                  {q.quizType || 'Single Choice'}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-900 mb-3">
                                {q.question}
                              </p>

                              <div className="space-y-1.5">
                                {q.options.map((opt: any, oIdx: number) => {
                                  const isCorrect = opt.isCorrect;
                                  return (
                                    <div
                                      key={opt.id || oIdx}
                                      className={`p-2 rounded text-xs border flex items-center justify-between ${
                                        includeAnswerKeys && isCorrect
                                          ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-semibold'
                                          : 'bg-white border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <span>
                                        {String.fromCharCode(65 + oIdx)}. {opt.text}
                                      </span>
                                      {includeAnswerKeys && isCorrect && (
                                        <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          Correct Answer
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {includeAnswerKeys && q.explanation && (
                                <div className="mt-3 text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                                  <span className="font-semibold text-slate-800">
                                    Explanation:{' '}
                                  </span>
                                  {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Slide notes / Voiceover Narration */}
                    {includeSlideNotes && (page.notes || page.audioNarration?.name) && (
                      <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg text-xs text-amber-900">
                        <div className="font-bold flex items-center gap-1 mb-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Instructor Notes / Narration Transcript:</span>
                        </div>
                        <p className="text-amber-800">
                          {page.notes ||
                            `Audio file: ${page.audioNarration?.name || 'Voiceover recorded'}`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Document Footer */}
            <div className="text-center pt-6 border-t border-slate-200 text-xs text-slate-400">
              End of course handout · Generated with SCORM Canva Authoring Studio
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
