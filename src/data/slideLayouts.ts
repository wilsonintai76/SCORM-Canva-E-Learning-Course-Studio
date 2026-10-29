import { TextNode, ImageNode, QuizNode, ShapeNode, CalloutNode } from '../types/schema';

export type LayoutNode =
  | Omit<TextNode, 'id'>
  | Omit<ImageNode, 'id'>
  | Omit<QuizNode, 'id'>
  | Omit<ShapeNode, 'id'>
  | Omit<CalloutNode, 'id'>;

export interface SlideLayout {
  id: string;
  category: 'intro' | 'content' | 'quiz' | 'conclusion';
  title: string;
  description: string;
  badge?: string;
  background: {
    type: 'color' | 'gradient';
    value: string;
  };
  nodes: LayoutNode[];
}

export const SLIDE_LAYOUTS: SlideLayout[] = [
  // 1. INTRO / HERO
  {
    id: 'layout_intro_hero',
    category: 'intro',
    title: 'Hero Intro & Objective',
    description: 'Impactful title, course badge, learning objective callout, and side hero imagery.',
    badge: 'Standard Intro',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    },
    nodes: [
      {
        type: 'shape',
        shapeType: 'rounded-rect',
        x: 60,
        y: 60,
        width: 140,
        height: 32,
        fill: '#3b82f6',
        borderRadius: 16,
        opacity: 1,
        zIndex: 1,
      },
      {
        type: 'text',
        x: 60,
        y: 65,
        width: 140,
        height: 24,
        content: 'MODULE OVERVIEW',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        zIndex: 2,
      },
      {
        type: 'text',
        x: 60,
        y: 110,
        width: 520,
        height: 110,
        content: 'Course Title & Core Subject Headline',
        fontSize: 38,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'left',
        zIndex: 2,
      },
      {
        type: 'text',
        x: 60,
        y: 235,
        width: 480,
        height: 90,
        content: 'Provide learners with high-level context, real-world relevance, and what competencies they will acquire throughout this instructional module.',
        fontSize: 16,
        fontWeight: 'normal',
        color: '#94a3b8',
        textAlign: 'left',
        zIndex: 2,
      },
      {
        type: 'callout',
        x: 60,
        y: 345,
        width: 480,
        height: 110,
        variant: 'tip',
        title: 'Core Learning Objective',
        content: 'Demonstrate comprehension of standard operating protocols and achieve passing score on final evaluation.',
        zIndex: 2,
      },
      {
        type: 'image',
        x: 570,
        y: 65,
        width: 330,
        height: 400,
        url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80',
        alt: 'Course Cover Photo',
        objectFit: 'cover',
        borderRadius: 16,
        opacity: 0.95,
        shadow: true,
        zIndex: 2,
      },
    ],
  },

  // 2. 3-PILLAR COMPARISON
  {
    id: 'layout_content_pillars',
    category: 'content',
    title: '3-Pillar Framework',
    description: 'Header with 3 balanced concept cards: Info, Warning, and Actionable Pro-Tips.',
    badge: 'Popular',
    background: {
      type: 'color',
      value: '#f8fafc',
    },
    nodes: [
      {
        type: 'text',
        x: 60,
        y: 45,
        width: 840,
        height: 45,
        content: 'Key Principles & Operational Guidelines',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'left',
        zIndex: 2,
      },
      {
        type: 'text',
        x: 60,
        y: 95,
        width: 840,
        height: 30,
        content: 'Examine each pillar carefully before proceeding to next operational stage:',
        fontSize: 15,
        fontWeight: 'normal',
        color: '#64748b',
        textAlign: 'left',
        zIndex: 2,
      },
      {
        type: 'callout',
        x: 60,
        y: 145,
        width: 260,
        height: 325,
        variant: 'info',
        title: '1. Assessment Phase',
        content: 'Evaluate current state telemetry, baseline operational requirements, and preliminary compliance variables.',
        zIndex: 2,
      },
      {
        type: 'callout',
        x: 350,
        y: 145,
        width: 260,
        height: 325,
        variant: 'warning',
        title: '2. Critical Risk Check',
        content: 'Identify failure points, regulatory boundaries, and unmitigated exposure vectors before rollout.',
        zIndex: 2,
      },
      {
        type: 'callout',
        x: 640,
        y: 145,
        width: 260,
        height: 325,
        variant: 'tip',
        title: '3. Execution & Action',
        content: 'Deploy verified standard procedures, monitor immediate feedback indicators, and log telemetry.',
        zIndex: 2,
      },
    ],
  },

  // 3. SPLIT CONTENT & MEDIA
  {
    id: 'layout_split_media',
    category: 'content',
    title: 'Split Content & Diagram',
    description: 'Two-column layout balancing structured instructional text with featured visual media.',
    badge: 'Content',
    background: {
      type: 'color',
      value: '#ffffff',
    },
    nodes: [
      {
        type: 'text',
        x: 60,
        y: 60,
        width: 460,
        height: 80,
        content: 'Workflow Architecture & Execution Details',
        fontSize: 30,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'left',
        zIndex: 2,
      },
      {
        type: 'text',
        x: 60,
        y: 155,
        width: 440,
        height: 120,
        content: 'Reliable execution relies on clear handoffs between distributed team members. When unexpected exceptions arise, follow designated fallback channels to avoid systemic disruption.',
        fontSize: 15,
        fontWeight: 'normal',
        color: '#475569',
        textAlign: 'left',
        zIndex: 2,
      },
      {
        type: 'callout',
        x: 60,
        y: 295,
        width: 440,
        height: 160,
        variant: 'tip',
        title: 'Best Practice Standard',
        content: 'Always document anomalies in real-time. Continuous logging eliminates post-incident ambiguities and accelerates retrospective reviews.',
        zIndex: 2,
      },
      {
        type: 'image',
        x: 530,
        y: 60,
        width: 370,
        height: 395,
        url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=700&q=80',
        alt: 'Execution workflow diagram',
        objectFit: 'cover',
        borderRadius: 14,
        opacity: 1,
        shadow: true,
        zIndex: 2,
      },
    ],
  },

  // 4. INTERACTIVE QUIZ
  {
    id: 'layout_quiz_scenario',
    category: 'quiz',
    title: 'Knowledge Check Quiz',
    description: 'SCORM graded interactive multiple-choice evaluation with instant learner feedback.',
    badge: 'SCORM Graded',
    background: {
      type: 'color',
      value: '#f1f5f9',
    },
    nodes: [
      {
        type: 'quiz',
        x: 80,
        y: 50,
        width: 800,
        height: 440,
        quizType: 'single',
        question: 'Scenario Question: You encounter a process deviation that violates standard quality thresholds. What is the mandatory next step?',
        options: [
          {
            id: 'opt_q1',
            text: 'Immediately pause the workflow, log the variance, and report to the supervisor per protocol.',
            isCorrect: true,
            feedback: 'Correct! Halting the process and reporting ensures compliance and isolates root causes.',
          },
          {
            id: 'opt_q2',
            text: 'Ignore the threshold violation and proceed to meet deadlines.',
            isCorrect: false,
            feedback: 'Incorrect! Proceeding with known variances causes downstream failures.',
          },
          {
            id: 'opt_q3',
            text: 'Delete the log entry to preserve positive compliance metrics.',
            isCorrect: false,
            feedback: 'Incorrect! Falsifying compliance logs violates organizational governance.',
          },
        ],
        points: 100,
        showFeedbackImmediately: true,
        zIndex: 2,
      },
    ],
  },

  // 5. CONCLUSION & LMS TELEMETRY
  {
    id: 'layout_conclusion_lms',
    category: 'conclusion',
    title: 'LMS Completion & Summary',
    description: 'Celebratory completion badge, key takeaways recap, and SCORM status confirmation.',
    badge: 'Completion',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)',
    },
    nodes: [
      {
        type: 'text',
        x: 80,
        y: 75,
        width: 800,
        height: 60,
        content: 'Module Complete! Mastery Achieved',
        fontSize: 36,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        zIndex: 2,
      },
      {
        type: 'text',
        x: 140,
        y: 150,
        width: 680,
        height: 80,
        content: 'You have successfully reviewed all foundational lessons and demonstrated proficiency in the knowledge verification challenge.',
        fontSize: 16,
        fontWeight: 'normal',
        color: '#a7f3d0',
        textAlign: 'center',
        zIndex: 2,
      },
      {
        type: 'callout',
        x: 180,
        y: 255,
        width: 600,
        height: 180,
        variant: 'success',
        title: 'SCORM 1.2 Telemetry Committed',
        content: 'Your completion status (cmi.core.lesson_status: passed) and final score have been transmitted to your Learning Management System. You may now close this window or return to your course catalog.',
        zIndex: 2,
      },
    ],
  },
];
