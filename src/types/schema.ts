/**
 * Course and Manifest Schema for SCORM Canva
 */

export type NodeType = 'text' | 'image' | 'quiz' | 'shape' | 'callout';

export interface BaseNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  groupId?: string;
  isLocked?: boolean;
  isHidden?: boolean;
  name?: string;
  animation?: {
    enter: 'none' | 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'bounce';
    exit?: 'none' | 'fade' | 'slide-down' | 'zoom';
    duration?: number;
  };
}

export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'semibold' | 'bold' | 'black';
  fontStyle?: 'normal' | 'italic';
  fontFamily?: string;
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ImageNode extends BaseNode {
  type: 'image';
  url: string;
  alt: string;
  objectFit: 'cover' | 'contain' | 'fill';
  borderRadius: number;
  opacity: number;
  borderColor?: string;
  borderWidth?: number;
  shadow?: boolean;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface QuizLogicConfig {
  onPass?: 'next_slide' | 'result_screen' | 'specific_slide';
  onFail?: 'retry' | 'review' | 'next_slide';
  targetSlideId?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
}

export interface QuizNode extends BaseNode {
  type: 'quiz';
  quizType: 'single' | 'multiple' | 'true-false' | 'matching';
  question: string;
  options: QuizOption[];
  explanation?: string;
  points: number;
  showFeedbackImmediately: boolean;
  themeColor?: string;
  quizLogic?: QuizLogicConfig;
}

export interface ShapeNode extends BaseNode {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'rounded-rect' | 'badge' | 'line';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity: number;
  borderRadius?: number;
}

export interface CalloutNode extends BaseNode {
  type: 'callout';
  title: string;
  content: string;
  variant: 'info' | 'warning' | 'success' | 'tip';
  icon?: string;
}

export type CanvasNode = TextNode | ImageNode | QuizNode | ShapeNode | CalloutNode;

export interface PageTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom';
  duration: number;
}

export interface AudioNarration {
  audioUrl?: string;
  name?: string;
  duration?: number;
  autoPlay?: boolean;
  waveform?: number[];
}

export interface Page {
  id: string;
  title: string;
  width: number;
  height: number;
  background: {
    type: 'color' | 'gradient';
    value: string;
  };
  nodes: CanvasNode[];
  transition?: PageTransition;
  audioNarration?: AudioNarration;
  notes?: string;
}

export interface CanvasComment {
  id: string;
  pageId: string;
  x: number;
  y: number;
  author: string;
  text: string;
  createdAt: string;
  color?: string; // 'yellow' | 'blue' | 'green' | 'purple' | 'coral'
  isResolved?: boolean;
}

export interface CourseVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue: string;
  currentValue?: string;
  description?: string;
}

export interface VersionSnapshot {
  id: string;
  name: string;
  timestamp: string;
  course: CourseManifest;
  pageCount: number;
  nodeCount: number;
  note?: string;
}

export interface AssetItem {
  id: string;
  name: string;
  category: 'icons' | 'shapes' | 'images' | 'badges';
  type: 'icon' | 'shape' | 'image';
  url?: string;
  iconName?: string;
  shapeType?: string;
  svgContent?: string;
  color?: string;
  width: number;
  height: number;
  tags: string[];
  isCustom?: boolean;
}

export interface GlobalTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  logoUrl?: string;
  logoPosition?: 'top-left' | 'top-right' | 'bottom-right';
}

export interface BranchingConnection {
  id: string;
  fromPageId: string;
  toPageId: string;
  label?: string;
  condition?: 'default' | 'passed' | 'failed' | 'choice';
}

export interface CourseManifest {
  id: string;
  title: string;
  description: string;
  version: string;
  author: string;
  passingScore: number; // 0 to 100
  estimatedMinutes: number;
  completionCriteria: 'all_pages' | 'quiz_passed' | 'all_pages_and_quiz';
  pages: Page[];
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
  updatedAt: string;
  variables?: CourseVariable[];
  comments?: CanvasComment[];
  theme?: GlobalTheme;
  branching?: BranchingConnection[];
}

export interface SuspendPayload {
  v: number; // SUSPEND_PAYLOAD_VERSION
  currentPageIndex: number;
  visitedPages: string[];
  quizAnswers: Record<string, string[]>; // node.id -> selected option IDs
  quizScores: Record<string, number>; // node.id -> awarded points
  totalScore: number;
  maxScore: number;
  percentageScore: number;
  isCompleted: boolean;
  isPassed: boolean;
  timestamp: number;
}
