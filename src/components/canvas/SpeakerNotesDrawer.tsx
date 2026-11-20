import React, { useState, useRef } from 'react';
import { useCourseStore } from '../../store/courseStore';
import {
  FileText,
  ChevronUp,
  ChevronDown,
  Clock,
  Copy,
  Check,
  Sparkles,
  Trash2,
  Mic,
} from 'lucide-react';

export const SpeakerNotesDrawer: React.FC = () => {
  const { currentPage, activePageIndex, updateActivePage, pushUndo } = useCourseStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(144);
  const [copied, setCopied] = useState(false);
  const hasPushedFocusUndoRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!currentPage) return null;

  const notes = currentPage.notes || '';
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  // Average instructional narration pace ~140 words per minute (~2.3 words/sec)
  const estSeconds = wordCount > 0 ? Math.max(1, Math.round(wordCount / 2.3)) : 0;
  const formattedReadTime =
    estSeconds >= 60
      ? `${Math.floor(estSeconds / 60)}m ${estSeconds % 60}s`
      : `${estSeconds}s`;

  const handleNotesFocus = () => {
    if (!hasPushedFocusUndoRef.current) {
      pushUndo(`Edit speaker notes (Slide ${activePageIndex + 1})`);
      hasPushedFocusUndoRef.current = true;
    }
  };

  const handleNotesBlur = () => {
    hasPushedFocusUndoRef.current = false;
  };

  const handleNotesChange = (val: string) => {
    updateActivePage({ notes: val }, false);
  };

  const insertCue = (cue: string) => {
    pushUndo(`Insert speaker note cue (Slide ${activePageIndex + 1})`);
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? notes.length;
      const end = el.selectionEnd ?? notes.length;
      const prefix = start > 0 && !notes.slice(0, start).endsWith(' ') && !notes.slice(0, start).endsWith('\n') ? ' ' : '';
      const next = notes.slice(0, start) + prefix + cue + ' ' + notes.slice(end);
      updateActivePage({ notes: next }, false);
      setTimeout(() => {
        el.focus();
        const cursor = start + prefix.length + cue.length + 1;
        el.setSelectionRange(cursor, cursor);
      }, 0);
    } else {
      updateActivePage({ notes: notes ? `${notes}\n${cue} ` : `${cue} ` }, false);
    }
  };

  const handleCopyNotes = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = drawerHeight;

    const onMove = (moveEvt: PointerEvent) => {
      const deltaY = startY - moveEvt.clientY;
      setDrawerHeight(Math.max(104, Math.min(320, startHeight + deltaY)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className="w-full bg-slate-900/98 border-t border-slate-800 text-slate-200 shrink-0 z-30 select-none flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Drag Resize Handle (visible when expanded) */}
      {isExpanded && (
        <div
          onPointerDown={handleResizePointerDown}
          title="Drag vertically to resize Speaker Notes height"
          className="h-1.5 w-full cursor-ns-resize hover:bg-sky-500/40 transition-colors flex items-center justify-center group"
        >
          <div className="w-10 h-0.5 rounded-full bg-slate-700 group-hover:bg-sky-400 transition-colors" />
        </div>
      )}

      {/* Header Bar (Always docked cleanly at bottom of canvas viewport) */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="h-9 px-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 shrink-0">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Speaker Notes</span>
          </div>

          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
            Slide {activePageIndex + 1}
          </span>

          {!isExpanded && (
            <span className="text-[11px] text-slate-400 truncate italic">
              {notes.trim()
                ? notes.replace(/\s+/g, ' ')
                : 'Click to add narrative script or instructional design guidance for this slide...'}
            </span>
          )}

          {isExpanded && (
            <div className="hidden md:flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-slate-500 mr-0.5">Cues:</span>
              {[
                { label: '+ Pause', val: '[Pause 2s]' },
                { label: '+ Emphasis', val: '[Emphasis]' },
                { label: '+ Visual Cue', val: '[Show Callout]' },
              ].map((cue) => (
                <button
                  key={cue.label}
                  type="button"
                  onClick={() => insertCue(cue.val)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {cue.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Word Count & Read Time Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded">
            <Mic className="w-3 h-3 text-slate-500" />
            <span>{wordCount}w</span>
            {wordCount > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-sky-400 flex items-center gap-0.5" title="Estimated voiceover duration">
                  <Clock className="w-2.5 h-2.5" />
                  ~{formattedReadTime}
                </span>
              </>
            )}
          </div>

          {notes.trim() && (
            <button
              type="button"
              onClick={handleCopyNotes}
              title="Copy speaker notes"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {isExpanded && notes.trim() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pushUndo(`Clear speaker notes (Slide ${activePageIndex + 1})`);
                updateActivePage({ notes: '' }, false);
              }}
              title="Clear notes for this slide"
              className="p-1 rounded hover:bg-rose-950/70 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Speaker Notes' : 'Expand Speaker Notes'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Per-Slide Notes Text Editor */}
      {isExpanded && (
        <div
          className="px-3.5 pb-3 pt-1 flex flex-col gap-1.5 bg-slate-950/90 border-t border-slate-800/70"
          style={{ height: `${drawerHeight}px` }}
        >
          <textarea
            ref={textareaRef}
            key={currentPage.id}
            value={notes}
            onFocus={handleNotesFocus}
            onBlur={handleNotesBlur}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={`Write voiceover script, narration cues, or instructional design notes for "${currentPage.title}"...`}
            className="w-full flex-1 bg-slate-900/90 border border-slate-800 focus:border-sky-500/80 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none leading-relaxed font-sans select-text"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Persists automatically per slide ({currentPage.title})</span>
            </span>
            <span>Synced with Slide Inspector &amp; SCORM Transcript</span>
          </div>
        </div>
      )}
    </div>
  );
};
