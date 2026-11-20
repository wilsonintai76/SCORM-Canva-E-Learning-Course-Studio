import React, { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { useCourseStore } from '../../store/courseStore';
import { saveDataUrlWithDialog, saveTextWithDialog } from '../../utils/saveFile';
import { createBlankCourse } from '../../data/blankCourse';
import { filterQuickActions, QuickActionItem } from '../../utils/quickActions';
import {
  Undo,
  Redo,
  Play,
  Download,
  Terminal,
  ZoomIn,
  ZoomOut,
  Check,
  Layers,
  Grid,
  Keyboard,
  FileImage,
  FileText,
  Ruler,
  Sliders,
  History,
  FilePlus2,
  ShieldCheck,
  GitBranch,
  FolderDown,
  Crosshair,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  ChevronDown,
  Eye,
  RotateCcw,
  Moon,
  Sun,
  Palette,
  RefreshCw,
  Search,
  X,
  CornerDownLeft,
  Settings,
  Database,
  Sparkles,
  Plus,
  Type,
  HelpCircle,
  MessageSquare,
  SlidersHorizontal,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const TopNavBar: React.FC = () => {
  const {
    course,
    currentPage,
    selectedNodeIds,
    alignSelected,
    zoom,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    lastUndoDescription,
    lastRedoDescription,
    undo,
    redo,
    isSnapToGridEnabled,
    gridSize,
    showRulers,
    showGuides,
    lastSavedTime,
    isSaving,
    setIsCommandBarOpen,
    setActiveInspectorTab,
    setActiveSidebarTab,
    setActivePage,
    addNode,
    addPage,
    setSnapToGrid,
    setShowRulers,
    setShowGuides,
    setZoom,
    resetView,
    updateManifest,
    setIsPreviewOpen,
    setIsDebuggerOpen,
    setIsExportModalOpen,
    setIsShortcutsModalOpen,
    setIsGridSettingsModalOpen,
    setIsMediaManagerOpen,
    setIsBranchingFlowOpen,
    setIsAccessibilityModalOpen,
    setIsVersionHistoryOpen,
    setIsPdfModalOpen,
    setIsAiPaletteOpen,
    exportProjectJson,
    startNewCourse,
    saveVersion,
  } = useCourseStore();

  const { themeMode, setThemeMode } = useTheme();

  const [timeAgoText, setTimeAgoText] = useState('Saved just now');
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Quick Actions inline search state
  const [quickQuery, setQuickQuery] = useState('');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [quickSelectedIndex, setQuickSelectedIndex] = useState(0);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateSaveTime = () => {
      if (!lastSavedTime) {
        setTimeAgoText('Saved');
        return;
      }
      const diffSec = Math.floor((Date.now() - lastSavedTime) / 1000);
      if (diffSec < 5) {
        setTimeAgoText('Saved just now');
      } else if (diffSec < 60) {
        setTimeAgoText(`Saved ${diffSec}s ago`);
      } else {
        const date = new Date(lastSavedTime);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setTimeAgoText(`Saved at ${timeStr}`);
      }
    };

    updateSaveTime();
    const interval = setInterval(updateSaveTime, 3000);
    return () => clearInterval(interval);
  }, [lastSavedTime, isSaving]);

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isProjectActionsOpen, setIsProjectActionsOpen] = useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);

  // Close open dropdown menus & quick search popover on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsViewMenuOpen(false);
        setIsProjectActionsOpen(false);
        setIsAlignMenuOpen(false);
        setIsQuickActionsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsViewMenuOpen(false);
        setIsProjectActionsOpen(false);
        setIsAlignMenuOpen(false);
        setIsQuickActionsOpen(false);
        quickSearchInputRef.current?.blur();
      } else if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)
      ) {
        e.preventDefault();
        setIsQuickActionsOpen(true);
        setQuickSelectedIndex(0);
        quickSearchInputRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNewCourse = () => {
    const confirmed =
      typeof window.confirm === 'function'
        ? window.confirm(
            'Start a new blank course?\n\nThe current course is saved as a version snapshot first, so you can restore it from Version History.'
          )
        : true;
    if (!confirmed) return;
    startNewCourse(createBlankCourse());
  };

  const handleDownloadProject = async () => {
    try {
      const jsonStr = await exportProjectJson();
      const safeTitle = (course.title || 'course')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      await saveTextWithDialog(jsonStr, `${safeTitle || 'project'}_backup.json`);
    } catch (err) {
      console.error('Failed to export project JSON:', err);
    }
  };

  const handleDownloadImage = async () => {
    try {
      setIsExportingImage(true);
      const stageEl =
        (document.querySelector('.aistudio-slide-stage') as HTMLElement) ||
        (document.querySelector('div[style*="transform-origin"]') as HTMLElement);

      if (!stageEl) {
        console.error('Canvas stage element not found');
        return;
      }

      const canvas = await html2canvas(stageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const safeTitle = (currentPage?.title || course.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      await saveDataUrlWithDialog(dataUrl, `${safeTitle || 'slide'}_design.png`);
    } catch (err) {
      console.error('Failed to export slide as PNG image:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const closeAllMenus = () => {
    setIsViewMenuOpen(false);
    setIsProjectActionsOpen(false);
    setIsAlignMenuOpen(false);
    setIsQuickActionsOpen(false);
  };

  const quickActionsList = useMemo<QuickActionItem[]>(() => {
    const baseItems: QuickActionItem[] = [
      // Settings Navigation
      {
        id: 'setting_course',
        category: 'Settings',
        title: 'Course Settings & Manifest',
        subtitle: 'Passing score, completion criteria, title & metadata',
        keywords: ['course', 'manifest', 'settings', 'passing', 'score', 'scorm'],
        icon: <Settings className="w-3.5 h-3.5 text-blue-400" />,
        execute: () => setActiveInspectorTab('course'),
      },
      {
        id: 'setting_tokens',
        category: 'Settings',
        title: 'Design Tokens Panel',
        subtitle: 'Global color, typography & spacing tokens',
        keywords: ['tokens', 'design', 'typography', 'spacing', 'colors'],
        icon: <Palette className="w-3.5 h-3.5 text-pink-400" />,
        execute: () => setActiveInspectorTab('tokens'),
      },
      {
        id: 'setting_variables',
        category: 'Settings',
        title: 'Global Variables Manager',
        subtitle: 'Manage dynamic score, learner name & state variables',
        keywords: ['variables', 'state', 'score', 'user_name', 'dynamic'],
        icon: <Database className="w-3.5 h-3.5 text-cyan-400" />,
        execute: () => setActiveInspectorTab('variables'),
      },
      {
        id: 'setting_slide',
        category: 'Settings',
        title: 'Slide Properties & Audio',
        subtitle: 'Slide background, transitions & narration settings',
        keywords: ['slide', 'transitions', 'audio', 'narration', 'background'],
        icon: <Sliders className="w-3.5 h-3.5 text-sky-400" />,
        execute: () => setActiveInspectorTab('slide'),
      },
      {
        id: 'setting_grid',
        category: 'Settings',
        title: 'Grid & Snapping Settings',
        subtitle: 'Configure grid spacing, color & magnetic guides',
        keywords: ['grid', 'snap', 'spacing', 'color', 'rulers'],
        icon: <Grid className="w-3.5 h-3.5 text-indigo-400" />,
        execute: () => setIsGridSettingsModalOpen(true),
      },
      {
        id: 'setting_theme_editor',
        category: 'Settings',
        title: 'Global Theme & Brand Editor',
        subtitle: 'Configure project palette, fonts & course logo',
        keywords: ['theme', 'brand', 'logo', 'font'],
        icon: <Palette className="w-3.5 h-3.5 text-purple-400" />,
        execute: () => setActiveSidebarTab('theme'),
      },
      {
        id: 'setting_theme_dark',
        category: 'Settings',
        title: 'Switch Theme: Dark Mode',
        subtitle: 'Set studio interface to Dark slate mode',
        keywords: ['dark', 'theme', 'appearance', 'mode'],
        icon: <Moon className="w-3.5 h-3.5 text-blue-400" />,
        execute: () => setThemeMode('dark'),
      },
      {
        id: 'setting_theme_light',
        category: 'Settings',
        title: 'Switch Theme: Light Mode',
        subtitle: 'Set studio interface to Light mode',
        keywords: ['light', 'theme', 'appearance', 'mode'],
        icon: <Sun className="w-3.5 h-3.5 text-amber-400" />,
        execute: () => setThemeMode('light'),
      },

      // Commands & Creation
      {
        id: 'cmd_preview',
        category: 'Commands',
        title: 'Preview Live SCORM Player',
        subtitle: 'Test interactive course playback & CMI state',
        keywords: ['preview', 'play', 'simulate', 'player', 'test'],
        icon: <Play className="w-3.5 h-3.5 text-sky-400" />,
        execute: () => setIsPreviewOpen(true),
      },
      {
        id: 'cmd_add_slide',
        category: 'Commands',
        title: 'Add New Slide',
        subtitle: 'Append a new slide to the course filmstrip',
        keywords: ['new slide', 'add slide', 'page', 'create'],
        icon: <Plus className="w-3.5 h-3.5 text-blue-400" />,
        execute: () => addPage(),
      },
      {
        id: 'cmd_add_text',
        category: 'Commands',
        title: 'Insert Text Box',
        subtitle: 'Add a formatted text block to current slide',
        keywords: ['text', 'heading', 'paragraph', 'insert'],
        icon: <Type className="w-3.5 h-3.5 text-indigo-400" />,
        execute: () => addNode('text'),
      },
      {
        id: 'cmd_add_quiz',
        category: 'Commands',
        title: 'Insert Interactive Quiz',
        subtitle: 'Add a SCORM-graded question block',
        keywords: ['quiz', 'question', 'assessment', 'test'],
        icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" />,
        execute: () => addNode('quiz'),
      },
      {
        id: 'cmd_add_callout',
        category: 'Commands',
        title: 'Insert Callout Card',
        subtitle: 'Add an info, tip, or warning highlight box',
        keywords: ['callout', 'alert', 'tip', 'note'],
        icon: <MessageSquare className="w-3.5 h-3.5 text-teal-400" />,
        execute: () => addNode('callout'),
      },
      {
        id: 'cmd_ai_gen',
        category: 'Commands',
        title: 'AI Course Generator',
        subtitle: 'Generate multi-slide lessons or quizzes',
        keywords: ['ai', 'generate', 'assistant'],
        icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
        execute: () => setIsAiPaletteOpen(true),
      },
      {
        id: 'cmd_toggle_rulers',
        category: 'Commands',
        title: `Toggle Canvas Rulers (${showRulers ? 'On' : 'Off'})`,
        subtitle: 'Show or hide pixel rulers on workspace edges',
        keywords: ['rulers', 'view', 'measure'],
        icon: <Ruler className="w-3.5 h-3.5 text-sky-400" />,
        execute: () => setShowRulers(!showRulers),
      },
      {
        id: 'cmd_toggle_guides',
        category: 'Commands',
        title: `Toggle Smart Guides (${showGuides ? 'On' : 'Off'})`,
        subtitle: 'Enable or disable alignment snap guides',
        keywords: ['guides', 'snap', 'align'],
        icon: <Crosshair className="w-3.5 h-3.5 text-indigo-400" />,
        execute: () => setShowGuides(!showGuides),
      },
      {
        id: 'cmd_reset_view',
        category: 'Commands',
        title: 'Reset Canvas View (100%)',
        subtitle: 'Reset canvas zoom & center pan position',
        keywords: ['zoom', 'fit', 'reset', '100%'],
        icon: <RotateCcw className="w-3.5 h-3.5 text-slate-300" />,
        execute: () => resetView(),
      },

      // Studio Tools & Audits
      {
        id: 'tool_wcag',
        category: 'Tools',
        title: 'WCAG 2.1 Accessibility Audit',
        subtitle: 'Scan contrast ratios, readability & alt text',
        keywords: ['accessibility', 'wcag', 'contrast', 'audit'],
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
        execute: () => setIsAccessibilityModalOpen(true),
      },
      {
        id: 'tool_branching',
        category: 'Tools',
        title: 'Branching Flow Map',
        subtitle: 'Inspect & configure non-linear slide paths',
        keywords: ['branching', 'flow', 'map', 'navigation'],
        icon: <GitBranch className="w-3.5 h-3.5 text-sky-400" />,
        execute: () => setIsBranchingFlowOpen(true),
      },
      {
        id: 'tool_media',
        category: 'Tools',
        title: 'Media Manager',
        subtitle: 'Audit, inspect & bulk replace course assets',
        keywords: ['media', 'images', 'assets', 'manager'],
        icon: <Layers className="w-3.5 h-3.5 text-purple-400" />,
        execute: () => setIsMediaManagerOpen(true),
      },
      {
        id: 'tool_versions',
        category: 'Tools',
        title: 'Version History & Snapshots',
        subtitle: 'Create or restore project revision points',
        keywords: ['version', 'history', 'snapshot', 'restore'],
        icon: <History className="w-3.5 h-3.5 text-amber-400" />,
        execute: () => setIsVersionHistoryOpen(true),
      },
      {
        id: 'tool_lms',
        category: 'Tools',
        title: 'LMS SCORM Debugger',
        subtitle: 'Inspect CMI telemetry & completion logs',
        keywords: ['lms', 'debugger', 'scorm', 'cmi', 'logs'],
        icon: <Terminal className="w-3.5 h-3.5 text-emerald-400" />,
        execute: () => setIsDebuggerOpen(true),
      },
      {
        id: 'tool_shortcuts',
        category: 'Tools',
        title: 'Keyboard Shortcuts Guide',
        subtitle: 'View all editor hotkeys',
        keywords: ['shortcuts', 'hotkeys', 'keyboard', 'help'],
        shortcut: '?',
        icon: <Keyboard className="w-3.5 h-3.5 text-sky-400" />,
        execute: () => setIsShortcutsModalOpen(true),
      },

      // Export Actions
      {
        id: 'export_zip',
        category: 'Export',
        title: 'Export SCORM Package (.zip)',
        subtitle: 'Build LMS-ready SCORM 1.2 / 2004 zip archive',
        keywords: ['export', 'scorm', 'zip', 'publish', 'lms'],
        icon: <Download className="w-3.5 h-3.5 text-blue-400" />,
        execute: () => setIsExportModalOpen(true),
      },
      {
        id: 'export_pdf',
        category: 'Export',
        title: 'Export PDF Handout',
        subtitle: 'Generate printable course lesson handout',
        keywords: ['pdf', 'handout', 'print', 'export'],
        icon: <FileText className="w-3.5 h-3.5 text-rose-400" />,
        execute: () => setIsPdfModalOpen(true),
      },
      {
        id: 'export_png',
        category: 'Export',
        title: 'Download Slide PNG Image',
        subtitle: 'Save current slide canvas as high-res PNG',
        keywords: ['png', 'image', 'screenshot', 'export'],
        icon: <FileImage className="w-3.5 h-3.5 text-emerald-400" />,
        execute: () => handleDownloadImage(),
      },
      {
        id: 'export_json',
        category: 'Export',
        title: 'Download Project JSON Backup',
        subtitle: 'Export raw course manifest & slide data',
        keywords: ['json', 'backup', 'download', 'export'],
        icon: <FolderDown className="w-3.5 h-3.5 text-amber-400" />,
        execute: () => handleDownloadProject(),
      },
    ];

    // Add slide navigation entries
    course.pages.forEach((page, idx) => {
      baseItems.push({
        id: `nav_slide_${page.id}`,
        category: 'Navigation',
        title: `Go to Slide #${idx + 1}: ${page.title || 'Untitled Slide'}`,
        subtitle: `${page.nodes.length} element${page.nodes.length === 1 ? '' : 's'}`,
        keywords: ['slide', 'page', 'navigate', `slide ${idx + 1}`, page.title || ''],
        icon: <FileText className="w-3.5 h-3.5 text-slate-400" />,
        execute: () => setActivePage(idx),
      });
    });

    return baseItems;
  }, [
    course.pages,
    showRulers,
    showGuides,
    setActiveInspectorTab,
    setActiveSidebarTab,
    setActivePage,
    setThemeMode,
  ]);

  const filteredQuickActions = useMemo(
    () => filterQuickActions(quickActionsList, quickQuery).slice(0, 12),
    [quickActionsList, quickQuery]
  );

  const handleQuickInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsQuickActionsOpen(true);
      setQuickSelectedIndex((prev) =>
        filteredQuickActions.length > 0 ? (prev + 1) % filteredQuickActions.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsQuickActionsOpen(true);
      setQuickSelectedIndex((prev) =>
        filteredQuickActions.length > 0
          ? (prev - 1 + filteredQuickActions.length) % filteredQuickActions.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredQuickActions[quickSelectedIndex] || filteredQuickActions[0];
      if (target) {
        target.execute();
        setQuickQuery('');
        setIsQuickActionsOpen(false);
        quickSearchInputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsQuickActionsOpen(false);
      quickSearchInputRef.current?.blur();
    }
  };

  return (
    <header
      ref={navRef}
      className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 md:px-4 z-20 shrink-0 select-none gap-2"
    >
      {/* 1. LEFT: Brand, Editable Title, Save State & Quick Actions Search Bar */}
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-sm text-slate-100 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
              SCORM Canva
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.2 rounded">
                1.2
              </span>
            </span>
          </div>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

        {/* Course Title editable input */}
        <input
          type="text"
          value={course.title}
          onChange={(e) => updateManifest({ title: e.target.value })}
          className="text-xs font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/80 px-2 py-1 rounded transition-colors border border-transparent focus:border-blue-500 focus:bg-slate-950 outline-none max-w-27.5 md:max-w-38.75 lg:max-w-45 truncate"
          title="Click to rename course"
        />

        {/* Subtle Auto-Saving Status Indicator */}
        <div className="hidden xl:flex items-center shrink-0">
          {isSaving ? (
            <div
              className="flex items-center gap-1.5 text-[11px] text-sky-400 bg-sky-950/60 border border-sky-800/80 px-2 py-0.5 rounded-full animate-pulse select-none whitespace-nowrap"
              title="Auto-saving changes to storage..."
            >
              <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
              <span className="text-[10px] font-semibold tracking-tight">Saving...</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 text-[11px] text-slate-400 px-1.5 py-0.5 select-none whitespace-nowrap"
              title={
                lastSavedTime
                  ? `All progress saved locally at ${new Date(lastSavedTime).toLocaleTimeString()}`
                  : 'All changes saved'
              }
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium">{timeAgoText}</span>
            </div>
          )}
        </div>

        {/* Inline Quick Actions Search Bar */}
        <div className="relative hidden md:block ml-1">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-slate-950/85 transition-all w-44 lg:w-56 xl:w-64 ${
              isQuickActionsOpen
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-950'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <input
              ref={quickSearchInputRef}
              type="text"
              value={quickQuery}
              onFocus={() => {
                setIsQuickActionsOpen(true);
                setIsViewMenuOpen(false);
                setIsProjectActionsOpen(false);
                setIsAlignMenuOpen(false);
                setQuickSelectedIndex(0);
              }}
              onChange={(e) => {
                setQuickQuery(e.target.value);
                setIsQuickActionsOpen(true);
                setQuickSelectedIndex(0);
              }}
              onKeyDown={handleQuickInputKeyDown}
              placeholder="Quick Actions..."
              aria-label="Quick Actions search"
              className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none"
            />
            {quickQuery ? (
              <button
                type="button"
                onClick={() => {
                  setQuickQuery('');
                  setQuickSelectedIndex(0);
                  quickSearchInputRef.current?.focus();
                }}
                title="Clear search"
                className="text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCommandBarOpen(true)}
                title="Open full project search (Cmd+K) or press / for Quick Actions"
                className="text-[9px] font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-700/80 px-1.5 py-0.5 rounded shrink-0 cursor-pointer"
              >
                ⌘K
              </button>
            )}
          </div>

          {/* Quick Actions Live Results Popover */}
          {isQuickActionsOpen && (
            <div
              role="listbox"
              className="absolute top-full left-0 mt-2 w-80 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Quick Actions &amp; Settings</span>
                <span className="font-mono font-normal text-slate-500">
                  {filteredQuickActions.length} match{filteredQuickActions.length === 1 ? '' : 'es'}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
                {filteredQuickActions.length === 0 ? (
                  <div className="py-6 px-3 text-center text-xs text-slate-500">
                    No matching commands or settings for &ldquo;{quickQuery}&rdquo;
                  </div>
                ) : (
                  filteredQuickActions.map((item, idx) => {
                    const isActive = idx === quickSelectedIndex;
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setQuickSelectedIndex(idx)}
                        onClick={() => {
                          item.execute();
                          setQuickQuery('');
                          setIsQuickActionsOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-600/20 text-white border border-blue-500/40'
                            : 'hover:bg-slate-800/80 text-slate-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                            {item.icon}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-medium truncate">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-[10px] text-slate-400 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
                            {item.category}
                          </span>
                          {isActive && <CornerDownLeft className="w-3 h-3 text-blue-400" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-[10px] text-slate-500">
                <span>↑↓ Navigate · ↵ Execute · Esc Close</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setIsCommandBarOpen(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  All Elements (⌘K)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER: Canvas Navigation & Editing Toolbar */}
      <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-1 text-xs shrink-0">
        {/* Undo Button */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title={
            canUndo
              ? `Undo: ${lastUndoDescription || 'last change'} (Ctrl+Z) • ${undoCount} action${undoCount > 1 ? 's' : ''}`
              : 'Undo (Ctrl+Z)'
          }
          className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors text-xs ${
            canUndo
              ? 'text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 shadow-xs cursor-pointer'
              : 'text-slate-500 opacity-40 pointer-events-none'
          }`}
        >
          <Undo className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium hidden lg:inline">Undo</span>
          {canUndo && undoCount > 0 && (
            <span className="text-[10px] font-mono text-blue-300 bg-blue-950 px-1 rounded border border-blue-800/80">
              {undoCount}
            </span>
          )}
        </button>

        {/* Redo Button */}
        <button
          onClick={redo}
          disabled={!canRedo}
          title={
            canRedo
              ? `Redo: ${lastRedoDescription || 'action'} (Ctrl+Y) • ${redoCount} action${redoCount > 1 ? 's' : ''}`
              : 'Redo (Ctrl+Y)'
          }
          className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors text-xs ${
            canRedo
              ? 'text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 shadow-xs cursor-pointer'
              : 'text-slate-500 opacity-40 pointer-events-none'
          }`}
        >
          <Redo className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium hidden lg:inline">Redo</span>
          {canRedo && redoCount > 0 && (
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-1 rounded border border-indigo-800/80">
              {redoCount}
            </span>
          )}
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

        {/* Zoom Controls */}
        <button
          onClick={() => setZoom(zoom - 0.1)}
          title="Zoom Out"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1 min-w-9 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          title="Zoom In"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

        {/* Quick Snap Toggle */}
        <button
          onClick={() => setSnapToGrid(!isSnapToGridEnabled)}
          title={
            isSnapToGridEnabled
              ? `Snap to Grid Enabled (${gridSize}px) - Click to toggle`
              : 'Snap to Grid Disabled - Click to toggle'
          }
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
            isSnapToGridEnabled
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold hidden xl:inline">Snap</span>
        </button>

        {/* View Options Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsViewMenuOpen(!isViewMenuOpen);
              setIsProjectActionsOpen(false);
              setIsAlignMenuOpen(false);
              setIsQuickActionsOpen(false);
            }}
            title="Canvas View & Rulers Options"
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              isViewMenuOpen
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] hidden lg:inline">View</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isViewMenuOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-52 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                View &amp; Canvas Options
              </div>

              <button
                onClick={() => {
                  setShowRulers(!showRulers);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-sky-400" />
                  <span>Show Rulers</span>
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    showRulers
                      ? 'bg-sky-500 border-sky-400 text-slate-950 font-bold'
                      : 'border-slate-600'
                  }`}
                >
                  {showRulers && '✓'}
                </span>
              </button>

              <button
                onClick={() => {
                  setShowGuides(!showGuides);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Smart Guides</span>
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    showGuides
                      ? 'bg-indigo-500 border-indigo-400 text-slate-950 font-bold'
                      : 'border-slate-600'
                  }`}
                >
                  {showGuides && '✓'}
                </span>
              </button>

              <button
                onClick={() => {
                  setSnapToGrid(!isSnapToGridEnabled);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-blue-400" />
                  <span>Snap to Grid</span>
                </span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                    isSnapToGridEnabled
                      ? 'bg-blue-500 border-blue-400 text-slate-950 font-bold'
                      : 'border-slate-600'
                  }`}
                >
                  {isSnapToGridEnabled && '✓'}
                </span>
              </button>

              <div className="h-px bg-slate-800/80 my-1 mx-2" />

              <button
                onClick={() => {
                  setIsGridSettingsModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Grid Spacing &amp; Color...</span>
              </button>

              <button
                onClick={() => {
                  resetView();
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-slate-800/90 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset View (100%)</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Align Popover or Inline Buttons when elements selected */}
        <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

        {selectedNodeIds.length > 0 ? (
          <div className="flex items-center gap-0.5 bg-sky-950/40 border border-sky-500/30 rounded-md px-1 py-0.5">
            <span className="text-[10px] font-bold text-sky-400 px-1 border-r border-sky-800/80 mr-0.5">
              {selectedNodeIds.length}
            </span>
            <button
              onClick={() => alignSelected('left')}
              title="Align Left"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('center-h')}
              title="Center Horizontally"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('right')}
              title="Align Right"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-slate-700 mx-0.5" />
            <button
              onClick={() => alignSelected('top')}
              title="Align Top"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignStartVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('center-v')}
              title="Center Vertically"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelected('bottom')}
              title="Align Bottom"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
            >
              <AlignEndVertical className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-slate-700 mx-0.5" />
            <button
              onClick={() => alignSelected('baseline')}
              title="Snap to Baseline"
              className="p-1 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded cursor-pointer"
            >
              <AlignEndHorizontal className="w-3.5 h-3.5" />
            </button>
            {selectedNodeIds.length >= 3 && (
              <button
                onClick={() => alignSelected('distribute-h')}
                title="Distribute Horizontally"
                className="p-1 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
              >
                <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => {
                setIsAlignMenuOpen(!isAlignMenuOpen);
                setIsViewMenuOpen(false);
                setIsProjectActionsOpen(false);
                setIsQuickActionsOpen(false);
              }}
              title="Quick Align Elements (Select elements on canvas first)"
              className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] hidden lg:inline">Align</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {isAlignMenuOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-52 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[11px] font-semibold text-slate-300 mb-1">Align Elements</div>
                <p className="text-[10px] text-slate-400 mb-2">
                  Select one or more elements on the canvas to activate alignment tools.
                </p>
                <div className="flex items-center justify-center gap-1 opacity-40 pointer-events-none">
                  <AlignLeft className="w-4 h-4 text-slate-400" />
                  <AlignCenterHorizontal className="w-4 h-4 text-slate-400" />
                  <AlignRight className="w-4 h-4 text-slate-400" />
                  <AlignStartVertical className="w-4 h-4 text-slate-400" />
                  <AlignCenterVertical className="w-4 h-4 text-slate-400" />
                  <AlignEndVertical className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. RIGHT: Project Actions + Export (.zip) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Single Consolidated Project Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsProjectActionsOpen(!isProjectActionsOpen);
              setIsViewMenuOpen(false);
              setIsAlignMenuOpen(false);
              setIsQuickActionsOpen(false);
            }}
            aria-expanded={isProjectActionsOpen}
            aria-haspopup="menu"
            title="Project Actions, Preview, Audits, Exports & Theme"
            className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isProjectActionsOpen
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-transparent border-slate-700/70 text-slate-300 hover:bg-slate-800/60 hover:border-slate-600 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Project Actions</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${
                isProjectActionsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isProjectActionsOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 mt-2 w-72 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 select-none max-h-[82vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Project lifecycle: New / Snapshot */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Project
              </div>

              <button
                role="menuitem"
                onClick={() => {
                  handleNewCourse();
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">New Course</div>
                  <div className="text-[10px] text-slate-400">Start a blank SCORM project</div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  saveVersion();
                  setIsVersionHistoryOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Save Snapshot</div>
                  <div className="text-[10px] text-slate-400">Version restore point for this course</div>
                </div>
              </button>

              <div className="h-px bg-slate-800/80 my-1 mx-2" />

              {/* Primary Secondary Action: Preview */}
              <div className="px-2 pb-1.5 mb-1 border-b border-slate-800/80">
                <button
                  role="menuitem"
                  onClick={() => {
                    setIsPreviewOpen(true);
                    closeAllMenus();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/30 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Play className="w-4 h-4 text-sky-400 fill-sky-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-white">Preview SCORM Player</div>
                      <div className="text-[10px] text-slate-400">Run live interactive simulator</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Studio Tools & Audits */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tools &amp; Quality Audits
              </div>

              <button
                role="menuitem"
                onClick={() => {
                  setIsBranchingFlowOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <GitBranch className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Branching Flow</div>
                  <div className="text-[10px] text-slate-400">Non-linear navigation map</div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsMediaManagerOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Media Manager</div>
                  <div className="text-[10px] text-slate-400">Audit &amp; replace assets</div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsAccessibilityModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">WCAG 2.1 Audit</div>
                  <div className="text-[10px] text-slate-400">Contrast &amp; alt text checker</div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsVersionHistoryOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Version History</div>
                  <div className="text-[10px] text-slate-400">Snapshots &amp; restore points</div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsDebuggerOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">LMS Debugger</div>
                  <div className="text-[10px] text-slate-400">SCORM CMI tracking log</div>
                </div>
              </button>

              <div className="h-px bg-slate-800/80 my-1.5 mx-2" />

              {/* Additional Exports */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Additional Exports
              </div>

              <button
                role="menuitem"
                onClick={() => {
                  setIsPdfModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">PDF Handout</div>
                  <div className="text-[10px] text-slate-400">Formatted printable lesson handout</div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  handleDownloadImage();
                  closeAllMenus();
                }}
                disabled={isExportingImage}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <FileImage className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Slide PNG Image</div>
                  <div className="text-[10px] text-slate-400">
                    {isExportingImage ? 'Rendering image...' : 'High-resolution image snapshot'}
                  </div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  handleDownloadProject();
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <FolderDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Project JSON Backup</div>
                  <div className="text-[10px] text-slate-400">Full course manifest &amp; state</div>
                </div>
              </button>

              <div className="h-px bg-slate-800/80 my-1.5 mx-2" />

              {/* Settings & Help */}
              <button
                role="menuitem"
                onClick={() => {
                  setActiveInspectorTab('course');
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <Settings className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Course Settings</div>
                  <div className="text-[10px] text-slate-400">Manifest, scoring &amp; completion</div>
                </div>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsShortcutsModalOpen(true);
                  closeAllMenus();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-800/90 hover:text-white text-left transition-colors cursor-pointer text-slate-200"
              >
                <Keyboard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-medium leading-snug">Shortcuts Guide</div>
                  <div className="text-[10px] text-slate-400">Keyboard hotkeys (?)</div>
                </div>
              </button>

              <div className="h-px bg-slate-800/80 my-1.5 mx-2" />

              {/* Inline Interface Theme Segmented Selector */}
              <div className="px-3 py-1 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Workspace Theme
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/90 border border-slate-800 rounded-lg">
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`py-1 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-3 h-3 text-blue-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`py-1 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setThemeMode('custom')}
                    className={`py-1 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      themeMode === 'custom'
                        ? 'bg-pink-950/80 text-pink-300 border border-pink-700/60'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Palette className="w-3 h-3 text-pink-400" />
                    <span>Custom</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visible Primary Export (.zip) CTA Button */}
        <button
          onClick={() => setIsExportModalOpen(true)}
          title="Export course into SCORM package (.zip)"
          className="h-8 px-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-950/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-white shrink-0" />
          <span>Export .zip</span>
        </button>
      </div>
    </header>
  );
};
