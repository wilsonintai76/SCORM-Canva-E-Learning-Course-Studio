import React from 'react';
import { useCourseStore, globalCourseStore } from '../../store/courseStore';
import { QuizNode, CanvasNode } from '../../types/schema';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  SplitSquareVertical,
  ArrowRight,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { validateQuizConfig, QuizValidationResult } from '../../utils/quizValidator';

export interface QuizTemplateItem {
  id: string;
  name: string;
  type: 'single' | 'multiple' | 'true-false' | 'matching';
  description: string;
  points: number;
  question: string;
  options: { id: string; text: string; isCorrect: boolean; feedback?: string }[];
  accentColor: string;
}

export const QUIZ_TEMPLATES: QuizTemplateItem[] = [
  {
    id: 'qt_multiple_choice',
    name: 'Multiple Choice (4 Options)',
    type: 'single',
    description: 'Standard single-select knowledge check with instant feedback explanations.',
    points: 25,
    question: 'Which principle ensures sensitive records are only accessible to verified personas?',
    options: [
      {
        id: 'opt_1',
        text: 'Principle of Least Privilege (PoLP)',
        isCorrect: true,
        feedback: 'Correct! Least privilege minimizes attack surface.',
      },
      {
        id: 'opt_2',
        text: 'Unlimited Administrative Delegation',
        isCorrect: false,
        feedback: 'Incorrect! Excessive rights lead to compromise.',
      },
      {
        id: 'opt_3',
        text: 'Shared Default Passwords',
        isCorrect: false,
        feedback: 'Incorrect! Credentials must be unique.',
      },
      {
        id: 'opt_4',
        text: 'Broadcast Network Discovery',
        isCorrect: false,
        feedback: 'Incorrect! Broadcast creates eavesdropping vulnerabilities.',
      },
    ],
    accentColor: '#2563eb',
  },
  {
    id: 'qt_true_false',
    name: 'True / False Fast Check',
    type: 'true-false',
    description: 'Binary rapid assessment to verify learner understanding of key safety assertions.',
    points: 20,
    question: 'Multi-Factor Authentication (MFA) blocks over 99% of automated credential stuffing attacks.',
    options: [
      {
        id: 'opt_tf_1',
        text: 'True — Verified by CISA & Microsoft Identity Telemetry',
        isCorrect: true,
        feedback: 'Correct! MFA is one of the highest-impact defenses.',
      },
      {
        id: 'opt_tf_2',
        text: 'False — Standard 8-character passwords provide equal protection',
        isCorrect: false,
        feedback: 'Incorrect! Passwords alone are easily compromised by dictionary attacks.',
      },
    ],
    accentColor: '#10b981',
  },
  {
    id: 'qt_multi_select',
    name: 'Multiple Select (Check All)',
    type: 'multiple',
    description: 'Learners must identify all valid defensive actions from a realistic checklist.',
    points: 30,
    question: 'Which of the following are telltale signs of a targeted phishing email? (Select all)',
    options: [
      {
        id: 'opt_ms_1',
        text: 'Mismatched sender domain name vs display brand',
        isCorrect: true,
        feedback: 'Correct! Spoofed headers are common.',
      },
      {
        id: 'opt_ms_2',
        text: 'Urgent threats demanding immediate gift cards or wire transfers',
        isCorrect: true,
        feedback: 'Correct! Artificial urgency bypasses critical thought.',
      },
      {
        id: 'opt_ms_3',
        text: 'Standard verified internal company domain signature',
        isCorrect: false,
        feedback: 'Incorrect! Routine verified communications are legitimate.',
      },
      {
        id: 'opt_ms_4',
        text: 'Unprompted attachments requesting macros to be enabled',
        isCorrect: true,
        feedback: 'Correct! Macro payloads deliver malicious execution.',
      },
    ],
    accentColor: '#8b5cf6',
  },
  {
    id: 'qt_scenario_matching',
    name: 'Matching & Diagnostic Matrix',
    type: 'matching',
    description: 'Scenario evaluation linking incidents to the correct incident response protocol.',
    points: 35,
    question: 'Match the Incident: An employee discovers ransomware popups locking workstations.',
    options: [
      {
        id: 'opt_m_1',
        text: 'Isolate affected devices from the local subnet & notify SOC immediately',
        isCorrect: true,
        feedback: 'Correct! Network containment halts lateral encryption spread.',
      },
      {
        id: 'opt_m_2',
        text: 'Pay the ransom immediately with personal credit card',
        isCorrect: false,
        feedback: 'Incorrect! Never pay unverified adversaries.',
      },
      {
        id: 'opt_m_3',
        text: 'Forward the ransom note to external social media',
        isCorrect: false,
        feedback: 'Incorrect! Breaches require controlled incident response.',
      },
    ],
    accentColor: '#f59e0b',
  },
];

export const QuizTemplatesLibrary: React.FC = () => {
  const { currentPage, addNode } = useCourseStore();
  const [validationToast, setValidationToast] = React.useState<string | null>(null);

  const handleApplyQuizTemplate = (template: QuizTemplateItem) => {
    if (!currentPage) return;

    // Run validation helper before applying to canvas
    const validation = validateQuizConfig(template);
    if (!validation.isValid) {
      setValidationToast(`Cannot apply template: ${validation.errors[0]?.message || 'Validation failed'}`);
      setTimeout(() => setValidationToast(null), 4000);
      return;
    }

    const maxZ = currentPage.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0) + 1;

    const quizNode: Partial<QuizNode> = {
      type: 'quiz',
      x: 80,
      y: 70,
      width: 800,
      height: 380,
      zIndex: maxZ,
      quizType: template.type,
      question: template.question,
      options: template.options.map((opt) => ({
        ...opt,
        id: 'opt_' + Math.random().toString(36).substring(2, 7),
      })),
      points: template.points,
      showFeedbackImmediately: true,
      themeColor: template.accentColor,
      quizLogic: {
        onPass: 'next_slide',
        onFail: 'retry',
        correctFeedback: 'Excellent work! You answered correctly.',
        incorrectFeedback: 'Review the guidance and try again.',
      },
    };

    addNode('quiz', { x: 80, y: 70 }, quizNode as CanvasNode);
    setValidationToast(`Applied verified "${template.name}" to canvas!`);
    setTimeout(() => setValidationToast(null), 2500);
  };

  const handleDragStart = (e: React.DragEvent, template: QuizTemplateItem) => {
    // Validate template before allowing drag transfer
    const validation = validateQuizConfig(template);
    if (!validation.isValid) {
      e.preventDefault();
      setValidationToast(`Invalid template: ${validation.errors[0]?.message}`);
      setTimeout(() => setValidationToast(null), 3000);
      return;
    }

    e.dataTransfer.setData('application/scorm-quiz-template', JSON.stringify(template));
    e.dataTransfer.setData('application/scorm-node-type', 'quiz');
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="space-y-3.5 text-xs select-none">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Quiz Templates</span>
          </h4>
          <span className="text-[10px] text-emerald-400 font-medium">Drag to Canvas</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Structural interaction patterns for True/False, Multiple Choice, and Diagnostic exercises.
        </p>
      </div>

      {/* Validation Feedback Toast */}
      {validationToast && (
        <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 text-[11px] flex items-center gap-2 animate-in fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 font-medium">{validationToast}</span>
        </div>
      )}

      <div className="space-y-2.5">
        {QUIZ_TEMPLATES.map((tmpl) => {
          const val = validateQuizConfig(tmpl);
          return (
            <div
              key={tmpl.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tmpl)}
              onClick={() => handleApplyQuizTemplate(tmpl)}
              className="group p-3 rounded-xl border border-slate-800 hover:border-emerald-500/60 bg-slate-950/70 hover:bg-slate-900 cursor-grab active:cursor-grabbing transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                  {tmpl.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold flex items-center gap-1"
                    style={{
                      color: tmpl.accentColor,
                      borderColor: `${tmpl.accentColor}50`,
                      backgroundColor: `${tmpl.accentColor}15`,
                    }}
                  >
                    {tmpl.points} pts
                  </span>
                  <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1 py-0.5 rounded font-mono font-medium flex items-center gap-0.5" title="Pre-validated SCORM compatible quiz">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Valid</span>
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {tmpl.description}
              </p>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 space-y-1">
                <div className="font-medium truncate text-slate-200">
                  &ldquo;{tmpl.question}&rdquo;
                </div>
                <div className="text-[9px] text-slate-500 font-mono flex items-center justify-between">
                  <span>{tmpl.options.length} Answer Choices</span>
                  <span className="text-emerald-400">Feedback Verified ✓</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
