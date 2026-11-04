import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import {
  X,
  Users,
  Copy,
  Check,
  Globe,
  Shield,
  Clock,
  Sparkles,
  Link as LinkIcon,
  Eye,
} from 'lucide-react';

export const CollaborateModal: React.FC = () => {
  const { isCollaborateModalOpen, setIsCollaborateModalOpen, course } = useCourseStore();
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [enablePassword, setEnablePassword] = useState(false);

  if (!isCollaborateModalOpen) return null;

  const shareUrl = `${window.location.origin}/share/${course.id || 'course'}?role=${permission}&token=${Math.random().toString(36).substring(2, 10)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-16 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Collaborate &amp; Share Course
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate real-time read-only or review links for stakeholders
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCollaborateModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Shareable Link Box */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Shareable Live Project URL</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px] truncate select-all">
                {shareUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Access Permission */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Invitee Role &amp; Access Level</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'view', title: 'Read-Only Viewer', desc: 'Can view slides & test runtime' },
                { id: 'comment', title: 'Reviewer / Comments', desc: 'Can pin feedback notes' },
                { id: 'edit', title: 'Co-Author', desc: 'Full editing access' },
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => setPermission(role.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    permission === role.id
                      ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-slate-200 text-xs">{role.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Presence Roster */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Active Project Collaborators (Live)
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-200 font-medium">You (Lead Author)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Owner</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-slate-300 font-medium">Instructional Designer (Reviewer)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Viewing Slide #1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 bg-slate-950 border-t border-slate-800 flex items-center justify-end px-6 shrink-0">
          <button
            onClick={() => setIsCollaborateModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
