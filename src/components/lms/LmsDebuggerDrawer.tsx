import React, { useState, useEffect } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { globalMockLms } from '../../scorm/mockLms';
import { ScormLogEntry } from '../../scorm/types';
import {
  X,
  Terminal,
  RotateCcw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Database,
  Filter,
} from 'lucide-react';

export const LmsDebuggerDrawer: React.FC = () => {
  const { isDebuggerOpen, setIsDebuggerOpen } = useCourseStore();

  const [logs, setLogs] = useState<ScormLogEntry[]>([]);
  const [cmiData, setCmiData] = useState<Record<string, string>>({});
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'logs' | 'cmi'>('logs');

  useEffect(() => {
    if (!isDebuggerOpen) return;
    const unsub = globalMockLms.subscribe((newLogs, newData) => {
      setLogs(newLogs);
      setCmiData(newData);
    });
    return unsub;
  }, [isDebuggerOpen]);

  if (!isDebuggerOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterMethod === 'ALL') return true;
    return log.method === filterMethod;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-[520px] bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              SCORM 1.2 LMS Debugger &amp; Inspector
            </h3>
          </div>
          <button
            onClick={() => setIsDebuggerOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Strip & Tabs */}
        <div className="bg-slate-900/60 border-b border-slate-800 p-2 flex items-center justify-between text-xs">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeTab === 'logs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Event Stream ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('cmi')}
              className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'cmi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>CMI Data Model</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => globalMockLms.clearLogs()}
              title="Clear Event Log"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => globalMockLms.reset()}
              title="Reset Mock LMS state"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter bar for logs */}
        {activeTab === 'logs' && (
          <div className="p-2 border-b border-slate-800/80 bg-slate-900/30 flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Filter:</span>
            {['ALL', 'LMSSetValue', 'LMSGetValue', 'LMSCommit', 'LMSInitialize'].map((m) => (
              <button
                key={m}
                onClick={() => setFilterMethod(m)}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  filterMethod === m
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'ALL' ? 'All Calls' : m.replace('LMS', '')}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
          {activeTab === 'logs' ? (
            filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No SCORM events recorded yet. Launch "Preview Player" or run course slides to view live telemetry.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const isSuccess = log.result === 'true' || (log.method === 'LMSGetValue' && log.result !== '');

                  return (
                    <div
                      key={log.id}
                      className="p-2 rounded bg-slate-900/90 border border-slate-800/80 flex flex-col gap-1 hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-blue-400 font-semibold">{log.method}</span>
                        <span className="text-slate-500">{log.timestamp}</span>
                      </div>

                      <div className="text-slate-300 break-all">
                        {log.param && (
                          <span className="text-amber-300/90">"{log.param}"</span>
                        )}
                        {log.value !== undefined && (
                          <span className="text-slate-400">
                            {' '}
                            &rarr; <span className="text-emerald-300">"{log.value}"</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
                        <span
                          className={`flex items-center gap-1 ${
                            isSuccess ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          Result: {log.result}
                        </span>
                        {log.errorCode !== '0' && (
                          <span className="text-red-400">Error: {log.errorString}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* CMI DATA MODEL INSPECTION */
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 pb-2 border-b border-slate-800 font-sans">
                Real-time snapshot of the SCORM 1.2 CMI data model storage:
              </div>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2 border-b border-slate-800">Element</th>
                      <th className="p-2 border-b border-slate-800">Current Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                    {Object.entries(cmiData).map(([key, val]) => (
                      <tr key={key} className="hover:bg-slate-900/50">
                        <td className="p-2 text-slate-400 font-medium truncate max-w-[180px]">
                          {key}
                        </td>
                        <td className="p-2 text-slate-200 break-all">
                          {key === 'cmi.suspend_data' && val ? (
                            <pre className="text-[10px] text-emerald-400 max-h-32 overflow-y-auto whitespace-pre-wrap bg-slate-900 p-1.5 rounded">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(val), null, 2);
                                } catch {
                                  return val;
                                }
                              })()}
                            </pre>
                          ) : (
                            <span
                              className={
                                key.includes('lesson_status')
                                  ? 'font-bold text-sky-400'
                                  : key.includes('score.raw')
                                  ? 'font-bold text-amber-400'
                                  : ''
                              }
                            >
                              {val || <span className="text-slate-600 italic">empty</span>}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
