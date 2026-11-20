import React, { useState, useEffect, useRef } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { SLIDE_LAYOUTS, SlideLayout } from '../../data/slideLayouts';
import {
  Search,
  FileText,
  Type,
  HelpCircle,
  Image as ImageIcon,
  Square,
  MessageSquare,
  Zap,
  Sparkles,
  Play,
  Download,
  ShieldCheck,
  GitBranch,
  Layers,
  History,
  Terminal,
  Ruler,
  Grid,
  Sliders,
  LayoutGrid,
  X,
  ArrowRight,
  CornerDownLeft,
  Command,
  Database,
  Crosshair,
  RotateCcw,
  Settings,
  Palette,
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: 'Pages' | 'Elements' | 'Actions' | 'Variables' | 'Templates';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
}

export const GlobalCommandBar: React.FC = () => {
  const {
    course,
    activePageIndex,
    isCommandBarOpen,
    setIsCommandBarOpen,
    setActivePage,
    setSelectedNodeId,
    addNode,
    setIsPreviewOpen,
    setIsExportModalOpen,
    setIsAccessibilityModalOpen,
    setIsBranchingFlowOpen,
    setIsMediaManagerOpen,
    setIsVersionHistoryOpen,
    setIsDebuggerOpen,
    setIsAiPaletteOpen,
    setIsShortcutsModalOpen,
    setShowRulers,
    setShowGuides,
    setSnapToGrid,
    showRulers,
    showGuides,
    isSnapToGridEnabled,
    resetView,
    addSlideWithLayout,
    setActiveInspectorTab,
    setActiveSidebarTab,
    setIsGridSettingsModalOpen,
  } = useCourseStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandBarOpen(!isCommandBarOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandBarOpen, setIsCommandBarOpen]);

  // Focus input on open
  useEffect(() => {
    if (isCommandBarOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isCommandBarOpen]);

  if (!isCommandBarOpen) return null;

  // Build searchable items index
  const items: CommandItem[] = [];

  // 1. Pages / Slides
  course.pages.forEach((page, idx) => {
    items.push({
      id: `page_${page.id}`,
      category: 'Pages',
      title: `Page ${idx + 1}: ${page.title || 'Untitled Slide'}`,
      subtitle: `${page.nodes.length} element${page.nodes.length === 1 ? '' : 's'}${
        idx === activePageIndex ? ' • Active Page' : ''
      }`,
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      badge: `Page ${idx + 1}`,
      action: () => {
        setActivePage(idx);
        setIsCommandBarOpen(false);
      },
    });
  });

  // 2. Elements across slides
  course.pages.forEach((page, pIdx) => {
    page.nodes.forEach((node) => {
      let label = `${node.type.toUpperCase()} Element`;
      let icon = <Square className="w-4 h-4 text-indigo-400" />;

      if (node.type === 'text') {
        label = (node as any).content?.slice(0, 35) || 'Text Box';
        icon = <Type className="w-4 h-4 text-sky-400" />;
      } else if (node.type === 'quiz') {
        label = (node as any).question?.slice(0, 35) || 'Quiz Question';
        icon = <HelpCircle className="w-4 h-4 text-amber-400" />;
      } else if (node.type === 'callout') {
        label = (node as any).title || (node as any).content?.slice(0, 35) || 'Callout Box';
        icon = <MessageSquare className="w-4 h-4 text-teal-400" />;
      } else if (node.type === 'image') {
        label = (node as any).alt || 'Image Asset';
        icon = <ImageIcon className="w-4 h-4 text-emerald-400" />;
      } else if (node.type === 'shape') {
        label = `${(node as any).shapeType || 'Rectangle'} Shape`;
        icon = <Square className="w-4 h-4 text-cyan-400" />;
      }

      items.push({
        id: `node_${node.id}`,
        category: 'Elements',
        title: label,
        subtitle: `On Page ${pIdx + 1}: ${page.title || 'Untitled Slide'}`,
        icon,
        action: () => {
          setActivePage(pIdx);
          setSelectedNodeId(node.id);
          setIsCommandBarOpen(false);
        },
      });
    });
  });

  // 3. Actions & Studio Tools
  items.push(
    {
      id: 'action_add_text',
      category: 'Actions',
      title: 'Add Text Box',
      subtitle: 'Insert a customizable rich text block on active slide',
      icon: <Type className="w-4 h-4 text-indigo-400" />,
      action: () => {
        addNode('text');
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_add_quiz',
      category: 'Actions',
      title: 'Add Interactive Quiz',
      subtitle: 'Insert SCORM graded knowledge evaluation question',
      icon: <HelpCircle className="w-4 h-4 text-amber-400" />,
      action: () => {
        addNode('quiz');
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_add_callout',
      category: 'Actions',
      title: 'Add Callout Box',
      subtitle: 'Insert rule, warning, or pro-tip highlighted card',
      icon: <MessageSquare className="w-4 h-4 text-sky-400" />,
      action: () => {
        addNode('callout');
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_preview',
      category: 'Actions',
      title: 'Launch SCORM Simulator Preview',
      subtitle: 'Simulate learner playback & SCORM telemetry',
      icon: <Play className="w-4 h-4 text-sky-400" />,
      action: () => {
        setIsPreviewOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_export',
      category: 'Actions',
      title: 'Export SCORM Package (.zip)',
      subtitle: 'Download LMS ready zip package (SCORM 1.2 / 2004)',
      icon: <Download className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setIsExportModalOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_ai_palette',
      category: 'Actions',
      title: 'Generate with AI Studio Assistant',
      subtitle: 'Create multi-slide courses or instant quiz questions',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      action: () => {
        setIsAiPaletteOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_wcag_audit',
      category: 'Actions',
      title: 'Run WCAG 2.1 Accessibility Audit',
      subtitle: 'Check color contrast ratios & image alt texts',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setIsAccessibilityModalOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_branching',
      category: 'Actions',
      title: 'View Branching Flow Map',
      subtitle: 'Inspect non-linear scenario branching topology',
      icon: <GitBranch className="w-4 h-4 text-sky-400" />,
      action: () => {
        setIsBranchingFlowOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_media',
      category: 'Actions',
      title: 'Open Media Manager',
      subtitle: 'Audit, replace, and organize media assets',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      action: () => {
        setIsMediaManagerOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_versions',
      category: 'Actions',
      title: 'Version History & Snapshots',
      subtitle: 'Create and restore course revision points',
      icon: <History className="w-4 h-4 text-amber-400" />,
      action: () => {
        setIsVersionHistoryOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_debugger',
      category: 'Actions',
      title: 'Open LMS Debugger Drawer',
      subtitle: 'Inspect real-time CMI data model logs',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setIsDebuggerOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_shortcuts',
      category: 'Actions',
      title: 'Keyboard Shortcuts Guide',
      subtitle: 'View full list of keyboard hotkeys & controls',
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      action: () => {
        setIsShortcutsModalOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_toggle_rulers',
      category: 'Actions',
      title: `Toggle Canvas Rulers (${showRulers ? 'ON' : 'OFF'})`,
      subtitle: 'Show or hide magnetic alignment rulers',
      icon: <Ruler className="w-4 h-4 text-sky-400" />,
      action: () => {
        setShowRulers(!showRulers);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_toggle_guides',
      category: 'Actions',
      title: `Toggle Smart Guides (${showGuides ? 'ON' : 'OFF'})`,
      subtitle: 'Enable or disable tide-snapping magnetic alignment',
      icon: <Crosshair className="w-4 h-4 text-indigo-400" />,
      action: () => {
        setShowGuides(!showGuides);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_toggle_grid',
      category: 'Actions',
      title: `Toggle Grid Snapping (${isSnapToGridEnabled ? 'ON' : 'OFF'})`,
      subtitle: 'Snap element movements to pixel grid',
      icon: <Grid className="w-4 h-4 text-blue-400" />,
      action: () => {
        setSnapToGrid(!isSnapToGridEnabled);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'action_reset_view',
      category: 'Actions',
      title: 'Reset View (Zoom 100%)',
      subtitle: 'Reset canvas zoom level and pan offsets',
      icon: <RotateCcw className="w-4 h-4 text-slate-400" />,
      action: () => {
        resetView();
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'setting_course_manifest',
      category: 'Actions',
      title: 'Open Course Settings & Manifest',
      subtitle: 'Configure passing score, completion rules & metadata',
      icon: <Settings className="w-4 h-4 text-blue-400" />,
      action: () => {
        setActiveInspectorTab('course');
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'setting_design_tokens',
      category: 'Actions',
      title: 'Open Design Tokens Panel',
      subtitle: 'Manage global color, typography & spacing tokens',
      icon: <Palette className="w-4 h-4 text-pink-400" />,
      action: () => {
        setActiveInspectorTab('tokens');
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'setting_variables_mgr',
      category: 'Actions',
      title: 'Open Global Variables Manager',
      subtitle: 'Create & edit dynamic variables (score, user_name)',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      action: () => {
        setActiveInspectorTab('variables');
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'setting_grid_modal',
      category: 'Actions',
      title: 'Open Grid & Snapping Settings',
      subtitle: 'Customize grid spacing, color & snapping rules',
      icon: <Sliders className="w-4 h-4 text-indigo-400" />,
      action: () => {
        setIsGridSettingsModalOpen(true);
        setIsCommandBarOpen(false);
      },
    },
    {
      id: 'setting_theme_panel',
      category: 'Actions',
      title: 'Open Global Theme Editor',
      subtitle: 'Configure global palette, heading/body fonts & brand logo',
      icon: <Palette className="w-4 h-4 text-purple-400" />,
      action: () => {
        setActiveSidebarTab('theme');
        setIsCommandBarOpen(false);
      },
    }
  );

  // 4. Variables
  (course.variables || []).forEach((v) => {
    items.push({
      id: `var_${v.id}`,
      category: 'Variables',
      title: `Variable: $${v.name}`,
      subtitle: `Type: ${v.type} • Current: "${v.currentValue || v.defaultValue}"`,
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      badge: v.type,
      action: () => {
        navigator.clipboard.writeText(`{{${v.name}}}`);
        setIsCommandBarOpen(false);
      },
    });
  });

  // 5. Page Layout Templates
  SLIDE_LAYOUTS.forEach((tpl) => {
    items.push({
      id: `template_${tpl.id}`,
      category: 'Templates',
      title: `Template: ${tpl.title}`,
      subtitle: `${tpl.description} (${tpl.category})`,
      icon: <LayoutGrid className="w-4 h-4 text-purple-400" />,
      badge: tpl.badge || tpl.category,
      action: () => {
        addSlideWithLayout(tpl);
        setIsCommandBarOpen(false);
      },
    });
  });

  // Filter items by query
  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCommandBarOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 md:pt-24 px-4 animate-in fade-in duration-150 select-none"
      onClick={() => setIsCommandBarOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search pages, canvas elements, tools, variables, or slide templates... (Cmd+K)"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md shrink-0">
            <Command className="w-3 h-3 text-slate-400" />
            <span>K</span>
          </div>
        </div>

        {/* Search Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-500">
              <Search className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
              <p className="text-xs font-medium">No pages, elements, or commands matching "{query}"</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-xs'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/80 shrink-0">
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold leading-tight flex items-center gap-2">
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-950 border border-blue-800 px-1.5 py-0.2 rounded shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider hidden sm:inline">
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Command Bar Footer with Keyboard Shortcuts Legend */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/90 text-[10px] text-slate-400 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-300">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-300">
                ↵
              </kbd>{' '}
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-300">
                ESC
              </kbd>{' '}
              Close
            </span>
          </div>

          <div className="font-mono text-slate-500 hidden sm:block">
            {filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </div>
  );
};
