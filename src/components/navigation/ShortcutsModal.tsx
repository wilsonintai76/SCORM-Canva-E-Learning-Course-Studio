import React, { useEffect } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutGroup {
  category: string;
  items: { key: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Editing & State',
    items: [
      { key: 'Ctrl + Z / ⌘Z', description: 'Undo action' },
      { key: 'Ctrl + Y / ⌘⇧Z', description: 'Redo action' },
      { key: 'Delete / Backspace', description: 'Delete selected element(s)' },
      { key: 'Ctrl + D / ⌘D', description: 'Duplicate selected element' },
      { key: 'Ctrl + G / ⌘G', description: 'Group selected elements' },
      { key: 'Ctrl + Shift + G / ⌘⇧G', description: 'Ungroup elements' },
    ],
  },
  {
    category: 'Canvas & Selection',
    items: [
      { key: 'Shift + Click', description: 'Multi-select elements' },
      { key: 'Drag Box', description: 'Marquee / Lasso multi-selection' },
      { key: 'Arrow Keys', description: 'Nudge element by 1px' },
      { key: 'Shift + Arrow Keys', description: 'Nudge element by 10px / Grid' },
      { key: 'Spacebar + Drag', description: 'Pan canvas workspace' },
      { key: 'Ctrl + Wheel', description: 'Zoom canvas in / out' },
      { key: 'V / H', description: 'Switch Select (V) / Hand Pan (H)' },
      { key: '?', description: 'Toggle Shortcuts Modal' },
    ],
  },
];

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setIsShortcutsModalOpen } = useCourseStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen(!isShortcutsModalOpen);
      } else if (e.key === 'Escape' && isShortcutsModalOpen) {
        setIsShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsModalOpen, setIsShortcutsModalOpen]);

  if (!isShortcutsModalOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={() => setIsShortcutsModalOpen(false)}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-400">
                Speed up your authoring workflow with quick canvas hotkeys
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsShortcutsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category}>
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-blue-400" />
                <span>{group.category}</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80"
                  >
                    <span className="text-slate-300 font-medium">{item.description}</span>
                    <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 text-sky-300 font-mono text-[10px] rounded-md font-semibold shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-6 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-[11px] text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px] text-slate-200">?</kbd> anywhere to toggle this guide</span>
          <button
            onClick={() => setIsShortcutsModalOpen(false)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
