import React, { useState, useEffect } from 'react';
import { useCourseStore } from '../../store/courseStore';
import {
  bundleCourseToScormZip,
  validateCourseForScorm,
  ScormBundlePackageResult,
  ScormValidationResult,
} from '../../services/scormBundleService';
import { triggerDownloadBlob } from '../../packager/zipPackager';
import {
  X,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FolderArchive,
  Copy,
  Check,
  FileCode,
  ShieldCheck,
  Package,
} from 'lucide-react';

export const ScormExportModal: React.FC = () => {
  const { isExportModalOpen, setIsExportModalOpen, course } = useCourseStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'manifest' | 'files'>('overview');
  const [bundleResult, setBundleResult] = useState<ScormBundlePackageResult | null>(null);
  const [validation, setValidation] = useState<ScormValidationResult | null>(null);
  const [isBundling, setIsBundling] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (!isExportModalOpen) return;

    const val = validateCourseForScorm(course);
    setValidation(val);

    const generateBundle = async () => {
      setIsBundling(true);
      try {
        const res = await bundleCourseToScormZip(course);
        setBundleResult(res);
      } catch (err) {
        console.error('Failed to bundle SCORM ZIP:', err);
      } finally {
        setIsBundling(false);
      }
    };

    generateBundle();
  }, [isExportModalOpen, course]);

  if (!isExportModalOpen) return null;

  const handleDownload = () => {
    if (!bundleResult) return;
    triggerDownloadBlob(bundleResult.blob, bundleResult.filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleCopyXml = () => {
    if (!bundleResult) return;
    navigator.clipboard.writeText(bundleResult.imsManifestXml);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-16 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  SCORM 1.2 Bundle &amp; Package Studio
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  LMS Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Self-contained ZIP package ready for Moodle, Canvas, Blackboard, or SCORM Cloud
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Package Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'manifest' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>imsmanifest.xml</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'files' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ZIP File Tree ({bundleResult?.files.length || 0})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Validation Status Banner */}
              {validation?.isValid ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">
                      SCORM 1.2 Compliance Verification Passed
                    </h4>
                    <p className="text-[11px] text-emerald-400/90 leading-relaxed mt-0.5">
                      All required manifest identifiers, organization title, passing score threshold ({course.passingScore}%), and SCORM 1.2 CAM definitions are valid.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">LMS Warning Detected</h4>
                    <ul className="text-[11px] text-amber-400/90 list-disc list-inside mt-0.5 space-y-0.5">
                      {validation?.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Package Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Total Slides</span>
                  <span className="text-lg font-bold text-slate-100">{course.pages.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Passing Threshold</span>
                  <span className="text-lg font-bold text-blue-400">{course.passingScore}%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Compressed Size</span>
                  <span className="text-lg font-bold text-slate-100">
                    {bundleResult ? formatBytes(bundleResult.compressedSize) : 'Calculating...'}
                  </span>
                </div>
              </div>

              {/* Package Details */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Bundle Filename:</span>
                  <span className="font-mono text-slate-200">{bundleResult?.filename}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">SCORM Standard:</span>
                  <span className="font-semibold text-slate-200">SCORM 1.2 (ADL CAM 1.2)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">SCO Entrypoint:</span>
                  <span className="font-mono text-emerald-400">index.html (Offline Runtime)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Completion Mode:</span>
                  <span className="capitalize text-slate-200">
                    {course.completionCriteria.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  Generated ADL SCORM 1.2 imsmanifest.xml (placed at ZIP root):
                </span>
                <button
                  onClick={handleCopyXml}
                  className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedXml ? 'Copied' : 'Copy XML'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-80 whitespace-pre-wrap leading-relaxed">
                {bundleResult?.imsManifestXml}
              </pre>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-3">
              <span className="text-slate-400 text-[11px] block">
                The bundle structure conforms to standard SCORM 1.2 package guidelines:
              </span>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 bg-slate-950">
                {bundleResult?.files.map((file) => (
                  <div key={file.path} className="p-3 flex items-center justify-between hover:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-mono text-slate-200 text-xs">{file.path}</div>
                        <div className="text-[10px] text-slate-500">{file.type}</div>
                      </div>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="text-[11px] text-slate-400">
            ZIP package compresses to {bundleResult ? formatBytes(bundleResult.compressedSize) : '...'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={isBundling || !bundleResult}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download SCORM 1.2 (.zip)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
