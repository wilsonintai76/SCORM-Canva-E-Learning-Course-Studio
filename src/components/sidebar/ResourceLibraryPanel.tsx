import React, { useState, useRef } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { SavedCustomAsset } from '../../types/schema';
import {
  BookmarkPlus,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  GripVertical,
  Layers,
  Sparkles,
  Square,
  Type,
  Image as ImageIcon,
  CreditCard,
  FolderHeart,
  Palette,
  Copy,
  Download,
  Upload,
  Zap,
  Tag,
} from 'lucide-react';

type FilterTab = 'all' | 'shapes' | 'icons' | 'patterns' | 'saved';

export const ResourceLibraryPanel: React.FC = () => {
  const {
    course,
    myAssets,
    saveSelectionToMyAssets,
    deleteMyAsset,
    renameMyAsset,
    duplicateMyAsset,
    importResourcePack,
    addMyAssetToCanvas,
    selectedNodeIds,
    selectedNodeId,
    currentPage,
  } = useCourseStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<FilterTab>('all');
  const [matchBrandTheme, setMatchBrandTheme] = useState(true);
  const [isSavingOpen, setIsSavingOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<SavedCustomAsset['category']>('patterns');
  const [saveTagsInput, setSaveTagsInput] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveSelectionIds =
    selectedNodeIds && selectedNodeIds.length > 0
      ? selectedNodeIds
      : selectedNodeId
      ? [selectedNodeId]
      : [];
  const selectedNodes =
    currentPage?.nodes.filter((n) => effectiveSelectionIds.includes(n.id)) || [];

  const showNotice = (text: string, tone: 'success' | 'error' = 'success') => {
    setStatusNotice({ text, tone });
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleOpenSave = () => {
    if (selectedNodes.length === 0) return;
    let defaultName = 'Custom Resource';
    let defaultCategory: SavedCustomAsset['category'] = 'patterns';

    if (selectedNodes.length === 1) {
      const single = selectedNodes[0];
      if (single.type === 'text') {
        defaultName = (single as any).content?.slice(0, 24) || 'Custom Text Block';
        defaultCategory = 'text';
      } else if (single.type === 'shape') {
        defaultName = `Custom ${(single as any).shapeType || 'Shape'}`;
        defaultCategory = 'shapes';
      } else if (single.type === 'callout') {
        defaultName = (single as any).title || 'Interaction Callout';
        defaultCategory = 'patterns';
      } else if (single.type === 'image') {
        defaultName = (single as any).alt || 'Branded Icon';
        defaultCategory = 'icons';
      } else if (single.type === 'quiz') {
        defaultName = 'Quiz Interaction Pattern';
        defaultCategory = 'patterns';
      }
    } else {
      defaultName = `Interaction Pattern (${selectedNodes.length})`;
      defaultCategory = selectedNodes.some((n) => n.type === 'quiz' || n.type === 'callout' || Boolean(n.animation))
        ? 'patterns'
        : 'groups';
    }

    setSaveName(defaultName);
    setSaveCategory(defaultCategory);
    setSaveTagsInput('');
    setSaveDescription('');
    setIsSavingOpen(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim() || selectedNodes.length === 0) return;
    const parsedTags = saveTagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const created = saveSelectionToMyAssets(
      saveName.trim(),
      saveCategory,
      effectiveSelectionIds,
      {
        tags: parsedTags,
        description: saveDescription,
      }
    );
    if (created) {
      showNotice(`Saved "${created.name}" to Resource Library`);
      setIsSavingOpen(false);
      setSaveName('');
      setSaveTagsInput('');
      setSaveDescription('');
    }
  };

  const handleStartRename = (asset: SavedCustomAsset) => {
    setEditingAssetId(asset.id);
    setEditingName(asset.name);
  };

  const handleSaveRename = (assetId: string) => {
    if (editingName.trim()) {
      renameMyAsset(assetId, editingName.trim());
    }
    setEditingAssetId(null);
  };

  const handleExportPack = () => {
    const customOnly = myAssets.filter((a) => !a.isBuiltIn);
    const payload = customOnly.length > 0 ? customOnly : myAssets;
    const blob = new Blob([JSON.stringify({ resources: payload }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resource-library-pack.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice(`Exported ${payload.length} resource${payload.length === 1 ? '' : 's'}`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const items = Array.isArray(parsed) ? parsed : parsed.resources;
        const count = importResourcePack(items);
        if (count > 0) {
          showNotice(`Imported ${count} resource${count === 1 ? '' : 's'}`);
        } else {
          showNotice('No valid resources found in JSON file', 'error');
        }
      } catch {
        showNotice('Invalid Resource Pack JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredAssets = myAssets.filter((asset) => {
    if (selectedTab === 'saved') {
      if (asset.isBuiltIn) return false;
    } else if (selectedTab !== 'all') {
      if (asset.category !== selectedTab) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = asset.name.toLowerCase().includes(q);
      const matchCat = asset.category.toLowerCase().includes(q);
      const matchDesc = asset.description?.toLowerCase().includes(q);
      const matchTags = asset.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchCat || matchDesc || matchTags;
    }
    return true;
  });

  const savedCount = myAssets.filter((a) => !a.isBuiltIn).length;

  const getCategoryIcon = (category: SavedCustomAsset['category']) => {
    switch (category) {
      case 'shapes':
        return <Square className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'icons':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'patterns':
        return <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'groups':
        return <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
  };

  const getCategoryLabel = (category: SavedCustomAsset['category']) => {
    switch (category) {
      case 'shapes':
        return 'Shape';
      case 'icons':
        return 'Icon';
      case 'patterns':
        return 'Pattern';
      case 'groups':
        return 'Group';
      case 'text':
        return 'Text';
      default:
        return 'Card';
    }
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <FolderHeart className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-100">Resource Library</h4>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportPack}
              title="Export Resource Pack JSON"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import Resource Pack JSON"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <span className="text-[10px] text-cyan-400 font-mono font-semibold ml-1">
              {myAssets.length}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Save &amp; reuse custom shapes, branded icons, and interactive learning patterns across any course slide.
        </p>
      </div>

      {/* Save Selection CTA */}
      <div className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
            <BookmarkPlus className="w-4 h-4 text-cyan-400" />
            <span>Save Canvas Selection</span>
          </div>
          {selectedNodes.length > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-medium border border-cyan-500/30">
              {selectedNodes.length} selected
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">None selected</span>
          )}
        </div>

        {statusNotice && (
          <div
            className={`p-1.5 rounded-md text-[11px] flex items-center gap-1.5 border ${
              statusNotice.tone === 'error'
                ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{statusNotice.text}</span>
          </div>
        )}

        {isSavingOpen ? (
          <form onSubmit={handleConfirmSave} className="space-y-2 pt-1.5 border-t border-cyan-900/50">
            <div>
              <label className="text-[10px] font-medium text-slate-400 block mb-0.5">
                Resource Name
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Verified Security Callout"
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 block mb-0.5">
                Resource Type
              </label>
              <select
                value={saveCategory}
                onChange={(e) => setSaveCategory(e.target.value as SavedCustomAsset['category'])}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="patterns">Interaction Pattern</option>
                <option value="shapes">Custom Shape</option>
                <option value="icons">Branded Icon / Badge</option>
                <option value="cards">Callout / Card</option>
                <option value="groups">Reusable Group</option>
                <option value="text">Text Style Block</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 block mb-0.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={saveTagsInput}
                onChange={(e) => setSaveTagsInput(e.target.value)}
                placeholder="compliance, cta, reveal"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-1.5 pt-1">
              <button
                type="submit"
                disabled={!saveName.trim()}
                className="flex-1 py-1.5 px-2.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Save Resource</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSavingOpen(false)}
                className="py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : selectedNodes.length > 0 ? (
          <button
            onClick={handleOpenSave}
            className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Selected to Library</span>
          </button>
        ) : (
          <p className="text-[10px] text-slate-400 leading-normal italic">
            Select elements on the canvas to save them as custom shapes, icons, or interaction patterns.
          </p>
        )}
      </div>

      {/* Brand Theme Match Toggle */}
      <button
        onClick={() => setMatchBrandTheme(!matchBrandTheme)}
        className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
          matchBrandTheme
            ? 'bg-slate-950 border-sky-500/40 text-sky-200'
            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
        }`}
        title="Automatically tint inserted branded icons & shapes with your active Design Tokens palette"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Palette className="w-3.5 h-3.5 text-sky-400" />
          <span>Match Project Brand Colors</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/20"
            style={{ backgroundColor: course.theme?.primaryColor || '#2563eb' }}
          />
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              matchBrandTheme ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {matchBrandTheme ? 'ON' : 'OFF'}
          </span>
        </span>
      </button>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shapes, icons, patterns..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-slate-200 text-xs placeholder:text-slate-500 outline-none focus:border-cyan-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'shapes', label: 'Custom Shapes' },
            { id: 'icons', label: 'Branded Icons' },
            { id: 'patterns', label: 'Interaction Patterns' },
            { id: 'saved', label: `Saved (${savedCount})` },
          ] as { id: FilterTab; label: string }[]
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedTab(cat.id)}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
              selectedTab === cat.id
                ? 'bg-cyan-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Resource Cards List */}
      <div className="space-y-2.5">
        {filteredAssets.map((asset) => {
          const isEditing = editingAssetId === asset.id;
          const isConfirmingDelete = pendingDeleteId === asset.id;
          const isSingleSvgIcon =
            asset.category === 'icons' &&
            asset.nodes.length === 1 &&
            asset.nodes[0].type === 'image' &&
            Boolean((asset.nodes[0] as any).url);

          return (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/scorm-my-asset',
                  JSON.stringify({ id: asset.id, name: asset.name, applyBrandTheme: matchBrandTheme })
                );
                e.dataTransfer.setData('text/plain', asset.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/85 hover:border-cyan-500/60 transition-all group shadow-sm cursor-grab active:cursor-grabbing relative"
            >
              {/* Title Row */}
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {getCategoryIcon(asset.category)}
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="bg-slate-900 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(asset.id);
                          if (e.key === 'Escape') setEditingAssetId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveRename(asset.id)}
                        className="p-1 rounded bg-cyan-600 text-white hover:bg-cyan-500"
                        title="Save name"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingAssetId(null)}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-xs font-semibold text-slate-200 truncate"
                      title={asset.name}
                    >
                      {asset.name}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-400 uppercase font-mono">
                      {getCategoryLabel(asset.category)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMyAsset(asset.id);
                        showNotice(`Duplicated "${asset.name}"`);
                      }}
                      title="Duplicate Resource"
                      className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(asset);
                      }}
                      title="Rename Resource"
                      className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {!isConfirmingDelete ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteId(asset.id);
                        }}
                        title="Delete Resource"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5 bg-rose-950/90 border border-rose-500/40 rounded px-1 py-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMyAsset(asset.id);
                            setPendingDeleteId(null);
                          }}
                          className="text-[9px] font-bold text-rose-300 hover:text-white px-1 cursor-pointer"
                        >
                          Del
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(null);
                          }}
                          className="text-[9px] text-slate-400 hover:text-white px-0.5 cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Thumbnail Preview */}
              <div
                onClick={() =>
                  addMyAssetToCanvas(asset.id, undefined, { applyBrandTheme: matchBrandTheme })
                }
                className="w-full h-22 rounded-lg border border-slate-800/80 bg-slate-900/70 overflow-hidden relative mb-2 p-2 flex items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors"
              >
                {isSingleSvgIcon ? (
                  <img
                    src={(asset.nodes[0] as any).url}
                    alt={asset.name}
                    className="w-14 h-14 object-contain pointer-events-none"
                  />
                ) : (
                  <div
                    className="relative pointer-events-none"
                    style={{
                      width: Math.max(40, asset.width),
                      height: Math.max(24, asset.height),
                      transform: `scale(${Math.min(
                        1,
                        210 / Math.max(1, asset.width),
                        68 / Math.max(1, asset.height)
                      )})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {asset.nodes.map((node, i) => (
                      <div
                        key={node.id || i}
                        className="absolute overflow-hidden truncate"
                        style={{
                          left: node.x,
                          top: node.y,
                          width: node.width,
                          height: node.height,
                          zIndex: node.zIndex || 1,
                          background:
                            node.type === 'shape'
                              ? (node as any).fill || '#3b82f6'
                              : node.type === 'callout'
                              ? '#1e293b'
                              : node.type === 'quiz'
                              ? '#0f172a'
                              : 'transparent',
                          borderColor:
                            node.type === 'shape'
                              ? (node as any).stroke || 'transparent'
                              : node.type === 'callout'
                              ? '#38bdf8'
                              : node.type === 'quiz'
                              ? '#2563eb'
                              : 'transparent',
                          borderStyle: 'solid',
                          borderWidth: (node as any).strokeWidth || 1,
                          borderRadius: (node as any).borderRadius || 6,
                          color: (node as any).color || '#e2e8f0',
                          fontSize: Math.max(9, ((node as any).fontSize || 14) * 0.85),
                          fontWeight: (node as any).fontWeight || 'normal',
                          padding: 4,
                        }}
                      >
                        {node.type === 'text' && (node as any).content}
                        {node.type === 'callout' && (
                          <div className="text-[10px] leading-tight">
                            <strong className="block text-sky-400">{(node as any).title}</strong>
                            <span className="text-[9px] text-slate-300">
                              {(node as any).content}
                            </span>
                          </div>
                        )}
                        {node.type === 'quiz' && (
                          <div className="text-[10px] leading-tight text-sky-200 p-1">
                            <strong className="block text-blue-400">QUIZ PATTERN</strong>
                            <span>{(node as any).question}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="absolute inset-0 bg-cyan-950/75 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-cyan-600 px-2.5 py-1 rounded-md shadow-lg">
                    <GripVertical className="w-3.5 h-3.5" />
                    <span>Drag or Click to Insert</span>
                  </div>
                </div>
              </div>

              {/* Description & Tags */}
              {asset.description && (
                <p className="text-[10px] text-slate-400 leading-snug mb-1.5 line-clamp-2">
                  {asset.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-900">
                <div className="flex items-center gap-1 text-slate-500 min-w-0 truncate">
                  <Tag className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">
                    {asset.nodes.length} node{asset.nodes.length > 1 ? 's' : ''} •{' '}
                    {Math.round(asset.width)}×{Math.round(asset.height)}
                  </span>
                </div>
                <button
                  onClick={() =>
                    addMyAssetToCanvas(asset.id, undefined, { applyBrandTheme: matchBrandTheme })
                  }
                  className="py-1 px-2 rounded bg-cyan-900/50 hover:bg-cyan-600 text-cyan-200 hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insert</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-2">
            <Sparkles className="w-7 h-7 mx-auto text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No matching resources found</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Try clearing your filter or select elements on the canvas to save a new custom resource.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
