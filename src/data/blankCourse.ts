import { CourseManifest, Page } from '../types/schema';

export interface BlankCourseOptions {
  title?: string;
  author?: string;
  template?: CourseManifest;
}

function newId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

function blankPage(title: string, width: number, height: number): Page {
  return {
    id: newId('page'),
    title,
    width,
    height,
    background: { type: 'color', value: '#0f172a' },
    nodes: [],
  };
}

/** A minimal, SCORM-valid course so a new project can be exported immediately. */
export function createBlankCourse(options: BlankCourseOptions = {}): CourseManifest {
  const now = new Date().toISOString();
  const title = options.title?.trim() || 'Untitled Course';

  if (options.template) {
    const copy: CourseManifest = JSON.parse(JSON.stringify(options.template));
    return {
      ...copy,
      id: newId('COURSE'),
      title: `${copy.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
      pages: copy.pages.map((page) => ({ ...page, id: newId('page') })),
      comments: [],
    };
  }

  return {
    id: newId('COURSE'),
    title,
    description: '',
    version: '1.0.0',
    author: options.author?.trim() || 'Course Author',
    passingScore: 80,
    estimatedMinutes: 10,
    completionCriteria: 'all_pages',
    canvasWidth: 960,
    canvasHeight: 540,
    createdAt: now,
    updatedAt: now,
    pages: [blankPage('Slide 1', 960, 540)],
    variables: [],
    comments: [],
  };
}
