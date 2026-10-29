import React, { useState } from 'react';
import { useCourseStore } from '../../store/courseStore';
import {
  History,
  Save,
  RotateCcw,
  Trash2,
  Download,
  X,
  Clock,
  Layers,
  FileText,
  Check,
} from 'lucide-react';
import { triggerDownloadBlob } from '../../packager/zipPackager';

export const VersionHistoryDrawer: React.FC = () => {
  const {
    versionHistory,
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    saveVersion,
    restoreVersion,
    deleteVersion,
  } = useCourseStore();

  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionNote, setNewVersionNote] = useState('');
  const [restoreSuccessId, setRestoreSuccessId] = useState<string | null>(null);

  if (!isVersionHistoryOpen) return null;

  const handleSave = () => {
    saveVersion(newVersionName.trim() || undefined, newVersionNote.trim() || undefined);
    setNewVersionName('');
    setNewVersionNote('');
  };

  const handleRestore = (id: string) => {
    const success = restoreVersion(id);
    if (success) {
      setRestoreSuccessId(id);
      setTimeout(() => setRestoreSuccessId(null), 2500);
    }
  };

  const handleDownloadSnapshot = (id: string) => {
    const snap = versionHistory.find((v) => v.id === id);
    if (!snap) return;
    const jsonStr = JSON.stringify(snap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const safeName = snap.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    triggerDownloadBlob(blob, `${safeName}_snapshot.json`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Version History</h3>
              <span className="text-[11px] text-slate-400">
                {versionHistory.length} saved design states
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsVersionHistoryOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save Current Version Form */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-2.5">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5 text-blue-400" />
            Save Current Snapshot
          </span>
          <input
            type="text"
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            placeholder="Snapshot name (e.g. Added Cyber Quiz Module)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newVersionNote}
            onChange={(e) => setNewVersionNote(e.target.value)}
            placeholder="Optional revision notes..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSave}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Version Snapshot</span>
          </button>
        </div>

        {/* Snapshots Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {versionHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">No version snapshots saved yet.</p>
              <p className="text-[11px] text-slate-600">
                Click "Save Version Snapshot" above to create restore checkpoints.
              </p>
            </div>
          ) : (
            versionHistory.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 space-y-2 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      {snap.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(snap.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadSnapshot(snap.id)}
                      title="Download snapshot JSON"
                      className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteVersion(snap.id)}
                      title="Delete snapshot"
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {snap.note && (
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/80 p-2 rounded border border-slate-800/80">
                    "{snap.note}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-sky-400" />
                      {snap.pageCount} slides
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" />
                      {snap.nodeCount} elements
                    </span>
                  </span>

                  <button
                    onClick={() => handleRestore(snap.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                      restoreSuccessId === snap.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-200'
                    }`}
                  >
                    {restoreSuccessId === snap.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Restored!</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3 text-blue-400" />
                        <span>Restore State</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
