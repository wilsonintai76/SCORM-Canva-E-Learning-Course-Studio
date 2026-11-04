import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../../store/courseStore';
import {
  X,
  Image as ImageIcon,
  Music,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  Check,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MediaUsage {
  url: string;
  type: 'image' | 'audio' | 'background';
  occurrences: { pageIndex: number; pageTitle: string; nodeId?: string }[];
  alt?: string;
}

export const MediaManagerModal: React.FC = () => {
  const {
    isMediaManagerOpen,
    setIsMediaManagerOpen,
    course,
    replaceAssetReference,
    deleteAssetReference,
  } = useCourseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'audio'>('all');
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null>(null);
  const [newReplacementUrl, setNewReplacementUrl] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Scan all pages and nodes for unique media assets
  const mediaList = useMemo(() => {
    const map = new Map<string, MediaUsage>();

    course.pages.forEach((page, pIdx) => {
      // Check page background image
      if ((page.background as any).type === 'image' && page.background.value) {
        const url = page.background.value;
        const existing = map.get(url) || {
          url,
          type: 'background',
          occurrences: [],
        };
        existing.occurrences.push({ pageIndex: pIdx, pageTitle: page.title });
        map.set(url, existing);
      }

      // Check audio narration
      if (page.audioNarration && page.audioNarration.audioUrl) {
        const url = page.audioNarration.audioUrl;
        const existing = map.get(url) || {
          url,
          type: 'audio',
          occurrences: [],
          alt: page.audioNarration.name,
        };
        existing.occurrences.push({ pageIndex: pIdx, pageTitle: page.title });
        map.set(url, existing);
      }

      // Check canvas nodes
      page.nodes.forEach((node) => {
        if (node.type === 'image' && node.url) {
          const existing = map.get(node.url) || {
            url: node.url,
            type: 'image',
            occurrences: [],
            alt: node.alt,
          };
          existing.occurrences.push({
            pageIndex: pIdx,
            pageTitle: page.title,
            nodeId: node.id,
          });
          map.set(node.url, existing);
        }
      });
    });

    return Array.from(map.values());
  }, [course]);

  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.url.toLowerCase().includes(q) ||
          (item.alt && item.alt.toLowerCase().includes(q)) ||
          item.occurrences.some((o) => o.pageTitle.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [mediaList, filterType, searchQuery]);

  if (!isMediaManagerOpen) return null;

  const handleReplace = (oldUrl: string) => {
    if (!newReplacementUrl.trim()) return;
    replaceAssetReference(oldUrl, newReplacementUrl.trim());
    setActionSuccess(`Successfully replaced asset across ${mediaList.find((m) => m.url === oldUrl)?.occurrences.length || 0} locations!`);
    setNewReplacementUrl('');
    setSelectedAssetUrl(null);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleDelete = (url: string) => {
    if (confirm('Are you sure you want to delete this media reference across all slides?')) {
      deleteAssetReference(url);
      setActionSuccess('Media reference removed from slides.');
      if (selectedAssetUrl === url) setSelectedAssetUrl(null);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-16 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Media &amp; Asset Manager
                <span className="text-[10px] font-semibold text-purple-400 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded-full">
                  {mediaList.length} Unique Assets
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Audit, replace, or delete media references across all course slides
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMediaManagerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assets by filename, alt text, or slide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({mediaList.length})
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterType === 'image'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Images ({mediaList.filter((m) => m.type !== 'audio').length})
            </button>
            <button
              onClick={() => setFilterType('audio')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterType === 'audio'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Audio ({mediaList.filter((m) => m.type === 'audio').length})
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {actionSuccess && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 flex items-center gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Asset Grid & Details Split Pane */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Asset List (Left 2 cols) */}
          <div className="md:col-span-2 overflow-y-auto p-4 space-y-3 max-h-[500px]">
            {filteredMedia.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No media assets found matching filter.</p>
              </div>
            ) : (
              filteredMedia.map((media) => {
                const isSelected = selectedAssetUrl === media.url;
                return (
                  <div
                    key={media.url}
                    onClick={() => {
                      setSelectedAssetUrl(media.url);
                      setNewReplacementUrl('');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isSelected
                        ? 'bg-purple-950/30 border-purple-500/60 shadow-md shadow-purple-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Media Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                      {media.type === 'audio' ? (
                        <div className="flex flex-col items-center justify-center text-purple-400">
                          <Music className="w-6 h-6 mb-1" />
                          <span className="text-[9px] font-mono">AUDIO</span>
                        </div>
                      ) : (
                        <img
                          src={media.url}
                          alt={media.alt || 'Asset'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-200 truncate">
                          {media.alt || media.url.split('/').pop()?.split('?')[0] || 'Asset'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {media.occurrences.length} {media.occurrences.length === 1 ? 'slide' : 'slides'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mb-1">
                        {media.url}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {media.occurrences.map((occ, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800"
                          >
                            Slide {occ.pageIndex + 1}: {occ.pageTitle}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(media.url);
                      }}
                      title="Delete asset reference"
                      className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Action / Replacement Panel (Right 1 col) */}
          <div className="p-5 bg-slate-950/80 flex flex-col justify-between overflow-y-auto">
            {selectedAssetUrl ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 mb-1">
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                    Bulk Replace Asset
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Replace this asset across all slides with a new URL
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Current URL
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 break-all bg-slate-950 p-2 rounded border border-slate-800">
                    {selectedAssetUrl}
                  </div>
                  <a
                    href={selectedAssetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:underline"
                  >
                    Open original <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">
                    New Asset URL or Data URI
                  </label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or data:image/..."
                    value={newReplacementUrl}
                    onChange={(e) => setNewReplacementUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Or select high-res curated replacement:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: 'Tech Grid',
                        url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
                      },
                      {
                        label: 'Server Room',
                        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
                      },
                      {
                        label: 'Modern Shield',
                        url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
                      },
                      {
                        label: 'Abstract Code',
                        url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
                      },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewReplacementUrl(preset.url)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-[10px] text-slate-300 hover:text-white text-left transition-colors truncate"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleReplace(selectedAssetUrl)}
                    disabled={!newReplacementUrl.trim()}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg font-medium flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Apply Replacement Everywhere</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ImageIcon className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
                <p className="text-xs font-medium text-slate-400 mb-1">Select an Asset</p>
                <p className="text-[11px] text-slate-500">
                  Click any media item from the list to replace its URL or delete references across the course.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center gap-1">
              <span>All changes automatically record in Undo/Redo history.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
