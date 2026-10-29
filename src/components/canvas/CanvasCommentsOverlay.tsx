import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { CanvasComment } from '../../types/schema';
import {
  MessageSquare,
  X,
  Check,
  Trash2,
  User,
  Clock,
  CheckCircle2,
  Sparkles,
  Palette,
} from 'lucide-react';

interface CanvasCommentsOverlayProps {
  pageId: string;
  zoom: number;
}

const COLOR_THEMES: Record<string, { bg: string; border: string; text: string; pinBg: string }> = {
  yellow: {
    bg: '#fef08a',
    border: '#facc15',
    text: '#713f12',
    pinBg: '#eab308',
  },
  blue: {
    bg: '#bae6fd',
    border: '#38bdf8',
    text: '#0c4a6e',
    pinBg: '#0284c7',
  },
  green: {
    bg: '#bbf7d0',
    border: '#4ade80',
    text: '#14532d',
    pinBg: '#16a34a',
  },
  purple: {
    bg: '#e9d5ff',
    border: '#c084fc',
    text: '#581c87',
    pinBg: '#9333ea',
  },
  coral: {
    bg: '#fecdd3',
    border: '#fb7185',
    text: '#881337',
    pinBg: '#e11d48',
  },
};

export const CanvasCommentsOverlay: React.FC<CanvasCommentsOverlayProps> = ({ pageId, zoom }) => {
  const {
    course,
    showComments,
    updateComment,
    deleteComment,
    toggleCommentResolved,
  } = useCourseStore();

  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  if (!showComments) return null;

  const pageComments = (course.comments || []).filter((c) => c.pageId === pageId);

  if (pageComments.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      {pageComments.map((comment, index) => {
        const isOpen = activeCommentId === comment.id;
        const colorKey = comment.color || 'yellow';
        const theme = COLOR_THEMES[colorKey] || COLOR_THEMES.yellow;

        return (
          <div
            key={comment.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${comment.x}px`,
              top: `${comment.y}px`,
            }}
          >
            {/* The Sticky Note Pin / Badge */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveCommentId(isOpen ? null : comment.id);
              }}
              title={`${comment.author}: "${comment.text.slice(0, 40)}..." (Click to open)`}
              className={`-translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 ${
                comment.isResolved ? 'opacity-50 ring-1 ring-slate-400' : 'ring-2 ring-white shadow-xl'
              }`}
              style={{
                width: `${28 / zoom}px`,
                height: `${28 / zoom}px`,
                backgroundColor: comment.isResolved ? '#64748b' : theme.pinBg,
                color: '#ffffff',
              }}
            >
              {comment.isResolved ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span className="text-[11px] font-bold font-mono">
                  {index + 1}
                </span>
              )}
            </button>

            {/* Expandable Sticky Note Popover Card */}
            {isOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-4 top-4 w-72 rounded-xl shadow-2xl p-3 border animate-in zoom-in-95 duration-150 backdrop-blur-md z-40 text-left"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                {/* Header with Author and Close */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center font-bold text-[10px]">
                      {comment.author.charAt(0).toUpperCase()}
                    </div>
                    <input
                      type="text"
                      value={comment.author}
                      onChange={(e) => updateComment(comment.id, { author: e.target.value })}
                      placeholder="Author name..."
                      className="bg-transparent font-bold text-xs outline-none max-w-[130px] border-b border-transparent focus:border-black/30"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleCommentResolved(comment.id)}
                      title={comment.isResolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                      className={`p-1 rounded transition-colors ${
                        comment.isResolved
                          ? 'bg-emerald-600 text-white'
                          : 'bg-black/10 hover:bg-black/20 text-current'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      title="Delete Comment"
                      className="p-1 rounded bg-black/10 hover:bg-rose-500 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setActiveCommentId(null)}
                      className="p-1 rounded bg-black/10 hover:bg-black/20 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Comment Text Content */}
                <textarea
                  value={comment.text}
                  onChange={(e) => updateComment(comment.id, { text: e.target.value })}
                  placeholder="Type a feedback note or revision request..."
                  rows={3}
                  className="w-full bg-black/5 rounded-lg p-2 text-xs outline-none resize-none font-sans leading-relaxed border border-black/5 focus:border-black/20"
                />

                {/* Bottom Bar: Color Selector and Timestamp */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/10 text-[10px] opacity-75">
                  <div className="flex items-center gap-1">
                    {(['yellow', 'blue', 'green', 'purple', 'coral'] as const).map((cKey) => (
                      <button
                        key={cKey}
                        onClick={() => updateComment(comment.id, { color: cKey })}
                        className={`w-3.5 h-3.5 rounded-full transition-transform ${
                          colorKey === cKey ? 'ring-2 ring-black scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: COLOR_THEMES[cKey].pinBg }}
                      />
                    ))}
                  </div>

                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(comment.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
