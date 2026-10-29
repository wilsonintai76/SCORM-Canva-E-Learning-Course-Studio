import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { generateCourseWithAi } from '../../services/aiService';
import { Sparkles, X, Wand2, HelpCircle, BookOpen, Check } from 'lucide-react';

const SUGGESTED_TOPICS = [
  'HIPAA Compliance for Healthcare Workers',
  'Remote Work Cybersecurity & Zero Trust',
  'Conflict De-escalation & Active Listening',
  'Generative AI Safety & Ethics in Business',
  'Workplace Diversity & Micro-Aggression Awareness',
];

export const AiPalette: React.FC = () => {
  const { isAiPaletteOpen, setIsAiPaletteOpen, loadCourse, addNode } = useCourseStore();

  const [activeTab, setActiveTab] = useState<'course' | 'quiz'>('course');
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isAiPaletteOpen) return null;

  const handleGenerateCourse = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setSuccessMsg('');

    try {
      const generated = await generateCourseWithAi(topic, slideCount);
      loadCourse(generated);
      setSuccessMsg('Course successfully generated and loaded into canvas!');
      setTimeout(() => {
        setIsAiPaletteOpen(false);
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error('Course generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddQuizQuestion = () => {
    addNode('quiz');
    setIsAiPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-14 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI Course &amp; Content Palette</h3>
              <p className="text-[11px] text-slate-400">Powered by Gemini &amp; Instructional Intelligence</p>
            </div>
          </div>
          <button
            onClick={() => setIsAiPaletteOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
          <button
            onClick={() => setActiveTab('course')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'course'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Generate Full Course</span>
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'quiz'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Instant Quiz Generator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {activeTab === 'course' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  What subject or training topic do you want to teach?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Workplace Cybersecurity & Phishing Prevention..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateCourse();
                    }}
                  />
                </div>
              </div>

              {/* Topic chips */}
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-2">
                  Popular E-Learning Topics:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TOPICS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTopic(t)}
                      className="px-2.5 py-1 rounded-full border border-slate-800 bg-slate-950 text-slate-300 hover:border-blue-500 hover:text-white text-xs transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slide count */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-300">Course Length</div>
                  <div className="text-[11px] text-slate-400">Slides with interactive evaluation</div>
                </div>
                <div className="flex items-center gap-2">
                  {[3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSlideCount(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        slideCount === num
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Generate an interactive SCORM-scored knowledge check question for the current slide with realistic multiple-choice options, correct answers, and instructional feedback for learners.
              </p>
              <button
                onClick={handleAddQuizQuestion}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Insert Quiz Question into Active Slide</span>
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'course' && (
          <div className="h-16 bg-slate-950 border-t border-slate-800 flex items-center justify-end px-6 gap-3">
            <button
              onClick={() => setIsAiPaletteOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateCourse}
              disabled={isGenerating || !topic.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isGenerating ? 'Generating Slides...' : 'Generate Course'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
